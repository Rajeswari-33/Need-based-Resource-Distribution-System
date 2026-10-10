import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ArrowRightLeft, Mail, CheckCircle2 } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function ForgotPassword() {
  const { t } = usePreferences()
  const { resetPasswordFor } = useAuth()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [known, setKnown] = useState(true)

  function handleSubmit(e) {
    e.preventDefault()
    setKnown(resetPasswordFor(email))
    setSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-ink text-marigold">
          <ArrowRightLeft size={20} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Reset your password')}</h1>
        <p className="mt-2 text-sm text-ink/55">{t('Enter the email on your Setu account and we\'ll send a reset link.')}</p>
      </div>

      {submitted ? (
        <div className="card flex items-start gap-3 p-5">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-banyan" />
          <div>
            <p className="text-sm font-semibold text-ink">
              {t(known ? 'Reset link sent' : 'If that account exists, a link was sent')}
            </p>
            <p className="mt-1 text-sm text-ink/55">
              {t(`Check ${email || 'your inbox'} for instructions. This is a demo, so no email is actually sent — head back to log in with a demo account instead.`)}
            </p>
            <Link to="/login" className="btn-outline mt-4 inline-flex">{t('Back to log in')}</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">{t('Email')}</label>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
              <input id="email" type="email" required className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('e.g. name@example.com')} />
            </div>
          </div>
          <button type="submit" className="btn-accent w-full">{t('Send reset link')}</button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink/55">
        {t('Remembered it?')} <Link to="/login" className="font-semibold text-banyan-dark hover:underline">{t('Log in')}</Link>
      </p>
    </div>
  )
}
