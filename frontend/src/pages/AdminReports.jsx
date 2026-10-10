import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { ShieldAlert, MessageSquareWarning } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function AdminReports() {
  const { t } = usePreferences()
  const { users, updateUser } = useAuth()
  const { requests, resources, reports, setRequestStatus, resolveReport, notify } = useData()
  const { showToast } = useToast()
  const [confirmAction, setConfirmAction] = useState(null)

  const flagged = requests.filter((r) => r.flagged && r.status === 'requested')
  const openReports = reports.filter((r) => r.status === 'open')

  function run() {
    const { req, action } = confirmAction
    const recipient = users.find((u) => u.id === req.recipientId)
    if (action === 'approve') {
      setRequestStatus(req.id, 'approved')
      showToast('Request approved.', 'success')
    } else if (action === 'reject') {
      setRequestStatus(req.id, 'rejected')
      showToast('Request rejected.', 'info')
    } else if (action === 'info') {
      notify(req.recipientId, 'Admin requested more information for your flagged request. Please add supporting details.', '/recipient/requests')
      showToast('Requested more information from the recipient.', 'success')
    } else if (action === 'restrict') {
      updateUser(recipient.id, { restricted: true })
      showToast(`${recipient.name}'s account was restricted.`, 'success')
    }
    setConfirmAction(null)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Reports & disputes')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Flagged requests and user-submitted reports needing a decision.')}</p>
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink"><ShieldAlert size={14} /> {t('Flagged requests')}</h2>
      {flagged.length === 0 ? (
        <EmptyState icon="✅" title={t('Nothing flagged')} description={t('Requests flagged for repeated high-value activity or excessive cancellations will appear here.')} />
      ) : (
        <div className="mb-10 space-y-4">
          {flagged.map((req) => {
            const resource = resources.find((r) => r.id === req.resourceId)
            const recipient = users.find((u) => u.id === req.recipientId)
            return (
              <div key={req.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{resource?.title}</p>
                    <p className="text-xs text-ink/50">{t('Requested by')} {recipient?.name} · {t('Value')} ₹{req.value?.toLocaleString('en-IN')}</p>
                  </div>
                  <span className="badge bg-clay/10 text-clay"><ShieldAlert size={12} /> {t('Flagged')}</span>
                </div>
                <p className="mt-2 text-sm text-ink/65">"{req.reason}"</p>
                {req.supportingDoc && <p className="mt-1 text-xs text-ink/45">{t('Supporting document')}: {req.supportingDoc}</p>}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
                  <button onClick={() => setConfirmAction({ req, action: 'approve' })} className="btn-accent px-3 py-1.5 text-xs">{t('Approve')}</button>
                  <button onClick={() => setConfirmAction({ req, action: 'info' })} className="btn-outline px-3 py-1.5 text-xs">{t('Request more information')}</button>
                  <button onClick={() => setConfirmAction({ req, action: 'restrict' })} className="btn-outline px-3 py-1.5 text-xs">{t('Restrict account')}</button>
                  <button onClick={() => setConfirmAction({ req, action: 'reject' })} className="btn-outline px-3 py-1.5 text-xs text-clay">{t('Reject')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink"><MessageSquareWarning size={14} /> {t('Open reports')}</h2>
      {openReports.length === 0 ? (
        <p className="text-sm text-ink/50">{t('No user-submitted reports at the moment.')}</p>
      ) : (
        <div className="space-y-3">
          {openReports.map((r) => {
            const reporter = users.find((u) => u.id === r.reporterId)
            return (
              <div key={r.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {r.category && <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{r.category}</p>}
                    <p className="mt-0.5 text-sm font-semibold text-ink">{r.subject}</p>
                    <p className="mt-0.5 text-xs text-ink/45">{t('From')} {reporter?.name || t('a user')} · {t(reporter?.role || r.reporterRole || 'unknown role')}</p>
                  </div>
                  <span className="badge bg-clay/10 text-clay">{t('Open')}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink/60">{r.details}</p>
                <button onClick={() => { resolveReport(r.id, 'Reviewed by admin'); showToast('Report marked resolved.', 'success') }} className="btn-outline mt-3 px-3 py-1.5 text-xs">{t('Mark resolved')}</button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={
          t(confirmAction?.action === 'approve' ? 'Approve this flagged request?' :
          confirmAction?.action === 'reject' ? 'Reject this request?' :
          confirmAction?.action === 'restrict' ? 'Restrict this account?' :
          'Request more information?')
        }
        confirmLabel={
          t(confirmAction?.action === 'approve' ? 'Approve' :
          confirmAction?.action === 'reject' ? 'Reject' :
          confirmAction?.action === 'restrict' ? 'Restrict' : 'Send request')
        }
        tone={['reject', 'restrict'].includes(confirmAction?.action) ? 'danger' : 'default'}
        onConfirm={run}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardLayout>
  )
}
