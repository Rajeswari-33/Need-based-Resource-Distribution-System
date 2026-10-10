import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '../data/seed.js'
import { backendApi } from '../lib/api.js'
import { useAuth } from './AuthContext.jsx'

const DataContext = createContext(null)
let collectionWriteQueue = Promise.resolve()

function recordKey(collection, record) {
  if (collection === 'categories') return record
  if (collection === 'rewardClaims') return record.id || `${record.userId}:${record.badgeName}`
  return record.id
}

function useApiCollection(collection, initialValue = []) {
  const [records, setRecords] = useState(initialValue)
  const recordsRef = useRef(records)
  const readyRef = useRef(false)

  const hydrate = useCallback((nextRecords) => {
    const next = Array.isArray(nextRecords) ? nextRecords : []
    recordsRef.current = next
    readyRef.current = true
    setRecords(next)
  }, [])

  const update = useCallback((nextOrUpdater) => {
    const previous = recordsRef.current
    const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(previous) : nextOrUpdater
    if (!Array.isArray(next)) throw new TypeError(`Expected ${collection} data to be an array.`)
    recordsRef.current = next
    setRecords(next)
    if (!readyRef.current) return

    const oldById = new Map(previous.map((record) => [recordKey(collection, record), record]))
    const newById = new Map(next.map((record) => [recordKey(collection, record), record]))
    const upserts = [...newById.entries()]
      .filter(([key, value]) => JSON.stringify(oldById.get(key)) !== JSON.stringify(value))
      .map(([, value]) => collection === 'categories' ? { id: value, name: value } : value)
    const deletedIds = [...oldById.keys()].filter((key) => !newById.has(key))
    if (!upserts.length && !deletedIds.length) return
    if (collection === 'rewardClaims') return

    collectionWriteQueue = collectionWriteQueue
      .catch(() => {})
      .then(() => backendApi.syncCollection(collection, upserts, deletedIds))
      .catch((error) => {
        console.error(`Unable to save ${collection} data to the API.`, error)
        window.dispatchEvent(new CustomEvent('setu:api-error', { detail: error.message }))
        window.dispatchEvent(new Event('setu:refresh-data'))
      })
  }, [collection])

  const reset = useCallback((nextRecords = []) => {
    readyRef.current = false
    recordsRef.current = nextRecords
    setRecords(nextRecords)
  }, [])

  return [records, update, hydrate, reset]
}

const HIGH_VALUE_THRESHOLD = 5000
const MAX_ACTIVE_REQUESTS = 3
// Both the request-count cap and the value cap share the same rolling 30-day window.
const VALUE_LIMIT_PERIOD_DAYS = 30
const VALUE_LIMIT_AMOUNT = 5000
const CANCELLATION_FLAG_THRESHOLD = 3
// A single posted donation's estimated value is capped — this keeps the platform focused on
// everyday household items rather than high-value goods that need heavier due diligence.
const MAX_DONATION_VALUE = 1000

export function DataProvider({ children }) {
  const { users, currentUser, updateUser, flagAccountForReview, clearAccountFlag } = useAuth()
  const [resources, setResources, loadResources, resetResources] = useApiCollection('resources')
  const [requests, setRequests, loadRequests, resetRequests] = useApiCollection('requests')
  const [centers, setCenters, loadCenters, resetCenters] = useApiCollection('centers')
  const [centersLoaded, setCentersLoaded] = useState(false)
  const [tasks, setTasks, loadTasks, resetTasks] = useApiCollection('tasks')
  const taskMutationVersion = useRef(0)
  const [notifications, setNotifications, loadNotifications, resetNotifications] = useApiCollection('notifications')
  const [categories, setCategories, loadCategories, resetCategories] = useApiCollection('categories', CATEGORIES)
  const [reports, setReports, loadReports, resetReports] = useApiCollection('reports')
  const [messages, setMessages, loadMessages, resetMessages] = useApiCollection('messages')
  const [rewardClaims, setRewardClaims, loadRewardClaims, resetRewardClaims] = useApiCollection('rewardClaims')

  useEffect(() => {
    let active = true
    if (!currentUser) {
      setCentersLoaded(false)
      resetResources()
      resetRequests()
      resetCenters()
      resetTasks()
      resetNotifications()
      resetCategories(CATEGORIES)
      resetReports()
      resetMessages()
      resetRewardClaims()
      return () => { active = false }
    }

    setCentersLoaded(false)
    async function refreshData(reportError) {
      const taskVersionAtStart = taskMutationVersion.current
      backendApi.tasks()
        .then((taskData) => {
          if (active && taskVersionAtStart === taskMutationVersion.current) loadTasks(taskData)
        })
        .catch((error) => {
          if (!active) return
          console.error('Unable to load task assignments from the API.', error)
          if (reportError) window.dispatchEvent(new CustomEvent('setu:api-error', { detail: error.message }))
        })
      try {
        const [donationData, requestData, platformData, rewardData] = await Promise.all([
          backendApi.donations(),
          backendApi.requests(),
          backendApi.platformData(),
          backendApi.rewards(),
        ])
        if (!active) return
        loadResources(donationData)
        loadRequests(requestData)
        loadCenters(platformData.centers)
        setCentersLoaded(true)
        loadNotifications(platformData.notifications)
        loadCategories(platformData.categories)
        loadReports(platformData.reports)
        loadMessages(platformData.messages)
        loadRewardClaims(rewardData.rewards.filter((reward) => reward.claimed).map((reward) => ({
          userId: currentUser.id,
          badgeName: reward.name,
          id: `${currentUser.id}:${reward.name}`,
        })))
      } catch (error) {
        if (!active) return
        console.error('Unable to load application data from the API.', error)
        if (reportError) window.dispatchEvent(new CustomEvent('setu:api-error', { detail: error.message }))
      }
    }
    const refreshOnChange = () => refreshData(true)
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') refreshData(false)
    }
    refreshData(true)
    window.addEventListener('setu:refresh-data', refreshOnChange)
    window.addEventListener('focus', refreshOnFocus)
    const refreshTimer = window.setInterval(() => refreshData(false), 20000)
    return () => {
      active = false
      window.removeEventListener('setu:refresh-data', refreshOnChange)
      window.removeEventListener('focus', refreshOnFocus)
      window.clearInterval(refreshTimer)
    }
  }, [
    currentUser?.id,
    loadCategories, loadCenters, loadMessages, loadNotifications, loadReports, loadRequests,
    loadResources, loadRewardClaims, loadTasks, resetCategories, resetCenters, resetMessages,
    resetNotifications, resetReports, resetRequests, resetResources, resetRewardClaims, resetTasks,
  ])

  // `link` is where the notification should take the user when they click it — e.g. a donor
  // notified about a new request lands on /donor/requests, where the actual Approve/Reject
  // buttons live. Without this, a notification is just text with nothing to act on.
  // `related` (optional) is { type, id } — e.g. { type: 'request', id: 'req-123' }. It's what
  // lets the UI show this notification INLINE next to the specific request/resource/task it's
  // about (via notificationsForItem), instead of only in the one big global Notifications list —
  // dumping every notification about every item into one undifferentiated list makes it hard to
  // tell which item each one is about, especially once several items each have their own history.
  function notify(userId, message, link = null, related = null) {
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, userId, message, link, read: false,
        relatedType: related?.type || null, relatedId: related?.id || null,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])

    // Automatically send to the recipient's linked WhatsApp number
    try {
      const recipient = users.find((u) => u.id === userId) || (currentUser?.id === userId ? currentUser : null)
      const recipientPhone = recipient?.phone
      backendApi.notifyUserWhatsApp({
        userId,
        phone: recipientPhone,
        message,
        subject: 'Setu Donation Update',
      }).catch((err) => {
        console.warn('[WhatsApp] Auto-notify dispatch warning:', err.message)
      })
    } catch {
      // Non-blocking
    }
  }

  function notifyDonationParticipants({ request, resource, task }, messages, defaultLink = null) {
    const linkedRequest = request || requests.find((item) =>
      (task?.requestId && item.id === task.requestId) ||
      (resource && item.resourceId === resource.id && item.recipientId === task?.recipientId),
    )
    const linkedResource = resource || resources.find((item) => item.id === (task?.resourceId || linkedRequest?.resourceId))
    const linkedTask = task || tasks.find((item) => item.requestId === linkedRequest?.id)
    const participants = new Set([
      linkedRequest?.donorId,
      linkedRequest?.recipientId,
      linkedResource?.donorId,
      linkedTask?.donorId,
      linkedTask?.recipientId,
      linkedTask?.volunteerId,
    ].filter(Boolean))
    if (linkedTask?.centerId) {
      const center = centers.find((item) => item.id === linkedTask.centerId)
      if (center?.coordinatorId) participants.add(center.coordinatorId)
    }
    const related = linkedRequest
      ? { type: 'request', id: linkedRequest.id }
      : linkedResource
        ? { type: 'resource', id: linkedResource.id }
        : linkedTask ? { type: 'task', id: linkedTask.id } : null
    participants.forEach((participantId) => {
      const participant = users.find((user) => user.id === participantId)
      const link = participant?.role === 'volunteer' ? '/volunteer'
        : participant?.role === 'donor' ? '/donor/requests'
          : participant?.role === 'center' ? '/center' : defaultLink || '/recipient/requests'
      const message = typeof messages === 'string'
        ? messages
        : messages[participant?.role] || messages.default
      if (message) notify(participantId, message, link, related)
    })
  }

  function broadcast(message, roleFilter, link = null, related = null) {
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, userId: '__broadcast__', role: roleFilter || 'all', message, link, read: false,
        relatedType: related?.type || null, relatedId: related?.id || null,
        dismissedFor: [],
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
  }

  // ---- Resources ----
  // audience: 'individual' -> open to individual recipients only.
  //           'center'     -> for registered recipient centers only.
  // centerScope (only when audience === 'center'): 'specific' (donor picked one registered
  //   center; it's pushed straight there, no claiming) or 'open' (any approved center may claim
  //   it). These two fields are the source of truth — `method`/`centerId` are derived from them
  //   so older logic that reads `method`/`centerId` keeps working unchanged.
  function addResource(resource) {
    const donor = users.find((u) => u.id === resource.donorId)
    if (donor?.restricted) {
      return { ok: false, error: 'Your account is currently restricted. Contact support to resolve this before posting.' }
    }
    if (!donor || donor.verificationStatus !== 'verified') {
      return { ok: false, error: 'Please verify your account (submit an ID document from your Profile page) before posting donations.' }
    }
    const enteredValue = Number(resource.value) || 0
    if (enteredValue > MAX_DONATION_VALUE) {
      return { ok: false, error: `Estimated value can't exceed ₹${MAX_DONATION_VALUE.toLocaleString('en-IN')} per posting. For a higher-value item, list it at a conservative estimate or split it into smaller postings.` }
    }
    const id = `r-${Date.now()}`
    const audience = resource.audience || 'individual'
    const centerScope = audience === 'center' ? (resource.centerScope || 'open') : null
    const method = audience === 'center' && centerScope === 'specific' ? 'center' : 'direct'
    const centerId = method === 'center' ? resource.centerId : null
    const withDefaults = {
      id,
      status: 'available',
      createdAt: new Date().toISOString(),
      flaggedListing: false,
      ...resource,
      audience, centerScope, method, centerId,
      // Only meaningful for method:'center' items — the center gets a real accept/reject
      // choice before any delivery logistics happen, rather than the item just appearing as
      // theirs to keep.
      centerDecision: method === 'center' ? 'pending' : null,
    }
    setResources((prev) => [withDefaults, ...prev])
    // A donation the donor directed at one specific center shows up as an incoming donation
    // right away — the center didn't request it, so let its coordinator know it's waiting on
    // their accept/reject decision.
    if (method === 'center' && centerId) {
      const targetCenter = centers.find((c) => c.id === centerId)
      if (targetCenter?.coordinatorId) {
        notify(targetCenter.coordinatorId, `A donor sent "${withDefaults.title}" directly to ${targetCenter.name}. Accept or reject it from Incoming Donations.`, '/center', { type: 'resource', id })
      }
    }
    return { ok: true, resource: withDefaults }
  }

  function updateResource(id, patch) {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function flagListing(id, reason) {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, flaggedListing: true, flagReason: reason } : r)))
  }

  function unflagListing(id) {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, flaggedListing: false, flagReason: null } : r)))
  }

  function removeListing(id) {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'removed' } : r)))
  }

  function withdrawResource(id) {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'withdrawn' } : r)))
  }

  // ---- Requests / Claims ----
  // Requests made in the last 30 days (same rolling window as the value cap below), not just
  // ones still open — a request only stops counting once its 30-day window rolls over.
  // A claimed bundle is still exactly one request row, so it only ever counts as one
  // toward this limit — the bundle's contents are tracked separately (see isBundle/bundleItems).
  function activeRequestCount(recipientId, days = VALUE_LIMIT_PERIOD_DAYS) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return requests.filter((r) => r.recipientId === recipientId && !['rejected', 'cancelled'].includes(r.status) && new Date(r.createdAt).getTime() >= cutoff).length
  }

  function cancelledCount(recipientId) {
    return requests.filter((r) => r.recipientId === recipientId && r.status === 'cancelled').length
  }

  function canRequest(recipientId) {
    return activeRequestCount(recipientId) < MAX_ACTIVE_REQUESTS
  }

  // Sum of claimed value within the rolling value-limit window, regardless of per-request
  // active/inactive status (a rejected/cancelled request never counted, so it's excluded).
  function valueClaimedInPeriod(recipientId, days = VALUE_LIMIT_PERIOD_DAYS) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return requests
      .filter((r) => r.recipientId === recipientId && !['rejected', 'cancelled'].includes(r.status) && new Date(r.createdAt).getTime() >= cutoff)
      .reduce((sum, r) => sum + (r.value || 0), 0)
  }

  // ---- Quantity-aware availability ----
  // A resource with quantity > 1 (e.g. "5 blankets") should stay claimable by other
  // recipients/centers until every unit is spoken for — not disappear after the very
  // first claim. `computeAvailability` looks at every request against a resource
  // (requested/approved/completed all reserve their quantity) and derives what the
  // resource's status should be. It never overrides a donor/admin-driven status like
  // 'withdrawn' or 'removed'.
  function computeAvailability(resource, requestsList) {
    const total = resource.quantity || 1
    const relevant = requestsList.filter((r) => r.resourceId === resource.id && ['requested', 'approved', 'completed'].includes(r.status))
    const claimedQty = relevant.reduce((sum, r) => sum + (r.quantity || 1), 0)
    const completedQty = requestsList
      .filter((r) => r.resourceId === resource.id && r.status === 'completed')
      .reduce((sum, r) => sum + (r.quantity || 1), 0)
    const remaining = Math.max(0, total - claimedQty)
    let status
    if (completedQty >= total) status = 'completed'
    else if (remaining <= 0) status = 'pending'
    else status = 'available'
    return { total, claimedQty, completedQty, remaining, status }
  }

  // Call after any change to `requests` that could affect a resource's claimable stock.
  // Pass the ALREADY-UPDATED requests array (not the stale `requests` closure) so the
  // computed status reflects the change that just happened.
  function syncResourceAvailability(resourceId, updatedRequests) {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return
    if (resource.status === 'withdrawn' || resource.status === 'removed') return
    const avail = computeAvailability(resource, updatedRequests)
    if (avail.status !== resource.status) updateResource(resourceId, { status: avail.status })
  }

  // Live remaining-stock lookup for the UI (Browse / ResourceDetail / ResourceCard).
  function getAvailability(resourceId) {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return { total: 1, claimedQty: 0, completedQty: 0, remaining: 0, status: 'available' }
    return computeAvailability(resource, requests)
  }

  function submitRequest({ resourceId, recipientId, reason, beneficiary, quantity, urgency, supportingDoc }) {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return { ok: false, error: 'Resource not found.' }
    if (resource.status === 'withdrawn' || resource.status === 'removed') {
      return { ok: false, error: 'This item is no longer listed.' }
    }
    const requestedQty = resource.isBundle ? resource.quantity : (Number(quantity) || 1)
    const avail = computeAvailability(resource, requests)
    if (avail.remaining <= 0) {
      return { ok: false, error: 'This item has already been fully claimed and is no longer available.' }
    }
    if (requestedQty > avail.remaining) {
      return { ok: false, error: `Only ${avail.remaining} of ${avail.total} left — please request ${avail.remaining} or fewer.` }
    }
    const recipient = users.find((u) => u.id === recipientId)
    const claimingCenter = recipient?.role === 'center' ? centers.find((c) => c.id === recipient.centerId) : null

    // The donor's audience choice restricts who may claim: an 'individual' donation is for
    // individual recipients only; a 'center' donation (whether open to any center or routed to
    // one specific center) is for registered recipient centers only.
    if (resource.audience === 'individual' && recipient?.role !== 'recipient') {
      return { ok: false, error: 'This donation was posted for individual recipients only — registered centers cannot claim it.' }
    }
    if (resource.audience === 'center' && recipient?.role !== 'center') {
      return { ok: false, error: 'This donation was posted for registered recipient centers only — it is not open to individual recipients.' }
    }
    if (resource.method === 'center') {
      return { ok: false, error: 'The donor sent this directly to a specific center — it is not claimable through a request. The center just needs to confirm receipt from its dashboard.' }
    }
    if (recipient?.restricted) {
      return { ok: false, error: 'Your account is currently restricted. Contact support to resolve this before claiming resources.' }
    }
    // NOTE: mobile/email OTP verification is captured at registration and is informational
    // only from here on — it must never independently block claiming. Admin's document
    // verification (verificationStatus / center.approved) below is the ONE gate for claiming,
    // matching exactly what Profile / Center Profile shows the user as "Verified".
    // Verification is checked differently depending on who's claiming: an individual recipient's
    // OWN identity document is what matters; a center's claim requires BOTH of its two
    // sequential steps — the institution's own registration AND this coordinator's personal
    // proof of affiliation with it. Either one missing blocks the claim.
    if (recipient?.role === 'center') {
      if (!claimingCenter) {
        return { ok: false, error: 'No registered center is linked to this coordinator account yet. Contact support.' }
      }
      if (!claimingCenter.approved) {
        return { ok: false, error: `Step 1 of 2 isn't done: "${claimingCenter.name}" hasn't been verified by an admin yet. Submit your institution's registration document from Center Profile before claiming resources.` }
      }
      if (recipient.verificationStatus !== 'verified') {
        return { ok: false, error: `Step 2 of 2 isn't done: your own coordinator verification is still needed. Submit your affiliation document from Center Profile before claiming resources.` }
      }
    } else if (!recipient || recipient.verificationStatus !== 'verified') {
      return { ok: false, error: 'Please verify your account (submit an ID document from your Profile page) before claiming resources.' }
    }
    if (!canRequest(recipientId)) {
      return { ok: false, error: `You have reached the maximum of ${MAX_ACTIVE_REQUESTS} requests in the last ${VALUE_LIMIT_PERIOD_DAYS} days. Complete or cancel one, or wait for the window to roll over, before claiming again.` }
    }
    const unitValue = (resource.value || 0) / (resource.quantity || 1)
    const value = Math.round(unitValue * requestedQty)
    const isHighValue = value >= HIGH_VALUE_THRESHOLD
    if (isHighValue && !supportingDoc) {
      return { ok: false, error: 'This is a high-value claim. Please attach a supporting document before submitting.' }
    }
    const periodTotal = valueClaimedInPeriod(recipientId) + value
    if (periodTotal > VALUE_LIMIT_AMOUNT && !supportingDoc) {
      return {
        ok: false,
        error: `This would put you at ₹${periodTotal.toLocaleString('en-IN')} claimed in the last ${VALUE_LIMIT_PERIOD_DAYS} days, above the ₹${VALUE_LIMIT_AMOUNT.toLocaleString('en-IN')} limit for that period. Attach a supporting document to request an exception — it will go to admin review.`,
      }
    }

    // ---- Behavior monitoring: repeated high-value claims, excessive cancellations, or
    // breaching the period value limit → flag for admin review. This never blocks the claim
    // outright; it only queues the account and this specific claim for a closer look.
    const flagReasons = []
    const priorHighValueRequests = requests.filter((r) => r.recipientId === recipientId && r.value >= HIGH_VALUE_THRESHOLD && !['rejected', 'cancelled'].includes(r.status)).length
    if (isHighValue && priorHighValueRequests >= 1) flagReasons.push('Repeated high-value requests from this account')
    if (cancelledCount(recipientId) >= CANCELLATION_FLAG_THRESHOLD) flagReasons.push(`Excessive cancellations (${cancelledCount(recipientId)} so far)`)
    if (periodTotal > VALUE_LIMIT_AMOUNT) flagReasons.push(`Exceeds the ₹${VALUE_LIMIT_AMOUNT.toLocaleString('en-IN')} / ${VALUE_LIMIT_PERIOD_DAYS}-day value limit`)
    const flagged = flagReasons.length > 0

    const id = `req-${Date.now()}`
    const donorUser = users.find((u) => u.id === resource.donorId)
    const newRequest = {
      id, resourceId, recipientId,
      recipientPhone: recipient?.phone || '',
      recipientName: recipient?.name || '',
      donorId: resource.donorId,
      donorPhone: donorUser?.phone || '',
      donorName: donorUser?.name || '',
      reason, beneficiary,
      quantity: requestedQty, urgency,
      requesterType: recipient.role === 'center' ? 'center' : 'individual',
      status: 'requested', value, flagged, flagReasons,
      adminDecision: null, adminNote: null, additionalInfo: null,
      isBundle: !!resource.isBundle, bundleItems: resource.isBundle ? resource.bundleItems : null,
      supportingDoc: supportingDoc || null,
      donorConfirmed: false, recipientConfirmed: false,
      createdAt: new Date().toISOString(),
    }
    const updatedRequests = [newRequest, ...requests]
    setRequests(updatedRequests)
    syncResourceAvailability(resourceId, updatedRequests)
    const requesterLabel = recipient.role === 'center' ? `${claimingCenter?.name || 'A registered center'} (Center)` : `${recipient.name} (Individual recipient)`
    notifyDonationParticipants(
      { request: newRequest, resource },
      {
        donor: `New claim on "${resource.title}" (${requestedQty} of ${resource.quantity || 1}) from ${requesterLabel}. Review and respond to the request.`,
        recipient: `Your request for "${resource.title}" was sent to the donor.`,
        center: `Your center's request for "${resource.title}" was sent to the donor.`,
      },
      '/donor/requests',
    )
    notify(recipientId, `Your request for "${resource.title}" was submitted to the donor.`, '/recipient/active', { type: 'request', id })
    if (flagged) {
      flagAccountForReview(recipientId, flagReasons.join('; '))
      notify('u-admin-1', `Claim flagged for review (${recipient.name}): ${flagReasons.join('; ')}`, '/admin/users', { type: 'request', id })
      notify(recipientId, 'Your claim was submitted, but it needs an extra verification step before it reaches the donor\'s queue. An admin will review it shortly.', '/recipient/requests', { type: 'request', id })
    }
    return { ok: true, request: newRequest, flagged }
  }

  // ---- Resource-less "needs" — a recipient/center declares a need directly (mirrors a
  // donor's "Post New Donation"), instead of claiming an already-listed resource. Stored in
  // the same `requests` list (resourceId: null, needRequest: true) so it shows up naturally
  // in Active Requests / Request History / Received Donations alongside real claims. There is
  // no auto-matching engine here — it sits as "requested" until a donor/admin/center manually
  // links a donation to it, or the recipient cancels it.
  function submitNeedRequest({ recipientId, title, category, reason, beneficiary, quantity, urgency, supportingDoc }) {
    const recipient = users.find((u) => u.id === recipientId)
    const requestingCenter = recipient?.role === 'center' ? centers.find((c) => c.id === recipient.centerId) : null
    if (recipient?.restricted) {
      return { ok: false, error: 'Your account is currently restricted. Contact support to resolve this before requesting resources.' }
    }
    // Same two-step gate as submitRequest: a center's claim needs BOTH the institution's own
    // admin-approved registration AND this coordinator's personal proof of affiliation.
    if (recipient?.role === 'center') {
      if (!requestingCenter) {
        return { ok: false, error: 'No registered center is linked to this coordinator account yet. Contact support.' }
      }
      if (!requestingCenter.approved) {
        return { ok: false, error: `Step 1 of 2 isn't done: "${requestingCenter.name}" hasn't been verified by an admin yet. Submit your institution's registration document from Center Profile before requesting resources.` }
      }
      if (recipient.verificationStatus !== 'verified') {
        return { ok: false, error: `Step 2 of 2 isn't done: your own coordinator verification is still needed. Submit your affiliation document from Center Profile before requesting resources.` }
      }
    } else if (!recipient || recipient.verificationStatus !== 'verified') {
      return { ok: false, error: 'Please verify your account (submit an ID document from your Profile page) before requesting resources.' }
    }
    if (!canRequest(recipientId)) {
      return { ok: false, error: `You have reached the maximum of ${MAX_ACTIVE_REQUESTS} requests in the last ${VALUE_LIMIT_PERIOD_DAYS} days. Complete or cancel one, or wait for the window to roll over, before requesting again.` }
    }
    const id = `req-${Date.now()}`
    const newRequest = {
      id, resourceId: null, recipientId, title, category,
      reason, beneficiary, quantity: Number(quantity) || 1, urgency,
      requesterType: recipient.role === 'center' ? 'center' : 'individual',
      status: 'requested', value: 0, flagged: false, flagReasons: [],
      adminDecision: null, adminNote: null, additionalInfo: null,
      isBundle: false, bundleItems: null, supportingDoc: supportingDoc || null,
      donorConfirmed: false, recipientConfirmed: false,
      needRequest: true,
      createdAt: new Date().toISOString(),
    }
    setRequests((prev) => [newRequest, ...prev])
    notify('u-admin-1', `${recipient.name} submitted a resource need: "${title}" (no matching donation yet).`, '/admin/users', { type: 'request', id })
    return { ok: true, request: newRequest }
  }

  async function fulfillNeedRequest(requestId, resourceId) {
    const need = requests.find((item) => item.id === requestId)
    const resource = resources.find((item) => item.id === resourceId)
    if (!need?.needRequest || need.status !== 'requested' || need.resourceId) {
      return { ok: false, error: 'This need has already been matched, withdrawn, or fulfilled.' }
    }
    if (!resource || resource.donorId !== currentUser?.id || resource.method === 'center') {
      return { ok: false, error: 'Choose one of your own listed donations that is available for requests.' }
    }
    if (resource.category !== need.category || getAvailability(resourceId).remaining < (Number(need.quantity) || 1)) {
      return { ok: false, error: 'Choose a donation in the requested category with enough available quantity.' }
    }
    try {
      const result = await backendApi.fulfillNeedRequest(requestId, resourceId)
      if (!result?.ok || !result.request || !result.resource) throw new Error('The server did not confirm this donation match.')
      loadRequests(requests.map((item) => item.id === requestId ? result.request : item))
      loadResources(resources.map((item) => item.id === resourceId ? result.resource : item))
      window.dispatchEvent(new Event('setu:refresh-data'))
      return { ok: true, request: result.request }
    } catch (error) {
      return { ok: false, error: error.message || 'Unable to match this donation to the need. Please try again.' }
    }
  }

  function setRequestStatus(requestId, status, extra = {}) {
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    const statusTimestamp = status === 'approved' && !req.approvedAt
      ? { approvedAt: new Date().toISOString() }
      : {}
    const updatedRequests = requests.map((r) => (r.id === requestId ? { ...r, status, ...statusTimestamp, ...extra } : r))
    setRequests(updatedRequests)
    if (['rejected', 'cancelled', 'completed'].includes(status) && req.resourceId) {
      syncResourceAvailability(req.resourceId, updatedRequests)
    }
    if (status === 'approved') {
      notifyDonationParticipants(
        { request: req, resource: resources.find((item) => item.id === req.resourceId) },
        {
          donor: `You approved the request for "${resources.find((item) => item.id === req.resourceId)?.title || 'your donation'}". Coordinate handover or pickup with the recipient.`,
          recipient: `Your request for "${resources.find((item) => item.id === req.resourceId)?.title || 'the donation'}" was approved. Coordinate handover or pickup with the donor.`,
          center: `Your center's request for "${resources.find((item) => item.id === req.resourceId)?.title || 'the donation'}" was approved. Coordinate handover or pickup with the donor.`,
        },
        '/recipient/requests',
      )
    }
    if (status === 'completed') {
      notifyDonationParticipants(
        { request: req, resource: resources.find((item) => item.id === req.resourceId) },
        {
          donor: `Your donation "${resources.find((item) => item.id === req.resourceId)?.title || 'item'}" was marked complete.`,
          recipient: `Your request for "${resources.find((item) => item.id === req.resourceId)?.title || 'the donation'}" was marked complete.`,
          center: `Your center's request for "${resources.find((item) => item.id === req.resourceId)?.title || 'the donation'}" was marked complete.`,
        },
        '/recipient/requests',
      )
    }
    if (status === 'rejected' || status === 'cancelled') {
      notifyDonationParticipants(
        { request: req, resource: resources.find((item) => item.id === req.resourceId) },
        {
          donor: `The request for your donation "${resources.find((item) => item.id === req.resourceId)?.title || 'item'}" was ${status}.`,
          recipient: `Your request for "${resources.find((item) => item.id === req.resourceId)?.title || 'the donation'}" was ${status}.`,
          center: `Your center's request for "${resources.find((item) => item.id === req.resourceId)?.title || 'the donation'}" was ${status}.`,
        },
        '/recipient/requests',
      )
    }
  }

  function setRequestDeliveryMode(requestId, deliveryMode) {
    if (!['hand-to-hand', 'volunteer'].includes(deliveryMode)) return
    const request = requests.find((item) => item.id === requestId)
    if (!request || request.status !== 'approved') return
    setRequests((previous) => previous.map((item) => item.id === requestId ? { ...item, deliveryMode } : item))
    notifyDonationParticipants(
      { request, resource: resources.find((item) => item.id === request.resourceId) },
      deliveryMode === 'volunteer'
        ? {
            donor: 'You selected volunteer pickup and delivery for this donation.',
            recipient: 'The donor arranged volunteer pickup and delivery for your requested donation.',
            center: 'The donor arranged volunteer pickup and delivery for your center’s requested donation.',
            volunteer: 'A volunteer pickup and delivery task is available for this donation.',
          }
        : {
            donor: 'You selected hand-to-hand delivery for this donation.',
            recipient: 'The donor selected hand-to-hand delivery for your requested donation.',
            center: 'The donor selected hand-to-hand delivery for your center’s requested donation.',
          },
    )
  }

  // ---- Admin review of flagged claims ----
  // decision: 'approve' | 'info_requested' | 'restrict' | 'reject'
  function adminReviewRequest(requestId, decision, note = '') {
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    const resource = resources.find((r) => r.id === req.resourceId)
    const recipient = users.find((u) => u.id === req.recipientId)

    if (decision === 'approve') {
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, flagged: false, adminDecision: 'approved', adminNote: note || null } : r)))
      notify(req.recipientId, `Your claim on "${resource?.title || 'a resource'}" passed admin review and is now with the donor for approval.`, '/recipient/requests', { type: 'request', id: requestId })
    } else if (decision === 'info_requested') {
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, adminDecision: 'info_requested', adminNote: note || 'Please provide more information to support your claim.' } : r)))
      notify(req.recipientId, `An admin needs more information about your claim on "${resource?.title || 'a resource'}": "${note || 'Please provide more information.'}"`, '/recipient/requests', { type: 'request', id: requestId })
    } else if (decision === 'restrict') {
      updateUser(req.recipientId, { restricted: true })
      const updatedRequests = requests.map((r) => (r.id === requestId ? { ...r, status: 'rejected', adminDecision: 'restricted', adminNote: note || null } : r))
      setRequests(updatedRequests)
      if (req.resourceId) syncResourceAvailability(req.resourceId, updatedRequests)
      notify(req.recipientId, `Your account was restricted following review of your claim on "${resource?.title || 'a resource'}"${note ? `: "${note}"` : '.'} Contact support to resolve this.`, '/profile', { type: 'request', id: requestId })
    } else if (decision === 'reject') {
      const updatedRequests = requests.map((r) => (r.id === requestId ? { ...r, status: 'rejected', adminDecision: 'rejected', adminNote: note || null } : r))
      setRequests(updatedRequests)
      if (req.resourceId) syncResourceAvailability(req.resourceId, updatedRequests)
      notify(req.recipientId, `Your claim on "${resource?.title || 'a resource'}" was rejected after review${note ? `: "${note}"` : '.'}`, '/recipient/requests', { type: 'request', id: requestId })
    }
    // Clear the account-level flag once every one of the recipient's flagged, still-open
    // claims has an admin decision — keeps the queue from showing stale flags forever.
    if (decision !== 'info_requested') {
      const stillOpenFlags = requests.some((r) => r.recipientId === req.recipientId && r.id !== requestId && r.flagged && !r.adminDecision && !['rejected', 'cancelled'].includes(r.status))
      if (!stillOpenFlags && recipient?.flaggedForReview) {
        clearAccountFlag(req.recipientId)
      }
    }
  }

  // Recipient responds to an admin's "request more information" decision — puts the claim
  // back in front of the admin instead of silently reopening it with the donor.
  function provideAdditionalInfo(requestId, info) {
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, additionalInfo: info, adminDecision: null } : r)))
    const req = requests.find((r) => r.id === requestId)
    if (req) notify('u-admin-1', `Additional info provided for a flagged claim — ready for re-review.`, '/admin/users', { type: 'request', id: requestId })
  }

  // Dual confirmation: both donor and recipient confirm the handover before it's marked complete.
  function confirmHandover(requestId, role) {
    const req = requests.find((r) => r.id === requestId)
    if (!req || req.status === 'completed') return
    const confirmedAt = new Date().toISOString()
    const patch = role === 'donor'
      ? { donorConfirmed: true, donorConfirmedAt: confirmedAt }
      : { recipientConfirmed: true, recipientConfirmedAt: confirmedAt }
    const willComplete = (role === 'donor' ? true : req.donorConfirmed) && (role === 'recipient' ? true : req.recipientConfirmed)
    const updatedRequests = requests.map((r) => (r.id === requestId ? {
      ...r,
      ...patch,
      status: willComplete ? 'completed' : r.status,
      ...(willComplete ? { completedAt: confirmedAt } : {}),
      impactPointAwarded: willComplete ? true : r.impactPointAwarded,
    } : r))
    setRequests(updatedRequests)
    if (willComplete) {
      if (req.resourceId) syncResourceAvailability(req.resourceId, updatedRequests)
      const resource = resources.find((res) => res.id === req.resourceId)
      const donorId = req.donorId || resource?.donorId
      if (donorId && !req.impactPointAwarded) {
        const donor = users.find((user) => user.id === donorId)
        if (donor) updateUser(donor.id, { impactPoints: (donor.impactPoints || 0) + 1 })
      }
      notifyDonationParticipants(
        { request: req, resource: resources.find((res) => res.id === req.resourceId) },
        {
          donor: 'The recipient confirmed receipt. Your donation is complete.',
          recipient: 'The donor confirmed the handover. Your requested donation is complete.',
          center: 'The donor confirmed the handover. Your center’s requested donation is complete.',
          volunteer: 'The donor and recipient confirmed handover. This delivery is complete.',
        },
      )
    } else {
      const confirmation = role === 'donor'
        ? {
            donor: 'You confirmed the handover. The recipient still needs to confirm receipt.',
            recipient: 'The donor confirmed handover. Please confirm receipt to complete this donation.',
            center: 'The donor confirmed handover. Please confirm receipt for your center to complete this donation.',
            volunteer: 'The donor confirmed handover. Delivery can proceed; the recipient or center still needs to confirm receipt.',
          }
        : {
            donor: 'The recipient confirmed receipt. Please confirm the handover to complete this donation.',
            recipient: 'You confirmed receipt. The donor still needs to confirm the handover.',
            center: 'Your center confirmed receipt. The donor still needs to confirm the handover.',
            volunteer: 'The recipient or center confirmed receipt. The donor still needs to confirm the handover.',
          }
      notifyDonationParticipants(
        { request: req, resource: resources.find((res) => res.id === req.resourceId) },
        confirmation,
      )
    }
  }

  function addRating(requestId, rating, note) {
    const req = requests.find((r) => r.id === requestId)
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, rating, thankYouNote: note } : r)))
    // The donor is notified immediately so they know their donation was rated —
    // visible on their Notifications page and in Manage Donations.
    if (req) {
      const resource = resources.find((r) => r.id === req.resourceId)
      const recipient = users.find((u) => u.id === req.recipientId)
      if (resource) {
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
        notify(
          resource.donorId,
          `${recipient?.name || 'A recipient'} rated your donation "${resource.title}" ${stars}${note ? ` and left a note: "${note}"` : '.'}`,
          '/donor/donations',
          { type: 'resource', id: resource.id }
        )
      }
    }
  }

  // ---- Centers ----
  // A center's own registration verification mirrors the individual document-verification
  // pipeline (submit -> pending -> admin approves/rejects), but scoped to the institution
  // (its registration certificate), not the coordinator's personal ID. `approved` is the
  // resulting gate used everywhere a center needs to be "verified" to claim resources.
  async function addCenter(center) {
    const id = `c-${Date.now()}`
    const withDefaults = {
      id, approved: false, verificationStatus: 'unverified', verificationDoc: null, verificationNote: null,
      centerType: 'NGO / Trust', urgentNeeds: [], ...center,
    }
    await backendApi.syncCollection('centers', [withDefaults], [])
    setCenters((prev) => [withDefaults, ...prev])
    notify('u-admin-1', `New center "${withDefaults.name}" registered and awaiting document verification.`, '/admin/centers', { type: 'center', id })
    return withDefaults
  }

  function submitCenterVerification(centerId, { docType, docNumber }) {
    const center = centers.find((c) => c.id === centerId)
    setCenters((prev) => prev.map((c) => (c.id === centerId ? {
      ...c,
      verificationStatus: 'pending',
      verificationDoc: { docType, docNumber, submittedAt: new Date().toISOString() },
      verificationNote: null,
    } : c)))
    notify('u-admin-1', `${center?.name || 'A center'} submitted a registration document for verification.`, '/admin/centers', { type: 'center', id: centerId })
  }

  function approveCenter(id) {
    const center = centers.find((c) => c.id === id)
    setCenters((prev) => prev.map((c) => (c.id === id ? { ...c, approved: true, verificationStatus: 'verified', verificationNote: null } : c)))
    if (center?.coordinatorId) {
      notify(center.coordinatorId, `${center.name} has been verified by an admin. You can now claim resources from donors.`, '/center/profile', { type: 'center', id })
    }
  }

  function rejectCenter(id, reason) {
    const center = centers.find((c) => c.id === id)
    const note = reason || 'Registration document could not be verified.'
    setCenters((prev) => prev.map((c) => (c.id === id ? { ...c, approved: false, verificationStatus: 'rejected', verificationNote: note } : c)))
    if (center?.coordinatorId) {
      notify(center.coordinatorId, `${center.name}'s verification was rejected: ${note} Please resubmit from Center Profile.`, '/center/profile', { type: 'center', id })
    }
  }

  function updateCenter(id, patch) {
    setCenters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addUrgentNeed(centerId, need) {
    setCenters((prev) => prev.map((c) => (c.id === centerId ? { ...c, urgentNeeds: [...c.urgentNeeds, need] } : c)))
  }

  function removeUrgentNeed(centerId, need) {
    setCenters((prev) => prev.map((c) => (c.id === centerId ? { ...c, urgentNeeds: c.urgentNeeds.filter((n) => n !== need) } : c)))
  }

  function confirmCenterReceipt(resourceId) {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource || resource.status === 'completed') return
    updateResource(resourceId, { centerReceived: true, status: 'completed', impactPointAwarded: true })
    const donor = users.find((u) => u.id === resource.donorId)
    if (donor && !resource.impactPointAwarded) {
      updateUser(donor.id, { impactPoints: (donor.impactPoints || 0) + 1 })
    }
    if (resource?.donorId) {
      notify(resource.donorId, `Your donation "${resource.title}" was confirmed received by the center. Thank you!`, '/donor/donations', { type: 'resource', id: resourceId })
    }
  }

  // A donation the donor directed at one specific center isn't automatically theirs to keep —
  // the center gets a real choice before any delivery logistics happen, so this is a smooth,
  // two-sided handshake rather than a one-way push.
  function acceptIncomingDonation(resourceId) {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return
    const center = centers.find((c) => c.id === resource.centerId)
    updateResource(resourceId, { centerDecision: 'accepted' })
    if (resource.donorId) {
      notify(resource.donorId, `${center?.name || 'The center'} accepted your donation "${resource.title}". Coordinate delivery — you can also request a volunteer from Manage Requests.`, '/donor/donations', { type: 'resource', id: resourceId })
    }
  }

  function rejectIncomingDonation(resourceId, reason) {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return
    const center = centers.find((c) => c.id === resource.centerId)
    // Reopen it to any other registered center instead of leaving the donor stuck with a
    // dead-end listing — the donor doesn't have to repost anything.
    updateResource(resourceId, { centerDecision: null, centerScope: 'open', centerId: null, method: 'direct', status: 'available' })
    if (resource.donorId) {
      notify(resource.donorId, `${center?.name || 'The center'} wasn't able to accept "${resource.title}"${reason ? `: "${reason}"` : '.'} It's now open for any registered center to claim instead.`, '/donor/donations', { type: 'resource', id: resourceId })
    }
  }

  // ---- Volunteer tasks ----
  // Delivery: open -> accepted -> delivered -> completed after donor, volunteer, and receiver
  // confirmations. Field verification: open -> accepted -> completed with a report/outcome.
  function addTask(task) {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const withDefaults = {
      id, status: 'open', volunteerId: null, centerId: null, recipientId: null, donorId: currentUser?.id,
      createdAt: new Date().toISOString(), ...task,
    }
    setTasks((prev) => [withDefaults, ...prev])
    return withDefaults
  }

  async function acceptTask(taskId, volunteerId) {
    const task = tasks.find((t) => t.id === taskId)
    const volunteer = users.find((u) => u.id === volunteerId)
    const volunteerTypes = volunteer?.volunteerTypes?.length ? volunteer.volunteerTypes : ['verification', 'delivery']
    const requiredType = task?.type === 'field-verification' ? 'verification' : 'delivery'
    if (task?.status !== 'open') return { ok: false, error: 'This task is no longer open.' }
    if (volunteer?.restricted) {
      return { ok: false, error: 'Your account is currently restricted. Contact support to resolve this before accepting tasks.' }
    }
    if (!volunteer || volunteer.verificationStatus !== 'verified') {
      return { ok: false, error: 'Please verify your account (submit an ID document from your Profile page) before accepting tasks.' }
    }
    if (!volunteerTypes.includes(requiredType)) {
      return { ok: false, error: `Your volunteer profile is not enabled for ${requiredType === 'verification' ? 'field verification' : 'pickup and delivery'} tasks.` }
    }
    let acceptedTask
    try {
      acceptedTask = await backendApi.acceptTask(taskId)
    } catch (error) {
      return { ok: false, error: error.message }
    }
    taskMutationVersion.current += 1
    setTasks((prev) => prev.map((t) => (t.id === taskId ? acceptedTask : t)))
    window.dispatchEvent(new Event('setu:refresh-data'))
    if (task) {
      const resource = resources.find((r) => r.id === task.resourceId)
      const volunteerDetails = volunteer ? `${volunteer.name} (${volunteer.phone}${volunteer.vehicle ? `, ${volunteer.vehicle}` : ''})` : 'A volunteer'
      notifyDonationParticipants(
        { task: acceptedTask, resource },
        task.type === 'field-verification'
          ? {
              donor: `${volunteerDetails} accepted your field-verification visit for "${resource?.title || 'the request'}".`,
              recipient: `${volunteerDetails} accepted the field-verification visit for your request "${resource?.title || 'the item'}".`,
              center: `${volunteerDetails} accepted the field-verification visit for your center's request "${resource?.title || 'the item'}".`,
              volunteer: `You accepted the field-verification visit for "${resource?.title || 'the request'}".`,
            }
          : {
              donor: `${volunteerDetails} accepted the pickup and delivery task for your donation "${resource?.title || 'the item'}". Confirm handoff when you give them the item.`,
              recipient: `${volunteerDetails} accepted delivery of your requested donation "${resource?.title || 'the item'}".`,
              center: `${volunteerDetails} accepted delivery of your center's requested donation "${resource?.title || 'the item'}".`,
              volunteer: `You accepted the pickup and delivery task for "${resource?.title || 'the item'}".`,
            },
      )
    }
    return { ok: true }
  }

  function receivingPartyFor(task) {
    if (task.centerId) {
      const center = centers.find((c) => c.id === task.centerId)
      return center?.coordinatorId || null
    }
    return task.recipientId || null
  }

  async function requestFieldVerification(requestId) {
    const request = requests.find((item) => item.id === requestId)
    const resource = request ? resources.find((item) => item.id === request.resourceId) : null
    if (!request || !resource || request.status !== 'requested') {
      return { ok: false, error: 'This request is no longer available for field verification.' }
    }
    if (tasks.some((task) => task.requestId === requestId && task.type === 'field-verification')) {
      return { ok: false, error: 'A field-verification task already exists for this request.' }
    }
    try {
      const task = await backendApi.requestFieldVerificationTask(requestId)
      taskMutationVersion.current += 1
      loadTasks([task, ...tasks.filter((item) => item.id !== task.id)])
      return { ok: true, task }
    } catch (error) {
      return { ok: false, error: error.message || 'Unable to post the field-verification task. Please try again.' }
    }
  }

  function requestVolunteerDelivery(requestId) {
    const request = requests.find((item) => item.id === requestId)
    const resource = request ? resources.find((item) => item.id === request.resourceId) : null
    const recipient = request ? users.find((item) => item.id === request.recipientId) : null
    if (!request || !resource || !recipient || request.status !== 'approved') {
      return { ok: false, error: 'Approve the recipient request before assigning a delivery volunteer.' }
    }
    if (tasks.some((task) => task.requestId === requestId && task.type !== 'field-verification' && task.status !== 'cancelled')) {
      return { ok: false, error: 'A volunteer delivery task already exists for this request.' }
    }
    const center = recipient.role === 'center'
      ? centers.find((item) => item.id === recipient.centerId || item.coordinatorId === recipient.id)
      : null
    setRequestDeliveryMode(requestId, 'volunteer')
    const task = addTask({
      type: 'delivery',
      requestId,
      resourceId: resource.id,
      fromLabel: `${currentUser.name} (Donor)`,
      toLabel: recipient.role === 'center' ? center?.name || recipient.name : recipient.name,
      recipientId: recipient.id,
      centerId: center?.id || null,
      donorConfirmed: false,
      recipientConfirmed: false,
    })
    notifyDonationParticipants(
      { request, resource, task },
      {
        donor: `You approved the request for "${resource.title}" and posted a volunteer pickup and delivery task.`,
        recipient: `Your request for "${resource.title}" was approved. The donor posted a volunteer pickup and delivery task.`,
        center: `Your center's request for "${resource.title}" was approved. The donor posted a volunteer pickup and delivery task.`,
        volunteer: `A pickup and delivery task is available for "${resource.title}". Review it before accepting.`,
      },
    )
    return { ok: true, task }
  }

  function submitFieldVerification(taskId, outcome, report) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task || task.type !== 'field-verification' || task.status !== 'accepted' || task.volunteerId !== currentUser?.id) {
      return { ok: false, error: 'This field-verification task is not assigned to you.' }
    }
    if (!['verified', 'rejected', 'needs_more_information'].includes(outcome) || typeof report !== 'string' || report.trim().length < 20) {
      return { ok: false, error: 'Choose an outcome and provide a report of at least 20 characters.' }
    }
    const completedAt = new Date().toISOString()
    setTasks((previous) => previous.map((item) => item.id === taskId ? {
      ...item,
      status: 'completed',
      verificationOutcome: outcome,
      verificationReport: report.trim(),
      verificationSubmittedAt: completedAt,
      completedAt,
    } : item))
    const resource = resources.find((item) => item.id === task.resourceId)
    const request = requests.find((item) => item.id === task.requestId)
    const outcomeLabel = {
      verified: 'Verified',
      rejected: 'Rejected',
      needs_more_information: 'Needs More Information',
    }[outcome]
    notifyDonationParticipants(
      { request, resource, task },
      {
        donor: `Field verification for "${resource?.title || 'the request'}" is complete: ${outcomeLabel}. Review the volunteer report and decide whether to proceed.`,
        recipient: `Field verification for your request "${resource?.title || 'the item'}" is complete: ${outcomeLabel}.`,
        center: `Field verification for your center's request "${resource?.title || 'the item'}" is complete: ${outcomeLabel}.`,
        volunteer: `You submitted the field-verification report for "${resource?.title || 'the request'}": ${outcomeLabel}.`,
      },
    )
    return { ok: true }
  }

  function confirmTaskHandover(taskId) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task || task.type === 'field-verification' || task.status !== 'accepted' || task.donorId !== currentUser?.id) {
      return { ok: false, error: 'This delivery task is not awaiting your handoff.' }
    }
    setTasks((previous) => previous.map((item) => item.id === taskId ? {
      ...item, donorConfirmed: true, donorConfirmedAt: new Date().toISOString(),
    } : item))
    notifyDonationParticipants(
      { task: { ...task, donorConfirmed: true }, resource: resources.find((item) => item.id === task.resourceId) },
      {
        donor: 'You confirmed handoff to the volunteer. They can now complete delivery.',
        recipient: 'The donor handed the donation to the volunteer. Please confirm receipt when it arrives.',
        center: 'The donor handed the donation to the volunteer. Your center can confirm receipt when it arrives.',
        volunteer: 'The donor confirmed handoff. You can now complete delivery; the recipient or center will confirm receipt.',
      },
    )
    return { ok: true }
  }

  // Volunteer marks the drop-off as done — this is a claim, not proof. It moves the task
  // to "delivered" and asks the receiving party to confirm.
  function markTaskDelivered(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.type === 'field-verification' || task.status !== 'accepted') return { ok: false, error: 'This delivery task is not awaiting delivery.' }
    if (!task.donorConfirmed) return { ok: false, error: 'Wait for the donor to confirm handing the item to you before marking it delivered.' }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'delivered', deliveredAt: new Date().toISOString() } : t)))
    const resource = resources.find((r) => r.id === task.resourceId)
    notifyDonationParticipants(
      { task: { ...task, status: 'delivered' }, resource },
      {
        donor: `The volunteer marked your donation "${resource?.title || 'item'}" as delivered. The recipient or center must confirm receipt.`,
        recipient: `The volunteer delivered your requested donation "${resource?.title || 'item'}". Please confirm receipt.`,
        center: `The volunteer delivered your center's donation "${resource?.title || 'item'}". Please confirm receipt.`,
        volunteer: `You marked "${resource?.title || 'the donation'}" as delivered. The recipient or center must confirm receipt.`,
      },
    )
    return { ok: true }
  }

  // Receiving party (recipient or center coordinator) confirms — THIS is what verifies the
  // volunteer really completed the task. Only now does the task close and the volunteer's
  // activity score / completed-task count increase.
  async function confirmTaskDelivery(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.type === 'field-verification' || task.status !== 'delivered' || !task.donorConfirmed) {
      return { ok: false, error: 'This delivery is not ready for receipt confirmation. The donor must confirm handoff and the volunteer must mark it delivered.' }
    }
    try {
      const result = await backendApi.confirmTaskDelivery(taskId)
      if (!result?.ok || !result.task) throw new Error('The delivery confirmation was not saved by the server.')
      setTasks((previous) => previous.map((item) => item.id === taskId ? result.task : item))
      if (result.request) setRequests((previous) => previous.map((item) => item.id === result.request.id ? result.request : item))
      if (result.resource) setResources((previous) => previous.map((item) => item.id === result.resource.id ? result.resource : item))
      window.dispatchEvent(new Event('setu:refresh-data'))
      return { ok: true, completed: true }
    } catch (error) {
      return { ok: false, error: error.message || 'Unable to confirm receipt. Please try again.' }
    }
  }

  function hasClaimedReward(userId, badgeName) {
    return rewardClaims.some((claim) => claim.userId === userId && claim.badgeName === badgeName)
  }

  async function claimReward(userId, badgeName) {
    if (hasClaimedReward(userId, badgeName)) return { ok: false, error: 'This reward has already been claimed.' }
    const user = users.find((u) => u.id === userId)
    const requiredPoints = { Bronze: 5, Silver: 10, Gold: 25, Elite: 45, Platinum: 75 }[badgeName]
    if (!user || !requiredPoints || (user.impactPoints || 0) < requiredPoints) {
      return { ok: false, error: 'Reach the required badge before claiming this reward.' }
    }
    try {
      const claim = await backendApi.claimReward(badgeName)
      setRewardClaims((prev) => [...prev, { ...claim, id: `${claim.userId}:${claim.badgeName}` }])
      notify(userId, `${badgeName} reward claimed successfully.`, '/profile')
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  // ---- Categories (admin) ----
  function addCategory(name) {
    setCategories((prev) => (prev.includes(name) ? prev : [...prev, name]))
  }

  function removeCategory(name) {
    setCategories((prev) => prev.filter((c) => c !== name))
  }

  // ---- Reports & disputes ----
  function addReport(report) {
    const id = `rep-${Date.now()}`
    const withDefaults = { id, status: 'open', createdAt: new Date().toISOString(), ...report }
    setReports((prev) => [withDefaults, ...prev])
    const reporter = users.find((u) => u.id === report.reporterId)
    notify('u-admin-1', `New ${report.category || 'report'} submitted${reporter ? ` by ${reporter.name} (${reporter.role})` : ''}: ${report.subject}`, '/admin/reports', { type: 'report', id })
    return withDefaults
  }

  function resolveReport(id, resolution) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'resolved', resolution } : r)))
  }

  // ---- Direct messages (any user <-> any user, including admin) ----
  // Every new message also creates a regular notification for the recipient — messaging
  // deliberately reuses the existing notification bell rather than a separate unread system,
  // per how this was asked for. `deletedFor` is a per-user soft-delete: each side can delete
  // their own copy of a message without removing it for the other person.
  function sendMessage(fromId, toId, body) {
    const sender = users.find((u) => u.id === fromId)
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newMessage = { id, fromId, toId, body, deletedFor: [], createdAt: new Date().toISOString() }
    setMessages((prev) => [newMessage, ...prev])
    // relatedId is the OTHER participant (fromId, from the recipient's point of view) so the
    // Messages inbox can show an unread badge on that specific conversation row.
    notify(toId, `New message from ${sender?.name || 'someone'}: "${body.length > 60 ? body.slice(0, 60) + '…' : body}"`, '/messages', { type: 'message', id: fromId })
    return newMessage
  }

  // Soft-delete: removes the message from this user's view only. Once both participants
  // have deleted it, it's pruned entirely.
  function deleteMessage(messageId, userId) {
    setMessages((prev) => prev
      .map((m) => (m.id === messageId ? { ...m, deletedFor: m.deletedFor.includes(userId) ? m.deletedFor : [...m.deletedFor, userId] } : m))
      .filter((m) => !(m.fromId && m.toId && m.deletedFor.includes(m.fromId) && m.deletedFor.includes(m.toId)))
    )
  }

  function deleteConversation(userId, otherId) {
    setMessages((prev) => prev
      .map((m) => {
        const inConvo = (m.fromId === userId && m.toId === otherId) || (m.fromId === otherId && m.toId === userId)
        if (!inConvo) return m
        return { ...m, deletedFor: m.deletedFor.includes(userId) ? m.deletedFor : [...m.deletedFor, userId] }
      })
      .filter((m) => !(m.deletedFor.includes(m.fromId) && m.deletedFor.includes(m.toId)))
    )
  }

  function messagesFor(userId) {
    return messages.filter((m) => (m.fromId === userId || m.toId === userId) && !m.deletedFor.includes(userId))
  }

  // One row per other participant, most-recent message first — the inbox view.
  function conversationsFor(userId) {
    const mine = messagesFor(userId)
    const byOther = new Map()
    for (const m of mine) {
      const otherId = m.fromId === userId ? m.toId : m.fromId
      const existing = byOther.get(otherId)
      if (!existing || new Date(m.createdAt) > new Date(existing.createdAt)) byOther.set(otherId, m)
    }
    return Array.from(byOther.entries())
      .map(([otherId, lastMessage]) => ({ otherId, lastMessage }))
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt))
  }

  function messagesBetween(userId, otherId) {
    return messagesFor(userId)
      .filter((m) => (m.fromId === userId && m.toId === otherId) || (m.fromId === otherId && m.toId === userId))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  // ---- Notifications ----
  function markNotificationRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  function markAllRead(userId) {
    setNotifications((prev) => prev.map((n) => (n.userId === userId ? { ...n, read: true } : n)))
  }

  function notificationsFor(user) {
    if (!user) return []
    return notifications.filter((n) => {
      if (n.userId === '__broadcast__') {
        if (!(n.role === 'all' || n.role === user.role)) return false
        if (n.dismissedFor?.includes(user.id)) return false
        return true
      }
      return n.userId === user.id
    })
  }

  // Every notification tied to one specific item (a request, resource, task, center, report,
  // or message thread), for showing right next to that item — see the `related` note on notify().
  function notificationsForItem(user, type, id) {
    if (!type || !id) return []
    return notificationsFor(user).filter((n) => n.relatedType === type && n.relatedId === id)
  }

  // Personal notifications are removed outright. Broadcasts are shared across every recipient,
  // so one user "deleting" one only hides it for them (mirrors the message soft-delete pattern).
  function deleteNotification(id, userId) {
    setNotifications((prev) => prev.reduce((acc, n) => {
      if (n.id !== id) { acc.push(n); return acc }
      if (n.userId === '__broadcast__') {
        acc.push({ ...n, dismissedFor: n.dismissedFor?.includes(userId) ? n.dismissedFor : [...(n.dismissedFor || []), userId] })
      }
      return acc
    }, []))
  }

  function clearAllNotifications(userId, role) {
    setNotifications((prev) => prev.reduce((acc, n) => {
      const isMine = n.userId === userId || (n.userId === '__broadcast__' && (n.role === 'all' || n.role === role) && !n.dismissedFor?.includes(userId))
      if (!isMine) { acc.push(n); return acc }
      if (n.userId === '__broadcast__') {
        acc.push({ ...n, dismissedFor: [...(n.dismissedFor || []), userId] })
        return acc
      }
      return acc
    }, []))
  }

  const value = {
    users,
    resources, requests, centers, centersLoaded, tasks, notifications, categories, reports, messages,
    addResource, updateResource, flagListing, unflagListing, removeListing, withdrawResource,
    getAvailability,
    submitRequest, submitNeedRequest, fulfillNeedRequest, setRequestStatus, setRequestDeliveryMode, confirmHandover, addRating, canRequest, activeRequestCount, cancelledCount,
    valueClaimedInPeriod, adminReviewRequest, provideAdditionalInfo,
    addCenter, approveCenter, rejectCenter, submitCenterVerification, updateCenter, addUrgentNeed, removeUrgentNeed, confirmCenterReceipt,
    acceptIncomingDonation, rejectIncomingDonation,
    addTask, acceptTask, requestFieldVerification, requestVolunteerDelivery, submitFieldVerification,
    confirmTaskHandover, markTaskDelivered, confirmTaskDelivery, claimReward, hasClaimedReward,
    addCategory, removeCategory,
    addReport, resolveReport,
    sendMessage, deleteMessage, deleteConversation, messagesFor, conversationsFor, messagesBetween,
    notify, broadcast, markNotificationRead, markAllRead, notificationsFor, notificationsForItem,
    deleteNotification, clearAllNotifications,
    MAX_ACTIVE_REQUESTS, HIGH_VALUE_THRESHOLD, VALUE_LIMIT_PERIOD_DAYS, VALUE_LIMIT_AMOUNT, MAX_DONATION_VALUE,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
