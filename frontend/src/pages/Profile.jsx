import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import DocUploadField from '../components/DocUploadField.jsx'
import { PERSONAL_DOC_TYPES } from '../data/seed.js'
import { ShieldCheck, Clock3, XCircle, Mail, Smartphone, CheckCircle2, Trash2, Bell, MessageCircle, Send } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { backendApi } from '../lib/api.js'
import { openWhatsApp } from '../utils/whatsapp.js'

// One row of the contact-verification panel below — handles either "email" or
// "mobile". Simulated OTP: clicking "Send code" reveals a 6-digit input,
// any 6 digits are accepted (no real email or text message is sent), and "Verify" flips
// the flag via AuthContext.verifyContact. Frontend-only, same pattern as the
// ID-document panel further down this file.
function ContactVerifyRow({ label, icon: Icon, value, verified, field, userId }) {
  const { t } = usePreferences()
  const { verifyContact } = useAuth()
  const { showToast } = useToast()
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  if (verified) {
    return (
      <div className="flex items-center gap-2.5 rounded-md bg-banyan/10 px-3.5 py-2.5 text-sm text-banyan-dark">
        <CheckCircle2 size={15} className="shrink-0" /> <Icon size={14} className="shrink-0" />
        <span className="flex-1">{t(label)} {t('verified')} — {value}</span>
      </div>
    )
  }

  function handleSend() {
    setSent(true)
    setError('')
    showToast(`Simulated OTP sent to ${value} (demo — use any 6 digits)`, 'info')
  }

  function handleVerify(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t('Enter the 6-digit code.'))
      return
    }
    verifyContact(userId, field)
    showToast(`${label} verified.`, 'success')
    setSent(false)
    setCode('')
  }

  return (
    <div className="rounded-md border border-ink/10 bg-paper-dim px-3.5 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-ink/70"><Icon size={14} /> {t(label)} {t('not verified')} — {value}</span>
        {!sent && <button type="button" onClick={handleSend} className="btn-outline shrink-0 px-3 py-1.5 text-xs">{t('Send code')}</button>}
      </div>
      {sent && (
        <form onSubmit={handleVerify} className="mt-2.5 flex items-center gap-2">
          <input
            className="input flex-1 text-sm" value={code} maxLength={6} inputMode="numeric"
            placeholder={t('6-digit code')} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" className="btn-accent shrink-0 px-3 py-1.5 text-xs">{t('Verify')}</button>
        </form>
      )}
      {error && <p className="mt-1.5 text-xs text-clay">{t(error)}</p>}
      {sent && !error && <p className="mt-1.5 text-xs text-ink/40">{t('Demo mode — no real code is sent, enter any 6 digits.')}</p>}
    </div>
  )
}

function ContactVerificationPanel({ currentUser }) {
  const { t } = usePreferences()
  if (currentUser.emailVerified && currentUser.mobileVerified) return null
  return (
    <div className="mt-5 space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink/45"><ShieldCheck size={13} /> {t('Verify your contact details (optional)')}</p>
      <p className="text-xs text-ink/45">{t('This is a good security habit, but it\'s separate from account verification below — it does not affect your ability to claim or post resources.')}</p>
      <ContactVerifyRow label="Email" icon={Mail} value={currentUser.email} verified={currentUser.emailVerified} field="emailVerified" userId={currentUser.id} />
      <ContactVerifyRow label="Mobile" icon={Smartphone} value={currentUser.phone} verified={currentUser.mobileVerified} field="mobileVerified" userId={currentUser.id} />
    </div>
  )
}

function ContactDetailsPanel({ currentUser }) {
  const { t } = usePreferences()
  const { updateUser } = useAuth()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState({
    phone: currentUser.phone || '',
    address: currentUser.address || '',
    city: currentUser.city || '',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    const phone = details.phone.trim()
    const digitCount = phone.replace(/\D/g, '').length
    if (!/^\+[1-9][\d\s().-]*$/.test(phone) || digitCount < 8 || digitCount > 15) {
      showToast('Enter a phone number with its +countrycode, for example +919876543210.', 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await updateUser(currentUser.id, {
        phone,
        address: details.address.trim(),
        city: details.city.trim(),
      })
      if (!updated) {
        showToast('Unable to save contact details.', 'error')
        return
      }
      showToast('Contact details saved.', 'success')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-3 rounded-md border border-ink/10 bg-paper-dim p-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{t('Contact details for assignments')}</h2>
        <p className="mt-1 text-xs text-ink/55">
          {t('Google provides your name and email, but not your phone number or address. Add them here so people involved in an assignment can coordinate with you. Your phone and address are shared with the assigned Setu employee only after they accept the task.')}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="profilePhone">{t('Phone number')}</label>
        <input
          id="profilePhone"
          className="input"
          type="tel"
          autoComplete="tel"
          required
          maxLength={32}
          placeholder={t('+91 98765 43210')}
          value={details.phone}
          onChange={(event) => setDetails((previous) => ({ ...previous, phone: event.target.value }))}
        />
        <p className="mt-1 text-xs text-ink/45">{t('Include + and your country calling code for international contact.')}</p>
      </div>
      <div>
        <label className="label" htmlFor="profileAddress">{t('Street / locality')}</label>
        <input
          id="profileAddress"
          className="input"
          autoComplete="street-address"
          maxLength={250}
          value={details.address}
          onChange={(event) => setDetails((previous) => ({ ...previous, address: event.target.value }))}
        />
      </div>
      <div>
        <label className="label" htmlFor="profileCity">{t('City / area')}</label>
        <input
          id="profileCity"
          className="input"
          autoComplete="address-level2"
          required
          maxLength={120}
          value={details.city}
          onChange={(event) => setDetails((previous) => ({ ...previous, city: event.target.value }))}
        />
      </div>
      <button type="submit" disabled={saving} className="btn-accent px-3.5 py-2 text-sm disabled:opacity-60">
        {saving ? t('Saving...') : t('Save contact details')}
      </button>
    </form>
  )
}

function NotificationPreferencesPanel({ currentUser }) {
  const { t } = usePreferences()
  const { updateUser } = useAuth()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [sendingFlow, setSendingFlow] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [phone, setPhone] = useState(currentUser.phone || '')
  const storedPreferences = currentUser.notificationPreferences || {}
  const [preferences, setPreferences] = useState({
    email: storedPreferences.email !== false,
    whatsapp: storedPreferences.whatsapp === true || (
      !currentUser.notificationPreferences && currentUser.whatsappOptIn === true
    ),
  })
  const [sendingEmailTest, setSendingEmailTest] = useState(false)

  async function handleTestEmail() {
    if (!currentUser.email) {
      showToast(t('No email address registered on your account.'), 'error')
      return
    }
    setSendingEmailTest(true)
    try {
      const res = await backendApi.testEmailNotification(currentUser.email)
      if (res?.success) {
        showToast(t(`Test email sent successfully to ${currentUser.email}! Check your inbox.`), 'success')
      } else {
        showToast(res?.error || t('Unable to send test email.'), 'error')
      }
    } catch (err) {
      showToast(err.message || t('Error sending test email.'), 'error')
    } finally {
      setSendingEmailTest(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedPhone = phone.trim()
    const digitCount = normalizedPhone.replace(/\D/g, '').length
    if (
      normalizedPhone &&
      (!/^\+[1-9][\d\s().-]*$/.test(normalizedPhone) || digitCount < 8 || digitCount > 15)
    ) {
      showToast('Enter a phone number with its +countrycode, for example +919876543210.', 'error')
      return
    }
    if (preferences.whatsapp && !normalizedPhone) {
      showToast('Add a phone number with its +countrycode before enabling WhatsApp notifications.', 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await updateUser(currentUser.id, {
        phone: normalizedPhone,
        notificationPreferences: { inApp: true, ...preferences },
      })
      if (!updated) {
        showToast('Unable to save notification preferences.', 'error')
        return
      }
      showToast('Notification preferences saved.', 'success')
    } finally {
      setSaving(false)
    }
  }

  async function handleOpenWhatsAppFlow() {
    if (!phone.trim()) {
      showToast('Add a phone number with country code first.', 'error')
      return
    }
    setSendingFlow(true)
    try {
      setPreferences((previous) => ({ ...previous, whatsapp: true }))
      await backendApi.sendWhatsAppPreferencesFlow().catch(() => {})
      openWhatsApp(
        phone,
        'Hello! I have activated WhatsApp notifications for my Setu Donation Platform account.',
      )
      showToast('Opening WhatsApp! Notifications activated.', 'success')
    } catch (error) {
      openWhatsApp(
        phone,
        'Hello! I have activated WhatsApp notifications for my Setu Donation Platform account.',
      )
      showToast('Opening WhatsApp...', 'success')
    } finally {
      setSendingFlow(false)
    }
  }

  async function handleTestWhatsApp() {
    const normalizedPhone = phone.trim()
    if (!normalizedPhone) {
      showToast('Enter a phone number with country code first.', 'error')
      return
    }
    setSendingTest(true)
    try {
      const res = await backendApi.testWhatsAppNotification(
        normalizedPhone,
        '🔔 Setu Donation Platform: Test WhatsApp notification is working! Your account will receive automated donation and status updates.',
      )
      if (res?.success) {
        if (res.provider === 'callmebot') {
          showToast('WhatsApp notification sent directly to your phone via CallMeBot!', 'success')
        } else if (res.provider === 'green_api') {
          showToast('WhatsApp notification sent via Green-API!', 'success')
        } else if (res.provider === 'meta_cloud_api') {
          showToast('WhatsApp notification sent via Meta Cloud API!', 'success')
        } else {
          showToast('Notification generated! Opening WhatsApp chat...', 'success')
          if (res.directLink) {
            window.open(res.directLink, '_blank', 'noopener,noreferrer')
          }
        }
      } else {
        showToast(res?.error || 'Could not deliver automated message. Opening WhatsApp...', 'info')
        if (res?.directLink) {
          window.open(res.directLink, '_blank', 'noopener,noreferrer')
        }
      }
    } catch (error) {
      showToast(error.message || 'Error triggering WhatsApp notification.', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-3 rounded-md border border-ink/10 bg-paper-dim p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Bell size={15} /> {t('Notification preferences')}</h2>
        <p className="mt-1 text-xs text-ink/55">{t('Built-in notifications are always on. Choose any extra ways you would like to receive updates.')}</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink/65">
        <input type="checkbox" checked readOnly disabled className="mt-0.5 h-4 w-4 rounded border-ink/30" />
        <span>{t('Built-in notifications (default and always on)')}</span>
      </label>
      <div>
        <label className="label" htmlFor="notificationWhatsAppNumber">{t('Linked WhatsApp number')}</label>
        <input
          id="notificationWhatsAppNumber"
          className="input"
          type="tel"
          autoComplete="tel"
          maxLength={32}
          placeholder={t('+91 98765 43210')}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <p className="mt-1 text-xs text-ink/45">{t('Include + and your country calling code. This is the number that will receive WhatsApp notifications.')}</p>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/75">
        <input
          type="checkbox"
          checked={preferences.email}
          onChange={(event) => setPreferences((previous) => ({ ...previous, email: event.target.checked }))}
          className="mt-0.5 h-4 w-4 rounded border-ink/30"
        />
        <span className="flex items-start gap-1.5"><Mail size={15} className="mt-0.5 shrink-0" /> {t('Email notifications')}</span>
      </label>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/75">
        <input
          type="checkbox"
          checked={preferences.whatsapp}
          onChange={(event) => setPreferences((previous) => ({ ...previous, whatsapp: event.target.checked }))}
          className="mt-0.5 h-4 w-4 rounded border-ink/30"
        />
        <span>
          <span className="flex items-start gap-1.5"><MessageCircle size={15} className="mt-0.5 shrink-0" /> {t('WhatsApp messages')}</span>
          <span className="mt-1 block text-xs text-ink/50">{t('By enabling this, you agree to receive Setu donation and account notifications on WhatsApp at your saved phone number. You can turn this off at any time.')}</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-accent px-3.5 py-2 text-sm disabled:opacity-60">
          {saving ? t('Saving...') : t('Save notification preferences')}
        </button>
        <button
          type="button"
          onClick={handleTestEmail}
          disabled={sendingEmailTest || !currentUser.email}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink/20 bg-paper px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper-dim disabled:opacity-60"
        >
          <Mail size={15} />
          {sendingEmailTest ? t('Sending...') : t('Send Test Email')}
        </button>
        <button
          type="button"
          onClick={handleOpenWhatsAppFlow}
          disabled={sendingFlow || !phone.trim()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#25D366] bg-[#25D366]/10 px-3.5 py-2 text-sm font-semibold text-[#1da850] hover:bg-[#25D366]/20 disabled:opacity-60"
        >
          <MessageCircle size={15} />
          {sendingFlow ? t('Connecting...') : t('Open My WhatsApp')}
        </button>
        <button
          type="button"
          onClick={handleTestWhatsApp}
          disabled={sendingTest || !phone.trim()}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink/20 bg-paper px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper-dim disabled:opacity-60"
        >
          <Send size={15} />
          {sendingTest ? t('Sending...') : t('Send Test to My Phone')}
        </button>
      </div>
    </form>
  )
}

function VerificationPanel({ currentUser }) {
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
      <div className="mt-5 flex items-center gap-2.5 rounded-md bg-banyan/10 px-4 py-3 text-sm text-banyan-dark">
        <ShieldCheck size={16} /> {t(`Your account is verified using ${currentUser.verificationDoc?.docType || 'your submitted document'}. You have full access to request and post resources.`)}
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="mt-5 flex items-center gap-2.5 rounded-md bg-marigold/10 px-4 py-3 text-sm text-marigold-dark">
        <Clock3 size={16} /> {t(`Your ${currentUser.verificationDoc?.docType || 'document'} (${currentUser.verificationDoc?.docNumber}) is submitted and waiting for admin review.`)}
      </div>
    )
  }

  return (
    <div className="mt-5">
      {status === 'rejected' && (
        <div className="mb-3 flex items-start gap-2.5 rounded-md bg-clay/10 px-4 py-3 text-sm text-clay">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>{t(`Your last submission (${currentUser.verificationDoc?.docType}: ${currentUser.verificationDoc?.docNumber}) was rejected: ${currentUser.verificationNote || 'document could not be verified.'} Please resubmit a valid document below.`)}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-ink/10 bg-paper-dim p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">{t('Submit ID proof to get verified')}</p>
        <div>
          <label className="label" htmlFor="docType">{t('Which document are you submitting?')}</label>
          <select id="docType" className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {PERSONAL_DOC_TYPES.map((d) => <option key={d.type} value={d.type}>{t(d.type)}</option>)}
          </select>
        </div>
        <DocUploadField
          id="docNumber"
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

export default function Profile() {
  const { t } = usePreferences()
  const { currentUser, deleteAccount } = useAuth()
  const { centers } = useData()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const myCenter = currentUser.role === 'center' ? centers.find((c) => c.id === currentUser.centerId) : null
  const status = currentUser.role === 'center'
    ? (myCenter?.verificationStatus || (myCenter?.approved ? 'verified' : 'unverified'))
    : (currentUser.verificationStatus || (currentUser.verified ? 'verified' : 'unverified'))
  const statusLabel = t({ verified: 'Verified', pending: 'Pending review', rejected: 'Rejected', unverified: 'Unverified' }[status])

  async function handleDeleteAccount() {
    try {
      await deleteAccount(currentUser.id)
      setConfirmingDelete(false)
      showToast('Your account has been deleted.', 'info')
      navigate('/')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  return (
    <DashboardLayout>
    <div className="mx-auto max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-banyan/15 font-mono text-lg font-semibold text-banyan-dark">
            {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">{currentUser.name}</h1>
            <p className="text-xs font-mono uppercase tracking-wide text-ink/45">{t(currentUser.role)} · {currentUser.city}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-y-3 border-t border-ink/10 pt-5 text-sm">
          <dt className="text-ink/45">{t('Email')}</dt>
          <dd className="text-ink/75">{currentUser.email}</dd>
          <dt className="text-ink/45">{t('Phone')}</dt>
          <dd className="text-ink/75">{currentUser.phone}</dd>
          <dt className="text-ink/45">{t('Member since')}</dt>
          <dd className="text-ink/75">{currentUser.joined}</dd>
          <dt className="text-ink/45">{t('Verification')}</dt>
          <dd>
            <StatusBadge status={status === 'verified' ? 'verified' : status === 'pending' ? 'pending' : 'unverified'}>{statusLabel}</StatusBadge>
          </dd>
        </dl>

        <ContactDetailsPanel currentUser={currentUser} />
        <NotificationPreferencesPanel currentUser={currentUser} />
        <ContactVerificationPanel currentUser={currentUser} />
        {currentUser.role === 'center' ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-md border border-ink/10 bg-paper-dim px-4 py-3 text-sm text-ink/65">
            <ShieldCheck size={16} className="shrink-0 text-ink/40" />
            <span>
              {t('This is a center coordinator account — verification is done for the institution, not you personally.')} {t('Submit the center\'s registration document from')} <Link to="/center/profile" className="font-semibold text-banyan-dark hover:underline">{t('Center Profile')}</Link>.
            </span>
          </div>
        ) : (
          <VerificationPanel currentUser={currentUser} />
        )}

        {currentUser.restricted && (
          <p className="mt-4 rounded-md bg-clay/10 px-3 py-2.5 text-xs font-semibold text-clay">
            {t('Your account is currently restricted pending admin review.')}
          </p>
        )}
      </div>

      {/* Impact stats, certificates, and donation/request history each live on their own
          sidebar page now (Impact Tracker, Certificates & Receipts, Received Donations, etc.)
          rather than being duplicated here in miniature. */}

      <div className="card mt-6 border-clay/25 p-6">
        <h2 className="mb-1.5 flex items-center gap-2 font-display text-sm font-semibold text-clay"><Trash2 size={15} /> {t('Danger zone')}</h2>
        <p className="mb-4 text-sm text-ink/55">{t('Permanently delete your account. This can\'t be undone — your login and profile are removed immediately, though your past donations/requests stay on record for the other people involved.')}</p>
        <button onClick={() => setConfirmingDelete(true)} className="rounded-md border border-clay/40 px-3.5 py-2 text-sm font-semibold text-clay hover:bg-clay/10">{t('Delete my account')}</button>
      </div>
    </div>

    <ConfirmDialog
      open={confirmingDelete}
      title={t('Delete your account?')}
      description={t('This is permanent — you\'ll be logged out immediately and won\'t be able to log back in with this account.')}
      confirmLabel={t('Delete account')}
      tone="danger"
      onConfirm={handleDeleteAccount}
      onCancel={() => setConfirmingDelete(false)}
    />
    </DashboardLayout>
  )
}
