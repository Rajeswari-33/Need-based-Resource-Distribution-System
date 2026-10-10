import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ItemNotifications from '../components/ItemNotifications.jsx'
import RequestCard from '../components/RequestCard.jsx'
import WhatsAppButton from '../components/WhatsAppButton.jsx'
import { User, Truck, Building2, ShieldCheck, ClipboardCheck } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function DonorRequests() {
  const { t, itemName } = usePreferences()
  const { currentUser } = useAuth()
  const {
    resources, requests, users, centers, tasks, setRequestStatus, setRequestDeliveryMode,
    confirmHandover, requestFieldVerification, requestVolunteerDelivery, confirmTaskHandover,
    fulfillNeedRequest, getAvailability,
  } = useData()
  const { showToast } = useToast()
  const [confirmAction, setConfirmAction] = useState(null) // { req, action }
  const [selectedNeedDonations, setSelectedNeedDonations] = useState({})
  const [fulfillingNeedId, setFulfillingNeedId] = useState(null)

  const myResources = resources.filter((r) => r.donorId === currentUser.id)
  const myRequests = requests
    .filter((req) => myResources.some((r) => r.id === req.resourceId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const communityNeeds = requests
    .filter((req) => req.needRequest && ['requested', 'approved'].includes(req.status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const compatibleDonations = (need) => myResources.filter((resource) =>
    resource.method !== 'center' &&
    resource.category === need.category &&
    (!resource.audience || resource.audience === (need.requesterType === 'center' ? 'center' : 'individual')) &&
    ['available', 'pending'].includes(resource.status) &&
    getAvailability(resource.id).remaining >= (Number(need.quantity) || 1),
  )

  async function handleFulfillNeed(need) {
    const resourceId = selectedNeedDonations[need.id]
    if (!resourceId) {
      showToast('Choose one of your available donations first.', 'error')
      return
    }
    setFulfillingNeedId(need.id)
    const result = await fulfillNeedRequest(need.id, resourceId)
    showToast(result.ok
      ? 'Your donation is matched to this need. Choose hand-to-hand or Setu employee delivery below.'
      : result.error, result.ok ? 'success' : 'error')
    setFulfillingNeedId(null)
  }

  // Shows whether a claim came from an individual recipient or from a registered center, so
  // the donor always knows who they'd be handing the item to.
  function RequesterBadge({ req }) {
    const recipient = users.find((u) => u.id === req.recipientId)
    if (recipient?.role === 'center') {
      const center = centers.find((c) => c.id === recipient.centerId)
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-banyan-dark">
          <Building2 size={12} /> {center?.name || recipient.name} · Center
        </span>
      )
    }
    return <span className="flex items-center gap-1 text-xs text-ink/50"><User size={12} /> {recipient?.name} · Individual</span>
  }

  async function runAction() {
    const { req, action } = confirmAction
    const resource = resources.find((r) => r.id === req.resourceId)
    if (action === 'approve') {
      setRequestStatus(req.id, 'approved')
      showToast('Request approved. Coordinate handover with the recipient.', 'success')
    } else if (action === 'reject') {
      setRequestStatus(req.id, 'rejected')
      showToast('Request rejected.', 'info')
    } else if (action === 'confirm') {
      confirmHandover(req.id, 'donor')
      showToast('Handover confirmed on your side.', 'success')
    } else if (action === 'field-verification') {
      const result = await requestFieldVerification(req.id)
      showToast(result.ok ? 'Field-verification assignment posted for the Setu platform team.' : result.error, result.ok ? 'success' : 'error')
    } else if (action === 'hand-to-hand') {
      setRequestDeliveryMode(req.id, 'hand-to-hand')
      showToast('Hand-to-hand delivery selected. Confirm after the recipient receives the item.', 'success')
    } else if (action === 'volunteer') {
      const result = requestVolunteerDelivery(req.id)
      showToast(result.ok ? 'Pickup and delivery assignment posted for the Setu platform team.' : result.error, result.ok ? 'success' : 'error')
    } else if (action === 'confirm-volunteer-handoff') {
      const deliveryTask = tasks.find((task) => task.requestId === req.id && task.type !== 'field-verification')
      const result = deliveryTask ? confirmTaskHandover(deliveryTask.id) : { ok: false, error: 'The delivery task could not be found.' }
      showToast(result.ok ? 'Handoff to the Setu employee confirmed.' : result.error, result.ok ? 'success' : 'error')
    }
    setConfirmAction(null)
  }

  const pending = myRequests.filter((r) => r.status === 'requested')
  const inProgress = myRequests.filter((r) => r.status === 'approved')
  const resolved = myRequests.filter((r) => ['rejected', 'cancelled', 'completed'].includes(r.status))

  function Section({ title, items, children }) {
    if (items.length === 0) return null
    return (
      <div className="mb-8">
        <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t(title)} <span className="text-ink/40">({items.length})</span></h2>
        <div className="space-y-3">{items.map((req) => children(req))}</div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Approve / reject requests')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Review incoming requests for everything you\'ve posted.')}</p>
      </div>

      {communityNeeds.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">
            {t('Open recipient and center needs')} <span className="text-ink/40">({communityNeeds.length})</span>
          </h2>
          <p className="mb-3 text-xs text-ink/55">{t('These requests are visible to all donors until withdrawn or the requested item is received.')}</p>
          <div className="space-y-3">
            {communityNeeds.map((need) => {
              const options = compatibleDonations(need)
              const selectedId = selectedNeedDonations[need.id] || ''
              return (
                <RequestCard key={need.id} request={need}>
                  <RequesterBadge req={need} />
                  {need.status === 'requested' ? (
                    options.length > 0 ? (
                      <>
                        <label className="sr-only" htmlFor={`need-donation-${need.id}`}>{t('Choose donation to fulfill this need')}</label>
                        <select
                          id={`need-donation-${need.id}`}
                          value={selectedId}
                          onChange={(event) => setSelectedNeedDonations((previous) => ({ ...previous, [need.id]: event.target.value }))}
                          className="min-w-56 flex-1 rounded-md border border-ink/20 bg-paper px-3 py-2 text-sm text-ink"
                        >
                          <option value="">{t('Choose one of your matching donations')}</option>
                          {options.map((resource) => (
                            <option key={resource.id} value={resource.id}>
                              {itemName(resource.title, resource.titleTamil)} — {getAvailability(resource.id).remaining} {t('available')}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedId || fulfillingNeedId === need.id}
                          onClick={() => handleFulfillNeed(need)}
                          className="btn-accent px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t(fulfillingNeedId === need.id ? 'Matching donation…' : 'Offer donation')}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-ink/50">{t('No matching donation with enough quantity is currently available in your listings.')}</p>
                    )
                  ) : (
                    <p className="text-xs font-medium text-banyan-dark">{t('A donation has been matched. This need stays visible until receipt is confirmed.')}</p>
                  )}
                </RequestCard>
              )
            })}
          </div>
        </section>
      )}

      {myRequests.length === 0 ? (
        <EmptyState icon="📥" title={t('No requests yet')} description={t('When a recipient requests one of your resources, it\'ll show up here.')} />
      ) : (
        <>
          <Section title={t('Pending your decision')} items={pending}>
            {(req) => {
              const res = resources.find((r) => r.id === req.resourceId)
              const recipient = users.find((u) => u.id === req.recipientId)
              const fieldTask = tasks.find((task) => task.requestId === req.id && task.type === 'field-verification')
              const verificationInProgress = fieldTask && fieldTask.status !== 'completed'
              return (
                <div key={req.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-dim text-xl">{res?.photo}</span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{itemName(res?.title, res?.titleTamil)}</p>
                        <RequesterBadge req={req} />
                      </div>
                    </div>
                    {req.flagged && <span className="badge bg-clay/10 text-clay">{t('Flagged for review')}</span>}
                  </div>
                  <p className="mt-2.5 text-xs text-ink/60">"{req.reason}" — for {req.beneficiary}, qty {req.quantity}, urgency {req.urgency}</p>
                  {req.isBundle && <p className="mt-1 text-xs text-ink/45">Bundle claim — treated as one request ({req.bundleItems?.join(', ')}).</p>}
                  {fieldTask?.status === 'completed' && (
                    <div className="mt-3 rounded-md border border-ink/10 bg-paper-dim p-3 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold text-ink">
                        <ShieldCheck size={13} />
                        {t('Field verification')}: {t({
                          verified: 'Verified',
                          rejected: 'Rejected',
                          needs_more_information: 'Needs More Information',
                        }[fieldTask.verificationOutcome] || 'Report submitted')}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-ink/65">{fieldTask.verificationReport}</p>
                    </div>
                  )}
                  {req.flagged && req.adminDecision !== 'approved' ? (
                    <p className="mt-3 border-t border-ink/10 pt-3 text-xs text-clay">{t('This claim is still under admin verification — you\'ll be able to approve it once that clears.')}</p>
                  ) : verificationInProgress ? (
                    <p className="mt-3 border-t border-ink/10 pt-3 text-xs text-marigold-dark">
                      {t(fieldTask.status === 'accepted' ? 'A Setu platform employee is visiting the recipient and checking the need. Wait for their report before deciding.' : 'Field verification is posted and waiting for a Setu platform employee to take the assignment.')}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                      <button onClick={() => setConfirmAction({ req, action: 'approve' })} className="btn-accent px-3 py-1.5 text-xs">{t('Approve')}</button>
                      <button onClick={() => setConfirmAction({ req, action: 'reject' })} className="btn-outline px-3 py-1.5 text-xs text-clay">{t('Reject')}</button>
                      {!fieldTask && (
                        <button onClick={() => setConfirmAction({ req, action: 'field-verification' })} className="btn-outline px-3 py-1.5 text-xs">
                          <ClipboardCheck size={13} /> Request field verification
                        </button>
                      )}
                      <WhatsAppButton
                        phone={recipient?.phone || req.recipientPhone}
                        message={`Hello ${recipient?.name || 'there'}, this is ${currentUser?.name || 'the donor'}. Regarding your request for "${res?.title || 'the donation'}" on Setu Donation Platform.`}
                        label={t('Chat with Recipient')}
                        title={t('Chat with recipient on WhatsApp')}
                        variant="outline"
                        size="xs"
                      />
                    </div>
                  )}
                  <ItemNotifications type="request" id={req.id} />
                </div>
              )
            }}
          </Section>

          <Section title={t('Approved — awaiting handover')} items={inProgress}>
            {(req) => {
              const res = resources.find((r) => r.id === req.resourceId)
              const recipient = users.find((u) => u.id === req.recipientId)
              const deliveryTask = tasks.find((task) => task.requestId === req.id && task.type !== 'field-verification')
              return (
                <div key={req.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-dim text-xl">{res?.photo}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{itemName(res?.title, res?.titleTamil)}</p>
                      <RequesterBadge req={req} />
                    </div>
                  </div>
                  {req.isBundle && <p className="mt-2 text-xs text-ink/45">Bundle claim — treated as one request ({req.bundleItems?.join(', ')}).</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                    {!req.deliveryMode ? (
                      <>
                        <button onClick={() => setConfirmAction({ req, action: 'hand-to-hand' })} className="btn-accent px-3 py-1.5 text-xs">
                          Hand-to-hand donation
                        </button>
                        <button onClick={() => setConfirmAction({ req, action: 'volunteer' })} className="btn-outline px-3 py-1.5 text-xs">
                          <Truck size={13} /> Assign Setu employee for pickup & delivery
                        </button>
                      </>
                    ) : req.deliveryMode === 'volunteer' ? (
                      deliveryTask?.status === 'accepted' && !deliveryTask.donorConfirmed ? (
                        <button onClick={() => setConfirmAction({ req, action: 'confirm-volunteer-handoff' })} className="btn-accent px-3 py-1.5 text-xs">
                          Confirm handoff to Setu employee
                        </button>
                      ) : (
                        <span className="badge bg-marigold/20 text-marigold-dark">
                          {deliveryTask?.status === 'completed' ? 'Delivery confirmed by all three parties' :
                            deliveryTask?.status === 'delivered' ? 'Waiting for recipient confirmation' :
                              deliveryTask?.status === 'accepted' && deliveryTask.donorConfirmed ? 'Handoff confirmed — Setu employee will deliver' :
                                deliveryTask?.status === 'accepted' ? 'Setu employee assigned — waiting for donor handoff' :
                                'Waiting for a Setu employee to take the assignment'}
                        </span>
                      )
                    ) : req.donorConfirmed ? (
                      <span className="badge bg-banyan/10 text-banyan-dark">{t('You confirmed handover')}</span>
                    ) : (
                      <button onClick={() => setConfirmAction({ req, action: 'confirm' })} className="btn-accent px-3 py-1.5 text-xs">{t('Confirm handover complete')}</button>
                    )}
                    <WhatsAppButton
                      phone={recipient?.phone || req.recipientPhone}
                      message={`Hello ${recipient?.name || ''}, this is ${currentUser?.name || 'the donor'}. Your request for "${res?.title || 'the donation'}" is approved! Let's coordinate pickup/handover on Setu.`}
                      label={t('Chat with Recipient')}
                      title={t('Chat with recipient on WhatsApp to coordinate handover')}
                      variant="solid"
                      size="xs"
                    />
                  </div>
                  {req.deliveryMode === 'volunteer' && deliveryTask && (
                    <p className="mt-2 text-xs text-ink/55">
                      {t('Delivery confirmations')}: {deliveryTask.donorConfirmed ? t('donor handoff confirmed') : t('donor handoff pending')} · {deliveryTask.status === 'delivered' || deliveryTask.status === 'completed' ? t('Setu employee marked delivered') : t('Setu employee delivery pending')} · {deliveryTask.recipientConfirmed ? t('recipient confirmed receipt') : t('recipient confirmation pending')}
                    </p>
                  )}
                  <ItemNotifications type="request" id={req.id} />
                </div>
              )
            }}
          </Section>

          <Section title={t('Resolved')} items={resolved}>
            {(req) => {
              const res = resources.find((r) => r.id === req.resourceId)
              const recipient = users.find((u) => u.id === req.recipientId)
              return (
                <div key={req.id} className="card p-4 opacity-70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-dim text-xl">{res?.photo}</span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{itemName(res?.title, res?.titleTamil)}</p>
                        <RequesterBadge req={req} />
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  {req.isBundle && <p className="mt-2 text-xs text-ink/45">Bundle claim — treated as one request ({req.bundleItems?.join(', ')}).</p>}
                  <ItemNotifications type="request" id={req.id} />
                </div>
              )
            }}
          </Section>
        </>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.action === 'approve' ? 'Approve this request?' :
          confirmAction?.action === 'reject' ? 'Reject this request?' :
          confirmAction?.action === 'confirm' ? 'Confirm handover complete?' :
          confirmAction?.action === 'field-verification' ? 'Request field verification?' :
          confirmAction?.action === 'hand-to-hand' ? 'Choose hand-to-hand donation?' :
          confirmAction?.action === 'confirm-volunteer-handoff' ? 'Confirm handoff to the Setu employee?' :
          'Assign a Setu employee for pickup and delivery?'
        }
        description={
          confirmAction?.action === 'reject' ? 'The resource will become available for other recipients again.' :
          confirmAction?.action === 'confirm' ? 'This confirms on your side — the donation completes once the recipient also confirms.' :
          confirmAction?.action === 'field-verification' ? 'A verified Setu platform employee will visit the recipient, check their identity and need, then submit a report. You will review it before deciding whether to approve the request.' :
          confirmAction?.action === 'confirm-volunteer-handoff' ? 'Confirm only after you physically hand the item to the assigned Setu employee. Delivery completes after the employee marks delivery and the recipient confirms receipt.' :
          undefined
        }
        confirmLabel={confirmAction?.action === 'reject' ? 'Reject' : confirmAction?.action === 'field-verification' ? 'Request visit' : 'Confirm'}
        tone={confirmAction?.action === 'reject' ? 'danger' : 'default'}
        onConfirm={runAction}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardLayout>
  )
}
