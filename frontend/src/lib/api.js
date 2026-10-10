const API_BASE = import.meta.env.VITE_API_URL || '/api'

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('setu.authToken')
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
    })
  } catch (error) {
    console.error(`Unable to reach the Setu API for ${path}.`, error)
    throw new Error('Could not reach the Setu API. Check that the backend is running and the API URL is correct.')
  }
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {}
  if (!response.ok) {
    const message = data.error || (response.status === 404
      ? 'The API endpoint was not found. Restart the backend to load the latest routes.'
      : `The API request failed (HTTP ${response.status}).`)
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return data
}

export const backendApi = {
  health: () => apiRequest('/health'),
  login: (identifier, password) => apiRequest('/auth/login', { method: 'POST', body: { identifier, password } }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  googleLogin: (credential, role) => apiRequest('/auth/google', { method: 'POST', body: { credential, role } }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  donorLeaderboard: () => apiRequest('/donations/leaderboard'),
  currentUser: () => apiRequest('/users/me'),
  users: () => apiRequest('/users'),
  updateUser: (userId, patch) => apiRequest(`/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: patch }),
  sendWhatsAppPreferencesFlow: () => apiRequest('/whatsapp/preferences-flow', { method: 'POST' }),
  testWhatsAppNotification: (phone, message) => apiRequest('/whatsapp/test', { method: 'POST', body: { phone, message } }),
  testEmailNotification: (email, message, subject) => apiRequest('/email/test', { method: 'POST', body: { email, message, subject } }),
  notifyUserWhatsApp: ({ userId, phone, message, subject }) => apiRequest('/whatsapp/notify-user', {
    method: 'POST',
    body: { userId, phone, message, subject },
  }),
  deleteUser: (userId) => apiRequest(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  submitVerification: (userId, document) => apiRequest(`/users/${encodeURIComponent(userId)}/verification`, { method: 'PATCH', body: document }),
  decideVerification: (userId, approved, note) => apiRequest(`/users/${encodeURIComponent(userId)}/verify`, { method: 'PATCH', body: { approved, note } }),
  donations: () => apiRequest('/donations'),
  requests: () => apiRequest('/donations/requests'),
  fulfillNeedRequest: (requestId, resourceId) => apiRequest(`/donations/needs/${encodeURIComponent(requestId)}/fulfill`, {
    method: 'POST',
    body: { resourceId },
  }),
  tasks: () => apiRequest('/tasks'),
  requestFieldVerificationTask: (requestId) => apiRequest(`/tasks/verification-request/${encodeURIComponent(requestId)}`, { method: 'POST' }),
  acceptTask: (taskId) => apiRequest(`/tasks/${encodeURIComponent(taskId)}/accept`, { method: 'POST' }),
  confirmTaskDelivery: (taskId) => apiRequest(`/tasks/${encodeURIComponent(taskId)}/confirm`, { method: 'POST' }),
  rewards: () => apiRequest('/rewards'),
  platformData: () => apiRequest('/platform/bootstrap'),
  syncCollection: (collection, upserts, deletedIds) => apiRequest('/platform/sync', {
    method: 'POST',
    body: { collection, upserts, deletedIds },
  }),
  claimReward: (badgeName) => apiRequest(`/rewards/${encodeURIComponent(badgeName)}/claim`, { method: 'POST' }),
}
