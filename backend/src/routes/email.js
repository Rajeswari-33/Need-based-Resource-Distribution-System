import express from 'express'
import { connectDatabase } from '../db.js'
import { requireAuth } from '../middleware.js'
import { sendEmailNotification } from '../notificationService.js'

const router = express.Router()

// GET /api/email/status - Check email service configuration
router.get('/status', (req, res) => {
  const configured = Boolean(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD
  )

  res.json({
    active: configured,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    host: process.env.EMAIL_HOST,
  })
})

// POST /api/email/test - Sends a test email to the authenticated user or given email
router.post('/test', requireAuth, async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const currentUser = await db.collection('users').findOne({ id: req.auth.sub })
    const targetEmail = (req.body?.email || currentUser?.email || '').trim().toLowerCase()

    if (!targetEmail) {
      return res.status(400).json({ error: 'No email address found for your account.' })
    }

    const testSubject = req.body?.subject || '🔔 Setu Platform: Test Email Notification'
    const testMessage = req.body?.message || `Hello ${currentUser?.name || 'there'}!\n\nThis is a test notification confirming that email notifications are active and working on your Setu account (${targetEmail}).\n\nYou will receive automated emails whenever donation requests, approvals, or handovers occur on the platform.\n\nBest regards,\nSetu Platform Team`

    const result = await sendEmailNotification({
      to: targetEmail,
      subject: testSubject,
      message: testMessage,
    })

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error || 'Email delivery failed.',
        recipient: targetEmail,
      })
    }

    res.json({
      success: true,
      recipient: targetEmail,
      message: `Test email successfully sent to ${targetEmail}.`,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/email/send - Sends an email notification
router.post('/send', requireAuth, async (req, res, next) => {
  try {
    const { to, subject, message } = req.body || {}
    if (!to || !message) {
      return res.status(400).json({ error: 'Both "to" and "message" fields are required.' })
    }

    const result = await sendEmailNotification({ to, subject, message })
    if (!result.success) {
      return res.status(502).json(result)
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
