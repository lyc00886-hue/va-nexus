import { useSyncExternalStore } from 'react'
import { useAuth } from './auth'
import { parseStaffEmailAllowlist, resolveStaffRole, STAFF_PREVIEW_KEY, type StaffRole } from './staffRole'

function previewEnabled(): boolean {
  return import.meta.env.DEV
}

function readPreview(): string | null {
  if (!previewEnabled() || typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(STAFF_PREVIEW_KEY)
  } catch {
    return null
  }
}

function subscribePreview(cb: () => void) {
  if (!previewEnabled() || typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === STAFF_PREVIEW_KEY) cb()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

export type StaffGate = { ready: boolean; role: StaffRole | null }

/**
 * `ready` is false until auth (or a dev preview) can decide the role.
 * Callers must not treat a not-ready null as "student" — that would bounce a
 * teacher off this page before the session loads.
 */
export function useStaffGate(): StaffGate {
  const { ready, user } = useAuth()
  const preview = useSyncExternalStore(subscribePreview, readPreview, () => null)
  const devPreview = previewEnabled()
  const decided = ready || Boolean(devPreview && preview)
  if (!decided) return { ready: false, role: null }
  return {
    ready: true,
    role: resolveStaffRole({
      appMetadata: user?.app_metadata ?? null,
      email: user?.email ?? null,
      allowlist: parseStaffEmailAllowlist(import.meta.env.VITE_STAFF_EMAILS as string | undefined),
      preview,
      previewEnabled: devPreview,
    }),
  }
}

/** Teacher or coordinator, or null for guests and students. Null also while auth is still loading. */
export function useStaffRole(): StaffRole | null {
  return useStaffGate().role
}
