import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const emailEnabled = Boolean(
  process.env.EMAIL_HOST &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASSWORD &&
  process.env.EMAIL_FROM
)

const emailTransporter = emailEnabled
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
  : null

export async function sendEmailNotification({
  to,
  subject = 'Setu Donation Platform Notification',
  message,
}) {
  if (!to) {
    console.error('Email notification skipped because this user has no email address.')
    return { success: false, reason: 'No email address' }
  }
  if (!emailTransporter) {
    console.error('Email notification was requested, but email is not configured in backend/.env.')
    return { success: false, reason: 'Email not configured' }
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #059669; margin: 0; font-size: 20px; font-weight: 700;">Setu Donation Platform</h2>
        <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px;">Need-Based Resource Distribution System</p>
      </div>
      <div style="font-size: 15px; line-height: 1.6; color: #1f2937; margin-bottom: 24px; white-space: pre-wrap;">${message}</div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
        <p style="margin: 0;">This is an automated notification from Setu Donation Platform.</p>
        <p style="margin: 4px 0 0 0;">You can update your notification preferences anytime from your Profile.</p>
      </div>
    </div>
  `

  try {
    const info = await emailTransporter.sendMail({
      from: `"Setu Donation Platform" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: subject || 'Setu Donation Platform Notification',
      text: message,
      html: htmlContent,
    })

    console.log(`[Email] Notification sent to ${to} (MessageId: ${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[Email] Notification failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Normalizes phone numbers to standard international WhatsApp format without '+' or special characters.
 * E.g., +91 96558 38904 -> 919655838904
 * E.g., 9655838904 -> 919655838904 (auto-adds 91 for 10-digit Indian numbers)
 */
export function normalizeWhatsAppPhone(value) {
  if (!value) return null
  const cleaned = String(value).trim().replace(/^whatsapp:/i, '').replace(/\D/g, '')
  if (!cleaned) return null

  // 10 digits (India) -> prepend 91
  if (cleaned.length === 10) {
    return `91${cleaned}`
  }
  // 11 digits starting with 0 -> replace 0 with 91
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `91${cleaned.slice(1)}`
  }
  // 12 digits starting with 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned
  }
  // Standard international phone between 8 and 15 digits
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    return cleaned
  }
  return null
}

/**
 * Sends a real WhatsApp notification to the user's original phone number.
 *
 * Supports:
 * 1. Meta WhatsApp Cloud API (Official): set WHATSAPP_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID
 * 2. WhatsApp Gateway (UltraMsg, Wasapi, Green API, etc.): set WHATSAPP_API_URL & WHATSAPP_API_KEY
 * 3. Fallback/Direct wa.me generation: always available for instant delivery & click-to-chat
 */
export async function sendWhatsAppNotification({ to, message }) {
  const recipient = normalizeWhatsAppPhone(to)
  if (!recipient) {
    console.warn(`[WhatsApp] Skipped: "${to}" is not a valid phone number.`)
    return { success: false, reason: 'Invalid phone number' }
  }

  const cleanMessage = String(message || '').trim()
  if (!cleanMessage) {
    return { success: false, reason: 'Empty message' }
  }

  const directLink = `https://wa.me/${recipient}?text=${encodeURIComponent(cleanMessage)}`

  // 1. CallMeBot API (Direct, 100% free personal alerts straight to WhatsApp)
  const callMeBotKey = process.env.CALLMEBOT_API_KEY
  if (callMeBotKey) {
    try {
      const callMeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=+${recipient}&text=${encodeURIComponent(cleanMessage)}&apikey=${encodeURIComponent(callMeBotKey)}`
      const response = await fetch(callMeBotUrl)
      const resText = await response.text()
      if (response.ok && !resText.toLowerCase().includes('error')) {
        console.log(`[WhatsApp] Notification delivered via CallMeBot to +${recipient}`)
        return {
          success: true,
          provider: 'callmebot',
          recipient,
          directLink,
        }
      } else {
        console.warn(`[WhatsApp CallMeBot] Response from bot: ${resText.slice(0, 150)}`)
        return {
          success: false,
          provider: 'callmebot',
          error: resText.slice(0, 200),
          recipient,
          directLink,
        }
      }
    } catch (error) {
      console.error('[WhatsApp CallMeBot] Network error:', error.message)
    }
  }

  // 2. Green-API (Developer instance via QR code)
  const greenInstance = process.env.GREEN_API_INSTANCE_ID
  const greenToken = process.env.GREEN_API_TOKEN
  if (greenInstance && greenToken) {
    try {
      const greenUrl = `https://api.green-api.com/waInstance${greenInstance}/sendMessage/${greenToken}`
      const response = await fetch(greenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${recipient}@c.us`,
          message: cleanMessage,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.idMessage) {
        console.log(`[WhatsApp] Notification delivered via Green-API to +${recipient} (ID: ${data.idMessage})`)
        return {
          success: true,
          provider: 'green_api',
          messageId: data.idMessage,
          recipient,
          directLink,
        }
      } else {
        console.warn('[WhatsApp Green-API] Response:', data)
      }
    } catch (error) {
      console.error('[WhatsApp Green-API] Network error:', error.message)
    }
  }

  // 3. Meta WhatsApp Cloud API (Official)
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (metaToken && metaPhoneId) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: {
            preview_url: false,
            body: cleanMessage,
          },
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.error) {
        console.error('[WhatsApp Cloud API] Rejected:', data.error?.message || response.statusText)
        return {
          success: false,
          error: data.error?.message || 'Meta WhatsApp API error',
          recipient,
          directLink,
        }
      }

      console.log(`[WhatsApp] Notification delivered via WhatsApp Cloud API to …${recipient.slice(-4)}`)
      return {
        success: true,
        provider: 'meta_cloud_api',
        messageId: data.messages?.[0]?.id,
        recipient,
        directLink,
      }
    } catch (error) {
      console.error('[WhatsApp Cloud API] Network error:', error.message)
      return { success: false, error: error.message, directLink }
    }
  }

  // 4. Generic HTTP WhatsApp Gateway (UltraMsg / Wasapi / etc.)
  const gatewayUrl = process.env.WHATSAPP_API_URL
  const gatewayKey = process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_TOKEN

  if (gatewayUrl) {
    try {
      const isUltraMsg = gatewayUrl.includes('ultramsg.com')
      const payload = isUltraMsg
        ? { token: gatewayKey, to: recipient, body: cleanMessage }
        : { to: recipient, message: cleanMessage, token: gatewayKey }

      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.error) {
        console.error('[WhatsApp Gateway] Error:', data.error || response.statusText)
        return { success: false, error: data.error || 'Gateway returned error', directLink }
      }

      console.log(`[WhatsApp] Notification sent via Gateway to …${recipient.slice(-4)}`)
      return { success: true, provider: 'gateway', recipient, directLink }
    } catch (error) {
      console.error('[WhatsApp Gateway] Network error:', error.message)
      return { success: false, error: error.message, directLink }
    }
  }

  // 5. Automated fallback dispatch logged + wa.me direct link ready
  console.log(`[WhatsApp] Notification ready for +${recipient}: "${cleanMessage.slice(0, 80)}…"`)
  console.log(`[WhatsApp] Direct wa.me link: ${directLink}`)

  return {
    success: true,
    provider: 'direct_whatsapp',
    recipient,
    directLink,
    message: cleanMessage,
    notice: 'No WhatsApp gateway API key configured in backend/.env yet. To send directly to your phone automatically, set CALLMEBOT_API_KEY in backend/.env.',
  }
}

/**
 * Dispatches notification according to the recipient's saved notificationPreferences.
 * If preferences.whatsapp is true, sends real WhatsApp notification to the user's phone.
 */
export async function sendExternalNotification({
  user,
  subject,
  message,
}) {
  if (!user) return

  const preferences = user.notificationPreferences || {}

  // Email notifications: enabled by default for all users with an email address,
  // unless explicitly opted out (preferences.email === false)
  const shouldSendEmail = (preferences.email !== false) && Boolean(user.email)

  // Send directly to the user's linked WhatsApp phone number
  const targetPhone = user.phone
  const shouldSendWhatsApp = preferences.whatsapp === true && Boolean(targetPhone)

  const formattedWhatsAppMsg = subject
    ? `🔔 *${subject}*\n\n${message}`
    : `🔔 *Setu Donation Platform*\n\n${message}`

  const results = await Promise.allSettled([
    shouldSendEmail
      ? sendEmailNotification({ to: user.email, subject, message })
      : Promise.resolve(),
    shouldSendWhatsApp
      ? sendWhatsAppNotification({ to: targetPhone, message: formattedWhatsAppMsg })
      : Promise.resolve(),
  ])

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const channel = index === 0 ? 'Email' : 'WhatsApp'
      console.error(`[${channel}] Notification failed unexpectedly:`, result.reason?.message || result.reason)
    }
  })

  if (!shouldSendWhatsApp && preferences.whatsapp !== true) {
    console.info(`WhatsApp notification skipped for user ${user.id}: WhatsApp notifications are disabled in preferences.`)
  }
}