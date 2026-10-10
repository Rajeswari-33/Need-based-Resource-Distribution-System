import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { createHash } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import dotenv from 'dotenv'
import { connectDatabase } from '../db.js'
import { createSession, publicUser, requireAuth } from '../middleware.js'
import { id, now } from '../utils.js'
import { ROLES } from '../constants.js'

dotenv.config()

const router = Router()
const googleClient = new OAuth2Client()

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, username, password, phone = '', role, city = '', volunteerTypes } = req.body || {}
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password ||
      !ROLES.includes(role)
    ) {
      return res.status(400).json({ error: 'Name, email, username, password, and a valid non-admin role are required.' })
    }
    if (role === 'admin') return res.status(400).json({ error: 'Admin accounts cannot be created through registration.' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    const validVolunteerTypes = ['verification', 'delivery']
    const normalizedVolunteerTypes = role === 'volunteer'
      ? [...new Set(Array.isArray(volunteerTypes) ? volunteerTypes.filter((type) => validVolunteerTypes.includes(type)) : validVolunteerTypes)]
      : undefined
    if (role === 'volunteer' && normalizedVolunteerTypes.length === 0) {
      return res.status(400).json({ error: 'Choose at least one Setu field-team assignment type.' })
    }
    const db = await connectDatabase()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedUsername = username.trim().toLowerCase()
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3–20 characters: letters, numbers, underscore or dot only.' })
    }
    const duplicate = await db.collection('users').findOne({ $or: [{ email: normalizedEmail }, { username: normalizedUsername }] })
    if (duplicate) return res.status(409).json({ error: 'That email or username is already registered.' })
    const user = {
      id: id('u'), name: name.trim(), email: normalizedEmail, username: normalizedUsername,
      passwordHash: await bcrypt.hash(password, 12), phone, role, city,
      ...(role === 'volunteer' ? { volunteerTypes: normalizedVolunteerTypes } : {}),
      verified: false, verificationStatus: 'unverified', verificationDoc: null, verificationNote: null,
      restricted: false, flaggedForReview: false, flagReasons: [], impactPoints: 0,
      donationsCompleted: 0, tasksCompleted: 0, activityScore: 0, joined: now(), centerId: null,
    }
    await db.collection('users').insertOne(user)
    res.status(201).json({ user: publicUser(user), token: await createSession(user) })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That email or username is already registered.' })
    next(error)
  }
})

router.post('/google', async (req, res, next) => {
  try {
    const { credential, role } = req.body || {}
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return res.status(503).json({ error: 'Google sign-in is not configured on the server.' })
    if (typeof credential !== 'string' || !credential || ![...ROLES, 'admin'].includes(role)) {
      return res.status(400).json({ error: 'A Google credential and valid account role are required.' })
    }

    let ticket
    try {
      ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId })
    } catch {
      return res.status(401).json({ error: 'The Google credential is invalid or expired.' })
    }
    const profile = ticket.getPayload()
    if (!profile?.sub || typeof profile.email !== 'string' || profile.email_verified !== true) {
      return res.status(401).json({ error: 'Google did not provide a verified email address.' })
    }

    const users = (await connectDatabase()).collection('users')
    const email = profile.email.trim().toLowerCase()
    let user = await users.findOne({ googleId: profile.sub })

    if (!user) {
      user = await users.findOne({ email })
      if (user) {
        if (user.googleId && user.googleId !== profile.sub) {
          return res.status(409).json({ error: 'This email is linked to a different Google account.' })
        }
        if (user.role !== role) {
          return res.status(403).json({ error: 'Choose the role already assigned to this account.' })
        }
        await users.updateOne({ id: user.id }, { $set: { googleId: profile.sub, emailVerified: true } })
        user = { ...user, googleId: profile.sub, emailVerified: true }
      } else {
        if (role === 'admin') {
          return res.status(403).json({ error: 'Admin accounts must be provisioned by an administrator.' })
        }
        const username = `google_${createHash('sha256').update(profile.sub).digest('hex').slice(0, 16)}`
        user = {
          id: id('u'),
          name: profile.name?.trim() || email.split('@')[0],
          email,
          username,
          googleId: profile.sub,
          emailVerified: true,
          phone: '',
          role,
          ...(role === 'volunteer' ? { volunteerTypes: ['verification', 'delivery'] } : {}),
          city: '',
          verified: false,
          verificationStatus: 'unverified',
          verificationDoc: null,
          verificationNote: null,
          restricted: false,
          flaggedForReview: false,
          flagReasons: [],
          impactPoints: 0,
          donationsCompleted: 0,
          tasksCompleted: 0,
          activityScore: 0,
          joined: now(),
          centerId: null,
        }
        await users.insertOne(user)
      }
    } else if (user.role !== role) {
      return res.status(403).json({ error: 'Choose the role already assigned to this account.' })
    }

    res.json({ user: publicUser(user), token: await createSession(user) })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email or Google identity already exists.' })
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { identifier: rawIdentifier, password } = req.body || {}
    if (typeof rawIdentifier !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username/email and password are required.' })
    }
    const identifier = String(rawIdentifier || '').trim().toLowerCase()
    const user = await (await connectDatabase()).collection('users').findOne({ $or: [{ username: identifier }, { email: identifier }] })
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect username/email or password.' })
    }
    res.json({ user: publicUser(user), token: await createSession(user) })
  } catch (error) { next(error) }
})

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await (await connectDatabase()).collection('sessions').deleteOne({ sessionHash: req.auth.sessionHash })
    res.json({ ok: true })
  } catch (error) { next(error) }
})

export default router
