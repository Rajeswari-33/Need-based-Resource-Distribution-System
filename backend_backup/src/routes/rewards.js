import { Router } from 'express'
import { connectDatabase } from '../db.js'
import { requireAuth } from '../middleware.js'
import { IMPACT_BADGES, getImpactBadge } from '../constants.js'
import { now } from '../utils.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    if (req.auth.role === 'volunteer') return res.status(403).json({ error: 'Rewards are not available for Setu platform team accounts.' })
    const db = await connectDatabase()
    const user = await db.collection('users').findOne({ id: req.auth.sub })
    const claims = await db.collection('rewardClaims').find({ userId: req.auth.sub }).toArray()
    const points = user?.impactPoints || 0
    res.json({ points, badge: getImpactBadge(points), rewards: IMPACT_BADGES.map((reward) => ({ ...reward, unlocked: points >= reward.minPoints, claimed: claims.some((claim) => claim.badgeName === reward.name) })) })
  } catch (error) { next(error) }
})

router.post('/:badgeName/claim', async (req, res, next) => {
  try {
    if (req.auth.role === 'volunteer') return res.status(403).json({ error: 'Rewards are not available for Setu platform team accounts.' })
    const badge = IMPACT_BADGES.find((item) => item.name === req.params.badgeName)
    if (!badge) return res.status(400).json({ error: 'Unknown reward badge.' })
    const db = await connectDatabase()
    const user = await db.collection('users').findOne({ id: req.auth.sub })
    if (!user || (user.impactPoints || 0) < badge.minPoints) return res.status(403).json({ error: 'Reach the required badge before claiming this reward.' })
    try {
      const claim = { userId: req.auth.sub, badgeName: badge.name, claimedAt: now() }
      await db.collection('rewardClaims').insertOne(claim)
      res.status(201).json(claim)
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'This reward has already been claimed.' })
      throw error
    }
  } catch (error) { next(error) }
})

export default router
