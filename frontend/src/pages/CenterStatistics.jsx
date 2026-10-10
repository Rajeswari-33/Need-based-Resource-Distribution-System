import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { CATEGORY_ICON } from '../data/seed.js'
import { Package, PackageCheck, Clock3 } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function CenterStatistics() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { centers, resources } = useData()

  const center = centers.find((c) => c.id === currentUser.centerId)
  const incoming = center ? resources.filter((r) => r.centerId === center.id) : []
  const received = incoming.filter((r) => r.centerReceived || r.status === 'completed').length
  const pending = incoming.filter((r) => !r.centerReceived && r.status !== 'completed').length

  const byCategory = {}
  incoming.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + 1 })
  const maxCount = Math.max(1, ...Object.values(byCategory))

  if (!center) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <p className="text-ink/60">{t('Register your institution to view its donation statistics.')}</p>
          <Link to="/center/profile" className="btn-accent mt-5 inline-flex">{t('Register institution')}</Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Donation statistics')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('A snapshot of everything routed through')} {center.name}.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/10 text-ink"><Package size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{incoming.length}</p>
          <p className="text-xs text-ink/50">{t('Total donations routed here')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-banyan/10 text-banyan-dark"><PackageCheck size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{received}</p>
          <p className="text-xs text-ink/50">{t('Received & confirmed')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark"><Clock3 size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{pending}</p>
          <p className="text-xs text-ink/50">{t('Awaiting arrival')}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-display text-sm font-semibold text-ink">{t('By category')}</h2>
        {Object.keys(byCategory).length === 0 ? (
          <p className="text-sm text-ink/50">{t('No donations routed here yet.')}</p>
        ) : (
          <div className="space-y-3.5">
            {Object.entries(byCategory).map(([cat, count]) => (
              <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink/70">{CATEGORY_ICON[cat]} {t(cat)}</span>
                  <span className="font-mono font-semibold text-ink">{count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-paper-dim">
                  <div className="h-full rounded-full bg-banyan" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
