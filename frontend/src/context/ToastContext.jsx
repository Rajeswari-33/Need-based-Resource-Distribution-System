import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { usePreferences } from './PreferencesContext.jsx'

const ToastContext = createContext(null)

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const STYLES = {
  success: 'border-banyan/30 bg-white text-banyan-dark',
  error: 'border-clay/30 bg-white text-clay',
  info: 'border-ink/15 bg-white text-ink/80',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const { t } = usePreferences()

  const showToast = useCallback((message, type = 'success') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    function showApiError(event) {
      showToast(event.detail || 'Unable to save changes to the server.', 'error')
    }
    window.addEventListener('setu:api-error', showApiError)
    return () => window.removeEventListener('setu:api-error', showApiError)
  }, [showToast])

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:right-4 sm:left-auto">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-md border px-4 py-3 shadow-card sm:w-96 ${STYLES[toast.type]}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm font-medium">{t(toast.message)}</p>
              <button onClick={() => dismiss(toast.id)} className="shrink-0 text-ink/30 hover:text-ink/60" aria-label={t('Dismiss')}>
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
