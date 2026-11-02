import { XP } from '../game/rewards'
import type { ActivityEntry, GameStateV1, NodeProgress } from '../game/types'
import { clearCachedCanUseAi } from './aiAgeGate'
import { clearLocalNotes } from './sbaEvidence'
import { supabase } from './supabase'

/**
 * Per-user game sync (table `user_progress`, owner-only RLS).
 * Only the game state (`va-nexus:game:v1`) is synced.
 * SEN data (`va-nexus:sen-support:v1`) and locale preference are deliberately NEVER synced or cleared here.
 */

/** Which signed-in user the local game state currently belongs to (null = guest). */
export const GAME_OWNER_KEY = 'va-nexus:game:owner'
export const GAME_STORAGE_KEY = 'va-nexus:game:v1'

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

/** Fresh game state (used when another account's local progress must not be adopted). */
export function createEmptyGame(): GameStateV1 {
  return {
    version: 1,
    xp: 0,
    streak: { count: 0, best: 0, lastDate: null },
    nodes: {},
    quests: {},
    badges: {},
    activity: [],
    awarded: {},
    prefs: { hearts: true },
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

/** XP granted by a one-off `awardOnce` key (used when guest-only rewards are folded into cloud XP). */
export function xpForAwardKey(key: string): number {
  if (/^sba-step-\d+$/.test(key)) return XP.sbaStep
  if (key.startsWith('feldman')) return XP.feldmanAi
  return 0
}

/** Sum XP for `awarded` keys present on the guest/local copy but not yet on the cloud. */
export function guestOnlyRewardXp(local: GameStateV1, server: GameStateV1): number {
  let total = 0
  const serverAwarded = server.awarded ?? {}
  for (const key of Object.keys(local.awarded ?? {})) {
    if (key in serverAwarded) continue
    total += xpForAwardKey(key)
  }
  return total
}

/**
 * Merge guest/same-user local progress into the cloud copy.
 * XP = cloud XP + XP from rewards claimed only in the local/guest state (deduped by reward id).
 * Never use Math.max for XP — that drops guest-earned reward XP while still marking those rewards claimed.
 */
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
    xp: (server.xp ?? 0) + guestOnlyRewardXp(local, server),
    streak: { count: later?.count ?? 0, best: Math.max(ls.best ?? 0, ss?.best ?? 0), lastDate: later?.lastDate ?? null },
    nodes,
    quests,
    badges: unionMin(local.badges ?? {}, server.badges ?? {}),
    awarded: unionMin(local.awarded ?? {}, server.awarded ?? {}),
    activity,
    prefs: { ...server.prefs, ...local.prefs },
  }
}

/**
 * What to load when `uid` signs in.
 * - Local owned by a *different* account → cloud row, or empty if none. Never the local copy.
 * - Unowned guest progress, or owned by the same user → merge with cloud (or keep local if no cloud).
 */
export function resolveSignInState(
  uid: string,
  local: GameStateV1,
  owner: string | null,
  server: GameStateV1 | null,
): GameStateV1 {
  if (owner && owner !== uid) return server ?? createEmptyGame()
  if (server) return mergeGame(local, server)
  return local
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

/* ---------- debounced save + flush (survives effect cleanup / sign-out) ---------- */

let pendingUid: string | null = null
let pendingGame: GameStateV1 | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let chain: Promise<void> = Promise.resolve()

export function scheduleProgressSave(uid: string, game: GameStateV1, delayMs = 1500) {
  pendingUid = uid
  pendingGame = game
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void flushProgressSave()
  }, delayMs)
}

/** Cancel the debounce timer and await the latest pending save (no-op if nothing pending). */
export async function flushProgressSave(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const uid = pendingUid
  const game = pendingGame
  pendingUid = null
  pendingGame = null
  if (uid && game) {
    const run = saveServerGame(uid, game).catch((e) => {
      console.warn('[progress] flush failed', e)
    })
    chain = chain.then(() => run, () => run).then(
      () => undefined,
      () => undefined,
    )
  }
  await chain
}

/**
 * Clear per-user local keys on sign-out.
 * Keeps SEN support / SEN settings, locale preference, device id, and UI tab.
 */
export function clearPerUserLocalData() {
  setLocalOwner(null)
  clearCachedCanUseAi()
  clearLocalNotes()
  try {
    localStorage.removeItem(GAME_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
