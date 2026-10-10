import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Ban, Mail } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

// Shown in place of ANY protected page once an admin restricts an account — the global Navbar
// (rendered once in App.jsx) still wraps this, so logging out is always reachable, but no
// dashboard, browsing, posting, claiming, or task action is.
export default function RestrictedScreen() {
  const { currentUser } = useAuth()
  const { t } = usePreferences()
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
        <Ban size={26} />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-ink">{t('Account restricted')}</h1>
      <p className="mt-2 text-sm text-ink/60">
        {t(`${currentUser?.name}, an admin has restricted this account. You won't be able to browse, post, claim, or accept anything on Setu until it's reinstated.`)}
      </p>
      <div className="mt-6 flex items-center justify-center gap-2 rounded-md border border-ink/10 bg-paper-dim px-4 py-3 text-sm text-ink/60">
        <Mail size={15} /> {t('Contact support to find out why and get this resolved.')}
      </div>
    </div>
  )
}
