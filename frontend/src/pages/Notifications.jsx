import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Bell, CheckCheck, ArrowRight, X, Trash2 } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function Notifications() {
  const { currentUser } = useAuth()
  const { language, t } = usePreferences()
  const { notificationsFor, markNotificationRead, markAllRead, deleteNotification, clearAllNotifications } = useData()
  const [clearingAll, setClearingAll] = useState(false)

  // Item-scoped updates (a new claim, an approval, a delivery, etc.) now show as a small
  // notification icon right next to the item they're about — a request card, a donation, a
  // task — instead of cluttering this general inbox. This page is reserved for messages the
  // admin sends out (announcements/policy notices). Admin's own account still sees its full
  // operational inbox here, since that's how admin catches new registrations, flags, and reports.
  const mine = (currentUser.role === 'admin' ? notificationsFor(currentUser) : notificationsFor(currentUser).filter((n) => n.userId === '__broadcast__'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  function handleDelete(e, id) {
    e.stopPropagation()
    e.preventDefault()
    deleteNotification(id, currentUser.id)
  }

  function handleClearAll() {
    clearAllNotifications(currentUser.id, currentUser.role)
    setClearingAll(false)
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t('Notifications')}</h1>
          <div className="flex items-center gap-3">
            {mine.some((n) => !n.read) && (
              <button onClick={() => markAllRead(currentUser.id)} className="btn-ghost text-xs"><CheckCheck size={14} /> {t('Mark all read')}</button>
            )}
            {mine.length > 0 && (
              <button onClick={() => setClearingAll(true)} className="btn-ghost text-xs text-clay"><Trash2 size={13} /> {t('Clear all')}</button>
            )}
          </div>
        </div>

        {mine.length === 0 ? (
          <EmptyState icon={<Bell size={28} />} title={t('No announcements yet')} description={t(currentUser.role === 'admin' ? 'System alerts — new registrations, flags, reports — will appear here.' : 'Admin announcements will appear here. Updates about your own requests, donations, and tasks show as a bell icon right next to each item.')} />
        ) : (
          <div className="space-y-2.5">
            {mine.map((n) => {
              // Notifications about an action (a new request, an approval, a rating, etc.)
              // carry a `link` to the page where that action actually lives — e.g. a donor's
              // "new request" notification opens Approve / Reject Requests directly, instead
              // of just being text with nowhere to go.
              const content = (
                <>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-marigold" />}
                  <span className="flex-1">
                    {n.userId === '__broadcast__' && <span className="mr-1.5 rounded-full bg-ink/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink/45">{t('Announcement')}</span>}
                    {t(n.message)}
                    <span className="mt-1 flex items-center gap-1 text-xs text-ink/40">
                      {new Date(n.createdAt).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      {n.link && <span className="ml-1 flex items-center gap-0.5 font-semibold text-banyan-dark">· {t('Open')} <ArrowRight size={11} /></span>}
                    </span>
                  </span>
                </>
              )
              const sharedClass = `group flex w-full items-start gap-3 rounded-md border px-4 py-3.5 text-left text-sm transition-colors ${n.read ? 'border-ink/10 bg-white text-ink/55' : 'border-marigold/40 bg-marigold/10 text-ink'}`
              const deleteBtn = (
                <button
                  onClick={(e) => handleDelete(e, n.id)}
                  className="shrink-0 rounded-md p-1 text-ink/25 opacity-0 hover:bg-ink/5 hover:text-clay group-hover:opacity-100"
                  aria-label={t('Delete this notification')}
                  title={t('Delete this notification')}
                >
                  <X size={14} />
                </button>
              )
              return n.link ? (
                <div key={n.id} className={sharedClass}>
                  <Link
                    to={n.link}
                    onClick={() => n.userId !== '__broadcast__' && markNotificationRead(n.id)}
                    className="flex flex-1 items-start gap-3"
                  >
                    {content}
                  </Link>
                  {deleteBtn}
                </div>
              ) : (
                <div key={n.id} className={sharedClass}>
                  <button
                    onClick={() => n.userId !== '__broadcast__' && markNotificationRead(n.id)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    {content}
                  </button>
                  {deleteBtn}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={clearingAll}
        title={t('Clear all notifications?')}
        description={t('This removes every notification from your inbox. It won\'t undo anything they refer to — approvals, deliveries, etc. stay as they are.')}
        confirmLabel={t('Clear all')}
        tone="danger"
        onConfirm={handleClearAll}
        onCancel={() => setClearingAll(false)}
      />
    </DashboardLayout>
  )
}
