const KEY = 'va-nexus:device-id'

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Persistent anonymous device id (MVP — no auth yet). */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const id = randomId()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return 'anonymous-device'
  }
}

export { randomId }
