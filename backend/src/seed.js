import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { connectDatabase, closeDatabase } from './db.js'

dotenv.config()

const db = await connectDatabase()
const passwordHash = await bcrypt.hash('Admin@123', 12)
await db.collection('users').updateOne(
  { id: 'u-admin-1' },
  { $setOnInsert: {
    id: 'u-admin-1', name: 'Platform Admin', email: 'admin@setu.org', username: 'admin', passwordHash,
    phone: '+91 90000 00000', role: 'admin', verified: true, verificationStatus: 'verified',
    restricted: false, flaggedForReview: false, impactPoints: 0, joined: new Date().toISOString(), centerId: null,
  } },
  { upsert: true },
)
console.log('MongoDB seed complete. Admin login: admin / Admin@123')
await closeDatabase()
