import { Router } from 'express'
import { connectDatabase } from '../db.js'
import { publicUser, requireAuth, requireRole } from '../middleware.js'
import { normalizePhoneNumber } from '../utils.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const users = await db.collection('users').find({}).toArray()
    res.json(users.map((user) => {
      const safeUser = publicUser(user)
      if (req.auth.role !== 'admin' && user.id !== req.auth.sub) {
        delete safeUser.email
        delete safeUser.address
      }
      if (user.id !== req.auth.sub) delete safeUser.notificationPreferences
      return safeUser
    }))
  } catch (error) { next(error) }
})

router.get('/me', async (req, res, next) => {
  try {
    const user = await (await connectDatabase()).collection('users').findOne({ id: req.auth.sub })
    if (!user) return res.status(404).json({ error: 'User not found.' })
    res.json(publicUser(user))
  } catch (error) { next(error) }
})

router.patch('/:id/verification', async (req, res, next) => {
  try {
    if (req.auth.sub !== req.params.id) return res.status(403).json({ error: 'You can only submit verification for your own account.' })
    const { docType, docNumber } = req.body || {}
    if (typeof docType !== 'string' || !docType.trim() || typeof docNumber !== 'string' || !docNumber.trim()) {
      return res.status(400).json({ error: 'A document type and document number are required.' })
    }
    if (docType.trim().length > 80 || docNumber.trim().length > 120) {
      return res.status(400).json({ error: 'Document type or document number is too long.' })
    }

    const db = await connectDatabase()
    const users = db.collection('users')
    const user = await users.findOne({ id: req.params.id })
    if (!user) return res.status(404).json({ error: 'User not found.' })
    if (user.role === 'center') {
      const center = user.centerId ? await db.collection('centers').findOne({ id: user.centerId }) : null
      if (!center || !(center.approved || center.verificationStatus === 'verified')) {
        return res.status(403).json({ error: 'The institution must be approved before the coordinator can submit personal ID verification.' })
      }
      const personalDocumentTypes = ['Aadhaar', 'PAN Card', 'Voter ID (EPIC)', 'Driving Licence', 'Ration Card', 'Passport']
      if (!personalDocumentTypes.includes(docType.trim())) {
        return res.status(400).json({ error: 'Center coordinators must submit a personal identity document, such as Aadhaar.' })
      }
    }

    const result = await users.findOneAndUpdate(
      { id: req.params.id },
      { $set: {
        verified: false,
        verificationStatus: 'pending',
        verificationDoc: { docType: docType.trim(), docNumber: docNumber.trim(), submittedAt: new Date().toISOString() },
        verificationNote: null,
      } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(404).json({ error: 'User not found.' })
    res.json(publicUser(result))
  } catch (error) { next(error) }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const isAdmin = req.auth.role === 'admin'
    if (req.auth.sub !== req.params.id && !isAdmin) return res.status(403).json({ error: 'You can only update your own account.' })
    const allowed = isAdmin
      ? ['name', 'phone', 'city', 'address', 'vehicle', 'availability', 'serviceArea', 'centerId', 'restricted', 'flaggedForReview', 'flagReasons', 'impactPoints', 'donationsCompleted', 'tasksCompleted', 'activityScore', 'whatsappOptIn', 'notificationPreferences']
      : ['name', 'phone', 'city', 'address', 'vehicle', 'availability', 'serviceArea', 'volunteerTypes', 'mobileVerified', 'emailVerified', 'notificationPreferences']
    const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    for (const field of ['phone', 'address', 'city']) {
      if (Object.hasOwn(patch, field)) {
        if (typeof patch[field] !== 'string' || patch[field].length > (field === 'address' ? 250 : 120)) {
          return res.status(400).json({ error: `Enter a valid ${field} using no more than ${field === 'address' ? 250 : 120} characters.` })
        }
        patch[field] = patch[field].trim()
      }
    }
    if (Object.hasOwn(patch, 'phone') && patch.phone) {
      const normalizedPhone = normalizePhoneNumber(patch.phone)
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'Enter a phone number with +countrycode and 8 to 15 digits, for example +919876543210.' })
      }
      patch.phone = normalizedPhone
    }
    if (Object.hasOwn(patch, 'whatsappOptIn')) {
      if (typeof patch.whatsappOptIn !== 'boolean') {
        return res.status(400).json({ error: 'WhatsApp notification consent must be true or false.' })
      }
    }
    if (Object.hasOwn(patch, 'notificationPreferences')) {
      const preferences = patch.notificationPreferences
      const allowedKeys = ['inApp', 'email', 'whatsapp']
      if (
        !preferences || typeof preferences !== 'object' || Array.isArray(preferences) ||
        Object.keys(preferences).some((key) => !allowedKeys.includes(key)) ||
        Object.values(preferences).some((val) => typeof val !== 'boolean') ||
        preferences.inApp !== true
      ) {
        return res.status(400).json({ error: 'Choose valid notification preferences. Built-in notifications must remain enabled.' })
      }
      if (typeof preferences.whatsapp === 'boolean') {
        patch.whatsappOptIn = preferences.whatsapp
      }
    }
    if (Object.hasOwn(patch, 'phone') || patch.whatsappOptIn === true || patch.notificationPreferences?.whatsapp === true) {
      const currentUser = await (await connectDatabase()).collection('users').findOne(
        { id: req.params.id },
        { projection: { phone: 1, whatsappOptIn: 1 } },
      )
      const nextPhone = Object.hasOwn(patch, 'phone') ? patch.phone : currentUser?.phone
      const nextOptIn = Object.hasOwn(patch, 'whatsappOptIn') ? patch.whatsappOptIn : currentUser?.whatsappOptIn
      if (nextOptIn === true && !normalizePhoneNumber(nextPhone)) {
        return res.status(400).json({ error: 'Save a valid phone number with +countrycode before enabling WhatsApp notifications.' })
      }
    }
    if (Object.hasOwn(patch, 'volunteerTypes')) {
      const validTypes = ['verification', 'delivery']
      if (req.auth.role !== 'volunteer' || !Array.isArray(patch.volunteerTypes) || patch.volunteerTypes.length === 0 ||
          patch.volunteerTypes.some((type) => !validTypes.includes(type))) {
        return res.status(400).json({ error: 'Choose one or more valid Setu field-team assignment types.' })
      }
      patch.volunteerTypes = [...new Set(patch.volunteerTypes)]
    }
    if (!isAdmin && Object.hasOwn(req.body, 'centerId')) {
      const centerId = req.body.centerId
      if (typeof centerId !== 'string' || !centerId.trim()) {
        return res.status(400).json({ error: 'A valid center link is required.' })
      }
      const center = await (await connectDatabase()).collection('centers').findOne({
        id: centerId,
        coordinatorId: req.auth.sub,
      })
      if (!center) return res.status(403).json({ error: 'You can only link your account to an institution registered by you.' })
      patch.centerId = centerId
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No editable profile fields were provided.' })
    const update = { $set: patch }
    const result = await (await connectDatabase()).collection('users').findOneAndUpdate(
      { id: req.params.id },
      update,
      { returnDocument: 'after' },
    )
    if (!result) return res.status(404).json({ error: 'User not found.' })
    res.json(publicUser(result))
  } catch (error) { next(error) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.auth.sub !== req.params.id && req.auth.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own account.' })
    }
    const db = await connectDatabase()
    const result = await db.collection('users').deleteOne({ id: req.params.id })
    if (!result.deletedCount) return res.status(404).json({ error: 'User not found.' })
    await db.collection('sessions').deleteMany({ userId: req.params.id })
    res.json({ ok: true })
  } catch (error) { next(error) }
})

router.patch('/:id/verify', requireRole('admin'), async (req, res, next) => {
  try {
    if (typeof req.body?.approved !== 'boolean') return res.status(400).json({ error: 'An approval decision is required.' })
    if (req.body.note !== undefined && typeof req.body.note !== 'string') {
      return res.status(400).json({ error: 'The rejection note must be text.' })
    }
    const db = await connectDatabase()
    const users = db.collection('users')
    const targetUser = await users.findOne({ id: req.params.id })
    if (!targetUser) return res.status(404).json({ error: 'User not found.' })
    if (targetUser.role === 'center') {
      const center = targetUser.centerId ? await db.collection('centers').findOne({ id: targetUser.centerId }) : null
      if (!center || !(center.approved || center.verificationStatus === 'verified')) {
        return res.status(403).json({ error: 'Approve the institution before reviewing its coordinator.' })
      }
    }
    const patch = req.body.approved
      ? { verified: true, verificationStatus: 'verified', verificationNote: null }
      : { verified: false, verificationStatus: 'rejected', verificationNote: req.body.note?.trim() || 'Document could not be verified.' }
    const result = await users.findOneAndUpdate(
      { id: req.params.id, verificationStatus: 'pending' },
      { $set: patch },
      { returnDocument: 'after' },
    )
    if (!result) {
      return res.status(409).json({ error: 'This account has no pending verification request.' })
    }
    res.json(publicUser(result))
  } catch (error) { next(error) }
})

export default router
