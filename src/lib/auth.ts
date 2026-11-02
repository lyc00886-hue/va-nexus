import type { Session, User } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/**
 * Supabase Auth (Google) as a tiny external store — no provider needed.
 * Guest mode = no session; the app keeps working on localStorage only.
 */
export type AuthSnapshot = { ready: boolean; session: Session | null; user: User | null }

let snap: AuthSnapshot = { ready: !supabase, session: null, user: null }
const listeners = new Set<() => void>()

function set(session: Session | null) {
  snap = { ready: true, session, user: session?.user ?? null }
  listeners.forEach((l) => l())
}

if (supabase) {
  supabase.auth
    .getSession()
    .then(({ data }) => set(data.session))
    .catch(() => set(null))
  supabase.auth.onAuthStateChange((_event, session) => {
    // avoid re-render storms on TOKEN_REFRESHED when the user didn't change
    if (snap.ready && session?.user?.id === snap.user?.id && session?.access_token === snap.session?.access_token) return
    set(session)
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribe, () => snap, () => snap)
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export function displayName(user: User): string {
  const m = user.user_metadata ?? {}
  return (m.full_name as string) || (m.name as string) || user.email || 'Google'
}

export function avatarUrl(user: User): string | null {
  const m = user.user_metadata ?? {}
  return (m.avatar_url as string) || (m.picture as string) || null
}
