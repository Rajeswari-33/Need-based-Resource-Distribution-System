import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { CATEGORIES, CATEGORY_ICON } from '../data/seed.js'
import { Award, Package, IndianRupee } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function ImpactTracker() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { resources } = useData()

  const completed = resources.filter((r) => r.donorId === currentUser.id && r.status === 'completed')
  const totalValue = completed.reduce((sum, r) => sum + (r.value || 0), 0)
  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    count: completed.filter((r) => r.category === cat).length,
  }))
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count))

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Impact tracker')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Your total contribution to the community, category by category.')}</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-banyan/10 text-banyan-dark"><Package size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{completed.length}</p>
          <p className="text-xs text-ink/50">{t('Total donations completed')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark"><IndianRupee size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">₹{totalValue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-ink/50">{t('Estimated total value given')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/10 text-ink"><Award size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{currentUser.impactScore || 0}</p>
          <p className="text-xs text-ink/50">{t('Impact score')}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-display text-sm font-semibold text-ink">{t('Category-wise contribution')}</h2>
        <div className="space-y-3.5">
          {byCategory.map(({ cat, count }) => (
            <div key={cat}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink/70">{CATEGORY_ICON[cat]} {cat}</span>
                <span className="font-mono font-semibold text-ink">{count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-paper-dim">
                <div className="h-full rounded-full bg-banyan" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
