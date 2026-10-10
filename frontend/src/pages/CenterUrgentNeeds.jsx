import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { AlertCircle, Plus, X } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function CenterUrgentNeeds() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { centers, addUrgentNeed, removeUrgentNeed } = useData()
  const { showToast } = useToast()
  const [need, setNeed] = useState('')

  const center = centers.find((c) => c.id === currentUser.centerId)

  if (!center) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <p className="text-ink/60">{t('Register your institution to manage its urgent needs.')}</p>
          <Link to="/center/profile" className="btn-accent mt-5 inline-flex">{t('Register institution')}</Link>
        </div>
      </DashboardLayout>
    )
  }

  function handleAdd(e) {
    e.preventDefault()
    if (!need.trim()) return
    addUrgentNeed(center.id, need.trim())
    showToast('Urgent need posted. Nearby donors will be notified.', 'success')
    setNeed('')
  }

  function handleRemove(n) {
    removeUrgentNeed(center.id, n)
    showToast('Urgent need removed.', 'info')
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><AlertCircle size={22} className="text-marigold-dark" /> {t('Urgent needs')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Post shortages so donors with a history of giving nearby get notified.')}</p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleAdd} className="card mb-6 flex gap-2 p-4">
          <input className="input" placeholder={t('e.g. Winter clothing for children')} value={need} onChange={(e) => setNeed(e.target.value)} />
          <button type="submit" className="btn-accent shrink-0 px-3"><Plus size={15} /></button>
        </form>

        {center.urgentNeeds.length === 0 ? (
          <EmptyState icon="📢" title={t('No urgent needs posted')} description={t('Add a shortage above to alert nearby donors.')} />
        ) : (
          <ul className="space-y-2">
            {center.urgentNeeds.map((n) => (
              <li key={n} className="card flex items-center justify-between px-4 py-3 text-sm text-ink/75">
                {n}
                <button onClick={() => handleRemove(n)} className="text-ink/35 hover:text-clay" aria-label={t('Remove')}><X size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
