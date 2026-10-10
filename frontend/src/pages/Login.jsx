import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { ArrowRightLeft, Gift, HeartHandshake, Truck, Building2, ShieldCheck, ChevronLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { DASHBOARD_HOME } from '../utils/dashboardHome.js'
import { usePreferences } from '../context/PreferencesContext.jsx'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'

const ROLE_META = {
  donor: { icon: Gift, label: 'Donor', tagline: 'Give away what you no longer need', color: 'text-marigold-dark', bg: 'bg-marigold/15' },
  recipient: { icon: HeartHandshake, label: 'Recipient', tagline: 'Request what your family needs', color: 'text-clay', bg: 'bg-clay/10' },
  volunteer: { icon: Truck, label: 'Setu Field Team Employee', tagline: 'Complete assigned field verification and delivery work', color: 'text-banyan-dark', bg: 'bg-banyan/10' },
  center: { icon: Building2, label: 'Center Coordinator', tagline: 'Represent a recipient institution', color: 'text-ink', bg: 'bg-ink/10' },
  admin: { icon: ShieldCheck, label: 'Admin', tagline: 'Keep the platform safe and trustworthy', color: 'text-ink', bg: 'bg-ink/10' },
}

const ROLE_ORDER = ['donor', 'recipient', 'volunteer', 'center', 'admin']

export default function Login() {
  const { login, loginWithGoogle, authError } = useAuth()
  const { t } = usePreferences()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState('role')
  const [role, setRole] = useState(null)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSelectRole(r) {
    setRole(r)
    setStep('account')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await login(identifier, password, role)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    showToast(`Welcome back, ${result.user.name.split(' ')[0]}.`, 'success')
    navigate(DASHBOARD_HOME[result.user.role])
  }

  async function handleGoogleCredential(credential) {
    setError('')
    setSubmitting(true)
    const result = await loginWithGoogle(credential, role)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    showToast(`Welcome, ${result.user.name.split(' ')[0]}.`, 'success')
    navigate(DASHBOARD_HOME[result.user.role])
  }

  if (step === 'role') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="mb-10 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-ink text-marigold">
            <ArrowRightLeft size={20} />
          </span>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink/40">{t('Step 1 of 2')}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{t('How would you like to continue?')}</h1>
              <p className="mt-2 text-sm text-ink/55">{t('Choose your role to sign in and unlock the dashboard built for it.')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ROLE_ORDER.map((r) => {
            const meta = ROLE_META[r]
            const Icon = meta.icon
            return (
              <button
                key={r}
                onClick={() => handleSelectRole(r)}
                className="card group flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}>
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{t(meta.label)}</span>
                  <span className="block truncate text-xs text-ink/50">{t(meta.tagline)}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5 group-hover:text-ink/60" />
              </button>
            )
          })}
        </div>

        <p className="mt-10 flex flex-col items-center gap-2 text-center text-sm text-ink/55">
          <span>{t('New to Setu?')} <Link to="/register" className="font-semibold text-banyan-dark hover:underline">{t('Create an account')}</Link></span>
          <Link to="/forgot-password" className="text-ink/45 hover:text-ink/70 hover:underline">{t('Forgot password?')}</Link>
        </p>
      </div>
    )
  }

  const meta = ROLE_META[role]
  const Icon = meta.icon

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <button onClick={() => setStep('role')} className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink">
        <ChevronLeft size={15} /> {t('Choose a different role')}
      </button>

      <div className="mb-8 text-center">
        <span className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}>
          <Icon size={20} />
        </span>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink/40">{t('Step 2 of 2')}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Log in as')} {t(meta.label)}</h1>
        <p className="mt-2 text-sm text-ink/55">{t('Enter the username or email and password you registered with.')}</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        {authError && <p className="text-sm text-clay">{t(authError)}</p>}
        <div>
          <label className="label" htmlFor="identifier">{t('Username or email')}</label>
          <input id="identifier" className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={t('e.g. priya_k or priya@example.com')} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">{t('Password')}</label>
          <div className="relative">
            <input
              id="password" type={showPassword ? 'text' : 'password'} className="input pr-10"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink/60">
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-clay">{t(error)}</p>}
        <button type="submit" disabled={submitting} className="btn-accent w-full disabled:opacity-50">{t(submitting ? 'Signing in…' : 'Log in')}</button>
        <div className="space-y-3 border-t border-ink/10 pt-4">
          <p className="text-center text-xs text-ink/45">{t('Or continue with')}</p>
          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            onError={setError}
          />
        </div>
      </form>

      <p className="mt-10 flex flex-col items-center gap-2 text-center text-sm text-ink/55">
        <span>{t(`Don't have a ${meta.label.toLowerCase()} account?`)} <Link to="/register" className="font-semibold text-banyan-dark hover:underline">{t('Register now')}</Link></span>
        <Link to="/forgot-password" className="text-ink/45 hover:text-ink/70 hover:underline">{t('Forgot password?')}</Link>
      </p>
    </div>
  )
}
