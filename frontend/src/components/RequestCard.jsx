import React from 'react'
import { Clock, AlertTriangle, Layers, ShieldCheck } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import ItemNotifications from './ItemNotifications.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'

const ADMIN_DECISION_LABEL = {
  approved: { text: 'Cleared by admin review', cls: 'text-banyan-dark' },
  info_requested: { text: 'Admin requested more information', cls: 'text-marigold-dark' },
  restricted: { text: 'Account restricted after review', cls: 'text-clay' },
  rejected: { text: 'Rejected after admin review', cls: 'text-clay' },
}

export default function RequestCard({ request, resource, extra, children }) {
  const { language, t, itemName } = usePreferences()
  if (!resource && !request.needRequest) return null
  const display = resource || { photo: '🙏', title: request.title || 'Requested item', titleTamil: request.titleTamil, category: request.category }
  const decision = request.adminDecision ? ADMIN_DECISION_LABEL[request.adminDecision] : null
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-paper-dim text-2xl">{display.photo}</span>
          <div>
            <h3 className="font-display text-sm font-semibold text-ink">{itemName(display.title, display.titleTamil)}</h3>
            <p className="text-xs text-ink/50">
              {t(request.needRequest ? 'Requested' : 'Claimed')} {new Date(request.createdAt).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {request.needRequest && !resource && ` · ${t('not yet matched to a donation')}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={request.status} />
          {request.flagged && !decision && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-clay">
              <AlertTriangle size={12} /> {t('Under verification')}
            </span>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-ink/10 pt-3 text-xs">
        <dt className="text-ink/45">{t('Beneficiary')}</dt>
        <dd className="text-ink/75">{request.beneficiary}</dd>
        <dt className="text-ink/45">{t('Quantity')}</dt>
        <dd className="text-ink/75">{request.quantity}</dd>
        <dt className="text-ink/45">{t('Urgency')}</dt>
        <dd className="flex items-center gap-1 text-ink/75"><Clock size={11} /> {request.urgency}</dd>
        <dt className="text-ink/45">{t('Reason')}</dt>
        <dd className="col-span-1 text-ink/75">{request.reason}</dd>
      </dl>
      {request.isBundle && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/50"><Layers size={12} /> {t('Bundle claim — 1 request,')} {resource.quantity} {t('item(s) tracked internally.')}</p>
      )}
      {request.flagged && request.flagReasons?.length > 0 && !decision && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-clay/10 px-3 py-2 text-xs text-clay">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {t('Flagged')}: {request.flagReasons.map((reason) => t(reason)).join('; ')}
        </p>
      )}
      {decision && (
        <p className={`mt-2 flex items-start gap-1.5 text-xs ${decision.cls}`}>
          <ShieldCheck size={13} className="mt-0.5 shrink-0" /> {t(decision.text)}{request.adminNote ? `: "${request.adminNote}"` : ''}
        </p>
      )}
      {extra}
      {children && <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">{children}</div>}
      {/* Updates about THIS request only — kept next to the request itself rather than only
          in the global Notifications inbox, so it's obvious which item each update is about. */}
      <ItemNotifications type="request" id={request.id} />
    </div>
  )
}
