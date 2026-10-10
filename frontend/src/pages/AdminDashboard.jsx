import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getGreeting } from '../utils/greeting.js'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { CATEGORY_ICON } from '../data/seed.js'
import { Package, Users as UsersIcon, Building2, ShieldAlert, TrendingUp, MessageSquareWarning } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function AdminDashboard() {
  const { t } = usePreferences()
  const { users, currentUser } = useAuth()
  const { resources, requests, centers, reports } = useData()

  const totalDonations = resources.length
  const completed = resources.filter((r) => r.status === 'completed').length
  const activeUsers = users.length
  const approvedCenters = centers.filter((c) => c.approved).length
  const pendingCenters = centers.filter((c) => !c.approved).length
  const flagged = requests.filter((r) => r.flagged && r.status === 'requested').length
  const openReports = reports.filter((r) => r.status === 'open').length

  const byCategory = {}
  resources.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + 1 })
  const maxCount = Math.max(1, ...Object.values(byCategory))

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t(getGreeting())}, {currentUser.name.split(' ')[0]}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Analytics across the entire Setu platform.')}</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/10 text-ink"><Package size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{totalDonations}</p>
          <p className="text-xs text-ink/50">{t('Total resources posted')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-banyan/10 text-banyan-dark"><TrendingUp size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{completed}</p>
          <p className="text-xs text-ink/50">{t('Donations completed')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark"><UsersIcon size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{activeUsers}</p>
          <p className="text-xs text-ink/50">{t('Registered users')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/10 text-ink"><Building2 size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{approvedCenters}</p>
          <p className="text-xs text-ink/50">{t('Approved centers')} ({pendingCenters} {t('pending')})</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-clay/10 text-clay"><ShieldAlert size={18} /></span>
          <div>
            <p className="text-lg font-semibold text-ink">{flagged}</p>
            <p className="text-xs text-ink/50">{t('Flagged requests awaiting review')}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark"><MessageSquareWarning size={18} /></span>
          <div>
            <p className="text-lg font-semibold text-ink">{openReports}</p>
            <p className="text-xs text-ink/50">{t('Open reports & disputes')}</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-display text-sm font-semibold text-ink">{t('Resources by category')}</h2>
        <div className="space-y-3.5">
          {Object.entries(byCategory).map(([cat, count]) => (
            <div key={cat}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink/70">{CATEGORY_ICON[cat]} {t(cat)}</span>
                <span className="font-mono font-semibold text-ink">{count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-paper-dim">
                <div className="h-full rounded-full bg-ink" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
