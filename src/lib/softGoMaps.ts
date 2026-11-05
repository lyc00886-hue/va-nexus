import type { MessageKey } from '../i18n'

/** Scope maps on the one-lesson shell. `islands` keeps the five-island shell. */
export const SOFT_GO_TRACKS = ['islands', 'history-cn', 'history-west', 'media', 'f4'] as const

export type SoftGoTrack = (typeof SOFT_GO_TRACKS)[number]

/** Grade chips. F.5 / F.6 packs stay out, so those chips open no units. */
export const SOFT_GO_GRADES = ['all', 'f4', 'f5', 'f6'] as const

export type SoftGoGrade = (typeof SOFT_GO_GRADES)[number]

export const SCOPE_LABEL: Record<SoftGoTrack, MessageKey> = {
  islands: 'map.scope.islands',
  'history-cn': 'map.scope.historyCn',
  'history-west': 'map.scope.historyWest',
  media: 'map.scope.media',
  f4: 'map.scope.f4',
}

export const SCOPE_CHIP: Record<SoftGoTrack, MessageKey> = {
  islands: 'map.chip.islands',
  'history-cn': 'map.chip.historyCn',
  'history-west': 'map.chip.historyWest',
  media: 'map.chip.media',
  f4: 'map.chip.f4',
}

export const GRADE_LABEL: Record<SoftGoGrade, MessageKey> = {
  all: 'map.grade.all',
  f4: 'map.grade.f4',
  f5: 'map.grade.f5',
  f6: 'map.grade.f6',
}

/** Student chrome titles for the first four Form 4 units. No school and no year. */
export const F4_CHROME_KEY: Record<string, MessageKey> = {
  'F4-U1-ORIENT': 'map.f4.chrome.u1',
  'F4-U2-DRAW-DESIGN': 'map.f4.chrome.u2',
  'F4-U3-COMMUNITY': 'map.f4.chrome.u3',
  'F4-U4-SELF-RESEARCH': 'map.f4.chrome.u4',
}

const HISTORY_SIDE: Record<string, 'cn' | 'west'> = {
  'U1-CN-MODERN': 'cn',
  'U2-HK-IDENTITY': 'cn',
  'U4-CN-CONTEMP': 'cn',
  'U6-MQ-WUMEN': 'cn',
  'U7-SELF-HERITAGE': 'cn',
  'U8-CN-SYMBOLS': 'cn',
  'U11-EXHIBIT-REVIEW': 'cn',
  'U3-WEST-MODERN': 'west',
  'U5-COMPARE': 'west',
  'U9-ROLE-TAKING': 'west',
  'U10-YBA-CN': 'west',
}

/** Untagged intros stay on 全部 and 中四. Explicit later years stay on 全部 only. */
const HISTORY_YEAR: Record<string, 'core' | 'f5' | 'f6'> = {
  'U1-CN-MODERN': 'core',
  'U2-HK-IDENTITY': 'f6',
  'U3-WEST-MODERN': 'core',
  'U4-CN-CONTEMP': 'f5',
  'U5-COMPARE': 'f6',
  'U6-MQ-WUMEN': 'f6',
  'U7-SELF-HERITAGE': 'f6',
  'U8-CN-SYMBOLS': 'f6',
  'U9-ROLE-TAKING': 'f6',
  'U10-YBA-CN': 'f6',
  'U11-EXHIBIT-REVIEW': 'f6',
}

function searchParams(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q)
}

function isTrack(value: string | null): value is SoftGoTrack {
  return value != null && (SOFT_GO_TRACKS as readonly string[]).includes(value)
}

function isGrade(value: string | null): value is SoftGoGrade {
  return value != null && (SOFT_GO_GRADES as readonly string[]).includes(value)
}

export function softGoTrackFromSearch(search: string): SoftGoTrack {
  const raw = searchParams(search).get('track')
  return isTrack(raw) ? raw : 'islands'
}

export function softGoGradeFromSearch(search: string): SoftGoGrade {
  const raw = searchParams(search).get('grade')
  return isGrade(raw) ? raw : 'all'
}

/** Keep `ux` and every other param. Default track and grade stay out of the query. */
export function withSoftGoQuery(search: string, track: SoftGoTrack, grade: SoftGoGrade): string {
  const params = searchParams(search)
  if (track === 'islands') params.delete('track')
  else params.set('track', track)
  if (grade === 'all') params.delete('grade')
  else params.set('grade', grade)
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function historyUnitsFor<T extends { id: string }>(
  units: readonly T[],
  side: 'cn' | 'west' | 'all',
  grade: SoftGoGrade,
): T[] {
  if (grade === 'f5' || grade === 'f6') return []
  return units.filter((unit) => {
    const unitSide = HISTORY_SIDE[unit.id]
    if (side !== 'all' && unitSide !== side) return false
    if (side === 'all' && unitSide == null && !(unit.id in HISTORY_YEAR)) return true
    if (grade === 'all') return side === 'all' || unitSide === side
    const year = HISTORY_YEAR[unit.id] ?? 'core'
    return year === 'core'
  })
}

export function yearUnitsFor<T>(units: readonly T[], grade: SoftGoGrade): T[] {
  if (grade === 'f5' || grade === 'f6') return []
  return [...units]
}

export function withF4ChromeTitles<T extends { id: string; title: string }>(
  units: readonly T[],
  titleFor: (id: string) => string | undefined,
): T[] {
  return units.map((unit) => {
    const title = titleFor(unit.id)
    return title ? { ...unit, title } : unit
  })
}

export function lessonFromUnits<T extends { id: string }>(
  units: readonly { nodes: readonly T[] }[],
  id: string,
): T | undefined {
  for (const unit of units) {
    const node = unit.nodes.find((item) => item.id === id)
    if (node) return node
  }
  return undefined
}
