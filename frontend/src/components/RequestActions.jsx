import React, { useState } from 'react'
import { Star, MessageSquareText } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

// Recipient rates a completed donation. Rating starts UNSET (0) — the recipient must
// actively pick a star count; it is never pre-filled/defaulted for them.
export function RatingForm({ request, onSubmit }) {
  const { t } = usePreferences()
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')

  if (request.rating) {
    return (
      <div className="mt-3 border-t border-ink/10 pt-3 text-sm">
        <p className="flex items-center gap-1 text-marigold-dark">
          {Array.from({ length: request.rating }).map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
        </p>
        {request.thankYouNote && <p className="mt-1 text-ink/60">"{request.thankYouNote}"</p>}
      </div>
    )
  }
  return (
    <div className="mt-3 border-t border-ink/10 pt-3">
      <p className="mb-2 text-xs font-semibold text-ink/60">{t('Rate this donation & leave a thank-you note')}</p>
      <div className="mb-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? 'text-marigold-dark' : 'text-ink/20'}>
            <Star size={18} fill={n <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <textarea className="input min-h-[60px] text-sm" placeholder={t('Say thank you…')} value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        onClick={() => onSubmit(rating, note)}
        disabled={rating === 0}
        className="btn-accent mt-2 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('Submit rating')}
      </button>
      {rating === 0 && <p className="mt-1.5 text-xs text-ink/40">{t('Tap a star to rate before submitting.')}</p>}
    </div>
  )
}

// Shown when an admin has flagged a claim/need as needing more information. The
// recipient's reply is stored on the request and puts it back in the admin's queue.
export function MoreInfoForm({ request, onSubmit }) {
  const { t } = usePreferences()
  const [info, setInfo] = useState(request.additionalInfo || '')
  return (
    <div className="mt-3 space-y-2 border-t border-marigold/30 pt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-marigold-dark"><MessageSquareText size={13} /> {t('Admin requested more info')}: "{request.adminNote}"</p>
      <textarea className="input min-h-[60px] text-sm" placeholder={t('Add the requested details or context…')} value={info} onChange={(e) => setInfo(e.target.value)} />
      <button onClick={() => onSubmit(info)} disabled={!info.trim()} className="btn-accent px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">{t('Send to admin')}</button>
    </div>
  )
}
