import React, { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Flag } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function AdminModeration() {
  const { t } = usePreferences()
  const { resources, flagListing, unflagListing, removeListing } = useData()
  const { users } = useAuth()
  const { showToast } = useToast()
  const [reason, setReason] = useState({})
  const [removing, setRemoving] = useState(null)

  const live = resources.filter((r) => !['removed', 'withdrawn'].includes(r.status))
  const flagged = live.filter((r) => r.flaggedListing)
  const others = live.filter((r) => !r.flaggedListing)

  function handleFlag(res) {
    flagListing(res.id, reason[res.id] || 'Flagged by admin for review')
    showToast(`"${res.title}" flagged for review.`, 'info')
  }

  function handleUnflag(res) {
    unflagListing(res.id)
    showToast(`"${res.title}" unflagged.`, 'success')
  }

  function handleRemove() {
    removeListing(removing.id)
    showToast(`"${removing.title}" removed from the platform.`, 'success')
    setRemoving(null)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Moderate listings')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Flag inappropriate listings for a closer look, or remove them outright.')}</p>
      </div>

      {flagged.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-clay"><Flag size={14} /> {t('Flagged listings')}</h2>
          <div className="space-y-3">
            {flagged.map((res) => {
              const donor = users.find((u) => u.id === res.donorId)
              return (
                <div key={res.id} className="card border-clay/30 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-dim text-xl">{res.photo}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{res.title}</p>
                      <p className="text-xs text-ink/45">{t('Posted by')} {donor?.name} · {t(res.category)}</p>
                    </div>
                  </div>
                  {res.flagReason && <p className="mt-2 text-xs text-clay">{t('Reason')}: {res.flagReason}</p>}
                  <div className="mt-3 flex gap-2 border-t border-ink/10 pt-3">
                    <button onClick={() => handleUnflag(res)} className="btn-outline px-3 py-1.5 text-xs">{t('Clear flag')}</button>
                    <button onClick={() => setRemoving(res)} className="btn-outline px-3 py-1.5 text-xs text-clay">{t('Remove listing')}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('All active listings')}</h2>
      {others.length === 0 ? (
        <EmptyState icon="🗂️" title={t('Nothing to moderate')} description={t('Active listings will appear here.')} />
      ) : (
        <div className="space-y-2">
          {others.map((res) => {
            const donor = users.find((u) => u.id === res.donorId)
            return (
              <div key={res.id} className="card flex flex-wrap items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-paper-dim text-lg">{res.photo}</span>
                  <div>
                    <p className="text-sm font-medium text-ink/85">{res.title}</p>
                    <p className="text-xs text-ink/45">{donor?.name} · {t(res.category)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="input hidden w-40 py-1.5 text-xs sm:block"
                    placeholder={t('Reason (optional)')}
                    value={reason[res.id] || ''}
                    onChange={(e) => setReason((r) => ({ ...r, [res.id]: e.target.value }))}
                  />
                  <button onClick={() => handleFlag(res)} className="btn-outline px-2.5 py-1.5 text-xs">{t('Flag')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        title={t('Remove this listing?')}
        description={removing ? t(`"${removing.title}" will be permanently taken down from the platform.`) : ''}
        confirmLabel={t('Remove')}
        tone="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </DashboardLayout>
  )
}
