import { createHash, randomBytes } from 'node:crypto'
import dotenv from 'dotenv'
import { connectDatabase } from './db.js'

dotenv.config()

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(user) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await (await connectDatabase()).collection('sessions').insertOne({
    sessionHash: hashSessionToken(token),
    userId: user.id,
    createdAt: new Date(),
    expiresAt,
  })
  return token
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'Authentication required.' })

  try {
    const db = await connectDatabase()
    const sessionHash = hashSessionToken(token)
    const session = await db.collection('sessions').findOne({ sessionHash })
    if (!session || session.expiresAt <= new Date()) {
      if (session) await db.collection('sessions').deleteOne({ sessionHash })
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }

    const user = await db.collection('users').findOne({ id: session.userId })
    if (!user) {
      await db.collection('sessions').deleteOne({ sessionHash })
      return res.status(401).json({ error: 'The account for this session no longer exists.' })
    }

    req.auth = { sub: user.id, role: user.role, sessionHash }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action.' })
    }
    next()
  }
}

export function publicUser(user) {
  if (!user) return null
  const { passwordHash, googleId, ...safeUser } = user
  return safeUser
}
