import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { Plus, Package, TrendingUp, Award, ClipboardCheck, ArrowRight } from 'lucide-react'
import { getGreeting } from '../utils/greeting.js'
import ImpactRewards from '../components/ImpactRewards.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function DonorDashboard() {
  const { t, itemName } = usePreferences()
  const { currentUser } = useAuth()
  const { resources, requests } = useData()

  const myResources = resources.filter((r) => r.donorId === currentUser.id)
  const pendingApprovals = requests.filter((req) => {
    const res = myResources.find((r) => r.id === req.resourceId)
    return res && req.status === 'requested'
  })
  const openNeeds = requests.filter((req) => req.needRequest && ['requested', 'approved'].includes(req.status))
  const completedCount = myResources.filter((r) => r.status === 'completed').length
  const activeCount = myResources.filter((r) => r.status === 'available' || r.status === 'pending').length

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t(getGreeting())}, {currentUser.name.split(' ')[0]}</h1>
          <p className="mt-1.5 text-sm text-ink/55">{t('Here\'s how your giving is doing.')}</p>
        </div>
        <Link to="/donor/post" className="btn-accent"><Plus size={16} /> {t('Post a resource')}</Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-banyan/10 text-banyan-dark"><Package size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{myResources.length}</p>
          <p className="text-xs text-ink/50">{t('Resources posted')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark"><ClipboardCheck size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{activeCount}</p>
          <p className="text-xs text-ink/50">{t('Currently active')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/10 text-ink"><TrendingUp size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{completedCount}</p>
          <p className="text-xs text-ink/50">{t('Donations completed')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-clay/10 text-clay"><Award size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{currentUser.impactPoints || 0}</p>
          <p className="text-xs text-ink/50">{t('Impact points')}</p>
        </div>
      </div>

      <div className="mb-8"><ImpactRewards /></div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink">{t('Requests awaiting your review')}</h2>
          <span className="badge bg-marigold/20 text-marigold-dark">{pendingApprovals.length}</span>
        </div>
        {pendingApprovals.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50">{t('No requests waiting on your review right now.')}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {pendingApprovals.slice(0, 4).map((req) => {
              const res = myResources.find((r) => r.id === req.resourceId)
              return (
                <li key={req.id} className="flex items-center justify-between rounded-md bg-paper-dim px-3 py-2.5 text-sm">
                  <span className="truncate text-ink/75">{itemName(res?.title, res?.titleTamil)}</span>
                  <Link to="/donor/requests" className="shrink-0 font-semibold text-banyan-dark hover:underline">{t('Review')}</Link>
                </li>
              )
            })}
          </ul>
        )}
        <Link to="/donor/requests" className="btn-ghost mt-4 px-0 text-xs">{t('Go to Approve / Reject Requests')} <ArrowRight size={13} /></Link>
      </div>

      {openNeeds.length > 0 && (
        <div className="card mt-5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink">{t('Open recipient and center needs')}</h2>
            <span className="badge bg-marigold/20 text-marigold-dark">{openNeeds.length}</span>
          </div>
          <ul className="mt-4 space-y-2">
            {openNeeds.slice(0, 4).map((need) => (
              <li key={need.id} className="flex items-center justify-between gap-3 rounded-md bg-paper-dim px-3 py-2.5 text-sm">
                <span className="truncate text-ink/75">{need.title} · {need.category}</span>
                <Link to="/donor/requests" className="shrink-0 font-semibold text-banyan-dark hover:underline">{t(need.status === 'requested' ? 'View need' : 'Track donation')}</Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink/50">{t('Open needs stay visible until withdrawn or the requested item is received.')}</p>
        </div>
      )}
    </DashboardLayout>
  )
}
