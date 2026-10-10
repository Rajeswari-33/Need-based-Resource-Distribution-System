import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { Bell, X, ChevronDown, ChevronUp, MessageCircle, Check } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { backendApi } from '../lib/api.js'
import { openWhatsApp } from '../utils/whatsapp.js'

// Shows the notifications tied to ONE specific item (a request, resource, task, center, or
// report) right next to that item — instead of only in the single global Notifications page.
// Keeping them here, per item, is deliberate: folding every item's notifications together into
// one undifferentiated list makes it hard to tell which item each one is even about, especially
// once several items each build up their own history. Each entry can be deleted on its own.
//
// Usage: <ItemNotifications type="request" id={request.id} />
export default function ItemNotifications({ type, id, className = '' }) {
  const { currentUser } = useAuth()
  const { language, t } = usePreferences()
  const { showToast } = useToast()
  const {
    requests = [],
    resources = [],
    tasks = [],
    users = [],
    notificationsForItem,
    markNotificationRead,
    deleteNotification,
  } = useData()
  const [expanded, setExpanded] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [sentMap, setSentMap] = useState({})
  const [sendingAll, setSendingAll] = useState(false)

  const items = notificationsForItem(currentUser, type, id).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
  if (items.length === 0) return null

  const unreadCount = items.filter((n) => !n.read).length

  // Resolve the OTHER party:
  // If current user is donor -> target recipient's WhatsApp
  // If current user is recipient -> target donor's WhatsApp
  // Never target oneself!
  let targetUser = null
  let targetPhone = null

  if (type === 'request') {
    const req = requests.find((r) => r.id === id)
    if (req) {
      if (currentUser?.id === req.donorId) {
        // Current user is donor -> target recipient
        targetUser = users.find((u) => u.id === req.recipientId)
        targetPhone = targetUser?.phone || req.recipientPhone || null
      } else if (currentUser?.id === req.recipientId) {
        // Current user is recipient -> target donor
        targetUser = users.find((u) => u.id === req.donorId)
        targetPhone = targetUser?.phone || req.donorPhone || null
      } else {
        targetUser = users.find((u) => u.id === req.recipientId) || users.find((u) => u.id === req.donorId)
        targetPhone = targetUser?.phone || req.recipientPhone || req.donorPhone || null
      }
    }
  } else if (type === 'resource') {
    const res = resources.find((r) => r.id === id)
    if (res) {
      if (currentUser?.id === res.donorId) {
        // Current user is donor -> target claimant
        const relatedReq = requests.find((r) => r.resourceId === res.id && ['requested', 'approved', 'completed'].includes(r.status))
        if (relatedReq) {
          targetUser = users.find((u) => u.id === relatedReq.recipientId)
          targetPhone = targetUser?.phone || relatedReq.recipientPhone || null
        }
      } else {
        // Current user is recipient -> target donor
        targetUser = users.find((u) => u.id === res.donorId)
        targetPhone = targetUser?.phone || null
      }
    }
  } else if (type === 'task') {
    const taskItem = tasks.find((t) => t.id === id)
    if (taskItem) {
      if (currentUser?.id === taskItem.volunteerId) {
        targetUser = users.find((u) => u.id === taskItem.recipientId) || users.find((u) => u.id === taskItem.donorId)
      } else if (currentUser?.id === taskItem.donorId) {
        targetUser = users.find((u) => u.id === taskItem.volunteerId) || users.find((u) => u.id === taskItem.recipientId)
      } else {
        targetUser = users.find((u) => u.id === taskItem.volunteerId) || users.find((u) => u.id === taskItem.donorId)
      }
      targetPhone = targetUser?.phone || null
    }
  }

  const isCurrentDonor = currentUser?.role === 'donor' || (type === 'request' && requests.find(r => r.id === id)?.donorId === currentUser?.id)
  const targetRoleLabel = isCurrentDonor ? t('Recipient') : t('Donor')

  function handleDelete(e, notifId) {
    e.stopPropagation()
    e.preventDefault()
    deleteNotification(notifId, currentUser.id)
  }

  async function handleSendSingleToWhatsApp(e, notif) {
    e.stopPropagation()
    e.preventDefault()
    if (!targetPhone) {
      showToast(t(`The ${targetRoleLabel.toLowerCase()} has not linked a WhatsApp phone number yet.`), 'info')
      return
    }

    setSendingId(notif.id)
    try {
      const res = await backendApi.notifyUserWhatsApp({
        userId: targetUser?.id || currentUser?.id,
        phone: targetPhone,
        message: notif.message,
        subject: 'Setu Request Update',
      })
      setSentMap((prev) => ({ ...prev, [notif.id]: true }))
      if (res?.success) {
        showToast(t(`Update sent to ${targetRoleLabel.toLowerCase()}'s linked WhatsApp!`), 'success')
      } else {
        openWhatsApp(targetPhone, `🔔 *Setu Update*\n\n${notif.message}`)
        showToast(t(`Opening WhatsApp chat with ${targetRoleLabel.toLowerCase()}...`), 'info')
      }
    } catch {
      openWhatsApp(targetPhone, `🔔 *Setu Update*\n\n${notif.message}`)
      showToast(t(`Opening WhatsApp chat with ${targetRoleLabel.toLowerCase()}...`), 'info')
    } finally {
      setSendingId(null)
    }
  }

  async function handleSendAllToWhatsApp(e) {
    e.stopPropagation()
    e.preventDefault()
    if (!targetPhone) {
      showToast(t(`The ${targetRoleLabel.toLowerCase()} has not linked a WhatsApp phone number yet.`), 'info')
      return
    }

    setSendingAll(true)
    const summary = items.map((n) => `• ${n.message}`).join('\n\n')
    try {
      const res = await backendApi.notifyUserWhatsApp({
        userId: targetUser?.id || currentUser?.id,
        phone: targetPhone,
        message: `Updates on your item:\n\n${summary}`,
        subject: 'Setu Request Updates',
      })
      if (res?.success) {
        showToast(t('All updates sent to linked WhatsApp!'), 'success')
      } else {
        openWhatsApp(targetPhone, `🔔 *Setu Updates*\n\n${summary}`)
        showToast(t('Opening WhatsApp...'), 'info')
      }
    } catch {
      openWhatsApp(targetPhone, `🔔 *Setu Updates*\n\n${summary}`)
      showToast(t('Opening WhatsApp...'), 'info')
    } finally {
      setSendingAll(false)
    }
  }

  return (
    <div className={`mt-3 rounded-md border border-ink/10 bg-paper-dim/60 ${className}`}>
      <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-ink/70">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-1.5 text-left"
        >
          <Bell size={12} className={unreadCount > 0 ? 'text-marigold-dark' : 'text-ink/40'} />
          {items.length} {t('update')} {t('on this item')}
          {unreadCount > 0 && (
            <span className="rounded-full bg-marigold/25 px-1.5 py-0.5 text-[10px] text-marigold-dark">
              {unreadCount} {t('new')}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1.5">
          {targetPhone && (
            <button
              type="button"
              onClick={handleSendAllToWhatsApp}
              disabled={sendingAll}
              title={`${t('Open WhatsApp chat with')} ${targetRoleLabel}`}
              className="inline-flex items-center gap-1 rounded bg-[#25D366]/15 px-2 py-0.5 text-[11px] font-medium text-[#1da850] hover:bg-[#25D366]/25 transition-colors"
            >
              <MessageCircle size={11} />
              <span>{sendingAll ? t('Sending...') : `${t('Chat with')} ${targetRoleLabel}`}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-0.5 text-ink/40 hover:text-ink"
            aria-label="Toggle updates"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-1.5 border-t border-ink/10 px-3 py-2.5">
          {items.map((n) => {
            const body = (
              <>
                <span className="flex-1 leading-snug">{t(n.message)}</span>
                <span className="mt-0.5 block text-[10px] text-ink/40">
                  {new Date(n.createdAt).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </>
            )
            const rowClass = `group flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
              n.read ? 'text-ink/55' : 'bg-marigold/10 text-ink'
            }`
            return (
              <div key={n.id} className={rowClass}>
                {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-marigold" />}
                {n.link ? (
                  <Link
                    to={n.link}
                    onClick={() => !n.read && markNotificationRead(n.id)}
                    className="flex flex-1 flex-col hover:underline"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex flex-1 flex-col">{body}</div>
                )}
                <div className="flex items-center gap-1">
                  {targetPhone && (
                    <button
                      type="button"
                      onClick={(e) => handleSendSingleToWhatsApp(e, n)}
                      disabled={sendingId === n.id}
                      className="shrink-0 rounded p-1 text-[#1da850] opacity-75 hover:bg-[#25D366]/15 hover:opacity-100 transition-opacity"
                      aria-label={t('Send to linked WhatsApp')}
                      title={t('Send this update to linked WhatsApp')}
                    >
                      {sentMap[n.id] ? <Check size={12} className="text-[#1da850]" /> : <MessageCircle size={12} />}
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    className="shrink-0 rounded p-0.5 text-ink/25 opacity-0 hover:bg-ink/5 hover:text-clay group-hover:opacity-100"
                    aria-label={t('Delete this notification')}
                    title={t('Delete this notification')}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
