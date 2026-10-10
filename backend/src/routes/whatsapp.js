import express from 'express'
import { connectDatabase } from '../db.js'
import { requireAuth } from '../middleware.js'
import { normalizePhoneNumber } from '../utils.js'
import { sendWhatsAppNotification, normalizeWhatsAppPhone } from '../notificationService.js'

const router = express.Router()

// GET /api/whatsapp/status - Check WhatsApp service configuration
router.get('/status', (req, res) => {
  const greenApiConfigured = Boolean(process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_TOKEN)
  const metaConfigured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  )
  const gatewayConfigured = Boolean(process.env.WHATSAPP_API_URL)
  const callMeBotConfigured = Boolean(process.env.CALLMEBOT_API_KEY)

  let provider = 'direct_whatsapp'
  if (greenApiConfigured) provider = 'green_api'
  else if (metaConfigured) provider = 'meta_cloud_api'
  else if (gatewayConfigured) provider = 'gateway'
  else if (callMeBotConfigured) provider = 'callmebot'

  res.json({
    active: true,
    provider,
    callMeBotConfigured,
    greenApiConfigured,
    metaConfigured,
    gatewayConfigured,
  })
})

// POST /api/whatsapp/send - Endpoint to send a WhatsApp notification
router.post('/send', async (req, res, next) => {
  try {
    const { to, message } = req.body || {}
    if (!to || !message) {
      return res.status(400).json({ error: 'Both "to" and "message" fields are required.' })
    }

    const result = await sendWhatsAppNotification({ to, message })
    if (!result.success) {
      return res.status(502).json(result)
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// POST /api/whatsapp/notify-user - Sends WhatsApp notification for user activity / item updates
router.post('/notify-user', async (req, res, next) => {
  try {
    const { userId, phone, message, subject } = req.body || {}
    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' })
    }

    let targetPhone = phone
    if (!targetPhone && userId) {
      const db = await connectDatabase()
      const user = await db.collection('users').findOne({ id: userId })
      targetPhone = user?.phone
    }

    if (!targetPhone) {
      return res.status(400).json({ error: 'This user has no linked WhatsApp phone number in their profile.' })
    }

    const formattedMessage = subject
      ? `🔔 *${subject}*\n\n${message}`
      : `🔔 *Setu Donation Update*\n\n${message}`

    const result = await sendWhatsAppNotification({
      to: targetPhone,
      message: formattedMessage,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// POST /api/whatsapp/test - Test WhatsApp notification to user's real phone number
router.post('/test', async (req, res, next) => {
  try {
    const targetPhone = req.body?.phone
    if (!targetPhone) {
      return res.status(400).json({ error: 'Please provide the linked phone number to test.' })
    }

    const testMessage = req.body?.message ||
      '🔔 Test Notification from Setu Donation Platform: Your WhatsApp notification system is active and working!'

    const result = await sendWhatsAppNotification({
      to: targetPhone,
      message: testMessage,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// POST /api/whatsapp/preferences-flow - Legacy/Profile route to confirm preferences
router.post('/preferences-flow', requireAuth, async (req, res, next) => {
  try {
    const db = await connectDatabase()
    const user = await db.collection('users').findOne({ id: req.auth.sub })
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const phone = normalizePhoneNumber(user.phone)
    if (!phone) {
      return res.status(400).json({ error: 'Add a valid linked WhatsApp number in Profile first.' })
    }

    // Automatically enable WhatsApp notifications for this user
    await db.collection('users').updateOne(
      { id: user.id },
      {
        $set: {
          'notificationPreferences.whatsapp': true,
          whatsappOptIn: true,
        },
      },
    )

    // Send a real confirmation WhatsApp message to their real phone number
    const confirmation = await sendWhatsAppNotification({
      to: phone,
      message: 'Hello! You have enabled WhatsApp notifications for your Setu account. You will now receive automatic updates for your donation claims and handovers.',
    })

    res.json({
      sent: true,
      directLink: confirmation.directLink,
      message: 'WhatsApp notifications enabled successfully.',
    })
  } catch (error) {
    next(error)
  }
})

export default router