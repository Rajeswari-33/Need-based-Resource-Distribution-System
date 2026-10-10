import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import RequestCard from '../components/RequestCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ClaimActivityTracker from '../components/ClaimActivityTracker.jsx'
import { RatingForm, MoreInfoForm } from '../components/RequestActions.jsx'
import WhatsAppButton from '../components/WhatsAppButton.jsx'
import { PackageCheck, Truck, ShieldAlert } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'requested', label: 'Requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Received' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function MyRequests() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const {
    requests, resources, users, tasks, setRequestStatus, confirmHandover, confirmTaskDelivery, addRating,
    provideAdditionalInfo,
  } = useData()
  const { showToast } = useToast()
  const [cancelling, setCancelling] = useState(null)
  const [tab, setTab] = useState('all')

  const allMyRequests = requests
    .filter((r) => r.recipientId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const myRequests = tab === 'all' ? allMyRequests : allMyRequests.filter((r) => r.status === tab)
  const counts = TABS.reduce((acc, t) => ({ ...acc, [t.key]: t.key === 'all' ? allMyRequests.length : allMyRequests.filter((r) => r.status === t.key).length }), {})

  // Setu field-team deliveries addressed to this recipient, waiting on their confirmation.
  const deliveriesToConfirm = tasks.filter((t) => t.recipientId === currentUser.id && t.status === 'delivered')

  function handleCancel() {
    setRequestStatus(cancelling.id, 'cancelled')
    showToast('Request cancelled.', 'info')
    setCancelling(null)
  }

  function handleConfirmPickup(reqId) {
    confirmHandover(reqId, 'recipient')
    showToast('Pickup confirmed on your side.', 'success')
  }

  async function handleConfirmDelivery(taskId) {
    const result = await confirmTaskDelivery(taskId)
    showToast(result.ok ? 'Delivery confirmed — thanks! The donation and Setu employee assignment are complete.' : result.error, result.ok ? 'success' : 'error')
  }

  function handleMoreInfo(reqId, info) {
    provideAdditionalInfo(reqId, info)
    showToast('Additional information sent to the admin for re-review.', 'success')
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Request history')}</h1>
          <p className="mt-1.5 text-sm text-ink/55">{t('Every request you\'ve made, active or closed.')}</p>
        </div>
        <Link to="/browse" className="btn-outline">{t('Browse resources')}</Link>
      </div>

      <div className="mb-8">
        <ClaimActivityTracker />
      </div>

      {currentUser.flaggedForReview && (
        <div className="mb-6 flex items-start gap-2.5 rounded-md border border-marigold/40 bg-marigold/10 px-4 py-3.5 text-sm text-marigold-dark">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>{t('Your account has one or more claims under extra admin review right now. This doesn\'t mean you\'re banned — an admin will approve, ask for more info, or make a decision shortly.')}</span>
        </div>
      )}

      {deliveriesToConfirm.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-marigold-dark"><Truck size={15} /> {t('Confirm delivery received')}</h2>
          <div className="space-y-3">
            {deliveriesToConfirm.map((taskItem) => {
              const res = resources.find((r) => r.id === taskItem.resourceId)
              return (
                <div key={taskItem.id} className="card flex flex-wrap items-center justify-between gap-3 border-marigold/40 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-dim text-xl">{res?.photo}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{t(res?.title)}</p>
                      <p className="text-xs text-ink/45">{t('A Setu platform employee marked this as delivered. Confirm only once you actually have it.')}</p>
                    </div>
                  </div>
                  <button onClick={() => handleConfirmDelivery(taskItem.id)} className="btn-accent px-3 py-1.5 text-xs"><PackageCheck size={13} /> {t('Confirm received')}</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${tab === tabItem.key ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/60 hover:border-ink/40'}`}
          >
            {t(tabItem.label)} ({counts[tabItem.key]})
          </button>
        ))}
      </div>

      {myRequests.length === 0 ? (
        <EmptyState icon="📋" title={t('No requests here')} description={t('Requests you submit will appear here with live status.')} action={<Link to="/browse" className="btn-accent">{t('Browse resources')}</Link>} />
      ) : (
        <div className="space-y-4">
          {myRequests.map((req) => {
            const resource = resources.find((r) => r.id === req.resourceId)
            const fieldVerification = tasks.find((task) => task.requestId === req.id && task.type === 'field-verification')
            return (
              <RequestCard key={req.id} request={req} resource={resource}>
                {fieldVerification && (
                  <div className="mt-3 rounded-md border border-ink/10 bg-paper-dim p-3 text-xs">
                    <p className="font-semibold text-ink">
                      {t('Field verification')}: {t(fieldVerification.status === 'completed'
                        ? ({
                          verified: 'Verified',
                          rejected: 'Rejected',
                          needs_more_information: 'Needs More Information',
                        })[fieldVerification.verificationOutcome] || 'Report submitted'
                        : fieldVerification.status === 'accepted' ? 'Setu employee visit in progress' : 'Waiting for a Setu employee')}
                    </p>
                    {fieldVerification.status === 'completed' && (
                      <p className="mt-1 whitespace-pre-wrap text-ink/65">{fieldVerification.verificationReport}</p>
                    )}
                  </div>
                )}
                {req.adminDecision === 'info_requested' && (
                  <MoreInfoForm request={req} onSubmit={(info) => handleMoreInfo(req.id, info)} />
                )}
                {req.flagged && req.additionalInfo && !req.adminDecision && (
                  <p className="mt-3 border-t border-ink/10 pt-3 text-xs text-ink/55">{t('Additional info sent — waiting on the admin\'s next review.')}</p>
                )}
                {req.status === 'requested' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setCancelling(req)} className="btn-outline px-3 py-1.5 text-xs">{t('Cancel request')}</button>
                    <WhatsAppButton
                      phone={users.find((u) => u.id === req.donorId || u.id === resource?.donorId)?.phone || req.donorPhone}
                      message={`Hello, this is ${currentUser?.name || 'the recipient'}. Regarding my claim for "${resource?.title || 'the donation'}" on Setu Donation Platform.`}
                      label={t('Chat with Donor')}
                      title={t('Chat with donor on WhatsApp')}
                      variant="outline"
                      size="xs"
                    />
                  </div>
                )}
                {req.status === 'approved' && (
                  <div className="flex flex-wrap items-center gap-2">
                    {req.recipientConfirmed ? (
                      <span className="badge bg-banyan/10 text-banyan-dark">{t('You confirmed pickup — waiting on donor')}</span>
                    ) : (
                      <button onClick={() => handleConfirmPickup(req.id)} className="btn-accent px-3 py-1.5 text-xs"><PackageCheck size={13} /> {t('Confirm pickup / received')}</button>
                    )}
                    <WhatsAppButton
                      phone={users.find((u) => u.id === req.donorId || u.id === resource?.donorId)?.phone || req.donorPhone}
                      message={`Hello, this is ${currentUser?.name || 'the recipient'}. Regarding my approved request for "${resource?.title || 'the donation'}" on Setu Donation Platform. Let's coordinate the pickup/handover!`}
                      label={t('Chat with Donor')}
                      title={t('Chat with donor on WhatsApp')}
                      variant="solid"
                      size="xs"
                    />
                  </div>
                )}
                {req.status === 'completed' && (
                  <RatingForm request={req} onSubmit={(rating, note) => addRating(req.id, rating, note)} />
                )}
              </RequestCard>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelling}
        title={t('Cancel this request?')}
        description={t('Cancelling frees up the resource for other recipients. Excessive cancellations may flag your account for review.')}
        confirmLabel={t('Cancel request')}
        tone="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelling(null)}
      />
    </DashboardLayout>
  )
}
