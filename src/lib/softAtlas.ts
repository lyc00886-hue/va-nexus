import type { MessageKey } from '../i18n'

/** Soft atlas topics. Educational cards, not a shop. */
export const ATLAS_FILTERS = ['all', 'history', 'research', 'critique', 'sba', 'exam'] as const

export type AtlasFilter = (typeof ATLAS_FILTERS)[number]

export type AtlasCategory = Exclude<AtlasFilter, 'all'>

export const ATLAS_CARD_IDS = ['lingnan', 'expression', 'feldman', 'observe', 'sketch', 'compare'] as const

export type AtlasCardId = (typeof ATLAS_CARD_IDS)[number]

export type AtlasGlyph = 'arc' | 'wave' | 'steps'

export type AtlasCard = {
  id: AtlasCardId
  category: AtlasCategory
  locked: boolean
  glyph: AtlasGlyph
  title: MessageKey
  subtitle: MessageKey
  tip?: MessageKey
  related: readonly AtlasCardId[]
}

/** Map-shell destinations. `atlas` is the 圖鑑 grid. */
export const SOFT_SHELLS = ['map', 'path', 'atlas', 'mine'] as const

export type SoftShell = (typeof SOFT_SHELLS)[number]

export const ATLAS_CHIP: Record<AtlasFilter, MessageKey> = {
  all: 'atlas.chip.all',
  history: 'atlas.chip.history',
  research: 'atlas.chip.research',
  critique: 'atlas.chip.critique',
  sba: 'atlas.chip.sba',
  exam: 'atlas.chip.exam',
}

/**
 * Six educational cards. The first three stay open.
 * 雙圖對讀 stays locked. Nothing here is bought or claimed.
 */
export const ATLAS_CARDS: readonly AtlasCard[] = [
  {
    id: 'lingnan',
    category: 'history',
    locked: false,
    glyph: 'arc',
    title: 'atlas.card.lingnan.title',
    subtitle: 'atlas.card.lingnan.sub',
    tip: 'atlas.card.lingnan.tip',
    related: ['expression', 'feldman', 'observe'],
  },
  {
    id: 'expression',
    category: 'history',
    locked: false,
    glyph: 'wave',
    title: 'atlas.card.expression.title',
    subtitle: 'atlas.card.expression.sub',
    tip: 'atlas.card.expression.tip',
    related: ['lingnan', 'feldman', 'observe'],
  },
  {
    id: 'feldman',
    category: 'critique',
    locked: false,
    glyph: 'steps',
    title: 'atlas.card.feldman.title',
    subtitle: 'atlas.card.feldman.sub',
    tip: 'atlas.card.feldman.tip',
    related: ['lingnan', 'expression', 'observe'],
  },
  {
    id: 'observe',
    category: 'research',
    locked: true,
    glyph: 'arc',
    title: 'atlas.card.observe.title',
    subtitle: 'atlas.card.observe.sub',
    related: [],
  },
  {
    id: 'sketch',
    category: 'sba',
    locked: true,
    glyph: 'wave',
    title: 'atlas.card.sketch.title',
    subtitle: 'atlas.card.sketch.sub',
    related: [],
  },
  {
    id: 'compare',
    category: 'exam',
    locked: true,
    glyph: 'steps',
    title: 'atlas.card.compare.title',
    subtitle: 'atlas.card.compare.sub',
    related: [],
  },
]

function searchParams(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q)
}

export function atlasCardsFor(filter: AtlasFilter): readonly AtlasCard[] {
  if (filter === 'all') return ATLAS_CARDS
  return ATLAS_CARDS.filter((card) => card.category === filter)
}

export function atlasCard(id: AtlasCardId): AtlasCard {
  const card = ATLAS_CARDS.find((item) => item.id === id)
  if (!card) throw new Error(`unknown atlas card ${id}`)
  return card
}

/** `?shell=atlas` opens the grid. Unknown values stay on the map. */
export function softShellFromSearch(search: string): SoftShell {
  const raw = searchParams(search).get('shell')
  if (raw === 'atlas' || raw === 'path' || raw === 'mine' || raw === 'map') return raw
  return 'map'
}
