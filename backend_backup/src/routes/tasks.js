import { Router } from 'express'
import { connectDatabase } from '../db.js'
import { requireAuth } from '../middleware.js'
import { id, now } from '../utils.js'

const router = Router()
router.use(requireAuth)

async function notifyTaskParticipants(db, task, request, message) {
  const participants = [...new Set([
    task.donorId,
    task.recipientId,
    task.volunteerId,
    request?.donorId,
    request?.recipientId,
  ].filter(Boolean))]
  const relatedType = request ? 'request' : 'task'
  const relatedId = request?.id || task.id
  const createdAt = now()
  await db.collection('notifications').insertMany(participants.map((userId) => ({
    id: id('n'),
    userId,
    message,
    link: userId === task.volunteerId ? '/volunteer'
      : userId === (request?.donorId || task.donorId) ? '/donor/requests'
        : task.centerId ? '/center' : '/recipient/requests',
    read: false,
    relatedType,
    relatedId,
    createdAt,
  })))
}

router.get('/', async (req, res, next) => {
  try {
    const user = req.auth.role === 'center'
      ? await (await connectDatabase()).collection('users').findOne({ id: req.auth.sub }, { projection: { centerId: 1 } })
      : null
    const query = req.auth.role === 'volunteer'
      ? { $or: [{ volunteerId: req.auth.sub }, { status: 'open' }] }
      : req.auth.role === 'donor' || req.auth.role === 'admin'
      ? req.auth.role === 'admin' ? {} : { donorId: req.auth.sub }
      : { $or: [{ recipientId: req.auth.sub }, { volunteerId: req.auth.sub }, ...(user?.centerId ? [{ centerId: user.centerId }] : [])] }
    res.json(await (await connectDatabase()).collection('tasks').find(query).sort({ createdAt: -1 }).toArray())
  } catch (error) { next(error) }
})

router.post('/', async (req, res, next) => {
  try {
    if (req.auth.role !== 'donor') return res.status(403).json({ error: 'Only donors can request a Setu field team assignment.' })
    const donor = await (await connectDatabase()).collection('users').findOne({ id: req.auth.sub })
    if (!donor || donor.verificationStatus !== 'verified' || donor.restricted) {
      return res.status(403).json({ error: 'A verified, unrestricted donor account is required to request a Setu field team assignment.' })
    }
    if (!['delivery', 'pickup', 'field-verification'].includes(req.body?.type)) {
      return res.status(400).json({ error: 'A valid Setu field team assignment type is required.' })
    }
    const task = { ...req.body, id: id('t'), status: 'open', volunteerId: null, createdAt: now() }
    await (await connectDatabase()).collection('tasks').insertOne(task)
    res.status(201).json(task)
  } catch (error) { next(error) }
})

router.post('/:taskId/accept', async (req, res, next) => {
  try {
    if (req.auth.role !== 'volunteer') return res.status(403).json({ error: 'Only Setu field team employees can take assignments.' })
    const db = await connectDatabase()
    const volunteer = await db.collection('users').findOne({ id: req.auth.sub })
    if (!volunteer || volunteer.verificationStatus !== 'verified' || volunteer.restricted) {
      return res.status(403).json({ error: 'A verified, unrestricted Setu field team employee account is required to take assignments.' })
    }
    const task = await db.collection('tasks').findOne({ id: req.params.taskId, status: 'open' })
    if (!task) return res.status(409).json({ error: 'Task is no longer open.' })
    const volunteerTypes = volunteer.volunteerTypes?.length ? volunteer.volunteerTypes : ['verification', 'delivery']
    const requiredType = task.type === 'field-verification' ? 'verification' : 'delivery'
    if (!volunteerTypes.includes(requiredType)) return res.status(403).json({ error: 'Your Setu field team profile is not enabled for this assignment type.' })
    const result = await db.collection('tasks').findOneAndUpdate({ id: req.params.taskId, status: 'open' }, { $set: { status: 'accepted', volunteerId: req.auth.sub, acceptedAt: now() } }, { returnDocument: 'after' })
    if (!result) return res.status(409).json({ error: 'Task is no longer open.' })
    res.json(result)
  } catch (error) { next(error) }
})

router.post('/:taskId/deliver', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const result = await db.collection('tasks').findOneAndUpdate({ id: req.params.taskId, volunteerId: req.auth.sub, status: 'accepted', donorConfirmed: true, type: { $ne: 'field-verification' } }, { $set: { status: 'delivered', deliveredAt: now() } }, { returnDocument: 'after' })
    if (!result) return res.status(409).json({ error: 'Task cannot be marked delivered.' })
    res.json(result)
  } catch (error) { next(error) }
})

router.post('/:taskId/handoff', async (req, res, next) => {
  try {
    if (req.auth.role !== 'donor') return res.status(403).json({ error: 'Only the donor can confirm handoff to the assigned Setu employee.' })
    const result = await (await connectDatabase()).collection('tasks').findOneAndUpdate(
      { id: req.params.taskId, donorId: req.auth.sub, type: { $ne: 'field-verification' }, status: 'accepted' },
      { $set: { donorConfirmed: true, donorConfirmedAt: now() } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(409).json({ error: 'This delivery task is not awaiting donor handoff.' })
    res.json(result)
  } catch (error) { next(error) }
})

router.post('/:taskId/verification-report', async (req, res, next) => {
  try {
    if (req.auth.role !== 'volunteer') return res.status(403).json({ error: 'Only the assigned Setu employee can submit a field-verification report.' })
    const { outcome, report } = req.body || {}
    if (!['verified', 'rejected', 'needs_more_information'].includes(outcome) ||
        typeof report !== 'string' || report.trim().length < 20 || report.length > 5000) {
      return res.status(400).json({ error: 'Choose a valid outcome and provide a report of 20–5000 characters.' })
    }
    const result = await (await connectDatabase()).collection('tasks').findOneAndUpdate(
      { id: req.params.taskId, volunteerId: req.auth.sub, type: 'field-verification', status: 'accepted' },
      { $set: {
        status: 'completed',
        verificationOutcome: outcome,
        verificationReport: report.trim(),
        verificationSubmittedAt: now(),
        completedAt: now(),
      } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(409).json({ error: 'This field-verification task is not assigned to you or is no longer active.' })
    res.json(result)
  } catch (error) { next(error) }
})

router.post('/:taskId/confirm', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const task = await db.collection('tasks').findOne({ id: req.params.taskId, status: 'delivered', donorConfirmed: true, type: { $ne: 'field-verification' } })
    if (!task) return res.status(404).json({ error: 'Delivered task not found.' })
    let isReceivingParty = task.recipientId === req.auth.sub
    if (!isReceivingParty && task.centerId) {
      const center = await db.collection('centers').findOne({ id: task.centerId }, { projection: { coordinatorId: 1 } })
      isReceivingParty = center?.coordinatorId === req.auth.sub
    }
    if (!isReceivingParty) return res.status(403).json({ error: 'Only the receiving party can confirm this delivery.' })
    const request = task.requestId
      ? await db.collection('requests').findOne({ id: task.requestId })
      : await db.collection('requests').findOne({
        resourceId: task.resourceId,
        recipientId: task.recipientId,
        status: 'approved',
      }, { sort: { createdAt: -1 } })
    if (task.requestId && (!request || request.status !== 'approved')) {
      return res.status(409).json({ error: 'The linked request is no longer awaiting delivery completion.' })
    }
    const result = await db.collection('tasks').findOneAndUpdate(
      { id: task.id, status: 'delivered', donorConfirmed: true },
      { $set: { status: 'completed', recipientConfirmed: true, confirmedAt: now() } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(409).json({ error: 'Task was already confirmed.' })
    const resource = task.resourceId ? await db.collection('resources').findOne({ id: task.resourceId }) : null
    let completedRequest = request
    let updatedResource = resource
    if (request) {
      const requestResult = await db.collection('requests').findOneAndUpdate(
        { id: request.id, status: 'approved' },
        { $set: {
          status: 'completed',
          recipientConfirmed: true,
          recipientConfirmedAt: result.confirmedAt,
          completedAt: result.confirmedAt,
        } },
        { returnDocument: 'after' },
      )
      if (!requestResult) {
        await db.collection('tasks').updateOne(
          { id: task.id, status: 'completed', recipientConfirmed: true },
          { $set: { status: 'delivered' }, $unset: { recipientConfirmed: '', confirmedAt: '' } },
        )
        return res.status(409).json({ error: 'The linked request was already completed or changed. Please refresh and try again.' })
      }
      completedRequest = requestResult
      if (!request.impactPointAwarded) {
        await db.collection('users').updateOne({ id: request.donorId || resource?.donorId }, { $inc: { impactPoints: 1, donationsCompleted: 1 } })
      }
      if (resource && !['withdrawn', 'removed'].includes(resource.status)) {
        const claims = await db.collection('requests').find({
          resourceId: resource.id,
          status: { $in: ['requested', 'approved', 'completed'] },
        }).toArray()
        const totalQuantity = resource.quantity || 1
        const claimedQuantity = claims.reduce((sum, claim) => sum + (claim.quantity || 1), 0)
        const completedQuantity = claims
          .filter((claim) => claim.status === 'completed')
          .reduce((sum, claim) => sum + (claim.quantity || 1), 0)
        const status = completedQuantity >= totalQuantity ? 'completed'
          : claimedQuantity >= totalQuantity ? 'pending' : 'available'
        const updated = await db.collection('resources').findOneAndUpdate(
          { id: resource.id },
          { $set: { status } },
          { returnDocument: 'after' },
        )
        updatedResource = updated || { ...resource, status }
      }
    }
    await notifyTaskParticipants(
      db,
      task,
      request,
      `Receipt of "${resource?.title || 'the donation'}" was confirmed. The donation and Setu employee delivery are complete.`,
    )
    res.json({ ok: true, task: result, request: completedRequest, resource: updatedResource })
  } catch (error) { next(error) }
})

export default router
