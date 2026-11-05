import type { MessageKey } from '../i18n'

/** Soft GO ⑤ islands. `all` keeps the live art-history path. */
export const SOFT_ISLAND_IDS = ['all', 'history', 'research', 'critique', 'sba', 'exam'] as const

export type SoftIslandId = (typeof SOFT_ISLAND_IDS)[number]

export type SoftPlate = 'home' | 'path' | 'quest' | 'focus'

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

/** `plate=home|path|quest|focus` opens one plate. Default is the island home. */
export function softPlateFromSearch(search: string): SoftPlate {
  const raw = searchParams(search).get('plate')
  if (raw === 'path' || raw === 'quest' || raw === 'home' || raw === 'focus') return raw
  return 'home'
}

export function historyQuestFeedback(choice: number): MessageKey | null {
  if (choice === HISTORY_QUEST_ANSWER) return 'island.quest.ok'
  if (choice === 0) return 'island.quest.missA'
  if (choice === 2) return 'island.quest.missC'
  return null
}

/** Five icon nodes on the illustration map. `all` is a filter, not a node. */
export const ISLAND_NODE_IDS = ['history', 'research', 'critique', 'sba', 'exam'] as const

export type IslandNodeId = (typeof ISLAND_NODE_IDS)[number]

/** Islands that receive one new micro-quest. History stays on the existing path. */
export const QUEST_ISLAND_IDS = ['research', 'critique', 'sba', 'exam'] as const

export type QuestIslandId = (typeof QUEST_ISLAND_IDS)[number]

export type IslandNodeState = 'done' | 'progress' | 'later'

export function isIslandNode(id: SoftIslandId): id is IslandNodeId {
  return (ISLAND_NODE_IDS as readonly string[]).includes(id)
}

export function isQuestIsland(id: SoftIslandId): id is QuestIslandId {
  return (QUEST_ISLAND_IDS as readonly string[]).includes(id)
}

/**
 * History stays the finished node. A quest island is in progress when it is
 * the filter, or when the filter is 全部. The others read as coming later.
 */
export function islandNodeState(id: IslandNodeId, filter: SoftIslandId): IslandNodeState {
  if (id === 'history') return 'done'
  if (filter === 'all' || filter === id) return 'progress'
  return 'later'
}

export const ISLAND_LINE: Record<IslandNodeId, MessageKey> = {
  history: 'island.line.history',
  research: 'island.line.research',
  critique: 'island.line.critique',
  sba: 'island.line.sba',
  exam: 'island.line.exam',
}

export type IslandMicroQuest = {
  tag: MessageKey
  title: MessageKey
  sub: MessageKey
  contextTitle: MessageKey
  context: MessageKey
  question: MessageKey
  options: readonly [MessageKey, MessageKey, MessageKey]
  ok: MessageKey
  missA: MessageKey
  missC: MessageKey
}

/** Option B is the answer on every new island quest. */
export const ISLAND_QUEST_ANSWER = 1

export const ISLAND_MICRO_QUEST: Record<QuestIslandId, IslandMicroQuest> = {
  research: {
    tag: 'island.mq.research.tag',
    title: 'island.mq.research.title',
    sub: 'island.mq.research.sub',
    contextTitle: 'island.mq.research.contextTitle',
    context: 'island.mq.research.context',
    question: 'island.mq.research.q',
    options: ['island.mq.research.a', 'island.mq.research.b', 'island.mq.research.c'],
    ok: 'island.mq.research.ok',
    missA: 'island.mq.research.missA',
    missC: 'island.mq.research.missC',
  },
  critique: {
    tag: 'island.mq.critique.tag',
    title: 'island.mq.critique.title',
    sub: 'island.mq.critique.sub',
    contextTitle: 'island.mq.critique.contextTitle',
    context: 'island.mq.critique.context',
    question: 'island.mq.critique.q',
    options: ['island.mq.critique.a', 'island.mq.critique.b', 'island.mq.critique.c'],
    ok: 'island.mq.critique.ok',
    missA: 'island.mq.critique.missA',
    missC: 'island.mq.critique.missC',
  },
  sba: {
    tag: 'island.mq.sba.tag',
    title: 'island.mq.sba.title',
    sub: 'island.mq.sba.sub',
    contextTitle: 'island.mq.sba.contextTitle',
    context: 'island.mq.sba.context',
    question: 'island.mq.sba.q',
    options: ['island.mq.sba.a', 'island.mq.sba.b', 'island.mq.sba.c'],
    ok: 'island.mq.sba.ok',
    missA: 'island.mq.sba.missA',
    missC: 'island.mq.sba.missC',
  },
  exam: {
    tag: 'island.mq.exam.tag',
    title: 'island.mq.exam.title',
    sub: 'island.mq.exam.sub',
    contextTitle: 'island.mq.exam.contextTitle',
    context: 'island.mq.exam.context',
    question: 'island.mq.exam.q',
    options: ['island.mq.exam.a', 'island.mq.exam.b', 'island.mq.exam.c'],
    ok: 'island.mq.exam.ok',
    missA: 'island.mq.exam.missA',
    missC: 'island.mq.exam.missC',
  },
}

export function islandQuestFeedback(id: QuestIslandId, choice: number): MessageKey | null {
  const quest = ISLAND_MICRO_QUEST[id]
  if (choice === ISLAND_QUEST_ANSWER) return quest.ok
  if (choice === 0) return quest.missA
  if (choice === 2) return quest.missC
  return null
}
