/**
 * School-internal formative comment + approximate band.
 * The comment is organised on the existing school criteria labels.
 * It is not an official SBA, HKEAA, or public-exam score.
 */
import {
  fitFormativePayload,
  formativeSourcePageCount,
  FORMATIVE_BODY_CHAR_MAX,
  FORMATIVE_PAGE_BYTE_MAX,
  FORMATIVE_TOTAL_BYTE_MAX,
} from './formativePageFit.ts'
import { pageDhashesOfUpload } from './pageDhash.ts'
import { CRITERIA_IDS, PRACTICE_BAND_IDS, type PracticeBandId } from './teacherDraftBand.ts'

export {
  FORMATIVE_BODY_CHAR_MAX,
  FORMATIVE_PAGE_BYTE_MAX,
  FORMATIVE_PLATFORM_BODY_MAX,
  FORMATIVE_TOTAL_BYTE_MAX,
  formativePageMime,
} from './formativePageFit.ts'

/** Same observable focus the school-score criteria rows already carry. Not a second rubric. */
const AXIS_FOCUS: Record<'zh-Hant' | 'zh-Hans' | 'en', Record<(typeof CRITERIA_IDS)[number], string>> = {
  'zh-Hant': {
    'rwb-1': '素材廣度、選擇／轉化、個人意念',
    'rwb-2': '有憑據觀點，能轉到自己創作／評賞',
    'rwb-3': '試驗深度；失敗紀錄亦保留',
    'rwb-4': '反思頻率與深度；進程可見',
    'aw-1': '操控媒介／技法；評賞含寫作',
    'aw-2': '視覺元素／組織是否切合主題',
    'aw-3': '個人／美學／文化情境與主題',
    'aw-4': '意念完整；有憑據個人觀點',
    'aw-5': '訊息是否清晰、完整、連貫',
    'aw-6': '四件之間有否可見進程',
  },
  'zh-Hans': {
    'rwb-1': '素材广度、选择／转化、个人意念',
    'rwb-2': '有凭据观点，能转到自己创作／评赏',
    'rwb-3': '试验深度；失败纪录亦保留',
    'rwb-4': '反思频率与深度；进程可见',
    'aw-1': '操控媒介／技法；评赏含写作',
    'aw-2': '视觉元素／组织是否切合主题',
    'aw-3': '个人／美学／文化情境与主题',
    'aw-4': '意念完整；有凭据个人观点',
    'aw-5': '讯息是否清晰、完整、连贯',
    'aw-6': '四件之间有否可见进程',
  },
  en: {
    'rwb-1': 'Sources, selection/transform, personal ideas',
    'rwb-2': 'Evidence-based views linked to own work',
    'rwb-3': 'Depth of trials; keep failed attempts',
    'rwb-4': 'Depth of reflection; visible progress',
    'aw-1': 'Control of medium; writing for critical studies',
    'aw-2': 'Elements/organisation fit the theme',
    'aw-3': 'Personal / aesthetic / cultural link to theme',
    'aw-4': 'Coherent ideas; evidenced personal view',
    'aw-5': 'Clear, complete, coherent message',
    'aw-6': 'Visible improvement across the set',
  },
}

/** Same 0–5 formative points the practice-band buttons already use. */
export const FORMATIVE_BAND_VALUE: Record<PracticeBandId, number> = {
  'practice-emerging': 1.25,
  'practice-developing': 2.5,
  'practice-secure': 3.5,
  'practice-strong': 4.5,
}

const AXIS_LABELS: Record<'zh-Hant' | 'zh-Hans' | 'en', Record<(typeof CRITERIA_IDS)[number], string>> = {
  'zh-Hant': {
    'rwb-1': '主題或意念的探索及發展',
    'rwb-2': '藝術品的詮釋及其與創作╱評賞研究的運用',
    'rwb-3': '媒介及技巧的實驗，以及表達形式的探索',
    'rwb-4': '反思及學習進程',
    'aw-1': '媒介、技巧及技法╱寫作技巧',
    'aw-2': '視覺表達形式╱分析',
    'aw-3': '與情境的關係',
    'aw-4': '創意及想像力╱批判思維',
    'aw-5': '整體表現及主題的傳意',
    'aw-6': '四件作品的改進',
  },
  'zh-Hans': {
    'rwb-1': '主题或意念的探索及发展',
    'rwb-2': '艺术品的诠释及其与创作／评赏研究的运用',
    'rwb-3': '媒介及技巧的实验，以及表达形式的探索',
    'rwb-4': '反思及学习进程',
    'aw-1': '媒介、技巧及技法／写作技巧',
    'aw-2': '视觉表达形式／分析',
    'aw-3': '与情境的关系',
    'aw-4': '创意及想象力／批判思维',
    'aw-5': '整体表现及主题的传意',
    'aw-6': '四件作品的改进',
  },
  en: {
    'rwb-1': 'Exploration and development of theme or ideas',
    'rwb-2': 'Interpretation of artworks and articulation with artmaking / critical studies',
    'rwb-3': 'Experimentation of media and skills; ways of expression',
    'rwb-4': 'Reflection and progression in learning',
    'aw-1': 'Media, skills and techniques / writing skills',
    'aw-2': 'Visual presentation / analysis',
    'aw-3': 'Relationship with context',
    'aw-4': 'Creativity and imagination / critical thinking',
    'aw-5': 'Overall presentation and communication of theme',
    'aw-6': 'Progression of all 4 pieces of work',
  },
}

const BAND_NAMES: Record<string, PracticeBandId> = {
  'practice-emerging': 'practice-emerging',
  'practice-developing': 'practice-developing',
  'practice-secure': 'practice-secure',
  'practice-strong': 'practice-strong',
  '起步': 'practice-emerging',
  '發展中': 'practice-developing',
  '发展中': 'practice-developing',
  '穩固': 'practice-secure',
  '稳固': 'practice-secure',
  '良好': 'practice-strong',
  emerging: 'practice-emerging',
  developing: 'practice-developing',
  secure: 'practice-secure',
  strong: 'practice-strong',
}

const BLOCKED_COMMENT =
  /5\*\*|97分|96:100|90:100|97:100|全校降分|未達標|未达标|公開試結果|公开试结果|公開試預測|公开试预测|AI＝公開試預測|AI＝公开试预测|正式分數|正式分数|official grade|official score|ArtInSight|洞察藝術|洞察艺术|artionhk|Lindsay|Yuen Hei Yan/i

export const FORMATIVE_COMMENT_PATH = '/api/formative-comment'

export type FormativeAxis = { id: (typeof CRITERIA_IDS)[number]; label: string; focus: string }

export type FormativeAxes = Partial<Record<(typeof CRITERIA_IDS)[number], number>>

export type FormativePageInput = {
  side?: string
  /** Both scans for one combined file. Every page of that file is still sent. */
  sides?: readonly string[]
  mime: string
  bytes: Uint8Array
  /** Used only to recognise a PDF or image. It is not sent to the model. */
  fileName?: string
}

export type FormativeAdvice = Partial<Record<(typeof CRITERIA_IDS)[number], string>>

export type FormativeModelResult =
  | { ok: true; comment: string; band: PracticeBandId; axes: FormativeAxes; score: number | null; advice: FormativeAdvice }
  | { ok: false; reason: 'unavailable' | 'not_sent' }

/** Visible unofficial later scale. Practice bands stay on 1.25 / 2.5 / 3.5 / 4.5. */
export const LATER_VISIBLE_LEVELS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const

/** A plain number, or the same number written as n/5 or n／5. A starred mark is not a level. */
function finiteLevelToken(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const slash = /^(-?\d+(?:\.\d+)?)\s*[/／]\s*5$/.exec(trimmed)
  const source = slash ? slash[1] : trimmed
  if (!/^-?\d+(?:\.\d+)?$/.test(source)) return null
  const n = Number(source)
  return Number.isFinite(n) ? n : null
}

/**
 * Snap a new model number onto the nine-level visible scale.
 * 1.25 is equidistant from 1 and 1.5 and becomes 1.5, so a new result never shows 1.25.
 * 5 stays 5. It is not pulled down to 4.5.
 */
export function laterVisibleLevel(value: unknown): number | null {
  const n = finiteLevelToken(value)
  if (n == null || n < 1 || n > 5) return null
  let best: number = LATER_VISIBLE_LEVELS[0]
  let dist = Number.POSITIVE_INFINITY
  for (const level of LATER_VISIBLE_LEVELS) {
    const next = Math.abs(level - n)
    if (next < dist || (next === dist && level > best)) {
      dist = next
      best = level
    }
  }
  return best
}

/**
 * Visible unofficial number for a new model result.
 * An explicit nine-level score wins, including 5, even when the practice band is 良好 / 4.5.
 * A numeric band token of 5 is that same score: snapping the band id to practice-strong must not replace it with 4.5.
 * A named top band with no score does not invent 4.5. A lower named band still uses its formative number.
 */
export function laterUnofficialScore(score: unknown, band: PracticeBandId, rawBand?: unknown): number | null {
  const explicit = laterVisibleLevel(score)
  if (explicit != null) return explicit
  const fromBand = laterVisibleLevel(rawBand)
  if (fromBand != null) return fromBand
  const bandValue = FORMATIVE_BAND_VALUE[band]
  if (bandValue >= 4.5) return null
  return laterVisibleLevel(bandValue)
}

function axisLocale(locale: string): 'zh-Hant' | 'zh-Hans' | 'en' {
  if (locale === 'en') return 'en'
  if (locale === 'zh-Hans') return 'zh-Hans'
  return 'zh-Hant'
}

export function formativeAxisLabels(locale: string): FormativeAxis[] {
  const key = axisLocale(locale)
  const pack = AXIS_LABELS[key]
  const focus = AXIS_FOCUS[key]
  return CRITERIA_IDS.map((id) => ({ id, label: pack[id], focus: focus[id] }))
}

export function formativeCommentSystem(labels: readonly string[], locale: string): string {
  const language = locale === 'en' ? 'English' : locale === 'zh-Hans' ? 'Simplified Chinese' : 'Traditional Chinese'
  const key = axisLocale(locale)
  const lines = CRITERIA_IDS.flatMap((id) => {
    const label = AXIS_LABELS[key][id]
    if (!labels.includes(label)) return []
    return [`- ${id}: ${label} — ${AXIS_FOCUS[key][id]}`]
  })
  return [
    'You write one short school-internal formative reference comment on uploaded visual-arts pages.',
    'The pages are artwork (藝術作品／評賞研究) and/or a research workbook (研究工作簿).',
    'Score only what is visible on the attached pages. Do not use the file name, file size, or any other file metadata to choose a score.',
    'Organize the comment against these existing school-score v1 criteria. Do not invent new axes:',
    ...lines,
    'The reference standard is the school\'s locked internal samples, already used by school-score v1.',
    'Locked comparison excerpt images are attached on this request, each with a label, a sample sha256, and a band hint. A label or a sha256 in text is not a comparison unless that excerpt image is attached.',
    'Score the visible visual elements and the making path in this order: text, then images, then visual elements, then combine with artist reference, then the artwork.',
    'A weak or missing path must not receive a high unofficial score only because the finished work looks complete, because an artist is cited, or because a cover teacher mark is high.',
    'Artist reference is not score authority. A cover score sheet or a teacher mark on it is not authority for this unofficial result.',
    'Band hint 發展中, including 待改進示例 A and 待改進示例 A 再匯出本, is about 2.5 and is not 良好. A re-export, rescan, or cover-removed copy of that locked work stays on this hint even when the whole-file sha256 differs. Do not score it as 4.5 or 良好.',
    'Band hint 良好 on a locked high sample may be an honest 4.5 or an unofficial 5. Do not cap that 5 at 4.5. Do not invent a fifth band name.',
    'Compare the student pages with the locked samples. Do not inflate a score. A complete file is not the same as depth.',
    'Read every attached page of this artwork and workbook. A score from only the first four pages is not a complete result for a longer file.',
    'Band hint 穩固 is about 3.5. A locked 良好 file may show 4, 4.5, or an honest 5. Do not raise a visible 4 to 4.5 only because the band value is about 4.5.',
    'Stronger work shows a clear theme, an evidenced reading of artworks carried into the student\'s own work, media trials including unsuccessful ones, a visible making process, and reflection.',
    'Earlier bands show a theme that is only starting, thin evidence, or missing trials.',
    'That standard is school-internal formative reference only. Do not name a student, a teacher, or a school. Do not present this as a public-exam result.',
    'Choose one approximate band id: practice-emerging, practice-developing, practice-secure, or practice-strong.',
    'Those ids are the school practice bands 起步 / 發展中 / 穩固 / 良好, with values 1.25 / 2.5 / 3.5 / 4.5. They are unofficial.',
    'The visible unofficial score is separate from those four band values. Score and every axis value use only 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, or 5.',
    'Do not use 1.25 as a visible score or axis value. Do not invent a band name for 5.',
    'When the pages support 5, return score as the number 5. Do not rewrite, snap, or cap that 5 to 4.5, and do not replace it with the 良好 / practice-strong band value.',
    'When the pages are honestly 4.5, return score as 4.5. If you cannot choose one of those nine levels, omit score. Do not fill a missing score with 4.5.',
    'The band id stays one of the four even when score is 5.',
    'Score each axis separately. Do not copy one overall band onto every axis.',
    'Return an axis value only for sides named in the user message.',
    'Artwork ids are aw-1, aw-2, aw-3, aw-4, aw-5, aw-6. Research-workbook ids are rwb-1, rwb-2, rwb-3, rwb-4.',
    'Every named side needs its own value on every one of its ids. Do not leave an id out, and do not fill a missing id from the overall score.',
    'For each artwork axis the user message names, add advice on how to improve this work on that axis. Name what is visible and the change to make next. Do not reuse one sentence for another axis.',
    'When the user message names the research workbook, add advice on how to improve this research workbook on each of rwb-1, rwb-2, rwb-3, and rwb-4. Each note is only for this workbook and that axis. Do not reuse an artwork sentence or one sentence across those axes.',
    'Omit an axis from advice when you cannot see a specific improvement. Do not write a generic tip, a public-exam result, or an official mark.',
    'This is not an SBA remark, not an HKEAA score, and not a public-exam prediction.',
    'Do not write a generic art-criticism essay. Two to four sentences, tied to what is visible on the pages.',
    `Write the comment and the advice in ${language}.`,
    'Reply with JSON only, using those ids. Omit ids for a side the user message did not name.',
    'A complete shape, when both sides are named and the visible score is 5, is {"comment":"...","band":"practice-strong","score":5,"axes":{"aw-1":4.5,"aw-2":5,"aw-3":4,"aw-4":5,"aw-5":4.5,"aw-6":4,"rwb-1":4,"rwb-2":4.5,"rwb-3":5,"rwb-4":4.5},"advice":{"aw-1":"...","aw-2":"...","aw-3":"...","aw-4":"...","aw-5":"...","aw-6":"...","rwb-1":"...","rwb-2":"...","rwb-3":"...","rwb-4":"..."}}',
  ].join('\n')
}

export const FORMATIVE_USER_PROMPT =
  'Pages marked with a page side are the student artwork and/or research-workbook pages to score. Locked comparison excerpts are separate images, each marked with a label, a sample sha256, and a band hint. Compare the student pages with those excerpts. Score visible visual elements and the making path: text, then images, then visual elements, then combine with artist reference, then the artwork. A weak or missing path must not receive a high unofficial score only because the finished work looks complete, an artist is cited, or a cover teacher mark is high. Artist reference is not score authority. A cover teacher mark is not authority for this unofficial result. Compare with the locked samples. Do not inflate. Completeness is not depth. Read every attached page of this artwork and workbook. Score each axis separately. Do not use the file name or file size. Do not award an official mark.'

export function formativeScanSides(side: unknown, sides?: unknown): Array<'artwork' | 'research_workbook'> {
  const found = new Set<string>()
  const push = (value: unknown) => {
    if (value === 'artwork' || value === 'research_workbook') found.add(value)
  }
  if (Array.isArray(sides)) {
    for (const item of sides) push(item)
  }
  push(side)
  const ordered: Array<'artwork' | 'research_workbook'> = []
  if (found.has('artwork')) ordered.push('artwork')
  if (found.has('research_workbook')) ordered.push('research_workbook')
  return ordered
}

export function formativeUserPrompt(sides: readonly string[]): string {
  const named = [...new Set(sides.filter((side) => side === 'artwork' || side === 'research_workbook'))]
  const scope = named.length > 0 ? named.join(', ') : 'none'
  const ids: string[] = []
  if (named.includes('artwork')) ids.push('aw-1', 'aw-2', 'aw-3', 'aw-4', 'aw-5', 'aw-6')
  if (named.includes('research_workbook')) ids.push('rwb-1', 'rwb-2', 'rwb-3', 'rwb-4')
  const required =
    ids.length > 0
      ? `\nEach of these axis ids needs its own value: ${ids.join(', ')}.\nDo not leave one of those ids out. Do not copy the overall score onto an axis.`
      : ''
  const advice: string[] = []
  if (named.includes('artwork')) {
    advice.push(
      'For each artwork axis aw-1, aw-2, aw-3, aw-4, aw-5, and aw-6, add one note on how to improve this work on that axis. Name what is visible and what to change. Do not reuse one sentence for another axis. Omit an axis when a specific improvement is not visible.',
    )
  }
  if (named.includes('research_workbook')) {
    advice.push(
      'For each research-workbook axis rwb-1, rwb-2, rwb-3, and rwb-4, add one note on how to improve this research workbook on that axis. Name what is visible in this workbook and what to change. Do not reuse one sentence for another axis. Omit an axis when a specific improvement is not visible.',
    )
  }
  const adviceBlock = advice.length > 0 ? `\n${advice.join('\n')}` : ''
  return `${FORMATIVE_USER_PROMPT}\nSides to score: ${scope}.${required}${adviceBlock}`
}

/** Label placed beside one page image. A combined file names both sides once. */
export function formativePageSideNote(sides: readonly string[]): string {
  const named = formativeScanSides(undefined, sides)
  return named.length > 0 ? `Page side: ${named.join(', ')}` : 'Page'
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary)
}

export function bandFromModel(value: unknown): PracticeBandId | null {
  const token = finiteLevelToken(value)
  if (token != null && token >= 0 && token <= 5) {
    let best: PracticeBandId = PRACTICE_BAND_IDS[0]
    let dist = Number.POSITIVE_INFINITY
    for (const id of PRACTICE_BAND_IDS) {
      const next = Math.abs(FORMATIVE_BAND_VALUE[id] - token)
      if (next < dist) {
        dist = next
        best = id
      }
    }
    return best
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return BAND_NAMES[trimmed] ?? BAND_NAMES[trimmed.toLowerCase()] ?? null
}

export function axisValueFromModel(value: unknown): number | null {
  return laterVisibleLevel(value)
}

const ADVICE_PALE = new Set([
  '暫時未有跟呢條軸、跟呢份作品嘅改進建議。',
  '暂时未有跟这条轴、跟这份作品的改进建议。',
  'A tailored improvement note for this axis and this work is not available yet.',
  '暫時未有跟呢條軸、跟呢份研究工作簿嘅改進建議。',
  '暂时未有跟这条轴、跟这份研究工作簿的改进建议。',
  'A tailored improvement note for this axis and this research workbook is not available yet.',
])

function axisIdFromModelKey(key: string): (typeof CRITERIA_IDS)[number] | null {
  const trimmed = key.trim()
  const lower = trimmed.toLowerCase()
  for (const id of CRITERIA_IDS) {
    if (lower === id) return id
  }
  for (const locale of ['zh-Hant', 'zh-Hans', 'en'] as const) {
    for (const id of CRITERIA_IDS) {
      if (AXIS_LABELS[locale][id] === trimmed) return id
    }
  }
  return null
}

/**
 * Scores and notes the model actually returned.
 * A flat id map, the school criterion label, one nested side object, or a list of
 * `{id, value}` rows are all read. Nothing here copies an overall score onto a missing id.
 */
function flattenModelRecord(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) {
    const flat: Record<string, unknown> = {}
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const key = [row.id, row.axis, row.key, row.name].find((value) => typeof value === 'string')
      if (typeof key !== 'string' || flat[key] !== undefined) continue
      const value = row.value ?? row.score ?? row.text ?? row.advice
      if (value !== undefined) flat[key] = value
    }
    return flat
  }
  if (!raw || typeof raw !== 'object') return {}
  const source = raw as Record<string, unknown>
  const flat: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object') continue
    flat[key] = value
  }
  for (const value of Object.values(source)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    for (const [innerKey, innerValue] of Object.entries(value as Record<string, unknown>)) {
      if (flat[innerKey] === undefined) flat[innerKey] = innerValue
    }
  }
  return flat
}

/** Keep a note only when it is specific to one axis. Shared, empty, or pale copy is dropped. */
export function tailoredAxisAdvice(raw: unknown): FormativeAdvice {
  const bag = flattenModelRecord(raw)
  const rows: { id: (typeof CRITERIA_IDS)[number]; text: string }[] = []
  const seen = new Set<(typeof CRITERIA_IDS)[number]>()
  const take = (id: (typeof CRITERIA_IDS)[number], value: unknown) => {
    if (seen.has(id)) return
    if (typeof value !== 'string') return
    const text = value.replace(/\s+/g, ' ').trim()
    if (text.length < 8 || text.length > 400) return
    if (BLOCKED_COMMENT.test(text) || ADVICE_PALE.has(text)) return
    seen.add(id)
    rows.push({ id, text })
  }
  for (const id of CRITERIA_IDS) take(id, bag[id])
  for (const [key, value] of Object.entries(bag)) {
    const id = axisIdFromModelKey(key)
    if (id) take(id, value)
  }
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.text, (counts.get(row.text) ?? 0) + 1)
  const advice: FormativeAdvice = {}
  for (const row of rows) {
    if ((counts.get(row.text) ?? 0) !== 1) continue
    advice[row.id] = row.text
  }
  return advice
}

function parseFormativeAxesFromBag(bag: Record<string, unknown>): FormativeAxes {
  const axes: FormativeAxes = {}
  for (const id of CRITERIA_IDS) {
    const value = axisValueFromModel(bag[id])
    if (value == null) continue
    axes[id] = value
  }
  for (const [key, rawValue] of Object.entries(bag)) {
    const id = axisIdFromModelKey(key)
    if (!id || axes[id] != null) continue
    const value = axisValueFromModel(rawValue)
    if (value == null) continue
    axes[id] = value
  }
  return axes
}

export function parseFormativeAxes(raw: unknown): FormativeAxes {
  return parseFormativeAxesFromBag(flattenModelRecord(raw))
}

export function parseFormativeModelText(
  raw: string,
): { comment: string; band: PracticeBandId; axes: FormativeAxes; score: number | null; advice: FormativeAdvice } | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let data: unknown
  try {
    data = JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const record = data as { comment?: unknown; band?: unknown; axes?: unknown; score?: unknown; advice?: unknown }
  if (typeof record.comment !== 'string') return null
  const comment = record.comment.replace(/\s+/g, ' ').trim()
  if (comment.length < 8 || comment.length > 800) return null
  if (BLOCKED_COMMENT.test(comment)) return null
  const band = bandFromModel(record.band)
  if (!band) return null
  const score = laterUnofficialScore(record.score, band, record.band)
  return { comment, band, axes: parseFormativeAxes(record.axes), score, advice: tailoredAxisAdvice(record.advice) }
}

type PackedFormativePage = {
  side: string
  sides: Array<'artwork' | 'research_workbook'>
  mime: string
  bytes: Uint8Array
  /** sha256 of the original uploaded file, taken before a fitted page replaces those bytes. */
  fileSha256: string
  pageCount: number
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  try {
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    const digest = await crypto.subtle.digest('SHA-256', copy)
    const hex: string[] = []
    for (const byte of new Uint8Array(digest)) hex.push(byte.toString(16).padStart(2, '0'))
    return hex.join('')
  } catch {
    return ''
  }
}

function coveredPageCount(items: readonly { pageCount?: number }[]): number {
  return items.reduce((sum, item) => sum + (item.pageCount != null && item.pageCount > 0 ? item.pageCount : 1), 0)
}

/**
 * Every page of every uploaded artwork and workbook file.
 * A file that cannot be fitted whole makes the request unsent. A prefix of
 * pages is not returned in its place.
 */
async function packFormativePages(input: {
  fileName: string
  mime: string
  bytes: Uint8Array | null
  pages?: readonly FormativePageInput[]
}): Promise<{ pages: PackedFormativePage[]; sourcePageCount: number } | null> {
  const source: FormativePageInput[] = (
    input.pages && input.pages.length > 0
      ? [...input.pages]
      : input.bytes
        ? [{ mime: input.mime, bytes: input.bytes, fileName: input.fileName }]
        : []
  ).filter((page) => page.bytes.byteLength > 0)
  if (source.length === 0) return null
  const share = Math.min(FORMATIVE_PAGE_BYTE_MAX, Math.floor(FORMATIVE_TOTAL_BYTE_MAX / source.length))
  const packed: PackedFormativePage[] = []
  let expected = 0
  for (const page of source) {
    const sides = formativeScanSides(page.side, page.sides)
    const mime = page.mime || input.mime
    const count = await formativeSourcePageCount(page.bytes, mime)
    expected += count
    const fileSha256 = await sha256Hex(page.bytes)
    const fitted = await fitFormativePayload({
      side: sides[0] ?? page.side,
      mime,
      bytes: page.bytes,
      fileName: page.fileName || input.fileName,
      maxBytes: share,
    })
    if (coveredPageCount(fitted) < count) return null
    for (const item of fitted) {
      if (item.bytes.byteLength === 0 || item.bytes.byteLength > FORMATIVE_PAGE_BYTE_MAX) return null
      packed.push({
        side: sides[0] ?? item.side,
        sides,
        mime: item.mime,
        bytes: item.bytes,
        fileSha256,
        pageCount: item.pageCount != null && item.pageCount > 0 ? item.pageCount : 1,
      })
    }
  }
  let total = 0
  for (const item of packed) {
    if (item.bytes.byteLength > FORMATIVE_TOTAL_BYTE_MAX) return null
    if (total + item.bytes.byteLength > FORMATIVE_TOTAL_BYTE_MAX) return null
    total += item.bytes.byteLength
  }
  if (packed.length === 0 || coveredPageCount(packed) < expected) return null
  return { pages: packed, sourcePageCount: expected }
}

function formativePageJson(page: PackedFormativePage): {
  side: string
  sides?: Array<'artwork' | 'research_workbook'>
  mime: string
  imageBase64: string
  fileSha256?: string
} {
  const imageBase64 = bytesToBase64(page.bytes)
  const fileSha256 = page.fileSha256 || undefined
  if (page.sides.length > 1) return { side: page.side, sides: page.sides, mime: page.mime, imageBase64, fileSha256 }
  return { side: page.side, mime: page.mime, imageBase64, fileSha256 }
}

function formativeRequestBody(
  locale: string,
  pages: readonly PackedFormativePage[],
  asPages: boolean,
  pageDhashes: readonly string[],
  sourcePageCount: number,
): string {
  const fingerprints = pageDhashes.length > 0 ? { pageDhashes } : {}
  const coverage = sourcePageCount > 0 ? { sourcePageCount } : {}
  if (asPages) {
    return JSON.stringify({
      locale,
      ...fingerprints,
      ...coverage,
      pages: pages.map((page) => formativePageJson(page)),
    })
  }
  return JSON.stringify({
    locale,
    ...fingerprints,
    ...coverage,
    mime: pages[0].mime,
    imageBase64: bytesToBase64(pages[0].bytes),
    ...(pages[0].fileSha256 ? { fileSha256: pages[0].fileSha256 } : {}),
  })
}

async function uploadPageDhashes(input: {
  bytes: Uint8Array | null
  pages?: readonly FormativePageInput[]
}): Promise<string[]> {
  const source = input.pages && input.pages.length > 0 ? input.pages : input.bytes ? [{ bytes: input.bytes }] : []
  const found: string[] = []
  for (const page of source) {
    if (page.bytes.byteLength === 0 || found.length >= 32) continue
    let hashes: string[] = []
    try {
      hashes = await pageDhashesOfUpload(page.bytes)
    } catch {
      hashes = []
    }
    for (const hash of hashes) {
      if (found.length >= 32) break
      if (!found.includes(hash)) found.push(hash)
    }
  }
  return found
}

export async function postFormativeComment(input: {
  locale: string
  fileName: string
  mime: string
  bytes: Uint8Array | null
  pages?: readonly FormativePageInput[]
  accessToken?: string | null
  fetchImpl?: typeof fetch
}): Promise<FormativeModelResult> {
  const packed = await packFormativePages(input)
  if (!packed) return { ok: false, reason: 'not_sent' }
  const pages = packed.pages
  const asPages = Boolean(input.pages && input.pages.length > 0)
  const pageDhashes = await uploadPageDhashes(input)
  const body = formativeRequestBody(input.locale, pages, asPages, pageDhashes, packed.sourcePageCount)
  if (body.length > FORMATIVE_BODY_CHAR_MAX) return { ok: false, reason: 'not_sent' }
  const fetchImpl = input.fetchImpl ?? fetch
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`
    const res = await fetchImpl(FORMATIVE_COMMENT_PATH, {
      method: 'POST',
      headers,
      body,
    })
    if (res.status === 413) return { ok: false, reason: 'not_sent' }
    const data: unknown = await res.json().catch(() => null)
    if (!res.ok || !data || typeof data !== 'object') return { ok: false, reason: 'unavailable' }
    const record = data as {
      ok?: unknown
      comment?: unknown
      band?: unknown
      axes?: unknown
      score?: unknown
      advice?: unknown
    }
    if (record.ok !== true) return { ok: false, reason: 'unavailable' }
    const parsed = parseFormativeModelText(
      JSON.stringify({
        comment: record.comment,
        band: record.band,
        axes: record.axes,
        score: record.score,
        advice: record.advice,
      }),
    )
    if (!parsed) return { ok: false, reason: 'unavailable' }
    return {
      ok: true,
      comment: parsed.comment,
      band: parsed.band,
      axes: parsed.axes,
      score: parsed.score,
      advice: parsed.advice,
    }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
