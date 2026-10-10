import React from 'react'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { MapPin, Clock, Tag, AlertCircle, BadgeCheck, Home } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function Centers() {
  const { t } = usePreferences()
  const { centers } = useData()
  const approved = centers.filter((c) => c.approved)

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Registered recipient centers')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          {t('These are recipient institutions — orphanages, old-age homes, shelters, NGOs — that receive donations for the people in their care. They are not physical trusts or drop-off/distribution depots; each is admin-verified using its own registration document.')}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {approved.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">{c.name}</h2>
                <p className="flex items-center gap-1 text-xs font-medium text-ink/50"><Home size={12} /> {t(c.centerType)}</p>
              </div>
              <span className="badge bg-banyan/10 text-banyan-dark"><BadgeCheck size={12} /> {t('Verified')}</span>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-ink/60">
              <p className="flex items-center gap-2"><MapPin size={14} /> {c.address ? `${c.address}, ` : ''}{c.location}</p>
              <p className="flex items-center gap-2"><Clock size={14} /> {c.hours}</p>
              <p className="flex items-start gap-2"><Tag size={14} className="mt-0.5 shrink-0" /> {c.acceptedCategories.map((category) => t(category)).join(', ')}</p>
            </div>
            {c.urgentNeeds.length > 0 && (
              <div className="mt-4 rounded-md bg-marigold/10 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-marigold-dark"><AlertCircle size={13} /> {t('Urgent needs')}</p>
                <ul className="mt-1 list-inside list-disc text-xs text-marigold-dark/90">
                  {c.urgentNeeds.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
