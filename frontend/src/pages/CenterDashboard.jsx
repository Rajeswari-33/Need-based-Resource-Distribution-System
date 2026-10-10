import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ItemNotifications from '../components/ItemNotifications.jsx'
import { MapPin, Clock, Truck, PackageCheck, Search, Home, User, Phone, CheckCircle2, XCircle, Layers } from 'lucide-react'
import { getGreeting } from '../utils/greeting.js'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function CenterDashboard() {
  const { t, itemName } = usePreferences()
  const { currentUser } = useAuth()
  const { centers, resources, users, tasks, confirmCenterReceipt, confirmTaskDelivery, acceptIncomingDonation, rejectIncomingDonation } = useData()
  const { showToast } = useToast()
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')

  const center = centers.find((c) => c.id === currentUser.centerId)
  const incoming = center ? resources.filter((r) => r.centerId === center.id) : []
  // Setu field-team assignments delivering to THIS center and awaiting confirmation.
  const deliveriesToConfirm = center ? tasks.filter((t) => t.centerId === center.id && t.status === 'delivered') : []

  if (!center) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <p className="text-ink/60">{t('Register your institution to begin the two-step verification process.')}</p>
          <Link to="/center/profile" className="btn-accent mt-5 inline-flex">{t('Register institution')}</Link>
        </div>
      </DashboardLayout>
    )
  }

  function handleConfirmReceipt(res) {
    confirmCenterReceipt(res.id)
    showToast(`Marked "${res.title}" as received. Donation complete.`, 'success')
  }

  function handleAccept(res) {
    acceptIncomingDonation(res.id)
    showToast(`Accepted "${res.title}" — coordinate delivery with the donor.`, 'success')
  }

  function handleRejectSubmit() {
    rejectIncomingDonation(rejecting.id, reason.trim())
    showToast(`Declined "${rejecting.title}" — it's now open to any registered center.`, 'info')
    setRejecting(null)
    setReason('')
  }

  async function handleConfirmDelivery(task) {
    const result = await confirmTaskDelivery(task.id)
    showToast(result.ok ? 'Delivery confirmed — the donation and Setu employee assignment are complete.' : result.error, result.ok ? 'success' : 'error')
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <p className="mb-1 text-sm font-medium text-ink/50">{t(getGreeting())}, {currentUser.name.split(' ')[0]}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{center.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink/45"><Home size={12} /> {t(center.centerType || 'Recipient center')} — {t('a recipient institution, not a distribution depot')}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/55">
          <span className="flex items-center gap-1.5"><MapPin size={14} /> {center.address ? `${center.address}, ` : ''}{center.location}</span>
          <span className="flex items-center gap-1.5"><Clock size={14} /> {center.hours}</span>
          <StatusBadge status={center.approved ? 'verified' : (center.verificationStatus || 'unverified')}>{t(center.approved ? 'Verified' : center.verificationStatus === 'pending' ? 'Pending review' : center.verificationStatus === 'rejected' ? 'Rejected' : 'Unverified')}</StatusBadge>
        </p>
        {!center.approved && (
          <p className="mt-2 text-xs text-marigold-dark">
            {t('Your center isn\'t verified yet, so you can\'t claim donations posted for centers.')} <Link to="/center/profile" className="font-semibold underline">{t('Submit your registration document')}</Link>.
          </p>
        )}
        <Link to="/browse" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-banyan-dark hover:underline">
          <Search size={13} /> {t('Browse donations open to registered centers')}
        </Link>
      </div>

      {deliveriesToConfirm.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-marigold-dark"><Truck size={15} /> {t('Deliveries awaiting your confirmation')}</h2>
          <div className="space-y-3">
            {deliveriesToConfirm.map((taskItem) => {
              const res = resources.find((r) => r.id === taskItem.resourceId)
              return (
                <div key={taskItem.id} className="card border-marigold/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-dim text-xl">{res?.photo}</span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{itemName(res?.title, res?.titleTamil)}</p>
                        <p className="text-xs text-ink/45">{t('A Setu platform employee marked this as delivered — confirm only once it\'s physically in hand.')}</p>
                      </div>
                    </div>
                    <button onClick={() => handleConfirmDelivery(taskItem)} className="btn-accent px-3 py-1.5 text-xs"><PackageCheck size={13} /> {t('Confirm delivery received')}</button>
                  </div>
                  <ItemNotifications type={taskItem.requestId ? 'request' : 'task'} id={taskItem.requestId || taskItem.id} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('Incoming donations')}</h2>
      <p className="mb-4 -mt-2 text-xs text-ink/45">{t('A donor sent these directly to your institution. You can see exactly who from, and choose to accept or decline before any delivery is arranged.')}</p>
      {incoming.length === 0 ? (
        <EmptyState icon="📦" title={t('No donations routed here yet')} description={t('Donations a donor directs specifically to your institution will appear here automatically.')} />
      ) : (
        <div className="space-y-3">
          {incoming.map((res) => {
            const donor = users.find((u) => u.id === res.donorId)
            return (
              <div key={res.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-paper-dim text-2xl">{res.photo}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{res.title}</p>
                      <p className="text-xs text-ink/45">{t(res.category)} · {t('Qty')} {res.quantity}</p>
                      {res.isBundle && res.bundleItems?.length > 0 && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/50"><Layers size={12} /> {t('Bundle')}: {res.bundleItems.join(', ')}</p>
                      )}
                      <p className="mt-1.5 flex items-center gap-3 text-xs text-ink/55">
                        <span className="flex items-center gap-1"><User size={12} /> {donor?.name || t('A donor')}</span>
                        {donor?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {donor.phone}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={res.status}>{res.status === 'completed' ? t('Donated') : undefined}</StatusBadge>
                  </div>
                </div>

                <div className="mt-3 border-t border-ink/10 pt-3">
                  {res.status === 'completed' ? (
                    <span className="text-xs font-semibold text-banyan-dark">{t('Received ✓ — donation complete')}</span>
                  ) : res.centerDecision === 'pending' ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-marigold-dark">{t('Awaiting your decision')}</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(res)} className="btn-accent px-3 py-1.5 text-xs"><CheckCircle2 size={13} /> {t('Accept')}</button>
                        <button onClick={() => setRejecting(res)} className="btn-outline px-3 py-1.5 text-xs text-clay"><XCircle size={13} /> {t('Decline')}</button>
                      </div>
                    </div>
                  ) : res.centerDecision === 'accepted' && !res.centerReceived ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-banyan-dark">{t('Accepted — coordinate delivery with the donor')}</span>
                      <button onClick={() => handleConfirmReceipt(res)} className="btn-outline px-3 py-1.5 text-xs">{t('Confirm received')}</button>
                    </div>
                  ) : null}
                </div>
                <ItemNotifications type="resource" id={res.id} />
              </div>
            )
          })}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-card">
            <h2 className="font-display text-sm font-semibold text-ink">{t(`Decline "${rejecting.title}"?`)}</h2>
            <p className="mt-1.5 text-xs text-ink/50">{t('The donor is notified, and this reopens automatically for any other registered center to claim — you don\'t need to do anything else.')}</p>
            <textarea
              autoFocus
              className="input mt-3 min-h-[70px] text-sm"
              placeholder={t('Reason (optional) — e.g. We do not currently have space for this category')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setRejecting(null); setReason('') }} className="btn-outline px-3.5 py-2 text-sm">{t('Cancel')}</button>
              <button onClick={handleRejectSubmit} className="rounded-md bg-clay px-3.5 py-2 text-sm font-semibold text-white hover:bg-clay/90">{t('Decline donation')}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
