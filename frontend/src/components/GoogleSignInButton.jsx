import React, { useEffect, useRef, useState } from 'react'
import { usePreferences } from '../context/PreferencesContext.jsx'

let googleScriptPromise

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (existing) {
        existing.addEventListener('load', resolve)
        existing.addEventListener('error', () => {
          googleScriptPromise = null
          reject(new Error('Google sign-in could not be loaded.'))
        })
        return
      }
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = resolve
      script.onerror = () => {
        googleScriptPromise = null
        reject(new Error('Google sign-in could not be loaded. Check your network connection and try again.'))
      }
      document.head.appendChild(script)
    })
  }
  return googleScriptPromise
}

export default function GoogleSignInButton({ onCredential, onError }) {
  const { language, t } = usePreferences()
  const buttonRef = useRef(null)
  const credentialHandler = useRef(onCredential)
  const errorHandler = useRef(onError)
  const [message, setMessage] = useState('')
  const [rendered, setRendered] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '944808987969-rcltpq050bnkni6jo9pvk5mv310666ps.apps.googleusercontent.com'

  credentialHandler.current = onCredential
  errorHandler.current = onError

  useEffect(() => {
    let active = true

    loadGoogleIdentity()
      .then(() => {
        if (!active || !buttonRef.current || !window.google?.accounts?.id) return
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: ({ credential }) => {
              if (credential) credentialHandler.current(credential)
              else errorHandler.current('Google did not return a sign-in credential.')
            },
          })
          buttonRef.current.replaceChildren()
          const width = Math.max(240, Math.min(380, buttonRef.current.offsetWidth || 300))
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width,
            locale: language,
          })
          setRendered(true)
        } catch (err) {
          console.warn('[Google Identity] renderButton issue:', err)
        }
      })
      .catch((error) => {
        if (active) {
          console.warn('[Google Identity] Load error:', error.message)
        }
      })

    return () => { active = false }
  }, [clientId, language])

  function handleFallbackClick() {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (credential) credentialHandler.current(credential)
            else errorHandler.current('Google did not return a sign-in credential.')
          },
        })
        window.google.accounts.id.prompt()
      } catch (err) {
        errorHandler.current(err.message || 'Google sign-in error.')
      }
    } else {
      loadGoogleIdentity()
        .then(() => {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: ({ credential }) => {
                if (credential) credentialHandler.current(credential)
                else errorHandler.current('Google did not return a sign-in credential.')
              },
            })
            window.google.accounts.id.prompt()
          }
        })
        .catch((err) => {
          errorHandler.current(err.message || 'Google sign-in is loading...')
        })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 justify-center">
        <div ref={buttonRef} className={rendered ? 'block' : 'hidden'} />
        {!rendered && (
          <button
            type="button"
            onClick={handleFallbackClick}
            className="flex w-full max-w-[320px] items-center justify-center gap-3 rounded border border-ink/20 bg-white px-4 py-2.5 text-sm font-medium text-ink/80 shadow-sm transition hover:bg-neutral-50 active:bg-neutral-100"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>{t('Continue with Google')}</span>
          </button>
        )}
      </div>
      {message && <p className="text-center text-xs text-ink/50">{t(message)}</p>}
    </div>
  )
}
