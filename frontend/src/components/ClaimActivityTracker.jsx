import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { ListChecks, IndianRupee, Layers } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

function Bar({ value, max, tone }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barTone = pct >= 100 ? 'bg-clay' : pct >= 70 ? 'bg-marigold' : tone
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
      <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Recipients and centers share the same rolling-30-day limits (max requests, max claimed
// value), and a bundle claim only ever counts as ONE request no matter how many items are in
// it. This widget makes those numbers visible up front so people can save their remaining
// requests/value for what's genuinely urgent, instead of discovering the cap mid-claim.
export default function ClaimActivityTracker({ compact = false }) {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { activeRequestCount, valueClaimedInPeriod, MAX_ACTIVE_REQUESTS, VALUE_LIMIT_AMOUNT, VALUE_LIMIT_PERIOD_DAYS } = useData()

  const requestCount = activeRequestCount(currentUser.id)
  const value = valueClaimedInPeriod(currentUser.id)
  const requestsLeft = Math.max(0, MAX_ACTIVE_REQUESTS - requestCount)
  const valueLeft = Math.max(0, VALUE_LIMIT_AMOUNT - value)

  return (
    <div className={`card ${compact ? 'p-4' : 'p-5'}`}>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink/45">
        <ListChecks size={13} /> {t('Your claim activity — last')} {VALUE_LIMIT_PERIOD_DAYS} {t('days')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-ink/60">{t('Requests made')}</span>
            <span className="font-mono font-semibold text-ink">{requestCount} / {MAX_ACTIVE_REQUESTS}</span>
          </div>
          <Bar value={requestCount} max={MAX_ACTIVE_REQUESTS} tone="bg-banyan" />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-ink/60">{t('Value claimed')}</span>
            <span className="font-mono font-semibold text-ink">₹{value.toLocaleString('en-IN')} / ₹{VALUE_LIMIT_AMOUNT.toLocaleString('en-IN')}</span>
          </div>
          <Bar value={value} max={VALUE_LIMIT_AMOUNT} tone="bg-banyan" />
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-ink/50">
        <Layers size={13} className="mt-0.5 shrink-0" />
        {t('A bundle claim (multiple items in one listing) still counts as just one request toward this limit.')}
      </p>
      {requestsLeft === 0 || valueLeft <= 0 ? (
        <p className="mt-2 flex items-center gap-1.5 rounded-md bg-clay/10 px-3 py-2 text-xs text-clay">
          <IndianRupee size={13} /> {t('You\'ve reached this month\'s limit — save any remaining room for your most urgent need, or wait for the window to roll over.')}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink/45">
          {t(`You have ${requestsLeft} request${requestsLeft === 1 ? '' : 's'} and ₹${valueLeft.toLocaleString('en-IN')} left this period — worth saving for what you need most.`)}
        </p>
      )}
    </div>
  )
}
