/**
 * Same-site teacher / coordinator gate for the school formative draft band.
 * Students, guests, and any other role stay on the student app.
 * `user_metadata` is ignored — the signed-in user can edit it.
 * Email allowlist applies only when the account has no role set.
 * Dev preview (`va-nexus:staff-preview`) is honored only when previewEnabled is true.
 */

export const STAFF_ROLES = ['teacher', 'coordinator'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_PREVIEW_KEY = 'va-nexus:staff-preview'

const ROLE_KEYS = ['role', 'staff_role', 'roles'] as const

export function parseStaffEmailAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const part of raw.split(/[,;\s]+/)) {
    const email = part.trim().replace(/^['"]|['"]$/g, '').toLowerCase()
    if (!email.includes('@')) continue
    seen.add(email)
  }
  return [...seen]
}

export function isStaffRole(value: unknown): value is StaffRole {
  return value === 'teacher' || value === 'coordinator'
}

function roleToken(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const token = value.trim().toLowerCase()
  return token || null
}

export function collectRoleTokens(appMetadata: object | null | undefined): string[] {
  if (!appMetadata) return []
  const meta = appMetadata as Record<string, unknown>
  const tokens: string[] = []
  for (const key of ROLE_KEYS) {
    const value = meta[key]
    if (typeof value === 'string') {
      const token = roleToken(value)
      if (token) tokens.push(token)
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        const token = roleToken(entry)
        if (token) tokens.push(token)
      }
    }
  }
  return tokens
}

export function resolveStaffRole(input: {
  appMetadata?: object | null
  email?: string | null
  allowlist?: readonly string[]
  preview?: string | null
  previewEnabled?: boolean
}): StaffRole | null {
  if (input.previewEnabled) {
    const preview = roleToken(input.preview)
    if (preview === 'student') return null
    if (isStaffRole(preview)) return preview
  }

  const tokens = collectRoleTokens(input.appMetadata)
  const staff = tokens.find(isStaffRole)
  if (staff) return staff
  if (tokens.length > 0) return null

  const email = (input.email ?? '').trim().toLowerCase()
  if (!email) return null
  const allow = new Set((input.allowlist ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean))
  return allow.has(email) ? 'teacher' : null
}
