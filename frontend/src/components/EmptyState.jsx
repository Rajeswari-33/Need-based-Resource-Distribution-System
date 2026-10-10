import React from 'react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function EmptyState({ icon, title, description, action }) {
  const { t } = usePreferences()
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink/15 bg-white/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <h3 className="font-display text-base font-semibold text-ink">{t(title)}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink/55">{t(description)}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
