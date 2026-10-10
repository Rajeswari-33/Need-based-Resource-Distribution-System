import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import DocUploadField from '../components/DocUploadField.jsx'
import ClaimActivityTracker from '../components/ClaimActivityTracker.jsx'
import { ShieldAlert, FileText, CheckCircle2, HandHeart } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function RequestResource() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const {
    categories, submitNeedRequest, canRequest, activeRequestCount,
    MAX_ACTIVE_REQUESTS, VALUE_LIMIT_PERIOD_DAYS, centers,
  } = useData()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const myCenter = currentUser.role === 'center'
    ? centers.find((c) => c.id === currentUser.centerId) || centers.find((c) => c.coordinatorId === currentUser.id)
    : null

  const [form, setForm] = useState({
    title: '', category: categories[0] || '', reason: '', beneficiary: '',
    quantity: 1, urgency: 'Medium', supportingDoc: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim() || !form.reason.trim() || !form.beneficiary.trim()) {
      setError(t('Please fill in the item, why you need it, and who it is for.'))
      return
    }
    if (!canRequest(currentUser.id)) {
      setError(t(`You have reached the maximum of ${MAX_ACTIVE_REQUESTS} requests in the last ${VALUE_LIMIT_PERIOD_DAYS} days. Complete or cancel one, or wait for the window to roll over, before requesting again.`))
      return
    }
    const result = submitNeedRequest({
      recipientId: currentUser.id,
      title: form.title.trim(),
      category: form.category,
      reason: form.reason,
      beneficiary: form.beneficiary,
      quantity: Number(form.quantity) || 1,
      urgency: form.urgency,
      supportingDoc: form.supportingDoc || null,
    })
    if (!result.ok) { setError(result.error); return }
    setSuccess(true)
    showToast('Request submitted.', 'success')
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Request a resource')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          {t('Don\'t see what you need on Browse Donations? Describe it here — it\'s tracked in Active Requests until a matching donation is found, same as claiming a listed item.')}
        </p>

        <div className="mt-6">
          {currentUser.restricted ? (
            <div className="flex items-start gap-2.5 rounded-md border border-clay/30 bg-clay/10 px-4 py-3.5 text-sm text-clay">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <span>{t('Your account is currently restricted. Contact support to resolve this before requesting resources.')}</span>
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
                  <li>{t('Step 1: submit your institution\'s registration document from Center Profile.')}</li>
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
                    ? t('Your ID document is submitted and awaiting admin review. You can request resources once verified.')
                    : currentUser.verificationStatus === 'rejected'
                    ? t(`Your last verification submission was rejected${currentUser.verificationNote ? `: "${currentUser.verificationNote}"` : ''}. Please resubmit a valid document.`)
                    : t('You need to verify your account before you can request resources.')}
                  {' '}<Link to="/profile" className="font-semibold underline">{t('Go to Profile')}</Link>
                </span>
              </div>
              <div className="rounded-md border border-ink/10 p-4 text-xs text-ink/60">
                <p className="mb-2 flex items-center gap-1.5 font-semibold text-ink/70"><FileText size={13} /> {t('How verification works')}</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>{t('Open Profile from the menu (or the icon with your name, top right).')}</li>
                  <li>{t('Under "Account verification", pick a document type (Aadhaar, Ration Card, etc.), enter its number, then submit.')}</li>
                  <li>{t('An admin reviews it — this usually shows as "Pending review" in the meantime.')}</li>
                  <li>{t('You\'ll get a notification once it\'s approved or rejected. Approved unlocks requesting; rejected shows a reason so you can resubmit.')}</li>
                </ol>
              </div>
            </div>
          ) : success ? (
            <div className="flex items-start gap-2.5 rounded-md border border-banyan/30 bg-banyan/10 px-4 py-3.5 text-sm text-banyan-dark">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>
                {t('Request submitted. Track it from')} <Link to="/recipient/active" className="font-semibold underline">{t('Active Requests')}</Link>, {t('or')}{' '}
                <button onClick={() => { setSuccess(false); setForm({ title: '', category: categories[0] || '', reason: '', beneficiary: '', quantity: 1, urgency: 'Medium', supportingDoc: '' }) }} className="font-semibold underline">
                  {t('submit another')}
                </button>.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-4 p-5">
              {currentUser.role === 'center' && (
                <p className="text-xs text-ink/50">{t(`This request is made on behalf of ${myCenter?.name} as an institution — not for you personally.`)}</p>
              )}
              <ClaimActivityTracker compact />
              <div>
                <label className="label" htmlFor="title">{t('What item do you need?')}</label>
                <input id="title" className="input" value={form.title} onChange={(e) => handleChange('title', e.target.value)} placeholder={t('e.g. Boys school uniform, age 10–12')} />
              </div>
              <div>
                <label className="label" htmlFor="category">{t('Category')}</label>
                <select id="category" className="input" value={form.category} onChange={(e) => handleChange('category', e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{t(c)}</option>)}
                </select>
              </div>
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
                  <label className="label" htmlFor="quantity">{t('Quantity needed')}</label>
                  <input id="quantity" type="number" min="1" className="input" value={form.quantity} onChange={(e) => handleChange('quantity', e.target.value)} />
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
              <div>
                <label className="label">{t('Supporting document (optional)')}</label>
                <DocUploadField
                  id="doc"
                  label={t('supporting document')}
                  value={form.supportingDoc}
                  onChange={(v) => handleChange('supportingDoc', v)}
                  placeholder={t('e.g. income_certificate.pdf')}
                  hint={t('Optional, but referencing proof of need speeds up admin review.')}
                />
              </div>
              {error && <p className="text-sm text-clay">{t(error)}</p>}
              <button type="submit" className="btn-accent w-full"><HandHeart size={15} /> {t('Submit request')}</button>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
