import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Layers, Boxes } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import { useData } from '../context/DataContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function ResourceCard({ resource }) {
  const { centers, getAvailability } = useData()
  const { t, itemName } = usePreferences()
  const center = resource.centerId ? centers.find((c) => c.id === resource.centerId) : null
  const avail = getAvailability(resource.id)

  return (
    <Link to={`/browse/${resource.id}`} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <div className="flex h-36 items-center justify-center bg-dot-grid bg-dot-grid bg-paper-dim text-6xl">
        <span aria-hidden="true">{resource.photo}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-semibold leading-snug text-ink group-hover:text-banyan-dark">
            {itemName(resource.title, resource.titleTamil)}
          </h3>
          <StatusBadge status={resource.status}>{resource.status === 'completed' ? t('Donated') : undefined}</StatusBadge>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink/45">{t(resource.category)}</p>
        {resource.description && <p className="line-clamp-2 text-xs text-ink/55">{resource.description}</p>}
        <div className="mt-auto flex flex-col gap-1.5 pt-2 text-xs text-ink/60">
          <span className="flex items-center gap-1.5"><MapPin size={13} /> {resource.location}</span>
          {resource.isBundle ? (
            <span className="flex items-center gap-1.5"><Layers size={13} /> Bundle · Qty {resource.quantity}</span>
          ) : (resource.quantity || 1) > 1 && (
            <span className="flex items-center gap-1.5"><Boxes size={13} /> {avail.remaining} of {avail.total} available</span>
          )}
          <span className="font-medium text-ink/70">
            {t(resource.audience === 'center' ? 'For registered centers only' : 'For individual recipients')}
          </span>
        </div>
      </div>
    </Link>
  )
}
