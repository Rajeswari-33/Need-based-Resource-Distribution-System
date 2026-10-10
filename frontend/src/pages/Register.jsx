import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Gift, HeartHandshake, Truck, Building2, Mail, Smartphone, CheckCircle2, ShieldCheck, Eye, EyeOff, User, Lock } from 'lucide-react'
import { CATEGORIES, CENTER_TYPES } from '../data/seed.js'
import { DASHBOARD_HOME } from '../utils/dashboardHome.js'
import { usePreferences } from '../context/PreferencesContext.jsx'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'

const ROLES = [
  { value: 'donor', label: 'Donor', desc: 'I want to give resources away.', icon: Gift },
  { value: 'recipient', label: 'Recipient', desc: 'I want to request resources I need.', icon: HeartHandshake },
  { value: 'volunteer', label: 'Setu Field Team Employee', desc: 'I want to carry out Setu-assigned verification or delivery work.', icon: Truck },
  { value: 'center', label: 'Center Coordinator', desc: 'I represent a recipient institution (orphanage, old-age home, NGO, shelter).', icon: Building2 },
]

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Simulated OTP verification block for a single channel (email or mobile). In production
// this would call a verification provider; here the code is generated client-side and
// surfaced via a toast so the flow can be demoed end-to-end without a backend.
function OtpField({ label, icon: Icon, destination, verified, onVerified }) {
  const { showToast } = useToast()
  const { t } = usePreferences()
  const [sentCode, setSentCode] = useState(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  function sendCode() {
    const code = genOtp()
    setSentCode(code)
    setInput('')
    setError('')
    showToast(`Demo OTP for ${destination}: ${code} (no real verification message is sent)`, 'info')
  }

  function verify() {
    if (input.trim() === sentCode) {
      onVerified()
      setError('')
    } else {
      setError(t('Incorrect code. Check the toast notification and try again.'))
    }
  }

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-banyan/30 bg-banyan/10 px-3.5 py-2.5 text-sm text-banyan-dark">
        <CheckCircle2 size={16} /> {t(label)} {t('verified')} — {destination}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-ink/10 bg-paper-dim p-3.5">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink/70"><Icon size={13} /> {t(label)} — {destination || t('enter above first')}</p>
      {!sentCode ? (
        <button type="button" disabled={!destination} onClick={sendCode} className="btn-outline w-full px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">
          {t('Send verification code')}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            className="input py-1.5 text-sm"
            placeholder={t('6-digit code')}
            maxLength={6}
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
          />
          <button type="button" onClick={verify} className="btn-accent shrink-0 px-3 py-1.5 text-xs">{t('Verify')}</button>
          <button type="button" onClick={sendCode} className="btn-outline shrink-0 px-2.5 py-1.5 text-xs">{t('Resend')}</button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-clay">{error}</p>}
    </div>
  )
}

export default function Register() {
  const { t } = usePreferences()
  const { register, updateUser, loginWithGoogle } = useAuth()
  const { addCenter } = useData()
  const navigate = useNavigate()

  async function handleGoogleCredential(credential) {
    const result = await loginWithGoogle(credential, role)
    if (result.success) {
      showToast(t('Welcome to Setu!'), 'success')
      navigate(DASHBOARD_HOME[result.role] || '/')
    } else {
      setErrors((prev) => ({ ...prev, submit: result.error || 'Google sign-in failed.' }))
    }
  }
  const [step, setStep] = useState(1) // 1: details, 2: verify contact
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState('donor')
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', username: '', password: '', confirmPassword: '' })
  const [volunteerTypes, setVolunteerTypes] = useState(['verification', 'delivery'])
  const [showPassword, setShowPassword] = useState(false)
  const [centerForm, setCenterForm] = useState({ centerName: '', centerType: CENTER_TYPES[0], address: '', location: '', hours: 'Mon–Sat, 9:00 AM – 6:00 PM', categories: [] })
  const [errors, setErrors] = useState({})
  const [emailVerified, setEmailVerified] = useState(false)
  const [mobileVerified, setMobileVerified] = useState(false)
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function updateCenterField(field, value) {
    setCenterForm((f) => ({ ...f, [field]: value }))
  }

  function toggleCategory(cat) {
    setCenterForm((f) => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter((c) => c !== cat) : [...f.categories, cat],
    }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = t('Enter your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('Enter a valid email address.')
    if (!/^\+[1-9][\d\s().-]*$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 8 || form.phone.replace(/\D/g, '').length > 15) {
      e.phone = t('Enter a phone number with +countrycode and 8 to 15 digits, for example +919876543210.')
    }
    if (!form.city.trim()) e.city = t('Enter your city.')
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(form.username.trim())) e.username = t('3–20 characters: letters, numbers, underscore or dot only.')
    if (!form.password || form.password.length < 6) e.password = t('At least 6 characters.')
    if (form.confirmPassword !== form.password) e.confirmPassword = t("Passwords don't match.")
    if (role === 'center') {
      if (!centerForm.centerName.trim()) e.centerName = t('Enter the center name.')
      if (!centerForm.location.trim()) e.location = t('Enter the center location.')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleContinueToVerify(e) {
    e.preventDefault()
    if (!validate()) return
    setStep(2)
  }

  async function handleFinalSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const result = await register({
      ...form,
      role,
      whatsappOptIn,
      ...(role === 'volunteer' ? { volunteerTypes } : {}),
    })
    setSubmitting(false)
    if (!result.ok) {
      setErrors({ submit: result.error })
      setStep(1)
      return
    }
    const newUser = result.user

    if (role === 'center') {
      try {
        const newCenter = await addCenter({
          name: centerForm.centerName,
          centerType: centerForm.centerType,
          address: centerForm.address,
          location: centerForm.location,
          hours: centerForm.hours,
          acceptedCategories: centerForm.categories,
          coordinatorId: newUser.id,
        })
        const linkedUser = await updateUser(newUser.id, { centerId: newCenter.id })
        if (!linkedUser) {
          setErrors({ submit: t('Your account was created, but the center could not be linked. Please contact support before submitting verification.') })
          return
        }
      } catch (error) {
        setErrors({ submit: error.message })
        return
      }
      navigate(DASHBOARD_HOME.center)
      return
    }
    navigate(DASHBOARD_HOME[role] || DASHBOARD_HOME.volunteer)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Create your Setu account')}</h1>
        <p className="mt-2 text-sm text-ink/55">
          {step === 1
            ? t("The next contact-code step is a demo only and does not send an email or text message. Recipients can submit an ID document from their Profile page before claiming resources.")
            : t('This contact-code step is a demo only; it does not verify ownership of your email address or mobile number.')}
        </p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-ink/40">
        <span className={step === 1 ? 'font-semibold text-ink' : ''}>1. {t('Your details')}</span>
        <span>—</span>
        <span className={step === 2 ? 'font-semibold text-ink' : ''}>2. {t('Verify contact')}</span>
      </div>

      {step === 1 && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {ROLES.map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`card flex flex-col items-start gap-2 p-3.5 text-left transition-colors ${role === value ? 'border-ink ring-1 ring-ink' : 'hover:border-ink/30'}`}
              >
                <Icon size={18} className={role === value ? 'text-marigold-dark' : 'text-ink/40'} />
                <span className="text-sm font-semibold text-ink">{t(label)}</span>
                <span className="text-xs text-ink/50">{t(desc)}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleContinueToVerify} className="card space-y-4 p-6">
            <div>
              <label className="label" htmlFor="name">{t('Full name')}</label>
              <input id="name" className="input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={t('e.g. Priya Kumar')} />
              {errors.name && <p className="mt-1 text-xs text-clay">{t(errors.name)}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="email">{t('Email')}</label>
                <input id="email" type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder={t('e.g. name@example.com')} />
                {errors.email && <p className="mt-1 text-xs text-clay">{t(errors.email)}</p>}
              </div>
              <div>
                <label className="label" htmlFor="phone">{t('Mobile number')}</label>
                <input id="phone" className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)}                 placeholder={t('+91 98765 43210')} />
                {errors.phone && <p className="mt-1 text-xs text-clay">{t(errors.phone)}</p>}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="city">{t('City')}</label>
              <input id="city" className="input" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder={t('e.g. Kovilpatti, TN')} />
              {errors.city && <p className="mt-1 text-xs text-clay">{t(errors.city)}</p>}
            </div>

            <div className="space-y-4 border-t border-ink/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">{t('Login credentials')}</p>
              <div>
                <label className="label" htmlFor="username">{t('Username')}</label>
                <div className="relative">
                  <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                  <input id="username" className="input pl-9" value={form.username} onChange={(e) => update('username', e.target.value)} placeholder={t('e.g. priya_k')} />
                </div>
                {errors.username && <p className="mt-1 text-xs text-clay">{t(errors.username)}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="password">{t('Password')}</label>
                  <div className="relative">
                    <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                    <input id="password" type={showPassword ? 'text' : 'password'} className="input pl-9 pr-9" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder={t('At least 6 characters')} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink/60">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-clay">{t(errors.password)}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="confirmPassword">{t('Confirm password')}</label>
                  <input id="confirmPassword" type={showPassword ? 'text' : 'password'} className="input" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder={t('Re-enter password')} />
                  {errors.confirmPassword && <p className="mt-1 text-xs text-clay">{t(errors.confirmPassword)}</p>}
                </div>
              </div>
              {errors.submit && <p className="text-xs text-clay">{t(errors.submit)}</p>}
              <p className="text-xs text-ink/40">{t('Your account is created by the API. Passwords are hashed on the server and are not stored in browser storage.')}</p>
            </div>

            {role === 'center' && (
              <div className="space-y-4 border-t border-ink/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">{t('Institution details')}</p>
                <div>
                  <label className="label" htmlFor="centerName">{t('Institution name')}</label>
                  <input id="centerName" className="input" value={centerForm.centerName} onChange={(e) => updateCenterField('centerName', e.target.value)} placeholder={t('e.g. Kovilpatti Children\'s Home')} />
                  {errors.centerName && <p className="mt-1 text-xs text-clay">{t(errors.centerName)}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="centerType">{t('Institution type')}</label>
                  <select id="centerType" className="input" value={centerForm.centerType} onChange={(e) => updateCenterField('centerType', e.target.value)}>
                    {CENTER_TYPES.map((type) => <option key={type} value={type}>{t(type)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="centerAddress">{t('Address')}</label>
                  <input id="centerAddress" className="input" value={centerForm.address} onChange={(e) => updateCenterField('address', e.target.value)} placeholder={t('e.g. Bus Stand Road')} />
                </div>
                <div>
                  <label className="label" htmlFor="location">{t('City / locality')}</label>
                  <input id="location" className="input" value={centerForm.location} onChange={(e) => updateCenterField('location', e.target.value)} placeholder={t('e.g. Kovilpatti, TN')} />
                  {errors.location && <p className="mt-1 text-xs text-clay">{t(errors.location)}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="hours">{t('Operating hours')}</label>
                  <input id="hours" className="input" value={centerForm.hours} onChange={(e) => updateCenterField('hours', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('Accepted categories')}</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCategory(c)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${centerForm.categories.includes(c) ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/60 hover:border-ink/40'}`}
                      >
                        {t(c)}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="rounded-md bg-marigold/10 px-3 py-2.5 text-xs text-marigold-dark">{t('Your institution will be listed once you submit its registration document from Center Profile and an admin verifies it.')}</p>
              </div>
            )}

            {role === 'volunteer' && (
              <fieldset className="space-y-3 border-t border-ink/10 pt-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-ink/45">{t('Join Setu as a field team employee')}</legend>
                <p className="text-xs text-ink/55">{t('Setu field team employees carry out platform-assigned recipient field verification and donation delivery. Choose one or both assignment types.')}</p>
                {[
                  { value: 'verification', label: 'Field verification', description: 'Visit recipients, check identity and need, and report findings to donors.' },
                  { value: 'delivery', label: 'Pickup and delivery', description: 'Collect approved donations from donors and deliver them to recipients or centers.' },
                ].map((type) => (
                  <label key={type.value} className="flex cursor-pointer items-start gap-3 rounded-md border border-ink/10 p-3">
                    <input
                      type="checkbox"
                      checked={volunteerTypes.includes(type.value)}
                      onChange={(event) => setVolunteerTypes((previous) => event.target.checked
                        ? [...previous, type.value]
                        : previous.filter((item) => item !== type.value))}
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">{t(type.label)}</span>
                      <span className="block text-xs text-ink/50">{t(type.description)}</span>
                    </span>
                  </label>
                ))}
                {volunteerTypes.length === 0 && <p className="text-xs text-clay">{t('Choose at least one volunteer service type.')}</p>}
              </fieldset>
            )}

            <button type="submit" className="btn-accent w-full">{t('Continue to demo contact check')}</button>
            <div className="space-y-3 border-t border-ink/10 pt-4">
              <p className="text-center text-xs text-ink/45">{t('Or continue with')}</p>
              <GoogleSignInButton
                onCredential={handleGoogleCredential}
                onError={(msg) => setErrors((prev) => ({ ...prev, submit: msg }))}
              />
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="card space-y-4 p-6">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink/45"><ShieldCheck size={13} /> {t('Contact verification')}</p>
          <OtpField label="Email" icon={Mail} destination={form.email} verified={emailVerified} onVerified={() => setEmailVerified(true)} />
          <OtpField label="Mobile" icon={Smartphone} destination={form.phone} verified={mobileVerified} onVerified={() => setMobileVerified(true)} />
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/75">
            <input
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(event) => setWhatsappOptIn(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink/30"
            />
            <span>{t('I agree to receive Setu donation and account notifications on WhatsApp at the phone number above. I can change this in my Profile.')}</span>
          </label>
          {errors.submit && <p className="text-xs text-clay">{t(errors.submit)}</p>}

          <div className="flex gap-2 border-t border-ink/10 pt-4">
            <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1">{t('Back')}</button>
            <button type="submit" disabled={!emailVerified || !mobileVerified || !whatsappOptIn || submitting || (role === 'volunteer' && volunteerTypes.length === 0)} className="btn-accent flex-1 disabled:cursor-not-allowed disabled:opacity-40">
              {t(submitting ? 'Creating account…' : 'Create account as')} {t(ROLES.find((r) => r.value === role).label)}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink/55">
        {t('Already have an account?')} <Link to="/login" className="font-semibold text-banyan-dark hover:underline">{t('Log in')}</Link>
      </p>
    </div>
  )
}
