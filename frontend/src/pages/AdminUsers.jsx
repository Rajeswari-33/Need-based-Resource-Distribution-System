import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { ShieldCheck, FileText, XCircle, CheckCircle2, AlertTriangle, MessageSquareText, ShieldOff, User } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const ROLE_FILTERS = ['all', 'donor', 'recipient', 'volunteer', 'center', 'admin']

function getRoleLabel(role) {
  return role === 'volunteer' ? 'Setu Field Team Employee' : role
}

const STEPS = [
  { title: '1. User submits ID proof', desc: 'From their Profile page, the user picks a document type (Aadhaar, PAN, Voter ID, etc.) and enters the document number. This sets their status to "Pending review".' },
  { title: '2. Request lands in this queue', desc: 'Every pending submission appears below with the document type and number the user provided, so you can review it before deciding.' },
  { title: '3. You approve or reject', desc: 'Approve marks the account "Verified" and unlocks full access (recipients can request resources, donors/centers gain trust badges). Reject requires a reason, which the user sees on their Profile so they can resubmit a correct document.' },
  { title: '4. User is notified', desc: 'Either decision sends an in-app notification to the user immediately, so they always know where their verification stands.' },
]

function VerificationQueue() {
  const { t } = usePreferences()
  const { users, approveVerification, rejectVerification } = useAuth()
  const { notify, centers } = useData()
  const { showToast } = useToast()
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')

  const approvedCenterIds = new Set(centers
    .filter((center) => center.approved || center.verificationStatus === 'verified')
    .map((center) => center.id))
  const pending = users.filter((user) =>
    user.verificationStatus === 'pending' &&
    (user.role !== 'center' || (user.centerId && approvedCenterIds.has(user.centerId))))

  async function handleApprove(u) {
    try {
      await approveVerification(u.id)
      notify(u.id, 'Your account was verified! You now have full access — recipients can request resources, donors and centers get a trust badge.', '/profile')
      showToast(`${u.name}'s account was verified.`, 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function handleRejectSubmit() {
    const finalReason = reason.trim() || 'Document could not be verified — please resubmit.'
    try {
      await rejectVerification(rejecting.id, finalReason)
      notify(rejecting.id, `Your verification was rejected: "${finalReason}" Please resubmit a valid document from your Profile.`, '/profile')
      showToast(`${rejecting.name}'s verification was rejected.`, 'info')
      setRejecting(null)
      setReason('')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  return (
    <div className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink"><ShieldCheck size={15} /> {t('How user verification works')}</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {STEPS.map((s) => (
          <div key={s.title} className="card p-3.5">
            <p className="text-xs font-semibold text-ink">{t(s.title)}</p>
            <p className="mt-1 text-xs text-ink/55">{t(s.desc)}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-display text-sm font-semibold text-ink">{t('Pending verification')} ({pending.length})</h3>
      {pending.length === 0 ? (
        <p className="mb-2 text-sm text-ink/50">{t('No accounts are waiting on document review right now.')}</p>
      ) : (
        <div className="card divide-y divide-ink/10">
          {pending.map((u) => (
            <div key={u.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{u.name} <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-ink/40">{t(getRoleLabel(u.role))}</span></p>
                <p className="text-xs text-ink/45">{u.email} · {u.city}</p>
                {u.role === 'center' && (
                  <p className="mt-1 text-xs font-medium text-banyan-dark">
                    {t('Coordinator identity review for')} {centers.find((center) => center.id === u.centerId)?.name || t('approved institution')}
                  </p>
                )}
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/65">
                  <FileText size={12} /> {u.verificationDoc?.docType || 'Document'}: {u.verificationDoc?.docNumber || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleApprove(u)} className="btn-accent px-2.5 py-1 text-xs"><CheckCircle2 size={13} /> {t('Approve')}</button>
                <button onClick={() => setRejecting(u)} className="btn-outline px-2.5 py-1 text-xs text-clay"><XCircle size={13} /> {t('Reject')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay"><AlertTriangle size={17} /></span>
              <div className="flex-1">
                <h2 className="font-display text-sm font-semibold text-ink">{t(`Reject ${rejecting.name}'s verification?`)}</h2>
                <textarea
                  autoFocus
                  className="input mt-2 min-h-[70px] text-sm"
                  placeholder={t('Reason (shown to the user, e.g. Document number unreadable, please resubmit)')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setRejecting(null); setReason('') }} className="btn-outline px-3.5 py-2 text-sm">{t('Cancel')}</button>
              <button onClick={handleRejectSubmit} className="rounded-md bg-clay px-3.5 py-2 text-sm font-semibold text-white hover:bg-clay/90">{t('Reject')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const REVIEW_STEPS = [
  { title: '1. Behavior monitoring flags a claim', desc: 'Repeated high-value claims, excessive cancellations, or breaching the value-based period limit automatically flags the claim (and the account) for review — nothing is blocked outright.' },
  { title: '2. Claim lands in this queue', desc: 'The recipient, resource, claimed value, and the specific reason(s) it was flagged are all shown together so you can make an informed call.' },
  { title: '3. You decide', desc: 'Approve clears the flag and sends it back to the donor as normal. Request More Info asks the recipient for extra context or documents. Restrict suspends the account and rejects this claim. Reject just rejects the claim.' },
  { title: '4. Recipient is notified', desc: 'Every decision sends an in-app notification immediately, and — for Request More Info — the recipient gets a reply box on their My Requests page that sends their answer straight back to this queue.' },
]

function FlaggedClaimsQueue() {
  const { t } = usePreferences()
  const { requests, resources, adminReviewRequest } = useData()
  const { users } = useAuth()
  const { showToast } = useToast()
  const [noteAction, setNoteAction] = useState(null) // { req, decision }
  const [note, setNote] = useState('')

  const openFlags = requests
    .filter((r) => r.flagged && !['rejected', 'cancelled'].includes(r.status) && r.adminDecision !== 'approved')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  function handleApprove(req) {
    adminReviewRequest(req.id, 'approve')
    showToast('Claim cleared — back with the donor for a normal decision.', 'success')
  }

  function openNoteDialog(req, decision) {
    setNote('')
    setNoteAction({ req, decision })
  }

  function submitNoteAction() {
    const { req, decision } = noteAction
    adminReviewRequest(req.id, decision, note.trim())
    showToast(
      decision === 'info_requested' ? 'Requested more information from the recipient.' :
      decision === 'restrict' ? 'Account restricted and claim rejected.' :
      'Claim rejected.',
      decision === 'restrict' ? 'info' : decision === 'info_requested' ? 'info' : 'success'
    )
    setNoteAction(null)
    setNote('')
  }

  if (openFlags.length === 0) return null

  return (
    <div className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-clay"><AlertTriangle size={15} /> {t('Flagged claims — behavior review')}</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {REVIEW_STEPS.map((s) => (
          <div key={s.title} className="card p-3.5">
            <p className="text-xs font-semibold text-ink">{t(s.title)}</p>
            <p className="mt-1 text-xs text-ink/55">{t(s.desc)}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-display text-sm font-semibold text-ink">{t('Awaiting decision')} ({openFlags.length})</h3>
      <div className="space-y-3">
        {openFlags.map((req) => {
          const resource = resources.find((r) => r.id === req.resourceId)
          const recipient = users.find((u) => u.id === req.recipientId)
          return (
            <div key={req.id} className="card border-clay/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-dim text-xl">{resource?.photo}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{resource?.title}</p>
                    <p className="flex items-center gap-1 text-xs text-ink/45"><User size={11} /> {recipient?.name} · {recipient?.city} · ₹{req.value?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {req.adminDecision === 'info_requested' && <span className="badge bg-marigold/20 text-marigold-dark">{t('Awaiting recipient\'s reply')}</span>}
              </div>

              <p className="mt-2.5 flex items-start gap-1.5 text-xs text-clay"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {req.flagReasons?.map((flagReason) => t(flagReason)).join('; ')}</p>
              <p className="mt-1.5 text-xs text-ink/60">"{req.reason}" — {t('for')} {req.beneficiary}, {t('urgency')} {t(req.urgency)}{req.supportingDoc ? ` · ${t('doc')}: ${req.supportingDoc}` : ''}</p>
              {req.additionalInfo && (
                <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-paper-dim px-3 py-2 text-xs text-ink/70"><MessageSquareText size={12} className="mt-0.5 shrink-0" /> {t('Recipient\'s reply')}: "{req.additionalInfo}"</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
                <button onClick={() => handleApprove(req)} className="btn-accent px-2.5 py-1 text-xs"><CheckCircle2 size={13} /> {t('Approve')}</button>
                <button onClick={() => openNoteDialog(req, 'info_requested')} className="btn-outline px-2.5 py-1 text-xs"><MessageSquareText size={13} /> {t('Request more info')}</button>
                <button onClick={() => openNoteDialog(req, 'restrict')} className="btn-outline px-2.5 py-1 text-xs text-clay"><ShieldOff size={13} /> {t('Restrict account')}</button>
                <button onClick={() => openNoteDialog(req, 'reject')} className="btn-outline px-2.5 py-1 text-xs text-clay"><XCircle size={13} /> {t('Reject claim')}</button>
              </div>
            </div>
          )
        })}
      </div>

      {noteAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay"><AlertTriangle size={17} /></span>
              <div className="flex-1">
                <h2 className="font-display text-sm font-semibold text-ink">
                  {t(noteAction.decision === 'info_requested' ? 'Request more information?' : noteAction.decision === 'restrict' ? 'Restrict this account?' : 'Reject this claim?')}
                </h2>
                <p className="mt-1 text-xs text-ink/55">
                  {t(noteAction.decision === 'info_requested' ? 'The recipient will see this note and can reply from My Requests.' :
                   noteAction.decision === 'restrict' ? 'This suspends the account and rejects the claim, freeing the resource for others.' :
                   'The resource becomes available for other recipients again.')}
                </p>
                <textarea
                  autoFocus
                  className="input mt-2 min-h-[70px] text-sm"
                  placeholder={t(noteAction.decision === 'info_requested' ? 'e.g. Please share proof of the beneficiary\'s needs' : 'Reason (shown to the recipient)')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setNoteAction(null)} className="btn-outline px-3.5 py-2 text-sm">{t('Cancel')}</button>
              <button
                onClick={submitNoteAction}
                className={`rounded-md px-3.5 py-2 text-sm font-semibold text-white ${noteAction.decision === 'info_requested' ? 'bg-marigold-dark hover:bg-marigold-dark/90' : 'bg-clay hover:bg-clay/90'}`}
              >
                {t(noteAction.decision === 'info_requested' ? 'Send request' : noteAction.decision === 'restrict' ? 'Restrict & reject' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminUsers() {
  const { t } = usePreferences()
  const { users, updateUser } = useAuth()
  const { showToast } = useToast()
  const [filter, setFilter] = useState('all')
  const [confirmUser, setConfirmUser] = useState(null)

  const filtered = filter === 'all' ? users : users.filter((u) => u.role === filter)

  function handleToggleRestrict() {
    const restricted = !confirmUser.restricted
    updateUser(confirmUser.id, { restricted })
    showToast(restricted ? `${confirmUser.name}'s account was restricted.` : `${confirmUser.name}'s account was reinstated.`, restricted ? 'info' : 'success')
    setConfirmUser(null)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Manage users')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('All accounts across every role, plus the identity-verification queue.')}</p>
      </div>

      <FlaggedClaimsQueue />

      <VerificationQueue />

      <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('All accounts')}</h2>
      <div className="mb-5 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${filter === r ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/60 hover:border-ink/40'}`}
          >
            {t(r === 'all' ? 'Everyone' : getRoleLabel(r))}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ink/10">
        {filtered.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-ink">{u.name} <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-ink/40">{t(getRoleLabel(u.role))}</span></p>
              <p className="text-xs text-ink/45">{u.email} · {u.city}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={u.verified ? 'verified' : (u.verificationStatus || 'unverified')}>
                {t(u.verified ? 'Verified' : u.verificationStatus === 'pending' ? 'Pending review' : u.verificationStatus === 'rejected' ? 'Rejected' : 'Unverified')}
              </StatusBadge>
              {u.flaggedForReview && <span className="badge bg-clay/10 text-clay">{t('Flagged')}</span>}
              {u.restricted ? (
                <>
                  <span className="badge bg-clay/10 text-clay">{t('Restricted')}</span>
                  <button onClick={() => setConfirmUser(u)} className="btn-outline px-2.5 py-1 text-xs">{t('Lift')}</button>
                </>
              ) : (
                <button onClick={() => setConfirmUser(u)} className="btn-outline px-2.5 py-1 text-xs">{t('Restrict')}</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmUser}
        title={t(confirmUser?.restricted ? `Lift restriction on ${confirmUser?.name}?` : `Restrict ${confirmUser?.name}'s account?`)}
        description={!confirmUser?.restricted ? t('They will be unable to post, request, or accept tasks until reinstated.') : undefined}
        confirmLabel={t(confirmUser?.restricted ? 'Lift restriction' : 'Restrict')}
        tone={confirmUser?.restricted ? 'default' : 'danger'}
        onConfirm={handleToggleRestrict}
        onCancel={() => setConfirmUser(null)}
      />
    </DashboardLayout>
  )
}
