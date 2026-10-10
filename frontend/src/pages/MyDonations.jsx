import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ItemNotifications from '../components/ItemNotifications.jsx'
import { Plus, Layers, MapPin, CheckCircle2, Boxes } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function MyDonations() {
  const { language, t } = usePreferences()
  const { currentUser, users } = useAuth()
  const { resources, requests, withdrawResource, getAvailability } = useData()
  const { showToast } = useToast()
  const [confirming, setConfirming] = useState(null)

  const myResources = resources
    .filter((r) => r.donorId === currentUser.id && r.status !== 'removed')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  function handleWithdraw() {
    withdrawResource(confirming.id)
    showToast(`"${confirming.title}" was withdrawn from listings.`, 'success')
    setConfirming(null)
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Manage donations')}</h1>
          <p className="mt-1.5 text-sm text-ink/55">{t('All the resources you\'ve posted, active and past. Once every unit is requested, it\'s hidden from other recipients and centers automatically — and once donated, it can\'t be claimed again.')}</p>
        </div>
        <Link to="/donor/post" className="btn-accent"><Plus size={16} /> {t('Post a resource')}</Link>
      </div>

      {myResources.length === 0 ? (
        <EmptyState icon="🎁" title={t('Nothing posted yet')} description={t('Your posted resources will show up here.')} action={<Link to="/donor/post" className="btn-accent">{t('Post your first resource')}</Link>} />
      ) : (
        <div className="space-y-3">
          {myResources.map((res) => {
            const activeRequests = requests.filter((r) => r.resourceId === res.id && ['requested', 'approved'].includes(r.status)).length
            const completedRequests = requests
              .filter((r) => r.resourceId === res.id && r.status === 'completed')
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            const avail = getAvailability(res.id)
            const multiQty = !res.isBundle && (res.quantity || 1) > 1
            return (
              <div key={res.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-paper-dim text-2xl">{res.photo}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{res.title}</p>
                      <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink/45">
                        <span>{t(res.category)}</span>
                        <span className="flex items-center gap-1"><MapPin size={11} /> {res.location}</span>
                        {res.isBundle && <span className="flex items-center gap-1"><Layers size={11} /> {t('Bundle')}</span>}
                        {multiQty && <span className="flex items-center gap-1"><Boxes size={11} /> {avail.remaining} {t('of')} {avail.total} {t('still available')}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {activeRequests > 0 && <span className="badge bg-marigold/20 text-marigold-dark">{activeRequests} {t(activeRequests === 1 ? 'active request' : 'active requests')}</span>}
                    <StatusBadge status={res.status}>{res.status === 'completed' ? 'Donated' : undefined}</StatusBadge>
                    {(res.status === 'available') && (
                      <button onClick={() => setConfirming(res)} className="btn-outline px-3 py-1.5 text-xs">{t('Withdraw')}</button>
                    )}
                  </div>
                </div>

                {/* ---- Per-item completion notifications — right under the item they belong to,
                     not just buried in the general Notifications inbox. Multi-quantity items can
                     rack up several as different recipients each complete their share. ---- */}
                {completedRequests.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-banyan/20 pt-3">
                    {completedRequests.map((req) => {
                      const recipient = users.find((u) => u.id === req.recipientId)
                      return (
                        <p key={req.id} className="flex items-center gap-2 text-xs text-banyan-dark">
                          <CheckCircle2 size={13} className="shrink-0" />
                          {t('Donated')} {req.quantity || 1} {t((req.quantity || 1) > 1 ? 'units' : 'unit')} {t('to')} {recipient ? recipient.name : t('a recipient')} — {t('completed')} {new Date(req.createdAt).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short' })}
                          {req.rating && <span className="ml-1 text-marigold-dark">{'★'.repeat(req.rating)}</span>}
                        </p>
                      )
                    })}
                  </div>
                )}
                <ItemNotifications type="resource" id={res.id} />
                {requests.filter((request) => request.resourceId === res.id).map((request) => (
                  <ItemNotifications key={request.id} type="request" id={request.id} />
                ))}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirming}
        title={t('Withdraw this donation?')}
        description={confirming ? t(`"${confirming.title}" will be removed from Browse Resources. This can't be undone.`) : ''}
        confirmLabel={t('Withdraw')}
        tone="danger"
        onConfirm={handleWithdraw}
        onCancel={() => setConfirming(null)}
      />
    </DashboardLayout>
  )
}
