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
