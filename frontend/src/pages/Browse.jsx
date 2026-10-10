import React, { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { CATEGORIES } from '../data/seed.js'
import ResourceCard from '../components/ResourceCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { getGreeting } from '../utils/greeting.js'
import { Search } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function Browse() {
  const { t } = usePreferences()
  const { resources } = useData()
  const { currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [locality, setLocality] = useState('All')

  const localities = useMemo(() => {
    const set = new Set(resources.map((r) => r.location))
    return ['All', ...Array.from(set)]
  }, [resources])

  const filtered = resources.filter((r) => {
    if (r.status !== 'available') return false
    // Donations routed straight to one specific center (the donor's choice) are pushed to
    // that center's own Incoming Donations list — they're never claimable through Browse by
    // anyone, individual or center.
    if (r.method === 'center') return false
    // A donor's audience choice restricts who can even see this as claimable: 'individual'
    // items are for individual recipients only, 'center' items (open to any center) are for
    // registered recipient centers only — never the other way round.
    if (r.audience === 'individual' && currentUser?.role === 'center') return false
    if (r.audience === 'center' && currentUser?.role === 'recipient') return false
    if (category !== 'All' && r.category !== category) return false
    if (locality !== 'All' && r.location !== locality) return false
    if (query && !r.title.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {currentUser?.role === 'recipient' ? `${t(getGreeting())}, ${currentUser.name.split(' ')[0]}` : t('Browse resources')}
        </h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Search and filter what\'s currently available, then submit a request.')}</p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            className="input pl-9"
            placeholder={t('Search resources…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">{t('All categories')}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
        </select>
        <select className="input sm:w-48" value={locality} onChange={(e) => setLocality(e.target.value)}>
          {localities.map((l) => <option key={l} value={l}>{l === 'All' ? t('All localities') : l}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={t('No matching resources')}
          description={t('Try a different category, locality, or search term.')}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => <ResourceCard key={r.id} resource={r} />)}
        </div>
      )}
    </DashboardLayout>
  )
}
