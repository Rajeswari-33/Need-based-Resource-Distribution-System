import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getDashboardPath } from '../utils/dashboardHome.js'

// Pages that should never be hijacked into a dashboard redirect — a logged-out
// visitor (or a user mid-auth) landing here on refresh/back should stay put.
// '/' is included deliberately: opening (or refreshing, or backing into) the
// site's root should always show the public landing page first — even for an
// already-logged-in user — never auto-jump straight into a dashboard.
const EXEMPT_PATHS = ['/', '/login', '/register', '/forgot-password']

/**
 * Two rules, applied only while a user is logged in:
 *
 * 1. Hard refresh (F5 / reload) on any page -> send them to their role's
 *    default dashboard instead of re-showing whatever page they refreshed on.
 * 2. Browser back or forward button, from any page -> also land on the
 *    default dashboard, rather than replaying app history.
 *
 * Normal in-app navigation (sidebar links, "Claim this donation", etc.) uses
 * history.pushState under the hood and never triggers a 'popstate' event, so
 * it is completely unaffected by rule 2.
 */
export default function useDashboardRedirect() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const checkedReloadRef = useRef(false)

  // Rule 1 — hard refresh
  useEffect(() => {
    if (checkedReloadRef.current) return
    checkedReloadRef.current = true
    if (!currentUser) return
    if (EXEMPT_PATHS.includes(location.pathname)) return

    const entries = window.performance?.getEntriesByType?.('navigation')
    const isReload = entries && entries.length > 0
      ? entries[0].type === 'reload'
      : window.performance?.navigation?.type === 1 // legacy fallback

    if (isReload) {
      const dest = getDashboardPath(currentUser.role)
      if (location.pathname !== dest) {
        navigate(dest, { replace: true })
      }
    }
    // Intentionally run once, on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rule 2 — browser back / forward
  useEffect(() => {
    function handlePopState() {
      if (!currentUser) return
      if (EXEMPT_PATHS.includes(window.location.pathname)) return
      const dest = getDashboardPath(currentUser.role)
      navigate(dest, { replace: true })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser, navigate])
}
