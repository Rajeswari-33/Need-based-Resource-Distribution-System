import React, { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ItemNotifications from '../components/ItemNotifications.jsx'
import { FileText, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function AdminCenters() {
  const { t } = usePreferences()
  const { centers, approveCenter, rejectCenter } = useData()
  const { showToast } = useToast()
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')

  const pending = centers.filter((c) => (c.verificationStatus || 'unverified') === 'pending')
  const decided = centers.filter((c) => ['verified', 'rejected'].includes(c.verificationStatus) || c.approved)
  const notYetSubmitted = centers.filter((c) => (c.verificationStatus || 'unverified') === 'unverified' && !c.approved)

  function handleApprove(c) {
    approveCenter(c.id)
    showToast(`"${c.name}" verified and now listed publicly.`, 'success')
  }

  function handleRejectSubmit() {
    rejectCenter(rejecting.id, reason.trim() || 'Registration document could not be verified.')
    showToast(`"${rejecting.name}"'s verification was rejected.`, 'info')
    setRejecting(null)
    setReason('')
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Verify & approve centers')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          {t('A center is a recipient institution — an orphanage, an old-age home, a shelter, an NGO. Verification here checks the institution\'s own registration document, submitted by its coordinator from Center Profile — not the coordinator\'s personal identity.')}
        </p>
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink"><ShieldCheck size={15} /> {t('Pending verification')} ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="mb-8 text-sm text-ink/50">{t('No center registration documents are waiting on review right now.')}</p>
      ) : (
        <div className="mb-8 card divide-y divide-ink/10">
          {pending.map((c) => (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{c.name} <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-ink/40">{c.centerType}</span></p>
                <p className="text-xs text-ink/50">{c.location} · {c.acceptedCategories.map((category) => t(category)).join(', ') || t('No categories set')}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/65">
                  <FileText size={12} /> {t(c.verificationDoc?.docType || 'Document')}: {c.verificationDoc?.docNumber || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleApprove(c)} className="btn-accent px-2.5 py-1 text-xs"><CheckCircle2 size={13} /> {t('Approve')}</button>
                <button onClick={() => setRejecting(c)} className="btn-outline px-2.5 py-1 text-xs text-clay"><XCircle size={13} /> {t('Reject')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notYetSubmitted.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('Registered, no document submitted yet')}</h2>
          <div className="space-y-2">
            {notYetSubmitted.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md bg-paper-dim px-4 py-3 text-sm text-ink/60">
                <span>{c.name} — {c.location}</span>
                <StatusBadge status="unverified">{t('Unverified')}</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('Reviewed centers')}</h2>
      {decided.length === 0 ? (
        <EmptyState icon="🏠" title={t('No centers reviewed yet')} description={t('Centers you approve or reject will show up here, with the document details kept for reference.')} />
      ) : (
        <div className="space-y-3">
          {decided.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{c.name} <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-ink/40">{c.centerType}</span></p>
                  <p className="text-xs text-ink/50">{c.location}</p>
                </div>
                <StatusBadge status={c.verificationStatus === 'rejected' ? 'rejected' : 'verified'}>{t(c.verificationStatus === 'rejected' ? 'Rejected' : 'Approved')}</StatusBadge>
              </div>
              {c.verificationDoc && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/55">
                  <FileText size={12} /> {t('Reviewed')}: {t(c.verificationDoc.docType)} ({c.verificationDoc.docNumber})
                </p>
              )}
              {c.verificationStatus === 'rejected' && c.verificationNote && (
                <p className="mt-2 flex items-start gap-1.5 rounded-md bg-clay/10 px-3 py-2 text-xs text-clay">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {t('Reason')}: {c.verificationNote}
                </p>
              )}
              <ItemNotifications type="center" id={c.id} />
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay"><AlertTriangle size={17} /></span>
              <div className="flex-1">
                <h2 className="font-display text-sm font-semibold text-ink">{t(`Reject "${rejecting.name}"'s verification?`)}</h2>
                <textarea
                  autoFocus
                  className="input mt-2 min-h-[70px] text-sm"
                  placeholder={t('Reason (shown to the coordinator, e.g. Registration number does not match records, please resubmit)')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setRejecting(null); setReason('') }} className="btn-outline px-3.5 py-2 text-sm">{t('Cancel')}</button>
              <button onClick={handleRejectSubmit} className="rounded-md bg-clay px-3.5 py-2 text-sm font-semibold text-white hover:bg-clay/90">{t('Reject')}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
