// Single source of truth for "what is this role's default/home dashboard page".
// Used at login, at registration, and by useDashboardRedirect (refresh / back-button guard).
export const DASHBOARD_HOME = {
  donor: '/donor',
  recipient: '/browse',
  volunteer: '/volunteer',
  center: '/center',
  admin: '/admin',
}

export function getDashboardPath(role) {
  return DASHBOARD_HOME[role] || '/'
}
