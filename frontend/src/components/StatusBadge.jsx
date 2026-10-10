import React from 'react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const STYLES = {
  available: 'bg-banyan/10 text-banyan-dark',
  pending: 'bg-marigold/20 text-marigold-dark',
  completed: 'bg-ink/10 text-ink/70',
  requested: 'bg-marigold/20 text-marigold-dark',
  approved: 'bg-banyan/10 text-banyan-dark',
  rejected: 'bg-clay/10 text-clay',
  cancelled: 'bg-ink/10 text-ink/50',
  open: 'bg-banyan/10 text-banyan-dark',
  accepted: 'bg-marigold/20 text-marigold-dark',
  delivered: 'bg-marigold/20 text-marigold-dark',
  flagged: 'bg-clay/10 text-clay',
  verified: 'bg-banyan/10 text-banyan-dark',
  unverified: 'bg-clay/10 text-clay',
}

export default function StatusBadge({ status, children }) {
  const { t } = usePreferences()
  const cls = STYLES[status] || 'bg-ink/10 text-ink/60'
  return <span className={`badge ${cls}`}>{t(children || status)}</span>
}
