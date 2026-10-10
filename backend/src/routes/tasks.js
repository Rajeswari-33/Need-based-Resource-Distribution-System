import { Router } from 'express'
import { connectDatabase } from '../db.js'
import { notifyDonationParticipants } from '../donationNotifications.js'
import { requireAuth } from '../middleware.js'
import { id, now } from '../utils.js'

const router = Router()
router.use(requireAuth)

async function notifyTaskParticipants(db, task, request, messages) {
  const relatedRequest = request || (task.requestId
    ? await db.collection('requests').findOne({ id: task.requestId })
    : null)
  const center = task.centerId
    ? await db.collection('centers').findOne({ id: task.centerId }, { projection: { coordinatorId: 1 } })
    : null
  const donorId = relatedRequest?.donorId || task.donorId
  const recipientId = relatedRequest?.recipientId || task.recipientId
  const roleForUser = new Map([
    [donorId, 'donor'],
    [recipientId, center?.coordinatorId === recipientId ? 'center' : 'recipient'],
    [task.volunteerId, 'volunteer'],
    [center?.coordinatorId, 'center'],
  ].filter(([userId]) => userId))
  const participants = [...roleForUser.keys()]

  await notifyDonationParticipants(db, {
    notifications: participants.flatMap((userId) => {
      const role = roleForUser.get(userId)
      const message = typeof messages === 'string' ? messages : messages[role] || messages.default
      if (!message) return []
      return [{
        userId,
        message,
        link: role === 'volunteer' ? '/volunteer'
          : role === 'donor' ? '/donor/requests'
            : role === 'center' ? '/center' : '/recipient/requests',
      }]
    }),
    subject: 'Setu Donation Notification',
    relatedType: relatedRequest ? 'request' : 'task',
    relatedId: relatedRequest?.id || task.id,
  })
}

router.get('/', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const user = req.auth.role === 'center'
      ? await db.collection('users').findOne({ id: req.auth.sub }, { projection: { centerId: 1 } })
      : null
    const query = req.auth.role === 'volunteer'
      ? { $or: [{ volunteerId: req.auth.sub }, { status: 'open' }] }
      : req.auth.role === 'donor' || req.auth.role === 'admin'
      ? req.auth.role === 'admin' ? {} : { donorId: req.auth.sub }
      : { $or: [{ recipientId: req.auth.sub }, { volunteerId: req.auth.sub }, ...(user?.centerId ? [{ centerId: user.centerId }] : [])] }
    const tasks = await db.collection('tasks').find(query).sort({ createdAt: -1 }).toArray()
    if (req.auth.role !== 'volunteer' || tasks.length === 0) return res.json(tasks)

    const resourceIds = [...new Set(tasks.map((task) => task.resourceId).filter(Boolean))]
    const requestIds = [...new Set(tasks.map((task) => task.requestId).filter(Boolean))]
    const [resources, requests] = await Promise.all([
      resourceIds.length ? db.collection('resources').find(
        { id: { $in: resourceIds } },
        { projection: { _id: 0, id: 1, donorId: 1, title: 1, photo: 1, location: 1, isBundle: 1, bundleItems: 1 } },
      ).toArray() : [],
      requestIds.length ? db.collection('requests').find(
        { id: { $in: requestIds } },
        { projection: { _id: 0, id: 1, donorId: 1 } },
      ).toArray() : [],
    ])
    const resourcesById = new Map(resources.map((resource) => [resource.id, resource]))
    const resourceDonorIds = new Map(resources.map((resource) => [resource.id, resource.donorId]))
    const requestDonorIds = new Map(requests.map((request) => [request.id, request.donorId]))
    const assignedTasks = tasks.filter((task) => task.status !== 'open' && task.volunteerId === req.auth.sub)
    const donorIds = [...new Set(assignedTasks.map((task) =>
      task.donorId || requestDonorIds.get(task.requestId) || resourceDonorIds.get(task.resourceId),
    ).filter(Boolean))]
    const recipientIds = [...new Set(assignedTasks.map((task) => task.recipientId).filter(Boolean))]
    const [donors, recipients] = await Promise.all([
      donorIds.length ? db.collection('users').find(
        { id: { $in: donorIds }, role: 'donor' },
        { projection: { _id: 0, id: 1, name: 1, email: 1, phone: 1, address: 1, city: 1, verificationStatus: 1 } },
      ).toArray() : [],
      recipientIds.length ? db.collection('users').find(
        { id: { $in: recipientIds } },
        { projection: { _id: 0, id: 1, role: 1, name: 1, email: 1, phone: 1, address: 1, city: 1, verificationStatus: 1 } },
      ).toArray() : [],
    ])
    const donorsById = new Map(donors.map((donor) => [donor.id, {
      ...donor,
      verified: donor.verificationStatus === 'verified',
    }]))
    const recipientsById = new Map(recipients.map((recipient) => [recipient.id, {
      ...recipient,
      verified: recipient.verificationStatus === 'verified',
    }]))

    const centersById = new Map()
    const assignedCenterIds = [...new Set(assignedTasks.map((task) => task.centerId).filter(Boolean))]
    if (assignedCenterIds.length) {
      const centers = await db.collection('centers').find(
        { id: { $in: assignedCenterIds } },
        { projection: { _id: 0, id: 1, name: 1, address: 1, location: 1, centerType: 1, coordinatorId: 1 } },
      ).toArray()
      centers.forEach((center) => centersById.set(center.id, center))
    }

    res.json(tasks.map((task) => {
      const donorId = task.donorId || requestDonorIds.get(task.requestId) || resourceDonorIds.get(task.resourceId)
      const resource = resourcesById.get(task.resourceId)
      const assignedToCurrentVolunteer = task.status !== 'open' && task.volunteerId === req.auth.sub
      const recipientContact = assignedToCurrentVolunteer ? recipientsById.get(task.recipientId) || null : null
      const center = assignedToCurrentVolunteer && task.centerId ? centersById.get(task.centerId) : null
      return {
        ...task,
        resourceDetails: resource ? {
          title: resource.title,
          photo: resource.photo,
          location: resource.location,
          isBundle: resource.isBundle,
          bundleItems: resource.bundleItems,
        } : null,
        donorContact: assignedToCurrentVolunteer ? donorsById.get(donorId) || null : null,
        recipientContact: center ? {
          ...(recipientsById.get(center.coordinatorId) || {}),
          address: center.address,
          city: center.location,
          centerName: center.name,
          centerType: center.centerType,
        } : recipientContact,
      }
    }))
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

router.post('/verification-request/:requestId', async (req, res, next) => {
  try {
    if (req.auth.role !== 'donor') {
      return res.status(403).json({ error: 'Only the donor can request field verification.' })
    }
    const db = await connectDatabase()
    const donor = await db.collection('users').findOne({ id: req.auth.sub })
    if (!donor || donor.verificationStatus !== 'verified' || donor.restricted) {
      return res.status(403).json({ error: 'A verified, unrestricted donor account is required to request field verification.' })
    }

    const request = await db.collection('requests').findOne({
      id: req.params.requestId,
      donorId: donor.id,
      status: 'requested',
    })
    if (!request) return res.status(404).json({ error: 'An active request belonging to your donation could not be found.' })

    const existingTask = await db.collection('tasks').findOne({
      requestId: request.id,
      type: 'field-verification',
      status: { $ne: 'cancelled' },
    })
    if (existingTask) return res.status(409).json({ error: 'A field-verification task already exists for this request.' })

    const [resource, recipient] = await Promise.all([
      db.collection('resources').findOne({ id: request.resourceId, donorId: donor.id }),
      db.collection('users').findOne({ id: request.recipientId }),
    ])
    if (!resource || !recipient) {
      return res.status(409).json({ error: 'The donation or receiving account for this request could not be found.' })
    }
    const center = recipient.role === 'center' && recipient.centerId
      ? await db.collection('centers').findOne({ id: recipient.centerId })
      : null
    const task = {
      id: id('t'),
      type: 'field-verification',
      requestId: request.id,
      resourceId: resource.id,
      donorId: donor.id,
      recipientId: recipient.id,
      centerId: center?.id || null,
      fromLabel: `${donor.name} (Donor)`,
      toLabel: center?.name || recipient.name,
      verificationNeed: {
        reason: request.reason,
        beneficiary: request.beneficiary,
        quantity: request.quantity,
        urgency: request.urgency,
      },
      status: 'open',
      volunteerId: null,
      createdAt: now(),
    }
    await db.collection('tasks').insertOne(task)
    await notifyTaskParticipants(db, task, request, {
      donor: `You requested an in-person verification visit for "${resource.title}". A verified volunteer will contact the recipient.`,
      recipient: `The donor requested an in-person verification visit for "${resource.title}". A verified volunteer will contact you.`,
      center: `The donor requested an in-person verification visit for "${resource.title}". A verified volunteer will contact your center.`,
    })
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
    await notifyTaskParticipants(db, result, null, {
      donor: `A Setu field team employee accepted your delivery task for "${result.title || 'the donation'}". Coordinate handoff with them.`,
      recipient: `A Setu field team employee accepted delivery of your requested donation "${result.title || 'the item'}".`,
      center: `A Setu field team employee accepted delivery of your center's requested donation "${result.title || 'the item'}".`,
      volunteer: `You accepted the delivery task for "${result.title || 'the donation'}".`,
    })
    res.json(result)
  } catch (error) { next(error) }
})

router.post('/:taskId/deliver', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const result = await db.collection('tasks').findOneAndUpdate({ id: req.params.taskId, volunteerId: req.auth.sub, status: 'accepted', donorConfirmed: true, type: { $ne: 'field-verification' } }, { $set: { status: 'delivered', deliveredAt: now() } }, { returnDocument: 'after' })
    if (!result) return res.status(409).json({ error: 'Task cannot be marked delivered.' })
    await notifyTaskParticipants(db, result, null, {
      donor: `The Setu field team employee marked your donation "${result.title || 'item'}" as delivered. The recipient or center must confirm receipt.`,
      recipient: `The Setu field team employee delivered your requested donation "${result.title || 'item'}". Please confirm receipt.`,
      center: `The Setu field team employee delivered your center's donation "${result.title || 'item'}". Please confirm receipt.`,
      volunteer: `You marked "${result.title || 'the donation'}" as delivered. The recipient or center must confirm receipt.`,
    })
    res.json(result)
  } catch (error) { next(error) }
})

router.post('/:taskId/handoff', async (req, res, next) => {
  try {
    if (req.auth.role !== 'donor') return res.status(403).json({ error: 'Only the donor can confirm handoff to the assigned Setu employee.' })
    const db = await connectDatabase()
    const result = await db.collection('tasks').findOneAndUpdate(
      { id: req.params.taskId, donorId: req.auth.sub, type: { $ne: 'field-verification' }, status: 'accepted' },
      { $set: { donorConfirmed: true, donorConfirmedAt: now() } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(409).json({ error: 'This delivery task is not awaiting donor handoff.' })
    await notifyTaskParticipants(db, result, null, {
      donor: `You confirmed handoff of "${result.title || 'the donation'}" to the assigned Setu field team employee.`,
      recipient: `The donor handed your requested donation "${result.title || 'item'}" to the field team employee. Confirm receipt when it arrives.`,
      center: `The donor handed your center's donation "${result.title || 'item'}" to the field team employee. Confirm receipt when it arrives.`,
      volunteer: `The donor confirmed handoff of "${result.title || 'the donation'}". You can now proceed with delivery.`,
    })
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
    const db = await connectDatabase()
    const result = await db.collection('tasks').findOneAndUpdate(
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
    await notifyTaskParticipants(db, result, null, {
      donor: `The Setu field team employee submitted a ${outcome.replace(/_/g, ' ')} verification report for "${result.title || 'the donation'}". Review it and decide how to proceed.`,
      recipient: `The field team employee completed verification for your request "${result.title || 'the item'}": ${outcome.replace(/_/g, ' ')}.`,
      center: `The field team employee completed verification for your center's request "${result.title || 'the item'}": ${outcome.replace(/_/g, ' ')}.`,
      volunteer: `You submitted a ${outcome.replace(/_/g, ' ')} verification report for "${result.title || 'the donation'}".`,
    })
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
      {
        donor: `The recipient confirmed receipt of your donation "${resource?.title || 'item'}". The donation and delivery are complete.`,
        recipient: `You confirmed receipt of "${resource?.title || 'the donation'}". The donation and delivery are complete.`,
        center: `Your center confirmed receipt of "${resource?.title || 'the donation'}". The donation and delivery are complete.`,
        volunteer: `The recipient confirmed receipt of "${resource?.title || 'the donation'}". Your delivery task is complete.`,
      },
    )
    res.json({ ok: true, task: result, request: completedRequest, resource: updatedResource })
  } catch (error) { next(error) }
})

export default router
