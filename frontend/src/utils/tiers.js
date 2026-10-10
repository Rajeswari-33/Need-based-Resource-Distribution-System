// Simple recognition-tier system — a concrete, non-monetary way to make giving time or goods
// pay off for the person doing it, beyond just "thanks". Nothing here changes what anyone is
// allowed to do; it only changes how they're recognised once they're admin-verified.

export const DONOR_TIERS = [
  { name: 'Bronze Donor', min: 0, perk: 'Impact certificate for every completed donation' },
  { name: 'Silver Donor', min: 3, perk: 'A "Trusted Donor" badge shown to recipients and centers on your listings' },
  { name: 'Gold Donor', min: 8, perk: 'Trusted Donor badge + your posts are highlighted near the top of Browse' },
  { name: 'Platinum Donor', min: 15, perk: 'All Gold perks + a yearly consolidated donation summary, handy for CSR/80G-style records' },
]

export function getTier(tiers, count) {
  let current = tiers[0]
  for (const t of tiers) {
    if ((count || 0) >= t.min) current = t
  }
  return current
}

export function nextTier(tiers, count) {
  return tiers.find((t) => t.min > (count || 0)) || null
}
