import React, { createContext, useContext, useEffect, useState } from 'react'
import { backendApi } from '../lib/api.js'

const AuthContext = createContext(null)
const TOKEN_KEY = 'setu.authToken'

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setCurrentUser(null)
      return
    }
    backendApi.currentUser()
      .then((user) => {
        setAuthError('')
        setCurrentUser(user)
        setUsers((previous) => [...previous.filter((item) => item.id !== user.id), user])
        backendApi.users().then(setUsers).catch((error) => {
          console.error('Unable to load the user directory.', error)
          setAuthError(error.message)
        })
      })
      .catch((error) => {
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem(TOKEN_KEY)
        }
        setAuthError(error.message)
        setCurrentUser(null)
      })
  }, [])

  useEffect(() => {
    if (!currentUser || !localStorage.getItem(TOKEN_KEY)) return undefined
    let active = true
    async function refreshCurrentUser() {
      try {
        const user = await backendApi.currentUser()
        if (!active) return
        setCurrentUser(user)
        setUsers((previous) => [...previous.filter((item) => item.id !== user.id), user])
        if (user.role === 'admin') {
          backendApi.users().then(setUsers).catch((error) => {
            console.error('Unable to refresh the admin user directory.', error)
          })
        }
      } catch (error) {
        if (!active) return
        if (error.status === 401 || error.status === 403) {
          setCurrentUser(null)
          localStorage.removeItem(TOKEN_KEY)
          setAuthError(error.message)
        } else {
          console.error('Unable to refresh the signed-in account.', error)
        }
      }
    }
    window.addEventListener('focus', refreshCurrentUser)
    const refreshTimer = window.setInterval(refreshCurrentUser, 15000)
    return () => {
      active = false
      window.removeEventListener('focus', refreshCurrentUser)
      window.clearInterval(refreshTimer)
    }
  }, [currentUser?.id])

  function syncUser(user) {
    setUsers((previous) => [...previous.filter((item) => item.id !== user.id), user])
    if (currentUser?.id === user.id) {
      setCurrentUser(user)
    }
  }

  function saveSession({ user, token }) {
    setCurrentUser(user)
    setUsers((previous) => [...previous.filter((item) => item.id !== user.id), user])
    localStorage.setItem(TOKEN_KEY, token)
    backendApi.users().then(setUsers).catch((error) => {
      console.error('Unable to load the user directory.', error)
      setAuthError(error.message)
    })
  }

  function logout() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      backendApi.logout().catch((error) => {
        console.error('Unable to revoke the server session during logout.', error)
      })
    }
    setCurrentUser(null)
    localStorage.removeItem(TOKEN_KEY)
    setUsers([])
  }

  async function register(payload) {
    try {
      const session = await backendApi.register(payload)
      saveSession(session)
      setAuthError('')
      return { ok: true, user: session.user }
    } catch (error) {
      setAuthError(error.message)
      return { ok: false, error: error.message }
    }
  }

  async function login(identifier, password, expectedRole) {
    try {
      const session = await backendApi.login(identifier, password)
      if (expectedRole && session.user.role !== expectedRole) {
        return { ok: false, error: `That account is registered as ${session.user.role}, not ${expectedRole}. Choose the matching role to continue.` }
      }
      saveSession(session)
      setAuthError('')
      return { ok: true, user: session.user }
    } catch (error) {
      setAuthError(error.message)
      return { ok: false, error: error.message }
    }
  }

  async function loginWithGoogle(credential, role) {
    try {
      const session = await backendApi.googleLogin(credential, role)
      saveSession(session)
      setAuthError('')
      return { ok: true, user: session.user }
    } catch (error) {
      setAuthError(error.message)
      return { ok: false, error: error.message }
    }
  }

  function updateUser(userId, patch) {
    const metricFields = new Set(['impactPoints', 'donationsCompleted', 'tasksCompleted', 'activityScore'])
    if (Object.keys(patch).length && Object.keys(patch).every((field) => metricFields.has(field))) {
      const existing = users.find((user) => user.id === userId)
      if (!existing) return Promise.resolve(null)
      const updated = { ...existing, ...patch }
      syncUser(updated)
      return Promise.resolve(updated)
    }
    const update = backendApi.updateUser(userId, patch)
      .then((updatedUser) => {
        syncUser(updatedUser)
        return updatedUser
      })
      .catch((error) => {
        console.error('Unable to save user data to the API.', error)
        window.dispatchEvent(new CustomEvent('setu:api-error', { detail: error.message }))
        return null
      })
    return update
  }

  // ---- Contact (mobile / email) verification — simulated OTP, frontend-only. ----
  // No email or text message is actually sent; any 6-digit code is accepted, matching the
  // rest of the demo's "simulated" verification steps (see ID-document
  // verification below). This just flips the flag ResourceDetail checks before
  // showing the "Claim this donation" button.
  function verifyContact(userId, field) {
    if (field !== 'mobileVerified' && field !== 'emailVerified') return
    updateUser(userId, { [field]: true }).catch((error) => {
      console.error('Unable to save contact verification.', error)
    })
  }

  // ---- Identity verification workflow ----
  // Step 1: user submits an ID document from their Profile page. This alone does NOT verify
  // them — it only queues the account for an admin to review (verificationStatus: 'pending').
  async function submitVerification(userId, { docType, docNumber }) {
    const user = await backendApi.submitVerification(userId, { docType, docNumber })
    syncUser(user)
    return user
  }

  // Step 2 (admin-only, called from Admin > Manage Users): admin inspects the submitted
  // document and approves it. Only this call flips `verified` to true.
  async function approveVerification(userId) {
    const user = await backendApi.decideVerification(userId, true)
    syncUser(user)
    return user
  }

  // Step 2 (alternate outcome): admin rejects the document with a reason; the user can see
  // the reason on their Profile page and resubmit a corrected document.
  async function rejectVerification(userId, reason) {
    const user = await backendApi.decideVerification(userId, false, reason)
    syncUser(user)
    return user
  }

  function resetPasswordFor(email) {
    return users.some((u) => u.email.toLowerCase() === email.toLowerCase())
  }

  // ---- Behavior-monitoring account flags ----
  // Called by the data layer when it detects a suspicious pattern (repeated high-value
  // requests, excessive cancellations, exceeding the period value limit). This never bans
  // the account by itself — it only queues it for admin review.
  function flagAccountForReview(userId, reason) {
    const user = users.find((item) => item.id === userId)
    if (!user) return
    const reasons = user.flagReasons || []
    updateUser(userId, {
      flaggedForReview: true,
      flagReasons: reasons.includes(reason) ? reasons : [...reasons, reason],
    })
  }

  function clearAccountFlag(userId) {
    updateUser(userId, { flaggedForReview: false, flagReasons: [] })
  }

  // Permanently removes the account. The caller (Profile page) is responsible for logging
  // out immediately after if this was the current user — this function only touches the
  // users list. Historical resources/requests/messages referencing this id are left in
  // place (every lookup elsewhere already falls back gracefully when a user isn't found)
  // so other people's donation/request history stays intact.
  async function deleteAccount(userId) {
    await backendApi.deleteUser(userId)
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    if (currentUser?.id === userId) logout()
  }

  const value = {
    users, currentUser, authError, login, loginWithGoogle, logout, register, updateUser, resetPasswordFor,
    submitVerification, approveVerification, rejectVerification, verifyContact,
    flagAccountForReview, clearAccountFlag, deleteAccount,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
