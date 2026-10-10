export const IMPACT_BADGES = [
  { name: 'Bronze', minPoints: 5, reward: 'Basic reward' },
  { name: 'Silver', minPoints: 10, reward: 'Small useful product' },
  { name: 'Gold', minPoints: 25, reward: 'Better product' },
  { name: 'Elite', minPoints: 45, reward: 'Premium product' },
  { name: 'Platinum', minPoints: 75, reward: 'Premium reward' },
]

export function getImpactBadge(points = 0) {
  return IMPACT_BADGES.reduce((current, badge) => (points >= badge.minPoints ? badge : current), null)
}

export function getNextImpactBadge(points = 0) {
  return IMPACT_BADGES.find((badge) => badge.minPoints > points) || null
}