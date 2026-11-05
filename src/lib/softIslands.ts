import type { MessageKey } from '../i18n'

/** Soft GO ⑤ islands. `all` keeps the live art-history path. */
export const SOFT_ISLAND_IDS = ['all', 'history', 'research', 'critique', 'sba', 'exam'] as const

export type SoftIslandId = (typeof SOFT_ISLAND_IDS)[number]

export type SoftPlate = 'home' | 'path' | 'quest'

/** History micro-quest. Option B is the Soft SCOUT D0 §1 answer. */
export const HISTORY_QUEST_ANSWER = 1

export const ISLAND_CHIP: Record<SoftIslandId, MessageKey> = {
  all: 'island.chip.all',
  history: 'island.chip.history',
  research: 'island.chip.research',
  critique: 'island.chip.critique',
  sba: 'island.chip.sba',
  exam: 'island.chip.exam',
}

export const ISLAND_SHORT: Record<SoftIslandId, MessageKey> = {
  all: 'island.short.all',
  history: 'island.short.history',
  research: 'island.short.research',
  critique: 'island.short.critique',
  sba: 'island.short.sba',
  exam: 'island.short.exam',
}

export const HISTORY_QUEST_OPTIONS = ['island.quest.a', 'island.quest.b', 'island.quest.c'] as const

const PATH_ISLAND = 'history'

function searchParams(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q)
}

function isIsland(value: string | null): value is SoftIslandId {
  return value != null && (SOFT_ISLAND_IDS as readonly string[]).includes(value)
}

/** The live main path is the art-history line. Other islands have no nodes in this wire. */
export function pathIslandOfLesson(_lessonId: string): typeof PATH_ISLAND {
  return PATH_ISLAND
}

/** `all` keeps every main-path lesson. A named island keeps only its own nodes. */
export function islandKeepsLesson(filter: SoftIslandId, lessonId: string): boolean {
  if (filter === 'all') return true
  return pathIslandOfLesson(lessonId) === filter
}

/** Default island matches the Soft QA plates (藝術史 selected). */
export function softIslandFromSearch(search: string): SoftIslandId {
  const raw = searchParams(search).get('island')
  return isIsland(raw) ? raw : 'history'
}

/** `plate=home|path|quest` opens one Soft QA plate. Default is the island home. */
export function softPlateFromSearch(search: string): SoftPlate {
  const raw = searchParams(search).get('plate')
  if (raw === 'path' || raw === 'quest' || raw === 'home') return raw
  return 'home'
}

export function historyQuestFeedback(choice: number): MessageKey | null {
  if (choice === HISTORY_QUEST_ANSWER) return 'island.quest.ok'
  if (choice === 0) return 'island.quest.missA'
  if (choice === 2) return 'island.quest.missC'
  return null
}
