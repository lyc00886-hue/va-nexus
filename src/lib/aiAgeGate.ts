/**
 * 18+ AI gate: birth_year stays private on user_progress (owner RLS).
 * UI and local cache only ever see can_use_ai — never birth year / full DOB.
 * Never send birth_year to Gemini or include it in exports.
 * can_use_ai is derived server-side from birth_year (trigger); clients cannot forge true.
 * Reads/writes go through RPCs so birth_year is never SELECTed by the client.
 */
import { supabase } from './supabase'

const CACHE_KEY = 'va-nexus:can-use-ai'

export type AiAgeGate = {
  canUseAi: boolean
  /** True when a birth_year row exists (year itself is never returned for display). */
  hasBirthYear: boolean
}

function cacheCanUseAi(v: boolean) {
  try {
    if (v) localStorage.setItem(CACHE_KEY, '1')
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

export function loadCachedCanUseAi(): boolean {
  try {
    return localStorage.getItem(CACHE_KEY) === '1'
  } catch {
    return false
  }
}

export function clearCachedCanUseAi() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

function parseGate(raw: unknown): AiAgeGate {
  const o = (raw && typeof raw === 'object' ? raw : {}) as {
    can_use_ai?: unknown
    has_birth_year?: unknown
  }
  return {
    canUseAi: Boolean(o.can_use_ai),
    hasBirthYear: Boolean(o.has_birth_year),
  }
}

/** Fetch gate flags only — never expose birth_year to UI. */
export async function fetchAiAgeGate(_uid: string): Promise<AiAgeGate> {
  if (!supabase) return { canUseAi: false, hasBirthYear: false }
  const { data, error } = await supabase.rpc('get_ai_age_gate')
  if (error) throw error
  const gate = parseGate(data)
  cacheCanUseAi(gate.canUseAi)
  return gate
}

/**
 * Persist birth_year privately via RPC; server derives can_use_ai.
 * Client never writes can_use_ai and never SELECTs birth_year.
 */
export async function saveBirthYearForAiGate(_uid: string, birthYear: number): Promise<AiAgeGate> {
  if (!supabase) throw new Error('no_supabase')
  const y = Math.floor(Number(birthYear))
  const max = new Date().getFullYear()
  if (!Number.isFinite(y) || y < 1900 || y > max) {
    throw new Error('invalid_birth_year')
  }
  const { data, error } = await supabase.rpc('set_ai_birth_year', { p_year: y })
  if (error) throw error
  const gate = parseGate(data)
  cacheCanUseAi(gate.canUseAi)
  return gate
}

/** Turn off AI: clear birth_year server-side so can_use_ai cannot stay true. */
export async function revokeCanUseAi(uid: string | null): Promise<void> {
  clearCachedCanUseAi()
  if (!uid || !supabase) return
  const { error } = await supabase.rpc('clear_ai_birth_year')
  if (error) throw error
}
