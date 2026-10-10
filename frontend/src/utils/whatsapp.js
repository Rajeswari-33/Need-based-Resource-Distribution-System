/**
 * Formats a phone number and message into a direct WhatsApp click-to-chat URL (wa.me).
 *
 * WhatsApp wa.me requires phone numbers to include the country code without any
 * '+', '-', '(', ')', or spaces.
 * For standard 10-digit Indian numbers, it automatically prepends country code 91.
 */
export function formatWhatsAppUrl(phone, message = '') {
  if (!phone) return null

  // Clean all non-digit characters
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return null

  // If 10 digits (Indian mobile without +91), prepend country code 91
  let fullNumber = digits
  if (digits.length === 10) {
    fullNumber = `91${digits}`
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // 09876543210 -> 919876543210
    fullNumber = `91${digits.slice(1)}`
  }

  if (fullNumber.length < 10) return null

  const encodedMessage = message ? encodeURIComponent(message.trim()) : ''
  return `https://wa.me/${fullNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}

/**
 * Directly opens WhatsApp in a new tab / window.
 */
export function openWhatsApp(phone, message = '') {
  const url = formatWhatsAppUrl(phone, message)
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  }
  return false
}
