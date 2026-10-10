import { randomUUID } from 'node:crypto'

export function id(prefix) {
  return `${prefix}-${randomUUID()}`
}

export function now() {
  return new Date().toISOString()
}

export function cleanId(value) {
  return String(value || '').trim()
}

export function normalizePhoneNumber(value) {
  if (typeof value !== 'string') return null
  const phone = value.trim()
  if (!/^\+[1-9][\d\s().-]*$/.test(phone)) return null

  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}
