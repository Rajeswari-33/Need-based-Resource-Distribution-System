import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  MapPin, Layers, IndianRupee, ArrowLeft, ShieldAlert, CheckCircle2, User, ShieldCheck,
  FileText, HandHeart, AlertTriangle,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import DocUploadField from '../components/DocUploadField.jsx'
import ClaimActivityTracker from '../components/ClaimActivityTracker.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function ResourceDetail() {
  const { t, itemName } = usePreferences()
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    resources, centers, users, submitRequest, canRequest, activeRequestCount,
    valueClaimedInPeriod, getAvailability, MAX_ACTIVE_REQUESTS, HIGH_VALUE_THRESHOLD, VALUE_LIMIT_AMOUNT, VALUE_LIMIT_PERIOD_DAYS,
  } = useData()
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const resource = resources.find((r) => r.id === id)

  // `claiming` gates whether the request/claim form is shown at all — the recipient must
  // explicitly click "Claim this donation" after reviewing the item and donor details first.
  const [claiming, setClaiming] = useState(false)
  const [form, setForm] = useState({ reason: '', beneficiary: '', quantity: 1, urgency: 'Medium', supportingDoc: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [wasFlagged, setWasFlagged] = useState(false)

  if (!resource) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <p className="text-ink/60">{t('This resource could not be found.')}</p>
          <Link to="/browse" className="btn-outline mt-4 inline-flex">{t('Back to browse')}</Link>
        </div>
      </DashboardLayout>
    )
  }

  const donor = users.find((u) => u.id === resource.donorId)
  const center = resource.centerId ? centers.find((c) => c.id === resource.centerId) : null
  const myCenter = currentUser?.role === 'center'
    ? centers.find((c) => c.id === currentUser.centerId) || centers.find((c) => c.coordinatorId === currentUser.id)
    : null
  const avail = getAvailability(resource.id)
  const isHighValue = (resource.value || 0) >= HIGH_VALUE_THRESHOLD
  const isOwnResource = currentUser && currentUser.id === resource.donorId
  const periodValue = currentUser ? valueClaimedInPeriod(currentUser.id) : 0
  const projectedPeriodValue = periodValue + (resource.value || 0)
  const overValueLimit = projectedPeriodValue > VALUE_LIMIT_AMOUNT

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!currentUser) { navigate('/login'); return }
    if (!form.reason.trim() || !form.beneficiary.trim()) {
      setError(t('Please explain why you need this and who it is for.'))
      return
    }
    const result = submitRequest({
      resourceId: resource.id,
      recipientId: currentUser.id,
      reason: form.reason,
      beneficiary: form.beneficiary,
      quantity: Number(form.quantity) || 1,
      urgency: form.urgency,
      supportingDoc: form.supportingDoc || null,
    })
    if (!result.ok) { setError(result.error); return }
    setSuccess(true)
    setWasFlagged(!!result.flagged)
    showToast(result.flagged ? 'Claim submitted — sent for an extra verification step.' : 'Claim submitted successfully.', result.flagged ? 'info' : 'success')
  }

  return (
    <DashboardLayout>
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink">
        <ArrowLeft size={15} /> {t('Back')}
      </button>

      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="card flex h-56 items-center justify-center bg-paper-dim text-8xl">{resource.photo}</div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center gap-2 text-ink/60"><MapPin size={14} /> {resource.location}</p>
            {resource.isBundle && (
              <p className="flex items-center gap-2 text-ink/60">
                <Layers size={14} /> {t('Bundle of')} {resource.quantity} · {resource.bundleItems?.map((item) => itemName(item)).join(', ')}
              </p>
            )}
              <p className="flex items-center gap-2 text-ink/60"><IndianRupee size={14} /> {t('Estimated value')} ₹{resource.value?.toLocaleString('en-IN')}</p>
            {!resource.isBundle && (resource.quantity || 1) > 1 && (
              <p className="flex items-center gap-2 font-medium text-ink/70"><Layers size={14} /> {avail.remaining} {t('of')} {avail.total} {t('still available')}</p>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{itemName(resource.title, resource.titleTamil)}</h1>
            <StatusBadge status={resource.status}>{resource.status === 'completed' ? 'Donated' : undefined}</StatusBadge>
          </div>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink/45">{t(resource.category)} · {t(resource.condition)}</p>
          {resource.description && <p className="mt-3 text-sm leading-relaxed text-ink/70">{resource.description}</p>}

          {/* ---- Donor details — visible before any claim step, so the recipient can review
               who they'd be claiming from before committing. ---- */}
          <div className="mt-4 rounded-md border border-ink/10 bg-paper-dim px-4 py-3.5 text-sm">
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">{t('Donor details')}</p>
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <User size={13} /> {donor ? donor.name : t('A donor')}
              {donor?.verified && <span className="flex items-center gap-1 text-xs font-medium text-banyan-dark"><ShieldCheck size={13} /> {t('Verified')}</span>}
            </p>
            {donor?.address && <p className="mt-1 text-ink/55">{donor.address}{donor?.city ? `, ${donor.city}` : ''}</p>}
            {!donor?.address && donor?.city && <p className="mt-1 text-ink/55">{donor.city}</p>}
            <div className="mt-2.5 border-t border-ink/10 pt-2.5">
              <p className="font-semibold text-ink/80">
                {resource.audience === 'center'
                  ? (resource.centerScope === 'specific' ? t('Sent directly to one registered center') : t('Open to any registered recipient center'))
                  : t('For individual recipients')}
              </p>
              {center && <p className="mt-0.5 text-ink/55">{center.name} ({center.centerType}) — {center.address ? `${center.address}, ` : ''}{center.location}</p>}
              {resource.audience !== 'center' && <p className="mt-0.5 text-ink/45">{t('Full contact details (phone, email, address) are shared once your claim is approved.')}</p>}
            </div>
          </div>

          {isHighValue && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-marigold/40 bg-marigold/10 px-4 py-3 text-sm text-marigold-dark">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>{t(`This is a high-value resource (≥ ₹${HIGH_VALUE_THRESHOLD.toLocaleString('en-IN')}). A supporting document will be required with your claim.`)}</span>
            </div>
          )}

          <div className="mt-6 border-t border-ink/10 pt-6">
            {isOwnResource ? (
              <p className="text-sm text-ink/55">{t('This is your own posted resource.')} <Link to="/donor/donations" className="font-semibold text-banyan-dark hover:underline">{t('Manage it from My Donations.')}</Link></p>
            ) : resource.method === 'center' ? (
              <div className="rounded-md bg-ink/5 px-4 py-3.5 text-sm text-ink/60">
                {t(`The donor sent this directly to ${center ? center.name : 'a registered center'} — it's not claimable through a request by anyone, individual or center.`)} {center && currentUser?.role === 'center' && currentUser.centerId === center.id ? <>{t("It's already listed under")} <Link to="/center" className="font-semibold underline">{t('your Incoming Donations')}</Link> — {t('just confirm receipt there.')}</> : t('The chosen center just needs to confirm receipt from its own dashboard.')}
              </div>
            ) : resource.audience === 'individual' && currentUser?.role === 'center' ? (
              <div className="rounded-md bg-ink/5 px-4 py-3.5 text-sm text-ink/60">
                {t('This donation was posted for individual recipients only. As a registered center, you can\'t claim it — look for items marked "For registered centers only" instead.')}
              </div>
            ) : resource.audience === 'center' && currentUser?.role === 'recipient' ? (
              <div className="rounded-md bg-ink/5 px-4 py-3.5 text-sm text-ink/60">
                {t('This donation was posted for registered recipient centers only (orphanages, old-age homes, NGOs, etc.) — it isn\'t open to individual recipients.')}
              </div>
            ) : resource.status !== 'available' ? (
              <div className="rounded-md bg-ink/5 px-4 py-3.5 text-sm text-ink/60">
                {resource.status === 'completed'
                  ? t('This item has already been donated to another recipient and is no longer available.')
                  : t(`This resource is currently ${resource.status} and isn't accepting new claims.`)}
              </div>
            ) : !currentUser ? (
              <div className="card p-5 text-center">
                <p className="text-sm text-ink/60">{t('Log in as a recipient to claim this resource.')}</p>
                <Link to="/login" className="btn-accent mt-4 inline-flex">{t('Log in to claim')}</Link>
              </div>
            ) : !['recipient', 'center'].includes(currentUser.role) ? (
              <p className="text-sm text-ink/55">{t('Only recipient or center coordinator accounts can claim resources.')}</p>
            ) : currentUser.restricted ? (
              <div className="flex items-start gap-2.5 rounded-md border border-clay/30 bg-clay/10 px-4 py-3.5 text-sm text-clay">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <span>{t('Your account is currently restricted. Contact support to resolve this before claiming resources.')}</span>
              </div>
            ) : currentUser.role === 'center' && !myCenter ? (
              <div className="rounded-md border border-marigold/40 bg-marigold/10 px-4 py-3.5 text-sm text-marigold-dark">
                {t('Register your institution and submit its registration document before requesting resources.')}
                {' '}<Link to="/center/profile" className="font-semibold underline">{t('Register institution')}</Link>
              </div>
            ) : currentUser.role === 'center' && !myCenter.approved ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-md border border-marigold/40 bg-marigold/10 px-4 py-3.5 text-sm text-marigold-dark">
                  <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                  <span>
                    {t(`Step 1 of 2 isn't done: ${myCenter.verificationStatus === 'pending'
                      ? `${myCenter.name}'s registration document is submitted and awaiting admin review.`
                      : myCenter.verificationStatus === 'rejected'
                      ? `${myCenter.name}'s last verification submission was rejected${myCenter.verificationNote ? `: "${myCenter.verificationNote}"` : ''}. Please resubmit a valid registration document.`
                      : `${myCenter.name} needs its registration document verified first.`}`)}
                    {' '}<Link to="/center/profile" className="font-semibold underline">{t('Go to Center Profile')}</Link>
                  </span>
                </div>
                <div className="rounded-md border border-ink/10 p-4 text-xs text-ink/60">
                  <p className="mb-2 flex items-center gap-1.5 font-semibold text-ink/70"><FileText size={13} /> {t('Center verification is two steps, back to back')}</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>{t('Step 1: submit your institution\'s registration document (trust/society/NGO registration) from Center Profile.')}</li>
                    <li>{t('Step 2 (unlocks after Step 1 is approved): submit your own proof of affiliation with the institution.')}</li>
                    <li>{t('Both must be approved before you can claim or request resources.')}</li>
                  </ol>
                </div>
              </div>
            ) : currentUser.role === 'center' && currentUser.verificationStatus !== 'verified' ? (
              <div className="flex items-start gap-2.5 rounded-md border border-marigold/40 bg-marigold/10 px-4 py-3.5 text-sm text-marigold-dark">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <span>
                  {t(`Step 1 is done — Step 2 of 2 isn't yet: ${currentUser.verificationStatus === 'pending'
                    ? 'your coordinator affiliation document is submitted and awaiting admin review.'
                    : currentUser.verificationStatus === 'rejected'
                    ? `your last submission was rejected${currentUser.verificationNote ? `: "${currentUser.verificationNote}"` : ''}. Please resubmit.`
                    : 'you still need to submit proof that you personally are authorized to represent this institution.'}`)}
                  {' '}<Link to="/center/profile" className="font-semibold underline">{t('Go to Center Profile')}</Link>
                </span>
              </div>
            ) : currentUser.role !== 'center' && currentUser.verificationStatus !== 'verified' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-md border border-marigold/40 bg-marigold/10 px-4 py-3.5 text-sm text-marigold-dark">
                  <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                  <span>
                    {currentUser.verificationStatus === 'pending'
                      ? t('Your ID document is submitted and awaiting admin review. You can claim resources once verified.')
                      : currentUser.verificationStatus === 'rejected'
                      ? t(`Your last verification submission was rejected${currentUser.verificationNote ? `: "${currentUser.verificationNote}"` : ''}. Please resubmit a valid document.`)
                      : t('You need to verify your account before you can claim resources.')}
                    {' '}<Link to="/profile" className="font-semibold underline">{t('Go to Profile')}</Link>
                  </span>
                </div>
                <div className="rounded-md border border-ink/10 p-4 text-xs text-ink/60">
                  <p className="mb-2 flex items-center gap-1.5 font-semibold text-ink/70"><FileText size={13} /> {t('How verification works')}</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>{t('Submit an ID document (Aadhaar, Ration Card, etc.) from your Profile page.')}</li>
                    <li>{t('An admin reviews it — this usually shows as "Pending review" in the meantime.')}</li>
                    <li>{t('You\'ll get a notification once it\'s approved or rejected. Approved unlocks claiming; rejected shows a reason so you can resubmit.')}</li>
                  </ol>
                </div>
              </div>
            ) : success ? (
              <div className={`flex items-start gap-2.5 rounded-md border px-4 py-3.5 text-sm ${wasFlagged ? 'border-marigold/40 bg-marigold/10 text-marigold-dark' : 'border-banyan/30 bg-banyan/10 text-banyan-dark'}`}>
                {wasFlagged ? <ShieldAlert size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
                <span>
                  {wasFlagged
                    ? t('Claim submitted, but it needs an extra verification step before it reaches the donor. An admin will review it and you\'ll be notified either way.')
                    : t('Claim submitted. You can track its status from ')}
                  {!wasFlagged && <Link to="/recipient/requests" className="font-semibold underline">{t('My Requests')}</Link>}
                  {wasFlagged && <> {t('Track it from')} <Link to="/recipient/requests" className="font-semibold underline">{t('My Requests')}</Link>.</>}
                </span>
              </div>
            ) : !claiming ? (
              <div className="card space-y-3 p-5">
                <ClaimActivityTracker compact />
                <p className="text-sm text-ink/65">
                  {currentUser.role === 'center'
                    ? t(`Reviewed the item and donor details above? Submit a claim on behalf of ${myCenter?.name} — it goes through a short verification step before it reaches the donor.`)
                    : t('Reviewed the item and donor details above? Claim this donation to submit a need-based request — it goes through a short verification step before it reaches the donor.')}
                </p>
                <button
                  onClick={() => canRequest(currentUser.id) ? setClaiming(true) : setError(t(`You have reached the maximum of ${MAX_ACTIVE_REQUESTS} requests in the last ${VALUE_LIMIT_PERIOD_DAYS} days. Complete or cancel one, or wait for the window to roll over, before claiming again.`))}
                  className="btn-accent w-full"
                >
                  <HandHeart size={15} /> {t(currentUser.role === 'center' ? 'Claim for your center' : 'Claim this donation')}
                </button>
                {error && <p className="text-sm text-clay">{t(error)}</p>}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card space-y-4 p-5">
                <h2 className="font-display text-sm font-semibold text-ink">
                  {t(currentUser.role === 'center' ? "Center's claim request" : 'Claim request & verification')}
                </h2>
                {currentUser.role === 'center' && (
                  <p className="text-xs text-ink/50">{t(`This claim is made on behalf of ${myCenter?.name} as an institution — not for you personally.`)}</p>
                )}
                <ClaimActivityTracker compact />
                {resource.isBundle && (
                  <p className="flex items-center gap-1.5 rounded-md bg-ink/5 px-3 py-2 text-xs text-ink/60">
                    <Layers size={13} /> {t(`This is a bundle — it counts as one request, tracked internally as ${resource.quantity} item(s) / ₹${resource.value?.toLocaleString('en-IN')} total.`)}
                  </p>
                )}
                {overValueLimit && (
                  <p className="flex items-start gap-1.5 rounded-md border border-marigold/40 bg-marigold/10 px-3 py-2 text-xs text-marigold-dark">
                    <ShieldAlert size={13} className="mt-0.5 shrink-0" /> {t(`This claim would put you over the ₹${VALUE_LIMIT_AMOUNT.toLocaleString('en-IN')} / ${VALUE_LIMIT_PERIOD_DAYS}-day limit. Attach a supporting document below — it will be sent to admin review instead of being blocked outright.`)}
                  </p>
                )}
                <div>
                  <label className="label" htmlFor="reason">{t(currentUser.role === 'center' ? 'Why does your center need this?' : 'Why do you need this?')}</label>
                  <textarea id="reason" className="input min-h-[80px]" value={form.reason} onChange={(e) => handleChange('reason', e.target.value)} placeholder={t(currentUser.role === 'center' ? 'Briefly explain how this will be used for your residents/beneficiaries…' : 'Briefly explain your situation…')} />
                </div>
                <div>
                  <label className="label" htmlFor="beneficiary">{t(currentUser.role === 'center' ? 'Which residents / beneficiaries is this for?' : 'Who is it for?')}</label>
                  <input id="beneficiary" className="input" value={form.beneficiary} onChange={(e) => handleChange('beneficiary', e.target.value)} placeholder={currentUser.role === 'center' ? 'e.g. Children currently in our care (ages 6–12)' : 'e.g. My son, age 9'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="quantity">{t('Quantity needed')}{!resource.isBundle && (resource.quantity || 1) > 1 ? ` (${t('max')} ${avail.remaining})` : ''}</label>
                    <input
                      id="quantity" type="number" min="1" max={resource.isBundle ? undefined : avail.remaining} className="input"
                      value={resource.isBundle ? resource.quantity : form.quantity}
                      disabled={resource.isBundle}
                      onChange={(e) => handleChange('quantity', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="urgency">{t('Urgency')}</label>
                    <select id="urgency" className="input" value={form.urgency} onChange={(e) => handleChange('urgency', e.target.value)}>
                      <option value="Low">{t('Low')}</option>
                      <option value="Medium">{t('Medium')}</option>
                      <option value="High">{t('High')}</option>
                    </select>
                  </div>
                </div>
                {/* Proof / supporting document — always available here (not just for high-value
                    claims) so recipients and center coordinators both know exactly where to
                    attach it while claiming, instead of hunting for it only when required. */}
                <div>
                  <label className="label">
                    {t('Supporting document')}{t((isHighValue || overValueLimit) ? ' (required)' : ' (optional)')}
                  </label>
                  <DocUploadField
                    id="doc"
                    label={t('supporting document')}
                    value={form.supportingDoc}
                    onChange={(v) => handleChange('supportingDoc', v)}
                    placeholder={t('e.g. income_certificate.pdf')}
                    hint={t((isHighValue || overValueLimit)
                      ? 'Required for this claim — reference proof of need (ID, income certificate, etc.) before submitting.'
                      : 'Optional here, but referencing proof of need speeds up donor and admin approval.')}
                  />
                </div>
                {error && <p className="text-sm text-clay">{t(error)}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setClaiming(false)} className="btn-outline flex-1">{t('Back')}</button>
                  <button type="submit" className="btn-accent flex-1">{t('Submit claim')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
