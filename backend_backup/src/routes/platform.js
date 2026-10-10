import { Router } from 'express'
import { connectDatabase } from '../db.js'
import { requireAuth } from '../middleware.js'
import { id, now } from '../utils.js'

const router = Router()
router.use(requireAuth)

const COLLECTIONS = {
  resources: 'resources',
  requests: 'requests',
  centers: 'centers',
  tasks: 'tasks',
  notifications: 'notifications',
  categories: 'categories',
  reports: 'reports',
  messages: 'messages',
  rewardClaims: 'rewardClaims',
}
const DEFAULT_CATEGORIES = [
  'Clothes & Textiles',
  'Books & Stationery',
  'Electronics & Gadgets',
  'Furniture & Household',
  "Toys & Children's Items",
]

function recordId(collection, record) {
  if (collection === 'categories') return record.name
  if (collection === 'rewardClaims') return `${record.userId}:${record.badgeName}`
  return record.id
}

function publicRecord(record) {
  if (!record) return record
  const { _id, ...safeRecord } = record
  return safeRecord
}

function userCanAccess(record, userId) {
  return record.userId === userId ||
    record.reporterId === userId ||
    record.fromId === userId ||
    record.toId === userId ||
    record.donorId === userId ||
    record.recipientId === userId ||
    record.volunteerId === userId ||
    record.coordinatorId === userId
}

async function donationParticipants(db, relatedType, relatedId) {
  let request = null
  let resource = null
  let task = null
  if (relatedType === 'request') {
    request = await db.collection('requests').findOne({ id: relatedId })
  } else if (relatedType === 'resource') {
    resource = await db.collection('resources').findOne({ id: relatedId })
  } else if (relatedType === 'task') {
    task = await db.collection('tasks').findOne({ id: relatedId })
  }
  if (!request && task?.requestId) request = await db.collection('requests').findOne({ id: task.requestId })
  if (!resource) {
    const resourceId = request?.resourceId || task?.resourceId || (relatedType === 'resource' ? relatedId : null)
    if (resourceId) resource = await db.collection('resources').findOne({ id: resourceId })
  }
  const requestId = request?.id || task?.requestId
  const [relatedTasks, relatedRequests] = await Promise.all([
    requestId
      ? db.collection('tasks').find({ requestId }).toArray()
      : resource
        ? db.collection('tasks').find({ resourceId: resource.id }).toArray()
        : Promise.resolve([]),
    resource && !request
      ? db.collection('requests').find({ resourceId: resource.id }).toArray()
      : Promise.resolve([]),
  ])
  const participantIds = new Set([
    request?.donorId,
    request?.recipientId,
    resource?.donorId,
    task?.donorId,
    task?.recipientId,
    task?.volunteerId,
    ...relatedTasks.flatMap((entry) => [entry.donorId, entry.recipientId, entry.volunteerId]),
    ...relatedRequests.flatMap((entry) => [entry.donorId, entry.recipientId]),
  ].filter(Boolean))
  if (task?.centerId) {
    const center = await db.collection('centers').findOne({ id: task.centerId }, { projection: { coordinatorId: 1 } })
    if (center?.coordinatorId) participantIds.add(center.coordinatorId)
  }
  return participantIds
}

async function canWriteRecord(db, collection, record, user) {
  if (user.role === 'admin') return true
  switch (collection) {
    case 'resources':
      if (record.donorId === user.id) return true
      return !!(record.id && await db.collection('requests').findOne({
        resourceId: record.id,
        $or: [{ recipientId: user.id }, { donorId: user.id }],
      }))
    case 'requests':
      return record.recipientId === user.id || record.donorId === user.id
    case 'centers':
      return record.coordinatorId === user.id
    case 'tasks': {
      if (record.donorId === user.id || record.volunteerId === user.id || record.recipientId === user.id) return true
      if (record.status === 'open' && user.role === 'volunteer') return true
      if (record.centerId) {
        const center = await db.collection('centers').findOne({ id: record.centerId }, { projection: { coordinatorId: 1 } })
        return center?.coordinatorId === user.id
      }
      return false
    }
    case 'notifications':
      if (record.userId === user.id) return true
      if (record.userId === '__broadcast__' && record.dismissedFor?.includes(user.id)) return true
      if (record.userId === '__broadcast__') return false
      if (!record.relatedType || !record.relatedId) return false
      if (['request', 'resource', 'task'].includes(record.relatedType)) {
        const participants = await donationParticipants(db, record.relatedType, record.relatedId)
        return participants.has(user.id) && participants.has(record.userId)
      }
      if (record.relatedType === 'center') {
        const center = await db.collection('centers').findOne({ id: record.relatedId })
        return !!center && center.coordinatorId === user.id
      }
      if (record.relatedType === 'message') return record.relatedId === user.id
      if (record.relatedType === 'report') {
        const report = await db.collection('reports').findOne({ id: record.relatedId })
        return !!report && report.reporterId === user.id
      }
      return false
    case 'categories':
      return false
    case 'reports':
      return record.reporterId === user.id
    case 'messages':
      return record.fromId === user.id || record.toId === user.id
    case 'rewardClaims':
      return record.userId === user.id
    default:
      return false
  }
}

async function validateNewRecord(db, collection, record, user) {
  if (user.role === 'admin' && collection !== 'rewardClaims') return true
  switch (collection) {
    case 'resources':
      return user.role === 'donor' &&
        user.verificationStatus === 'verified' &&
        !user.restricted &&
        record.donorId === user.id &&
        record.status === 'available' &&
        Number(record.value) <= 1000
    case 'requests': {
      if (!['recipient', 'center'].includes(user.role) ||
          user.verificationStatus !== 'verified' ||
          user.restricted ||
          record.recipientId !== user.id ||
          record.status !== 'requested') return false
      if (user.role === 'center') {
        const center = user.centerId ? await db.collection('centers').findOne({ id: user.centerId }) : null
        if (!center?.approved) return false
      }
      if (record.needRequest === true && record.resourceId === null) return true
      if (typeof record.resourceId !== 'string') return false
      const resource = await db.collection('resources').findOne({ id: record.resourceId })
      if (!resource || !['available', 'pending'].includes(resource.status)) return false
      if (resource.audience === 'center' ? user.role !== 'center' : user.role !== 'recipient') return false
      if (resource.method === 'center') return false
      const total = resource.quantity || 1
      const requested = await db.collection('requests').find({
        resourceId: resource.id,
        status: { $in: ['requested', 'approved', 'completed'] },
      }).toArray()
      const claimed = requested.reduce((sum, item) => sum + (item.quantity || 1), 0)
      return (Number(record.quantity) || 1) <= total - claimed
    }
    case 'centers':
      return user.role === 'center' && record.coordinatorId === user.id && record.verificationStatus === 'unverified'
    case 'tasks':
      return user.role === 'donor' &&
        user.verificationStatus === 'verified' &&
        !user.restricted &&
        record.donorId === user.id &&
        record.status === 'open'
    case 'notifications':
      return record.userId === user.id || await canWriteRecord(db, collection, record, user)
    case 'reports':
      return record.reporterId === user.id
    case 'messages':
      return record.fromId === user.id
    case 'categories':
      return user.role === 'admin'
    default:
      return false
  }
}

function changedFields(collection, previous, next, user) {
  if (collection === 'categories' || user.role === 'admin') return next
  const changed = Object.fromEntries(Object.entries(next).filter(([key, value]) =>
    key !== '_id' && key !== 'id' && JSON.stringify(previous[key]) !== JSON.stringify(value),
  ))
  let allowedFields = []
  if (collection === 'resources') {
    allowedFields = previous.donorId === user.id
      ? Object.keys(changed).filter((key) => !['donorId', 'createdAt'].includes(key))
      : ['status']
  } else if (collection === 'requests') {
    if (previous.donorId === user.id) {
      allowedFields = ['status', 'approvedAt', 'donorConfirmed', 'donorConfirmedAt', 'recipientConfirmedAt', 'completedAt', 'rating', 'thankYouNote', 'deliveryMode', 'impactPointAwarded']
      if (changed.status && !['approved', 'rejected'].includes(changed.status) &&
          !(changed.status === 'completed' && previous.recipientConfirmed && next.donorConfirmed)) {
        allowedFields = allowedFields.filter((key) => key !== 'status')
      }
      if (changed.donorConfirmed && changed.donorConfirmed !== true) allowedFields = allowedFields.filter((key) => key !== 'donorConfirmed')
      if (changed.impactPointAwarded && (changed.impactPointAwarded !== true || changed.status !== 'completed' || !next.donorConfirmed || !next.recipientConfirmed)) {
        allowedFields = allowedFields.filter((key) => key !== 'impactPointAwarded')
      }
      if (changed.deliveryMode && (!['hand-to-hand', 'volunteer'].includes(changed.deliveryMode) || previous.status !== 'approved')) {
        allowedFields = allowedFields.filter((key) => key !== 'deliveryMode')
      }
    } else {
      allowedFields = ['status', 'recipientConfirmed', 'recipientConfirmedAt', 'completedAt', 'additionalInfo', 'rating', 'thankYouNote', 'impactPointAwarded']
      if (changed.status && changed.status !== 'cancelled' &&
          !(changed.status === 'completed' && previous.donorConfirmed && next.recipientConfirmed)) {
        allowedFields = allowedFields.filter((key) => key !== 'status')
      }
      if (changed.recipientConfirmed && changed.recipientConfirmed !== true) allowedFields = allowedFields.filter((key) => key !== 'recipientConfirmed')
      if (changed.impactPointAwarded && (changed.impactPointAwarded !== true || changed.status !== 'completed' || !next.donorConfirmed || !next.recipientConfirmed)) {
        allowedFields = allowedFields.filter((key) => key !== 'impactPointAwarded')
      }
    }
  } else if (collection === 'centers') {
    allowedFields = ['name', 'centerType', 'address', 'location', 'hours', 'acceptedCategories', 'urgentNeeds', 'verificationStatus', 'verificationDoc', 'verificationNote']
    if (changed.verificationStatus && changed.verificationStatus !== 'pending') allowedFields = allowedFields.filter((key) => key !== 'verificationStatus')
    if (changed.verificationDoc && !changed.verificationDoc.docType) allowedFields = allowedFields.filter((key) => key !== 'verificationDoc')
  } else if (collection === 'tasks') {
    if (previous.donorId === user.id) {
      allowedFields = ['donorConfirmed', 'donorConfirmedAt']
      if (changed.donorConfirmed && (changed.donorConfirmed !== true || previous.status !== 'accepted')) {
        allowedFields = allowedFields.filter((key) => !['donorConfirmed', 'donorConfirmedAt'].includes(key))
      }
    }
    else if (previous.status === 'open' && user.role === 'volunteer' && next.volunteerId === user.id) {
      allowedFields = ['status', 'volunteerId']
      if (changed.status && changed.status !== 'accepted') allowedFields = allowedFields.filter((key) => key !== 'status')
    } else if (previous.volunteerId === user.id) {
      if (previous.type === 'field-verification' && previous.status === 'accepted') {
        allowedFields = ['status', 'verificationOutcome', 'verificationReport', 'verificationSubmittedAt', 'completedAt']
        if (changed.status && changed.status !== 'completed') allowedFields = allowedFields.filter((key) => key !== 'status')
        if (changed.verificationOutcome && !['verified', 'rejected', 'needs_more_information'].includes(changed.verificationOutcome)) {
          allowedFields = allowedFields.filter((key) => key !== 'verificationOutcome')
        }
        if (changed.verificationReport && (typeof changed.verificationReport !== 'string' || changed.verificationReport.trim().length < 20 || changed.verificationReport.length > 5000)) {
          allowedFields = allowedFields.filter((key) => key !== 'verificationReport')
        }
      } else {
        allowedFields = ['status', 'deliveredAt']
        if (changed.status && changed.status !== 'delivered') allowedFields = allowedFields.filter((key) => key !== 'status')
        if (changed.status === 'delivered' && !previous.donorConfirmed) allowedFields = allowedFields.filter((key) => key !== 'status')
      }
    } else {
      allowedFields = ['status', 'confirmedAt', 'recipientConfirmed', 'recipientConfirmedAt']
      if (previous.type === 'field-verification' || previous.status !== 'delivered' || !previous.donorConfirmed) {
        allowedFields = []
      }
      if (changed.status && changed.status !== 'completed') allowedFields = allowedFields.filter((key) => key !== 'status')
      if (changed.status === 'completed' && (!previous.donorConfirmed || next.recipientConfirmed !== true)) {
        allowedFields = allowedFields.filter((key) => key !== 'status')
      }
      if (changed.recipientConfirmed && changed.recipientConfirmed !== true) {
        allowedFields = allowedFields.filter((key) => key !== 'recipientConfirmed')
      }
    }
  } else if (collection === 'notifications') {
    allowedFields = previous.userId === '__broadcast__' ? ['dismissedFor'] : ['read']
  } else if (collection === 'reports') {
    allowedFields = ['status', 'resolution']
  } else if (collection === 'messages') {
    allowedFields = ['deletedFor']
  }
  const disallowed = Object.keys(changed).filter((key) => !allowedFields.includes(key))
  if (disallowed.length) return null
  return changed
}

router.get('/bootstrap', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const categoryCollection = db.collection('categories')
    const existingCategories = await categoryCollection.countDocuments()
    if (!existingCategories) {
      await categoryCollection.insertMany(DEFAULT_CATEGORIES.map((name) => ({ id: name, name })))
    }
    const [centers, notifications, categories, reports, messages, rewardClaims] = await Promise.all([
      db.collection('centers').find({}).toArray(),
      db.collection('notifications').find({
        $or: [
          { userId: req.auth.sub },
          { userId: '__broadcast__', $or: [{ role: 'all' }, { role: req.auth.role }] },
        ],
      }).sort({ createdAt: -1 }).toArray(),
      db.collection('categories').find({}).sort({ name: 1 }).toArray(),
      db.collection('reports').find(req.auth.role === 'admin' ? {} : { reporterId: req.auth.sub }).sort({ createdAt: -1 }).toArray(),
      db.collection('messages').find({ $or: [{ fromId: req.auth.sub }, { toId: req.auth.sub }] }).sort({ createdAt: -1 }).toArray(),
      db.collection('rewardClaims').find({ userId: req.auth.sub }).toArray(),
    ])

    res.json({
      centers: centers.map(publicRecord),
      notifications: notifications.map(publicRecord),
      categories: categories.map((item) => item.name),
      reports: reports.map(publicRecord),
      messages: messages.map(publicRecord),
      rewardClaims: rewardClaims.map((claim) => ({ ...publicRecord(claim), id: `${claim.userId}:${claim.badgeName}` })),
    })
  } catch (error) { next(error) }
})

router.post('/sync', async (req, res, next) => {
  try {
    const { collection, upserts = [], deletedIds = [] } = req.body || {}
    const db = await connectDatabase()
    const user = await db.collection('users').findOne({ id: req.auth.sub })
    const mongoCollection = COLLECTIONS[collection]

    if (!user || !mongoCollection) return res.status(400).json({ error: 'Unknown data collection.' })
    if (!Array.isArray(upserts) || !Array.isArray(deletedIds) || upserts.length > 100 || deletedIds.length > 100) {
      return res.status(400).json({ error: 'Invalid or oversized collection update.' })
    }
    if (collection === 'categories' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can manage categories.' })
    }
    if (collection === 'rewardClaims') {
      return res.status(403).json({ error: 'Rewards must be claimed through the reward API.' })
    }

    const prepared = upserts.map((record) => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return null
      const safeRecord = { ...record }
      delete safeRecord._id
      if (collection === 'categories') {
        const name = typeof safeRecord.name === 'string' ? safeRecord.name.trim() : ''
        return name ? { ...safeRecord, id: name, name } : null
      }
      if (typeof safeRecord.id !== 'string' || !safeRecord.id.trim()) return null
      return safeRecord
    })
    if (prepared.some((record) => !record)) return res.status(400).json({ error: 'Every record must have a valid identifier.' })

    const existingRecords = new Map()
    for (const record of prepared) {
      const identifier = recordId(collection, record)
      const existing = await db.collection(mongoCollection).findOne({ id: identifier })
      if (existing) existingRecords.set(identifier, existing)
      if (collection === 'categories') {
        if (user.role !== 'admin') return res.status(403).json({ error: 'Only administrators can manage categories.' })
      } else if (existing) {
        if (!await canWriteRecord(db, collection, existing, user)) return res.status(403).json({ error: 'You do not have permission to update this record.' })
        if (collection === 'notifications' && existing.userId !== user.id && existing.userId !== '__broadcast__') {
          return res.status(403).json({ error: 'You can only update your own notifications.' })
        }
        if (collection === 'tasks' && existing.status === 'open' && record.volunteerId === user.id &&
            (user.role !== 'volunteer' || user.verificationStatus !== 'verified' || user.restricted)) {
          return res.status(403).json({ error: 'A verified, unrestricted Setu field team employee account is required to take assignments.' })
        }
        if (collection === 'tasks' && existing.status === 'open' && record.volunteerId === user.id) {
          const volunteerTypes = user.volunteerTypes?.length ? user.volunteerTypes : ['verification', 'delivery']
          const requiredType = existing.type === 'field-verification' ? 'verification' : 'delivery'
          if (!volunteerTypes.includes(requiredType)) {
            return res.status(403).json({ error: `Your Setu field team profile is not enabled for ${requiredType === 'verification' ? 'field verification' : 'pickup and delivery'} assignments.` })
          }
        }
        if (collection === 'tasks' && existing.type === 'field-verification' && existing.volunteerId === user.id &&
            existing.status === 'accepted' && record.status === 'completed' &&
            (!['verified', 'rejected', 'needs_more_information'].includes(record.verificationOutcome) ||
              typeof record.verificationReport !== 'string' || record.verificationReport.trim().length < 20 ||
              record.verificationReport.length > 5000)) {
          return res.status(400).json({ error: 'A valid field-verification outcome and report of 20–5000 characters are required.' })
        }
        if (collection === 'tasks' && existing.volunteerId === user.id && existing.type !== 'field-verification' &&
            existing.status === 'accepted' && record.status === 'delivered' && !existing.donorConfirmed) {
          return res.status(409).json({ error: 'The donor must confirm handoff before the assigned Setu employee marks the item delivered.' })
        }
      } else if (!await validateNewRecord(db, collection, record, user) || !await canWriteRecord(db, collection, record, user)) {
        return res.status(403).json({ error: 'You do not have permission to create this record.' })
      }
    }

    for (const value of deletedIds) {
      if (typeof value !== 'string' || !value.trim()) return res.status(400).json({ error: 'Every deleted record identifier must be text.' })
      const existing = await db.collection(mongoCollection).findOne({ id: value })
      if (!existing) continue
      const allowed = collection === 'categories'
        ? user.role === 'admin'
        : collection === 'notifications'
          ? existing.userId === user.id || (existing.userId === '__broadcast__' && existing.dismissedFor?.includes(user.id))
        : await canWriteRecord(db, collection, existing, user)
      if (!allowed) return res.status(403).json({ error: 'You do not have permission to delete this record.' })
    }

    const operations = prepared.map((record) => {
      const identifier = recordId(collection, record)
      const storedRecord = { ...record, id: identifier }
      const existing = existingRecords.get(identifier)
      if (existing) {
        const patch = changedFields(collection, existing, storedRecord, user)
        if (!patch) throw Object.assign(new Error('You cannot change protected fields in this record.'), { status: 403 })
        return { updateOne: { filter: { id: identifier }, update: { $set: patch } } }
      }
      if (collection === 'notifications' && storedRecord.userId === '__broadcast__' && !storedRecord.createdAt) storedRecord.createdAt = now()
      if (collection === 'tasks' && !storedRecord.id) storedRecord.id = id('t')
      return { updateOne: { filter: { id: identifier }, update: { $set: storedRecord }, upsert: true } }
    })
    operations.push(...deletedIds.map((value) => ({ deleteOne: { filter: { id: value } } })))
    if (operations.length) await db.collection(mongoCollection).bulkWrite(operations, { ordered: true })

    if (collection === 'requests') {
      for (const record of prepared) {
        const previous = existingRecords.get(record.id)
        if (record.flagged && !record.adminDecision && !['rejected', 'cancelled'].includes(record.status)) {
          await db.collection('users').updateOne(
            { id: record.recipientId },
            { $set: { flaggedForReview: true }, $addToSet: { flagReasons: { $each: record.flagReasons || [] } } },
          )
        }
        if (previous && previous.status !== 'completed' && record.status === 'completed' && !previous.impactPointAwarded) {
          await db.collection('users').updateOne(
            { id: record.donorId },
            { $inc: { impactPoints: 1, donationsCompleted: 1 } },
          )
        }
        if (record.adminDecision || ['rejected', 'cancelled'].includes(record.status)) {
          const openFlags = await db.collection('requests').countDocuments({
            recipientId: record.recipientId,
            flagged: true,
            adminDecision: null,
            status: { $nin: ['rejected', 'cancelled'] },
          })
          if (!openFlags) {
            await db.collection('users').updateOne(
              { id: record.recipientId },
              { $set: { flaggedForReview: false, flagReasons: [] } },
            )
          }
        }
      }
    }
    if (collection === 'resources') {
      for (const record of prepared) {
        const previous = existingRecords.get(record.id)
        if (!previous || previous.status === 'completed' || record.status !== 'completed' || previous.impactPointAwarded) continue
        const linkedRequest = await db.collection('requests').findOne({
          resourceId: record.id,
          status: { $nin: ['rejected', 'cancelled'] },
        })
        if (!linkedRequest) {
          await db.collection('users').updateOne(
            { id: record.donorId },
            { $inc: { impactPoints: 1, donationsCompleted: 1 } },
          )
        }
      }
    }

    res.json({ ok: true, upserted: prepared.length, deleted: deletedIds.length })
  } catch (error) { next(error) }
})

export default router
