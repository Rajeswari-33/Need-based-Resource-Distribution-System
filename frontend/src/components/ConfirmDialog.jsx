import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', tone = 'default', onConfirm, onCancel }) {
  const { t } = usePreferences()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-clay/10 text-clay' : 'bg-marigold/15 text-marigold-dark'}`}>
            <AlertTriangle size={17} />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">{t(title)}</h2>
            {description && <p className="mt-1 text-sm text-ink/60">{t(description)}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-outline px-3.5 py-2 text-sm">{t('Cancel')}</button>
          <button
            onClick={onConfirm}
            className={`px-3.5 py-2 text-sm font-semibold rounded-md ${tone === 'danger' ? 'bg-clay text-white hover:bg-clay/90' : 'bg-ink text-paper hover:bg-ink-light'}`}
          >
            {t(confirmLabel)}
          </button>
        </div>
      </div>
    </div>
  )
}
