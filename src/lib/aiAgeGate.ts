import { createEmptyGame } from './progressSync'
import { supabase } from './supabase'

/**
 * 18+ AI gate: birth_year stays private on user_progress (owner RLS).
 * UI and local cache only ever see can_use_ai — never birth year / full DOB.
 * Never send birth_year to Gemini or include it in exports.
 */

export const CAN_USE_AI_CACHE_KEY = 'va-nexus:can-use-ai:v1'

export type AiAgeGate = {
  /** Derived permission flag for UI / client gating. */
  canUseAi: boolean
  /** True when a birth_year row exists (year itself is never returned for display). */
  hasBirthYear: boolean
}

const EMPTY: AiAgeGate = { canUseAi: false, hasBirthYear: false }

export function deriveCanUseAi(birthYear: number, now = new Date()): boolean {
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100) return false
  return now.getFullYear() - birthYear >= 18
}

export function loadCachedCanUseAi(): boolean {
  try {
    return localStorage.getItem(CAN_USE_AI_CACHE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveCachedCanUseAi(on: boolean) {
  try {
    if (on) localStorage.setItem(CAN_USE_AI_CACHE_KEY, '1')
    else localStorage.removeItem(CAN_USE_AI_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

export function clearCachedCanUseAi() {
  try {
    localStorage.removeItem(CAN_USE_AI_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

/** Fetch gate flags only — never expose birth_year to UI. */
export async function fetchAiAgeGate(uid: string): Promise<AiAgeGate> {
  if (!supabase) return EMPTY
  const { data, error } = await supabase
    .from('user_progress')
    .select('can_use_ai, birth_year')
    .eq('user_id', uid)
    .maybeSingle()
  if (error) throw error
  const canUseAi = Boolean(data?.can_use_ai)
  const hasBirthYear = data?.birth_year != null
  saveCachedCanUseAi(canUseAi)
  return { canUseAi, hasBirthYear }
}

/**
 * Persist birth_year privately and derived can_use_ai.
 * Returns gate flags only; birth year is never echoed for display.
 */
export async function saveBirthYearForAiGate(uid: string, birthYear: number): Promise<AiAgeGate> {
  if (!supabase) throw new Error('Supabase not configured')
  const maxYear = new Date().getFullYear()
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > maxYear) {
    throw new Error('invalid_birth_year')
  }
  const canUseAi = deriveCanUseAi(birthYear)

  const { data: existing, error: readErr } = await supabase
    .from('user_progress')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle()
  if (readErr) throw readErr

  if (existing) {
    const { error } = await supabase
      .from('user_progress')
      .update({ birth_year: birthYear, can_use_ai: canUseAi })
      .eq('user_id', uid)
    if (error) throw error
  } else {
    const { error } = await supabase.from('user_progress').insert({
      user_id: uid,
      birth_year: birthYear,
      can_use_ai: canUseAi,
      game: createEmptyGame(),
    })
    if (error) throw error
  }

  saveCachedCanUseAi(canUseAi)
  return { canUseAi, hasBirthYear: true }
}

/** Turn off AI in UI/cache; leave birth_year private on the server. */
export async function revokeCanUseAi(uid: string | null): Promise<void> {
  saveCachedCanUseAi(false)
  if (!uid || !supabase) return
  const { error } = await supabase.from('user_progress').update({ can_use_ai: false }).eq('user_id', uid)
  if (error) throw error
}
