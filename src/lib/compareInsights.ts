import type { Artist, ArtistPair } from '../types'
import { getLocale, t } from '../i18n'

export type CompareRow = {
  aspect: string
  shared: string[]
  east: string[]
  west: string[]
}

export type SbaTip = {
  /** stable id (composition / concept / medium / reflection) */
  id: 'composition' | 'concept' | 'medium' | 'reflection'
  title: string
  body: string
}

/** Art keywords (zh + en) used to detect overlap when tags don't match exactly. */
const KEYWORDS: string[] = [
  '光', '色彩', '色域', '筆觸', '筆勢', '墨', '留白', '空間', '抽象', '幾何', '對比', '肌理', '書法', '線條',
  '簡化', '重複', '身體', '城市', '都市', '日常', '情感', '情緒', '自然', '山水', '風景', '現成物', '攝影',
  '裝置', '孤獨', '疏離', '沉思', '身份', '消費', '大眾', '幻想', '超現實', '感知', '記憶', '時間',
  'light', 'colour', 'color', 'brush', 'ink', 'space', 'abstraction', 'urban', 'city', 'emotion', 'nature',
  'landscape', 'everyday', 'perspective', 'identity', 'body', 'realism', 'conceptual', 'photography',
]

function norm(s: string) {
  return s.trim().toLowerCase()
}

function uniq(list: string[]) {
  return Array.from(new Set(list.filter(Boolean)))
}

function textOf(a: Artist) {
  return [...a.themes, ...a.style_keywords, a.dse_concept ?? '', a.spld_summary ?? '', a.bio_short ?? '']
    .join(' ')
    .toLowerCase()
}

function exactOverlap(a: string[], b: string[]) {
  const bs = new Set(b.map(norm))
  return a.filter((x) => bs.has(norm(x)))
}

function keywordOverlap(a: Artist, b: Artist) {
  const ta = textOf(a)
  const tb = textOf(b)
  return KEYWORDS.filter((k) => ta.includes(k.toLowerCase()) && tb.includes(k.toLowerCase()))
}

function asStringList(v: unknown): string[] {
  if (v == null) return []
  if (typeof v === 'string') return v.trim() ? [v.trim()] : []
  if (Array.isArray(v)) return v.flatMap(asStringList)
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).flatMap(asStringList)
  return [String(v)]
}

/** Read optional artist_pairs.comparison_matrix if it carries similarities / differences. */
function matrixLists(matrix: unknown): { shared: string[]; diff: string[] } {
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) return { shared: [], diff: [] }
  const m = matrix as Record<string, unknown>
  const pick = (keys: string[]) => keys.flatMap((k) => asStringList(m[k]))
  return {
    shared: pick(['similarities', 'similarity', 'shared', 'common', 'shared_themes', '共同']),
    diff: pick(['differences', 'difference', 'contrast', 'diff', '相異']),
  }
}

function concept(a: Artist) {
  return a.dse_concept || a.bio_short || ''
}

function cultureLabel(a: Artist) {
  const g = a.culture_group ?? ''
  const map: Record<string, string> = {
    Western: t('ci.culture.western'),
    HK_Local: t('ci.culture.hk'),
    CN_HK: t('ci.culture.cnhk'),
    Chinese_Contemporary: t('ci.culture.chinese'),
  }
  if (map[g]) return map[g]
  if (g) return g
  return a.region === 'west' ? t('ci.culture.western') : t('ci.culture.east')
}

export function buildCompareRows(pair: ArtistPair, east: Artist, west: Artist): CompareRow[] {
  const sharedTags = exactOverlap(east.themes, west.themes)
  const sharedTraits = exactOverlap(east.style_keywords, west.style_keywords)
  const kw = keywordOverlap(east, west).filter(
    (k) => !sharedTags.some((x) => norm(x) === norm(k)) && !sharedTraits.some((x) => norm(x) === norm(k)),
  )
  const matrix = matrixLists(pair.comparison_matrix)

  const uniqueOf = (mine: string[], shared: string[]) =>
    mine.filter((x) => !shared.some((s) => norm(s) === norm(x)))

  const sameMedium = east.medium && west.medium && norm(east.medium) === norm(west.medium)

  const rows: CompareRow[] = [
    {
      aspect: t('ci.aspect.theme'),
      shared: uniq([
        t('ci.shared.theme', { theme: pair.theme }),
        ...sharedTags.map((x) => t('ci.shared.tag', { x })),
        ...matrix.shared,
      ]),
      east: uniqueOf(east.themes, sharedTags),
      west: uniqueOf(west.themes, sharedTags),
    },
    {
      aspect: t('ci.aspect.form'),
      shared: uniq([
        ...sharedTraits.map((x) => t('ci.shared.trait', { x })),
        ...kw.map((x) => t('ci.shared.keyword', { x })),
      ]),
      east: uniqueOf(east.style_keywords, sharedTraits),
      west: uniqueOf(west.style_keywords, sharedTraits),
    },
    {
      aspect: t('ci.aspect.medium'),
      shared: sameMedium
        ? [t('ci.shared.medium', { x: east.medium })]
        : pair.medium
          ? [t('ci.pairMedium', { x: pair.medium })]
          : [],
      east: east.medium && !sameMedium ? [east.medium] : [],
      west: west.medium && !sameMedium ? [west.medium] : [],
    },
    {
      aspect: t('ci.aspect.concept'),
      shared: [t('ci.shared.concept')],
      east: concept(east) ? [concept(east)] : [],
      west: concept(west) ? [concept(west)] : [],
    },
    {
      aspect: t('ci.aspect.culture'),
      shared: [],
      east: [cultureLabel(east)],
      west: [cultureLabel(west)],
    },
  ]

  if (matrix.diff.length) {
    rows.push({ aspect: t('ci.aspect.focus'), shared: [], east: matrix.diff, west: [] })
  }

  return rows.map((r) => ({
    ...r,
    shared: r.shared.length ? r.shared : [t('ci.shared.none')],
  }))
}

function displayName(a: Artist) {
  return getLocale() === 'en' ? a.name_en || a.name_zh : a.name_zh || a.name_en
}

export function buildSbaTips(pair: ArtistPair, east: Artist, west: Artist): SbaTip[] {
  const et = east.style_keywords[0]
  const wt = west.style_keywords[0]
  const et2 = east.style_keywords[1] ?? et
  const wt2 = west.style_keywords[1] ?? wt
  const eTag = east.themes[0] ?? pair.theme
  const wTag = west.themes[0] ?? pair.theme
  const E = displayName(east)
  const W = displayName(west)

  const tips: SbaTip[] = [
    {
      id: 'composition',
      title: t('ci.tip.composition'),
      body: et && wt ? t('ci.tip.composition.body', { W, E, wt, et }) : t('ci.tip.composition.alt', { W, E }),
    },
    {
      id: 'concept',
      title: t('ci.tip.concept'),
      body: t('ci.tip.concept.body', { theme: pair.theme, E, W, eTag, wTag }),
    },
    {
      id: 'medium',
      title: t('ci.tip.medium'),
      body:
        et2 && wt2
          ? t('ci.tip.medium.body', {
              wt2,
              et2,
              medium: pair.medium ? t('ci.tip.medium.pair', { x: pair.medium }) : '',
            })
          : t('ci.tip.medium.alt'),
    },
    {
      id: 'reflection',
      title: t('ci.tip.reflection'),
      body: t('ci.tip.reflection.body', { E, W }),
    },
  ]
  return tips
}

/** Split long Chinese / English text into short easy-read chunks. */
export function chunkText(text: string | null | undefined, max = 16): string[] {
  if (!text) return []
  const sentences = text
    .split(/(?<=[。！？；;!?])|(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const s of sentences) {
    if (s.length <= max) {
      out.push(s)
      continue
    }
    const parts = s.split(/(?<=[，,、])/).map((p) => p.trim()).filter(Boolean)
    let buf = ''
    for (const p of parts) {
      if ((buf + p).length > max && buf) {
        out.push(buf)
        buf = p
      } else {
        buf += p
      }
    }
    if (buf) out.push(buf)
  }
  return out.map((s) => s.replace(/[，,、]$/, ''))
}
