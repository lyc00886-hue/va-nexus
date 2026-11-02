import type { ActivityEntry, GameStateV1, NodeProgress } from '../game/types'
import { supabase } from './supabase'

/**
 * Per-user game sync (table `user_progress`, owner-only RLS).
 * Only the game state (`va-nexus:game:v1`) is synced.
 * SEN data (`va-nexus:sen-support:v1`) is deliberately NEVER sent to the server.
 */

/** Which signed-in user the local game state currently belongs to (null = guest). */
export const GAME_OWNER_KEY = 'va-nexus:game:owner'

export function getLocalOwner(): string | null {
  try {
    return localStorage.getItem(GAME_OWNER_KEY)
  } catch {
    return null
  }
}

export function setLocalOwner(uid: string | null) {
  try {
    if (uid) localStorage.setItem(GAME_OWNER_KEY, uid)
    else localStorage.removeItem(GAME_OWNER_KEY)
  } catch {
    /* ignore */
  }
}

function mergeNode(a: NodeProgress | undefined, b: NodeProgress | undefined): NodeProgress {
  if (!a) return b!
  if (!b) return a
  return {
    attempts: Math.max(a.attempts, b.attempts),
    bestAccuracy: Math.max(a.bestAccuracy, b.bestAccuracy),
    perfectRuns: Math.max(a.perfectRuns, b.perfectRuns),
    completed: a.completed || b.completed,
    lastTs: Math.max(a.lastTs, b.lastTs),
  }
}

function unionMin(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? Math.min(out[k], v) : v
  return out
}

/** Merge two game states: higher XP / mastery wins, badges + rewards are unioned. */
export function mergeGame(local: GameStateV1, server: GameStateV1): GameStateV1 {
  const nodes: GameStateV1['nodes'] = {}
  for (const id of new Set([...Object.keys(local.nodes ?? {}), ...Object.keys(server.nodes ?? {})])) {
    nodes[id] = mergeNode(local.nodes?.[id], server.nodes?.[id])
  }
  const quests: GameStateV1['quests'] = { ...(server.quests ?? {}) }
  for (const [id, q] of Object.entries(local.quests ?? {})) {
    const s = quests[id]
    quests[id] = s ? { completed: s.completed || q.completed, ts: Math.max(s.ts, q.ts) } : q
  }
  const seen = new Set<string>()
  const activity: ActivityEntry[] = [...(local.activity ?? []), ...(server.activity ?? [])]
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((x, y) => y.ts - x.ts)
    .slice(0, 60)
  const ls = local.streak
  const ss = server.streak
  const later = (ls.lastDate ?? '') >= (ss?.lastDate ?? '') ? ls : ss
  return {
    ...server,
    ...local,
    version: 1,
    xp: Math.max(local.xp ?? 0, server.xp ?? 0),
    streak: { count: later?.count ?? 0, best: Math.max(ls.best ?? 0, ss?.best ?? 0), lastDate: later?.lastDate ?? null },
    nodes,
    quests,
    badges: unionMin(local.badges ?? {}, server.badges ?? {}),
    awarded: unionMin(local.awarded ?? {}, server.awarded ?? {}),
    activity,
    prefs: { ...server.prefs, ...local.prefs },
  }
}

export async function fetchServerGame(uid: string): Promise<GameStateV1 | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_progress').select('game').eq('user_id', uid).maybeSingle()
  if (error) throw error
  const g = data?.game as GameStateV1 | undefined
  return g && g.version === 1 ? g : null
}

export async function saveServerGame(uid: string, game: GameStateV1): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('user_progress').upsert({ user_id: uid, game }, { onConflict: 'user_id' })
  if (error) throw error
}
