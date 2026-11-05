/**
 * Preview-only switch for the one-lesson Map shell.
 * The folded Learning Map stays the default. `?ux=map1` opts in
 * (and is remembered). `?ux=classic` or `?ux=off` turns it off.
 * `?ux=steps` is the Research shell and does not change this flag.
 */
export const MAP_UX_STORAGE_KEY = 'va-nexus:map-ux:v1'
export const MAP_UX_ONE_VALUE = 'map1'

export type MapUxQuery = 'map1' | 'classic' | 'off' | null

export type MapChunkRef = { kind: 'read'; index: number } | { kind: 'practice'; index: number }

function searchParams(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q)
}

/** Known map values only. `steps` and anything else leave the stored choice alone. */
export function mapUxQuery(search: string): MapUxQuery {
  const raw = searchParams(search).get('ux')
  if (raw === 'map1' || raw === 'classic' || raw === 'off') return raw
  return null
}

/** True only for an explicit map1 opt-in. Default (no query, no stored flag) is false. */
export function mapOneEnabled(search: string, stored: string | null | undefined): boolean {
  const query = mapUxQuery(search)
  if (query === 'map1') return true
  if (query === 'classic' || query === 'off') return false
  return stored === MAP_UX_ONE_VALUE
}

export function mapUxPersist(search: string): 'set' | 'clear' | 'keep' {
  const query = mapUxQuery(search)
  if (query === 'map1') return 'set'
  if (query === 'classic' || query === 'off') return 'clear'
  return 'keep'
}

/** Fired after the student map-version toggle rewrites `ux`. */
export const MAP_VERSION_EVENT = 'va-nexus:map-version'

export type MapVersion = 'map1' | 'classic'

/**
 * Student-facing version. `?ux=off` is the classic map.
 * A stored map1 opt-in still counts when the query does not say otherwise.
 */
export function mapVersionOf(search: string, stored: string | null | undefined): MapVersion {
  return mapOneEnabled(search, stored) ? 'map1' : 'classic'
}

/** Next search string. Other params stay. Classic is written as `ux=classic` (`off` remains a read alias). */
export function mapVersionSearch(search: string, version: MapVersion): string {
  const params = searchParams(search)
  params.set('ux', version)
  const q = params.toString()
  return q ? `?${q}` : ''
}

/** Read cards, then one practice item. Empty when the lesson has neither. */
export function lessonChunks(cardCount: number, questionCount: number): MapChunkRef[] {
  const chunks: MapChunkRef[] = []
  const cards = Math.max(0, cardCount)
  const questions = Math.max(0, questionCount)
  for (let index = 0; index < cards; index++) chunks.push({ kind: 'read', index })
  for (let index = 0; index < questions; index++) chunks.push({ kind: 'practice', index })
  return chunks
}

/** Next chunk, or `done` when this was the last one. */
export function stepChunk(index: number, count: number): { index: number; done: boolean } {
  if (count <= 0 || index >= count - 1) return { index: Math.max(0, index), done: true }
  return { index: index + 1, done: false }
}

/** The following lesson in curriculum order, or null at the end of the track. */
export function nextLessonId(units: readonly { nodes: readonly { id: string }[] }[], lessonId: string): string | null {
  for (let u = 0; u < units.length; u++) {
    const nodes = units[u].nodes
    const i = nodes.findIndex((node) => node.id === lessonId)
    if (i === -1) continue
    if (i + 1 < nodes.length) return nodes[i + 1].id
    return units[u + 1]?.nodes[0]?.id ?? null
  }
  return null
}
