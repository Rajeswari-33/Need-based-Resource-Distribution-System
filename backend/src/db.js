import dns from 'dns'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const uri = process.env.MONGODB_URI?.trim()
if (!uri) throw new Error('MONGODB_URI must be set in backend/.env before starting the API.')
const dbName = process.env.MONGODB_DB || 'setu_donations'

const client = new MongoClient(uri)

let database
let connectionPromise

export async function connectDatabase() {
  if (database) return database
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await client.connect()
      const db = client.db(dbName)
      await db.command({ ping: 1 })
      await ensureIndexes(db)
      database = db
      console.log(`MongoDB connected to database "${dbName}".`)
      return db
    })()
  }

  try {
    return await connectionPromise
  } catch (error) {
console.error('MongoDB connection failed.')
console.error(error)
    try {
      await client.close()
    } catch (closeError) {
      console.error(`MongoDB client cleanup failed (${closeError.name || 'unknown error'}).`)
    }
    throw error
  } finally {
    connectionPromise = null
  }
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection('users').createIndex({ username: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('users').createIndex({ googleId: 1 }, { unique: true, sparse: true }),
    db.collection('sessions').createIndex({ sessionHash: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('whatsappFlowSessions').createIndex({ token: 1 }, { unique: true }),
    db.collection('whatsappFlowSessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('resources').createIndex({ donorId: 1, status: 1 }),
    db.collection('requests').createIndex({ resourceId: 1, recipientId: 1 }),
    db.collection('tasks').createIndex({ volunteerId: 1, status: 1 }),
    db.collection('notifications').createIndex({ userId: 1, read: 1 }),
    db.collection('rewardClaims').createIndex({ userId: 1, badgeName: 1 }, { unique: true }),
    db.collection('categories').createIndex({ id: 1 }, { unique: true }),
  ])
}

export async function closeDatabase() {
  if (connectionPromise) await connectionPromise.catch(() => {})
  await client.close()
  database = null
  connectionPromise = null
}
