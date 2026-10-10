import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Star } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function DonationHistory() {
  const { language, t } = usePreferences()
  const { currentUser } = useAuth()
  const { resources, requests, users } = useData()

  const completed = resources
    .filter((r) => r.donorId === currentUser.id && r.status === 'completed')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Donation history')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Every donation you\'ve successfully completed.')}</p>
      </div>

      {completed.length === 0 ? (
        <EmptyState icon="🗂️" title={t('No completed donations yet')} description={t('Once a donation is handed over and confirmed, it\'ll appear here.')} />
      ) : (
        <div className="space-y-3">
          {completed.map((res) => {
            const req = requests.find((r) => r.resourceId === res.id && r.status === 'completed')
            const recipient = req ? users.find((u) => u.id === req.recipientId) : null
            return (
              <div key={res.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-paper-dim text-2xl">{res.photo}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{res.title}</p>
                    <p className="text-xs text-ink/45">{t(res.category)} · {t('To')} {recipient?.name || t('a recipient')} · {new Date(res.createdAt).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                {req?.rating ? (
                  <div className="flex items-center gap-1 text-marigold-dark">
                    {Array.from({ length: req.rating }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                ) : (
                  <span className="text-xs text-ink/40">{t('No rating yet')}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
