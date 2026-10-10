import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ItemNotifications from '../components/ItemNotifications.jsx'
import DocUploadField from '../components/DocUploadField.jsx'
import { CATEGORIES, CENTER_TYPES, CENTER_DOC_TYPES, PERSONAL_DOC_TYPES } from '../data/seed.js'
import { ShieldCheck, Clock3, XCircle, Lock, Building2, UserCheck } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

// A registered "center" here is a recipient INSTITUTION — an orphanage, an old-age home, a
// shelter, an NGO — that receives donations, not a physical drop-off / warehouse depot. This
// is the coordinator's admin panel for that institution's public listing AND its verification.
//
// Verification is two steps, back to back, and BOTH are required before the account has full
// system access (claiming, requesting):
//   Step 1 — the INSTITUTION's own registration document (this center is real and registered).
//   Step 2 — proof THIS coordinator is actually authorized to represent it (unlocked only
//            once step 1 is verified — you can't skip ahead).

function CenterVerificationPanel({ center }) {
  const { t } = usePreferences()
  const { submitCenterVerification } = useData()
  const { showToast } = useToast()
  const [docType, setDocType] = useState(CENTER_DOC_TYPES[0].type)
  const [docNumber, setDocNumber] = useState('')
  const status = center.verificationStatus || (center.approved ? 'verified' : 'unverified')
  const selectedDoc = CENTER_DOC_TYPES.find((d) => d.type === docType) || CENTER_DOC_TYPES[0]

  function handleSubmit(e) {
    e.preventDefault()
    if (!docNumber.trim()) return
    submitCenterVerification(center.id, { docType, docNumber: docNumber.trim() })
    showToast('Registration document submitted. An admin will review it shortly.', 'success')
    setDocNumber('')
  }

  if (status === 'verified') {
    return (
      <div className="flex items-center gap-2.5 rounded-md bg-banyan/10 px-4 py-3 text-sm text-banyan-dark">
        <ShieldCheck size={16} /> {t(`Institution verified${center.verificationDoc ? ` — reviewed using ${center.verificationDoc.docType} (${center.verificationDoc.docNumber})` : '.'}`)}
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2.5 rounded-md bg-marigold/10 px-4 py-3 text-sm text-marigold-dark">
        <Clock3 size={16} /> {t(`Your ${center.verificationDoc?.docType || 'registration document'} (${center.verificationDoc?.docNumber}) is submitted and awaiting admin review.`)}
      </div>
    )
  }

  return (
    <div>
      {status === 'rejected' && (
        <div className="mb-3 flex items-start gap-2.5 rounded-md bg-clay/10 px-4 py-3 text-sm text-clay">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            {t(`Your last submission (${center.verificationDoc?.docType || 'document'}: ${center.verificationDoc?.docNumber}) was rejected: ${center.verificationNote || 'document could not be verified.'} Please resubmit below.`)}
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-ink/10 bg-paper-dim p-4">
        <p className="text-xs text-ink/50">{t('This is proof of the institution itself — its registration certificate, not a personal ID.')}</p>
        <div>
          <label className="label" htmlFor="centerDocType">{t('Which document are you submitting?')}</label>
          <select id="centerDocType" className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {CENTER_DOC_TYPES.map((d) => <option key={d.type} value={d.type}>{t(d.type)}</option>)}
          </select>
        </div>
        <DocUploadField
          id="centerDocNumber"
          label={docType}
          value={docNumber}
          onChange={setDocNumber}
          placeholder={selectedDoc.placeholder}
          hint={t(`Format: ${selectedDoc.hint}`)}
        />
        <button type="submit" className="btn-accent w-full">{t('Submit for verification')}</button>
      </form>
    </div>
  )
}

// Step 2 — verify the coordinator's personal identity after the institution is approved.
function CoordinatorVerificationPanel({ currentUser }) {
  const { t } = usePreferences()
  const { submitVerification } = useAuth()
  const { showToast } = useToast()
  const [docType, setDocType] = useState(PERSONAL_DOC_TYPES[0].type)
  const [docNumber, setDocNumber] = useState('')
  const status = currentUser.verificationStatus || (currentUser.verified ? 'verified' : 'unverified')
  const selectedDoc = PERSONAL_DOC_TYPES.find((d) => d.type === docType) || PERSONAL_DOC_TYPES[0]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!docNumber.trim()) return
    try {
      await submitVerification(currentUser.id, { docType, docNumber: docNumber.trim() })
      showToast('Document submitted. An admin will review it shortly.', 'success')
      setDocNumber('')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  if (status === 'verified') {
    return (
      <div className="flex items-center gap-2.5 rounded-md bg-banyan/10 px-4 py-3 text-sm text-banyan-dark">
        <ShieldCheck size={16} /> {t(`You're verified as this institution's coordinator${currentUser.verificationDoc ? ` — reviewed using ${currentUser.verificationDoc.docType} (${currentUser.verificationDoc.docNumber})` : ''}. Both steps are complete — full system access is unlocked.`)}
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2.5 rounded-md bg-marigold/10 px-4 py-3 text-sm text-marigold-dark">
        <Clock3 size={16} /> {t(`Your ${currentUser.verificationDoc?.docType || 'document'} (${currentUser.verificationDoc?.docNumber}) is submitted and awaiting admin review.`)}
      </div>
    )
  }

  return (
    <div>
      {status === 'rejected' && (
        <div className="mb-3 flex items-start gap-2.5 rounded-md bg-clay/10 px-4 py-3 text-sm text-clay">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            {t(`Your last submission (${currentUser.verificationDoc?.docType}: ${currentUser.verificationDoc?.docNumber}) was rejected: ${currentUser.verificationNote || 'document could not be verified.'} Please resubmit below.`)}
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-ink/10 bg-paper-dim p-4">
        <p className="text-xs text-ink/50">{t('Submit a personal identity document, such as Aadhaar. This is reviewed only after the institution is approved.')}</p>
        <div>
          <label className="label" htmlFor="coordDocType">{t('Which document are you submitting?')}</label>
          <select id="coordDocType" className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {PERSONAL_DOC_TYPES.map((d) => <option key={d.type} value={d.type}>{t(d.type)}</option>)}
          </select>
        </div>
        <DocUploadField
          id="coordDocNumber"
          label={docType}
          value={docNumber}
          onChange={setDocNumber}
          placeholder={selectedDoc.placeholder}
          hint={t(`Format: ${selectedDoc.hint}`)}
        />
        <button type="submit" className="btn-accent w-full">{t('Submit for verification')}</button>
      </form>
    </div>
  )
}

export default function CenterProfile() {
  const { t } = usePreferences()
  const { currentUser, updateUser } = useAuth()
  const { centers, centersLoaded, addCenter, updateCenter } = useData()
  const { showToast } = useToast()

  const center = centers.find((c) => c.id === currentUser.centerId) ||
    centers.find((c) => c.coordinatorId === currentUser.id)
  const [form, setForm] = useState(null)
  const [newCenterForm, setNewCenterForm] = useState({
    name: '',
    centerType: CENTER_TYPES[0],
    address: '',
    location: currentUser.city || '',
    hours: 'Mon–Sat, 9:00 AM – 6:00 PM',
    categories: [],
  })
  const [creatingCenter, setCreatingCenter] = useState(false)
  const [centerLinkError, setCenterLinkError] = useState('')
  const attemptedCenterLink = useRef(null)

  useEffect(() => {
    if (!center) return
    setForm((previous) => previous?.centerId === center.id ? previous : {
      centerId: center.id,
      name: center.name,
      centerType: center.centerType || CENTER_TYPES[0],
      address: center.address || '',
      location: center.location || '',
      hours: center.hours || '',
      categories: center.acceptedCategories || [],
    })
  }, [center?.id])

  useEffect(() => {
    if (!center || currentUser.centerId === center.id) return
    if (attemptedCenterLink.current === center.id) return
    attemptedCenterLink.current = center.id
    updateUser(currentUser.id, { centerId: center.id }).then((linkedUser) => {
      if (!linkedUser) setCenterLinkError('Your institution is registered, but it is not linked to this account yet.')
    })
  }, [center?.id, currentUser.centerId, currentUser.id, updateUser])

  if (!centersLoaded) {
    return <DashboardLayout><p className="py-16 text-center text-sm text-ink/55">{t('Loading your institution profile…')}</p></DashboardLayout>
  }


  function updateNewCenter(field, value) {
    setNewCenterForm((previous) => ({ ...previous, [field]: value }))
  }

  function toggleNewCenterCategory(category) {
    setNewCenterForm((previous) => ({
      ...previous,
      categories: previous.categories.includes(category)
        ? previous.categories.filter((item) => item !== category)
        : [...previous.categories, category],
    }))
  }

  async function handleCreateCenter(event) {
    event.preventDefault()
    if (!newCenterForm.name.trim() || !newCenterForm.location.trim()) {
      showToast('Enter the institution name and city/locality to continue.', 'error')
      return
    }
    setCreatingCenter(true)
    try {
      const createdCenter = await addCenter({
        name: newCenterForm.name.trim(),
        centerType: newCenterForm.centerType,
        address: newCenterForm.address.trim(),
        location: newCenterForm.location.trim(),
        hours: newCenterForm.hours.trim(),
        acceptedCategories: newCenterForm.categories,
        coordinatorId: currentUser.id,
      })
      const linkedUser = await updateUser(currentUser.id, { centerId: createdCenter.id })
      if (!linkedUser) throw new Error('The institution was created, but linking it to your coordinator account failed. Please try again.')
      showToast('Institution registered. Submit its registration document below for Step 1 review.', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setCreatingCenter(false)
    }
  }

  if (!center) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">{t('Register your institution')}</h1>
            <p className="mt-1.5 text-sm text-ink/55">
              {t('Enter your institution details to start verification. First an admin reviews the institution registration document; after approval, you can submit your personal ID for coordinator verification.')}
            </p>
          </div>
          <form onSubmit={handleCreateCenter} className="card space-y-4 p-6">
            <div>
              <label className="label" htmlFor="newCenterName">{t('Institution name')}</label>
              <input id="newCenterName" className="input" required value={newCenterForm.name} onChange={(event) => updateNewCenter('name', event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="newCenterType">{t('Institution type')}</label>
              <select id="newCenterType" className="input" value={newCenterForm.centerType} onChange={(event) => updateNewCenter('centerType', event.target.value)}>
                {CENTER_TYPES.map((type) => <option key={type} value={type}>{t(type)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="newCenterAddress">{t('Address')}</label>
              <input id="newCenterAddress" className="input" value={newCenterForm.address} onChange={(event) => updateNewCenter('address', event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="newCenterLocation">{t('City / locality')}</label>
              <input id="newCenterLocation" className="input" required value={newCenterForm.location} onChange={(event) => updateNewCenter('location', event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="newCenterHours">{t('Operating hours')}</label>
              <input id="newCenterHours" className="input" value={newCenterForm.hours} onChange={(event) => updateNewCenter('hours', event.target.value)} />
            </div>
            <div>
              <label className="label">{t('Accepted categories')}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleNewCenterCategory(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${newCenterForm.categories.includes(category) ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/60 hover:border-ink/40'}`}
                  >
                    {t(category)}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={creatingCenter} className="btn-accent w-full disabled:opacity-50">
              {t(creatingCenter ? 'Registering institution…' : 'Register institution and continue')}
            </button>
          </form>
        </div>
      </DashboardLayout>
    )
  }

  if (!form) {
    return <DashboardLayout><p className="py-16 text-center text-sm text-ink/55">{t('Loading your institution profile…')}</p></DashboardLayout>
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function retryCenterLink() {
    const linkedUser = await updateUser(currentUser.id, { centerId: center.id })
    if (linkedUser) {
      setCenterLinkError('')
      showToast('Your institution is linked to your coordinator account.', 'success')
    } else {
      setCenterLinkError('We could not link your institution right now. Please try again.')
    }
  }

  function toggleCategory(cat) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter((c) => c !== cat) : [...f.categories, cat],
    }))
  }

  function handleSave(e) {
    e.preventDefault()
    updateCenter(center.id, { name: form.name, centerType: form.centerType, address: form.address, location: form.location, hours: form.hours, acceptedCategories: form.categories })
    showToast('Center profile updated.', 'success')
  }

  const centerStatus = center.verificationStatus || (center.approved ? 'verified' : 'unverified')
  const centerStatusLabel = t({ verified: 'Verified', pending: 'Pending review', rejected: 'Rejected', unverified: 'Unverified' }[centerStatus])
  const step1Done = centerStatus === 'verified'
  const coordStatus = currentUser.verificationStatus || (currentUser.verified ? 'verified' : 'unverified')
  const coordStatusLabel = t({ verified: 'Verified', pending: 'Pending review', rejected: 'Rejected', unverified: 'Unverified' }[coordStatus])
  const bothDone = step1Done && coordStatus === 'verified'

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Center profile')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          {t(`${center.name} is a recipient institution (${form.centerType}) — it receives donations for the people in its care, it doesn't operate as a general drop-off or distribution depot.`)}
        </p>
      </div>
      {centerLinkError && (
        <div className="mb-6 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-md border border-clay/25 bg-clay/5 px-4 py-3 text-sm text-clay">
          <span>{t(centerLinkError)}</span>
          <button type="button" onClick={retryCenterLink} className="btn-outline px-3 py-1.5 text-xs">{t('Retry link')}</button>
        </div>
      )}

      <div className={`mb-6 max-w-xl rounded-md border px-4 py-3 text-xs ${bothDone ? 'border-banyan/30 bg-banyan/5 text-banyan-dark' : 'border-marigold/30 bg-marigold/5 text-marigold-dark'}`}>
        {t('Verification is two steps, in order. First an admin approves the institution registration document; only then can the coordinator submit a personal ID such as Aadhaar for admin approval. Both approvals are required before this account can claim or request resources.')}
      </div>

      <div className="card mb-6 max-w-xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink"><Building2 size={15} /> {t('Step 1 — Institution verification')}</h2>
          <StatusBadge status={centerStatus === 'verified' ? 'verified' : centerStatus === 'pending' ? 'pending' : 'unverified'}>{centerStatusLabel}</StatusBadge>
        </div>
        <CenterVerificationPanel center={center} />
        <ItemNotifications type="center" id={center.id} />
      </div>

      <div className="card mb-6 max-w-xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink"><UserCheck size={15} /> {t('Step 2 — Coordinator verification')}</h2>
          {step1Done && <StatusBadge status={coordStatus === 'verified' ? 'verified' : coordStatus === 'pending' ? 'pending' : 'unverified'}>{coordStatusLabel}</StatusBadge>}
        </div>
        {step1Done ? (
          <CoordinatorVerificationPanel currentUser={currentUser} />
        ) : (
          <div className="flex items-center gap-2.5 rounded-md bg-ink/5 px-4 py-3 text-sm text-ink/50">
            <Lock size={15} className="shrink-0" /> {t('Locked until Step 1 (institution verification) is approved.')}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="card max-w-xl space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">{t('Institution name')}</label>
          <input id="name" className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="centerType">{t('Institution type')}</label>
          <select id="centerType" className="input" value={form.centerType} onChange={(e) => update('centerType', e.target.value)}>
            {CENTER_TYPES.map((type) => <option key={type} value={type}>{t(type)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="address">{t('Address')}</label>
          <input id="address" className="input" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder={t('Street / area — shown to Setu employees delivering here')} />
        </div>
        <div>
          <label className="label" htmlFor="location">{t('City / locality')}</label>
          <input id="location" className="input" value={form.location} onChange={(e) => update('location', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="hours">{t('Operating hours')}</label>
          <input id="hours" className="input" value={form.hours} onChange={(e) => update('hours', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('Accepted categories')}</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${form.categories.includes(c) ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/60 hover:border-ink/40'}`}
              >
                {t(c)}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-accent w-full">{t('Save changes')}</button>
      </form>
    </DashboardLayout>
  )
}
