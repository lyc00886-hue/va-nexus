import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { oauthReturnToClassroomMap } from './oauthReturn.ts'

if (typeof window !== 'undefined') {
  const next = oauthReturnToClassroomMap(window.location.href)
  if (next) window.history.replaceState(window.history.state, '', next)
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    !url.includes('YOUR_PROJECT_REF') &&
    anonKey !== 'your_supabase_anon_key',
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
