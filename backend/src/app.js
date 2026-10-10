
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { connectDatabase } from './db.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import donationRoutes from './routes/donations.js'
import taskRoutes from './routes/tasks.js'
import rewardRoutes from './routes/rewards.js'
import platformRoutes from './routes/platform.js'
import whatsappRoutes from './routes/whatsapp.js'
import emailRoutes from './routes/email.js'

dotenv.config()

const app = express()

const clientOrigin =
  process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// Middleware
app.use(cors({ origin: clientOrigin }))

app.use(express.urlencoded({
  extended: false,
  limit: '16kb'
}))

app.use(express.json({ limit: '2mb' }))

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const db = await connectDatabase()
    await db.command({ ping: 1 })

    res.json({
      ok: true,
      database: 'connected'
    })
  } catch (error) {
    console.error(
      `MongoDB health check failed (${error.name || 'unknown error'}).`
    )

    res.status(503).json({
      ok: false,
      database: 'disconnected',
      error: 'Unable to connect to MongoDB.'
    })
  }
})

// Application routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/donations', donationRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/rewards', rewardRoutes)
app.use('/api/platform', platformRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/email', emailRoutes)

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}.` })
})

// Error handler
app.use((error, _req, res, _next) => {
  console.error(error)

  res.status(error.status || 500).json({
    error: error.message || 'Internal server error.'
  })
})

export default app