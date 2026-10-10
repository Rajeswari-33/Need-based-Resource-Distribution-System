import React from 'react'
import { Award, Gift, LockKeyhole } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { IMPACT_BADGES, getImpactBadge, getNextImpactBadge } from '../utils/impact.js'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function ImpactRewards() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { claimReward, hasClaimedReward } = useData()
  const { showToast } = useToast()
  const points = currentUser.impactPoints || 0
  const badge = getImpactBadge(points)
  const nextBadge = getNextImpactBadge(points)

  async function handleClaim(name) {
    const result = await claimReward(currentUser.id, name)
    showToast(result.ok ? `${name} reward claimed successfully.` : result.error, result.ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-banyan/10 text-banyan-dark"><Award size={16} /></span>
          <p className="mt-3 text-2xl font-semibold text-ink">{points}</p>
          <p className="text-xs text-ink/50">{t('Impact points')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark"><Award size={16} /></span>
          <p className="mt-3 text-lg font-semibold text-ink">{badge?.name ? t(badge.name) : t('No badge yet')}</p>
          <p className="text-xs text-ink/50">{t('Current badge')}</p>
        </div>
        <div className="card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/10 text-ink"><Gift size={16} /></span>
          <p className="mt-3 text-lg font-semibold text-ink">{nextBadge ? nextBadge.minPoints - points : t('Complete')}</p>
          <p className="text-xs text-ink/50">{nextBadge ? `${t('Points to')} ${t(nextBadge.name)}` : t('All badges unlocked')}</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">{t('Rewards')}</h2>
            <p className="mt-1 text-xs text-ink/50">{t('Claim each reward once after unlocking its badge.')}</p>
          </div>
          <span className="text-xs font-semibold text-banyan-dark">{points} {t('points')}</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {IMPACT_BADGES.map((reward) => {
            const unlocked = points >= reward.minPoints
            const claimed = hasClaimedReward(currentUser.id, reward.name)
            return (
              <div key={reward.name} className="rounded-md border border-ink/10 bg-paper-dim p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t(reward.name)} {t('Reward')}{claimed ? ` - ${t('Claimed')}` : ''}</p>
                    <p className="mt-1 text-xs text-ink/50">{t('Required')}: {t(reward.name)} {t('Badge')}</p>
                    <p className="mt-1 text-xs text-ink/65">{t(reward.reward)}</p>
                  </div>
                  {!unlocked && <LockKeyhole size={15} className="shrink-0 text-ink/35" />}
                </div>
                {unlocked && !claimed && (
                  <button onClick={() => handleClaim(reward.name)} className="btn-outline mt-3 px-3 py-1.5 text-xs">{t('Claim Reward')}</button>
                )}
                {claimed && <p className="mt-3 text-xs font-semibold text-banyan-dark">{t('Claimed')}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}