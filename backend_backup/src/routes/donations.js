import { Router } from 'express'
import { connectDatabase } from '../db.js'
import { requireAuth } from '../middleware.js'
import { id, now } from '../utils.js'

const router = Router()

router.get('/leaderboard', async (_req, res, next) => {
  try {
    const db = await connectDatabase()
    const donors = await db.collection('users')
      .find(
        {
          role: 'donor',
          verified: true,
          verificationStatus: 'verified',
          restricted: { $ne: true },
          donationsCompleted: { $gt: 0 },
        },
        { projection: { _id: 0, name: 1, donationsCompleted: 1, impactPoints: 1 } },
      )
      .sort({ donationsCompleted: -1, impactPoints: -1, name: 1 })
      .limit(10)
      .toArray()
    res.json({ donors })
  } catch (error) { next(error) }
})

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const query = req.auth.role === 'donor' ? { donorId: req.auth.sub } : {}
    res.json(await db.collection('resources').find(query).sort({ createdAt: -1 }).toArray())
  } catch (error) { next(error) }
})

router.post('/', async (req, res, next) => {
  try {
    if (req.auth.role !== 'donor') return res.status(403).json({ error: 'Only donors can post donations.' })
    const db = await connectDatabase()
    const donor = await db.collection('users').findOne({ id: req.auth.sub })
    if (!donor || donor.verificationStatus !== 'verified' || donor.restricted) {
      return res.status(403).json({ error: 'A verified, unrestricted donor account is required to post donations.' })
    }
    const value = Number(req.body?.value) || 0
    if (value > 1000) return res.status(400).json({ error: 'Donation value exceeds the per-posting limit.' })
    const donation = {
      ...req.body,
      id: id('r'),
      donorId: req.auth.sub,
      value,
      status: 'available',
      createdAt: now(),
      impactPointAwarded: false,
    }
    await db.collection('resources').insertOne(donation)
    res.status(201).json(donation)
  } catch (error) { next(error) }
})

router.get('/requests', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const user = await db.collection('users').findOne({ id: req.auth.sub }, { projection: { centerId: 1 } })
    const query = req.auth.role === 'admin' ? {} :
      req.auth.role === 'donor' ? {
        $or: [
          { donorId: req.auth.sub },
          { needRequest: true, status: { $in: ['requested', 'approved'] } },
        ],
      } :
      req.auth.role === 'recipient' ? { recipientId: req.auth.sub } :
      req.auth.role === 'center' ? { $or: [{ recipientId: req.auth.sub }, { centerId: user?.centerId }] } :
      { recipientId: '__no_requests_for_volunteers__' }
    res.json(await db.collection('requests').find(query).sort({ createdAt: -1 }).toArray())
  } catch (error) { next(error) }
})

router.post('/:resourceId/requests', async (req, res, next) => {
  try {
    if (!['recipient', 'center'].includes(req.auth.role)) return res.status(403).json({ error: 'Only recipients and centers can claim donations.' })
    const db = await connectDatabase()
    const recipient = await db.collection('users').findOne({ id: req.auth.sub })
    if (!recipient || recipient.verificationStatus !== 'verified' || recipient.restricted) {
      return res.status(403).json({ error: 'A verified, unrestricted account is required to claim donations.' })
    }
    if (recipient.role === 'center') {
      const center = recipient.centerId ? await db.collection('centers').findOne({ id: recipient.centerId }) : null
      if (!center?.approved) return res.status(403).json({ error: 'The center must be verified before claiming donations.' })
    }
    const resource = await db.collection('resources').findOne({ id: req.params.resourceId })
    if (!resource || !['available', 'pending'].includes(resource.status)) return res.status(400).json({ error: 'Donation is not available.' })
    if (resource.audience === 'center' ? recipient.role !== 'center' : recipient.role !== 'recipient') {
      return res.status(403).json({ error: 'This donation is not listed for your account type.' })
    }
    if (resource.method === 'center') return res.status(400).json({ error: 'This donation was sent directly to a center and cannot be claimed.' })
    const quantity = Math.max(1, Number(req.body?.quantity) || 1)
    const activeClaims = await db.collection('requests').find({
      resourceId: resource.id,
      status: { $in: ['requested', 'approved', 'completed'] },
    }).toArray()
    const available = (resource.quantity || 1) - activeClaims.reduce((sum, claim) => sum + (claim.quantity || 1), 0)
    if (quantity > available) return res.status(409).json({ error: 'The requested quantity is no longer available.' })
    const request = {
      id: id('req'),
      resourceId: resource.id,
      recipientId: req.auth.sub,
      donorId: resource.donorId,
      reason: String(req.body?.reason || ''),
      beneficiary: String(req.body?.beneficiary || ''),
      quantity,
      urgency: String(req.body?.urgency || 'Normal'),
      requesterType: recipient.role === 'center' ? 'center' : 'individual',
      value: Math.round(((resource.value || 0) / (resource.quantity || 1)) * quantity),
      status: 'requested',
      donorConfirmed: false,
      recipientConfirmed: false,
      impactPointAwarded: false,
      createdAt: now(),
    }
    await db.collection('requests').insertOne(request)
    if (available - quantity <= 0) await db.collection('resources').updateOne({ id: resource.id }, { $set: { status: 'pending' } })
    res.status(201).json(request)
  } catch (error) { next(error) }
})

router.post('/needs/:requestId/fulfill', async (req, res, next) => {
  try {
    if (req.auth.role !== 'donor') return res.status(403).json({ error: 'Only donors can offer a donation for a resource need.' })
    const db = await connectDatabase()
    const donor = await db.collection('users').findOne({ id: req.auth.sub })
    if (!donor || donor.verificationStatus !== 'verified' || donor.restricted) {
      return res.status(403).json({ error: 'A verified, unrestricted donor account is required to fulfill a resource need.' })
    }
    const request = await db.collection('requests').findOne({
      id: req.params.requestId,
      needRequest: true,
      status: 'requested',
      resourceId: null,
    })
    if (!request) return res.status(409).json({ error: 'This resource need has already been matched, withdrawn, or fulfilled.' })
    const resource = await db.collection('resources').findOne({
      id: req.body?.resourceId,
      donorId: req.auth.sub,
      status: { $in: ['available', 'pending'] },
    })
    if (!resource || resource.method === 'center') {
      return res.status(400).json({ error: 'Choose one of your listed donations that is available for requests.' })
    }
    const categoryMatches = String(resource.category || '').trim().toLowerCase() === String(request.category || '').trim().toLowerCase()
    if (!categoryMatches) return res.status(400).json({ error: 'The donation category must match the recipient’s requested category.' })
    const requestType = request.requesterType === 'center' ? 'center' : 'individual'
    if (resource.audience && resource.audience !== requestType) {
      return res.status(400).json({ error: `This donation is listed for ${resource.audience === 'center' ? 'centers' : 'individual recipients'} and cannot fulfill this need.` })
    }
    const claims = await db.collection('requests').find({
      resourceId: resource.id,
      status: { $in: ['requested', 'approved', 'completed'] },
    }).toArray()
    const availableQuantity = Math.max(0, (resource.quantity || 1) - claims.reduce((sum, claim) => sum + (claim.quantity || 1), 0))
    const quantity = Math.max(1, Number(request.quantity) || 1)
    if (quantity > availableQuantity) {
      return res.status(409).json({ error: `This need requires ${quantity} item(s), but only ${availableQuantity} are still available.` })
    }
    const linkedRequest = await db.collection('requests').findOneAndUpdate(
      { id: request.id, needRequest: true, status: 'requested', resourceId: null },
      { $set: {
        resourceId: resource.id,
        donorId: req.auth.sub,
        status: 'approved',
        value: Math.round(((resource.value || 0) / (resource.quantity || 1)) * quantity),
        matchedNeed: true,
        matchedAt: now(),
      } },
      { returnDocument: 'after' },
    )
    if (!linkedRequest) return res.status(409).json({ error: 'Another donor has already matched this need. Refresh and choose another need.' })
    const nextClaims = [...claims, linkedRequest]
    const claimedQuantity = nextClaims.reduce((sum, claim) => sum + (claim.quantity || 1), 0)
    const nextStatus = claimedQuantity >= (resource.quantity || 1) ? 'pending' : 'available'
    const updatedResource = await db.collection('resources').findOneAndUpdate(
      { id: resource.id, donorId: req.auth.sub },
      { $set: { status: nextStatus } },
      { returnDocument: 'after' },
    )
    const createdAt = now()
    const notificationMessage = `A donor matched your request for "${request.title}" with "${resource.title}". Coordinate how you will receive it.`
    await db.collection('notifications').insertMany([
      {
        id: id('n'), userId: request.recipientId, message: notificationMessage,
        link: request.requesterType === 'center' ? '/center' : '/recipient/requests',
        read: false, relatedType: 'request', relatedId: request.id, createdAt,
      },
      {
        id: id('n'), userId: req.auth.sub,
        message: `Your donation "${resource.title}" was matched to the ${request.requesterType === 'center' ? 'center' : 'recipient'} need for "${request.title}".`,
        link: '/donor/requests', read: false, relatedType: 'request', relatedId: request.id, createdAt,
      },
    ])
    res.json({ ok: true, request: linkedRequest, resource: updatedResource || { ...resource, status: nextStatus } })
  } catch (error) { next(error) }
})

router.post('/requests/:requestId/confirm', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const request = await db.collection('requests').findOne({ id: req.params.requestId })
    if (!request || request.status === 'completed') return res.status(404).json({ error: 'Active request not found.' })
    const isDonor = req.auth.sub === request.donorId
    const isRecipient = req.auth.sub === request.recipientId
    if (!isDonor && !isRecipient) return res.status(403).json({ error: 'You are not part of this handover.' })
    const confirmedAt = now()
    const patch = isDonor
      ? { donorConfirmed: true, donorConfirmedAt: confirmedAt }
      : { recipientConfirmed: true, recipientConfirmedAt: confirmedAt }
    const complete = (isDonor || request.donorConfirmed) && (isRecipient || request.recipientConfirmed)
    await db.collection('requests').updateOne({ id: request.id }, {
      $set: { ...patch, ...(complete ? { status: 'completed', completedAt: confirmedAt, impactPointAwarded: true } : {}) },
    })
    if (complete) {
      await db.collection('resources').updateOne({ id: request.resourceId }, { $set: { status: 'completed' } })
      if (!request.impactPointAwarded) await db.collection('users').updateOne({ id: request.donorId }, { $inc: { impactPoints: 1, donationsCompleted: 1 } })
    }
    res.json({ ok: true, completed: complete })
  } catch (error) { next(error) }
})

export default router
