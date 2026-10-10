import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import RestrictedScreen from './RestrictedScreen.jsx'

export default function ProtectedRoute({ roles, children }) {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/" replace />
  // A restricted account gets no system access at all — every protected page shows the same
  // blocked screen instead of its normal content, regardless of role. Logging out still works
  // (that's outside this wrapper, in the navbar).
  if (currentUser.restricted) return <RestrictedScreen />
  return children
}
