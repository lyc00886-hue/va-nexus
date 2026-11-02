import type { Artist, ArtistPair } from '../types'

export type CompareRow = {
  aspect: string
  shared: string[]
  east: string[]
  west: string[]
}

export type SbaTip = {
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
    Western: '西方藝術脈絡',
    HK_Local: '香港本地脈絡',
    CN_HK: '中港水墨／現代脈絡',
    Chinese_Contemporary: '華人當代脈絡',
  }
  if (map[g]) return map[g]
  if (g) return g
  return a.region === 'west' ? '西方藝術脈絡' : '東方／華人藝術脈絡'
}

export function buildCompareRows(pair: ArtistPair, east: Artist, west: Artist): CompareRow[] {
  const sharedTags = exactOverlap(east.themes, west.themes)
  const sharedTraits = exactOverlap(east.style_keywords, west.style_keywords)
  const kw = keywordOverlap(east, west).filter(
    (k) => !sharedTags.some((t) => norm(t) === norm(k)) && !sharedTraits.some((t) => norm(t) === norm(k)),
  )
  const matrix = matrixLists(pair.comparison_matrix)

  const uniqueOf = (mine: string[], shared: string[]) =>
    mine.filter((x) => !shared.some((s) => norm(s) === norm(x)))

  const sameMedium = east.medium && west.medium && norm(east.medium) === norm(west.medium)

  const rows: CompareRow[] = [
    {
      aspect: '主題',
      shared: uniq([`同樣回應「${pair.theme}」`, ...sharedTags.map((t) => `都關注「${t}」`), ...matrix.shared]),
      east: uniqueOf(east.themes, sharedTags),
      west: uniqueOf(west.themes, sharedTags),
    },
    {
      aspect: '形式／技法',
      shared: uniq([
        ...sharedTraits.map((t) => `都用「${t}」`),
        ...kw.map((k) => `都涉及「${k}」`),
      ]),
      east: uniqueOf(east.style_keywords, sharedTraits),
      west: uniqueOf(west.style_keywords, sharedTraits),
    },
    {
      aspect: '媒介',
      shared: sameMedium
        ? [`同樣用「${east.medium}」`]
        : pair.medium
          ? [`配對媒介：${pair.medium}`]
          : [],
      east: east.medium && !sameMedium ? [east.medium] : [],
      west: west.medium && !sameMedium ? [west.medium] : [],
    },
    {
      aspect: '觀念',
      shared: ['都以視覺形式表達內在感受／對生活嘅觀察'],
      east: concept(east) ? [concept(east)] : [],
      west: concept(west) ? [concept(west)] : [],
    },
    {
      aspect: '文化背景',
      shared: [],
      east: [cultureLabel(east)],
      west: [cultureLabel(west)],
    },
  ]

  if (matrix.diff.length) {
    rows.push({ aspect: '對比重點', shared: [], east: matrix.diff, west: [] })
  }

  return rows.map((r) => ({
    ...r,
    shared: r.shared.length ? r.shared : ['（未有明顯共同點，可作對比切入）'],
  }))
}

function displayName(a: Artist) {
  return a.name_zh || a.name_en
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
      title: '構圖借鑑',
      body: et && wt
        ? `參考${W}嘅「${wt}」去安排畫面結構，再加入${E}嘅「${et}」，用喺你自己嘅香港日常場景。先畫 3 張細稿比較。`
        : `比較${W}同${E}點樣安排主體同空間，揀一種構圖方法畫 3 張細稿。`,
    },
    {
      title: '概念轉化',
      body: `由「${pair.theme}」出發，揀一個你身邊真實嘅經驗（例如屋企、返學路、社區）。${E}關注「${eTag}」，${W}關注「${wTag}」——你會點講你自己嘅版本？`,
    },
    {
      title: '技法／媒介實驗',
      body: et2 && wt2
        ? `做一張物料實驗：試「${wt2}」同「${et2}」，記錄效果同感覺${pair.medium ? `（配對媒介：${pair.medium}）` : ''}，貼入 SBA 過程紀錄。`
        : `用兩種唔同媒介試同一個構圖，記錄效果，貼入 SBA 過程紀錄。`,
    },
    {
      title: '反思寫作',
      body: `喺 SBA 寫明：我由${E}／${W}借咗乜（構圖、概念或技法），改咗乜，點解適合我嘅主題。避免直接模仿佢哋嘅畫風或代表作。`,
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
