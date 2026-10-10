import React from 'react'
import { Link } from 'react-router-dom'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function NotFound() {
  const { t } = usePreferences()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-sm text-ink/40">404</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">{t("This page doesn't exist")}</h1>
      <p className="mt-2 text-sm text-ink/55">{t('Let\'s get you back to somewhere useful.')}</p>
      <Link to="/" className="btn-accent mt-6">{t('Back to home')}</Link>
    </div>
  )
}
