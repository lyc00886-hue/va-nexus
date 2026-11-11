/**
 * School-internal formative comment + approximate band.
 * The comment is organised on the existing school criteria labels.
 * It is not an official SBA, HKEAA, or public-exam score.
 */
import {
  fitFormativePayload,
  FORMATIVE_BODY_CHAR_MAX,
  FORMATIVE_PAGE_BYTE_MAX,
  FORMATIVE_TOTAL_BYTE_MAX,
} from './formativePageFit.ts'
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
  mime: string
  bytes: Uint8Array
  /** Used only to recognise a PDF or image. It is not sent to the model. */
  fileName?: string
}

export type FormativeAdvice = Partial<Record<(typeof CRITERIA_IDS)[number], string>>

export type FormativeModelResult =
  | { ok: true; comment: string; band: PracticeBandId; axes: FormativeAxes; score: number; advice: FormativeAdvice }
  | { ok: false; reason: 'unavailable' | 'not_sent' }

/** Visible unofficial later scale. Practice bands stay on 1.25 / 2.5 / 3.5 / 4.5. */
export const LATER_VISIBLE_LEVELS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const

/**
 * Snap a new model number onto the nine-level visible scale.
 * 1.25 is equidistant from 1 and 1.5 and becomes 1.5, so a new result never shows 1.25.
 */
export function laterVisibleLevel(value: unknown): number | null {
  let n: number
  if (typeof value === 'number') n = value
  else if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) n = Number(value.trim())
  else return null
  if (!Number.isFinite(n) || n < 1 || n > 5) return null
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
    return [`- ${label} — ${AXIS_FOCUS[key][id]}`]
  })
  return [
    'You write one short school-internal formative reference comment on uploaded visual-arts pages.',
    'The pages are artwork (藝術作品／評賞研究) and/or a research workbook (研究工作簿).',
    'Score only what is visible on the attached pages. Do not use the file name, file size, or any other file metadata.',
    'Organize the comment against these existing school-score v1 criteria. Do not invent new axes:',
    ...lines,
    'The reference standard is the school\'s locked internal samples, already used by school-score v1.',
    'Stronger work shows a clear theme, an evidenced reading of artworks carried into the student\'s own work, media trials including unsuccessful ones, a visible making process, and reflection.',
    'Earlier bands show a theme that is only starting, thin evidence, or missing trials.',
    'That standard is school-internal formative reference only. Do not name samples or students. Do not present this as a public-exam result.',
    'Choose one approximate band id: practice-emerging, practice-developing, practice-secure, or practice-strong.',
    'Those ids are the school practice bands 起步 / 發展中 / 穩固 / 良好, with values 1.25 / 2.5 / 3.5 / 4.5. They are unofficial.',
    'The visible unofficial score and every axis value use only 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, or 5.',
    'Do not use 1.25 as a visible score or axis value. Do not invent a band name for 5.',
    'Score each axis separately. Do not copy one overall band onto every axis.',
    'Return an axis value only for sides named in the user message.',
    'For each artwork axis aw-1 through aw-6, add advice that is specific to this work and that axis.',
    'Do not reuse one sentence for more than one axis. Omit an axis from advice when you cannot see a specific improvement.',
    'Do not write a generic tip, a public-exam result, or an official mark.',
    'This is not an SBA remark, not an HKEAA score, and not a public-exam prediction.',
    'Do not write a generic art-criticism essay. Two to four sentences, tied to what is visible on the pages.',
    `Write the comment and the advice in ${language}.`,
    'Reply with JSON only: {"comment":"...","band":"practice-secure","score":3.5,"axes":{"aw-1":3.5,"rwb-1":2.5},"advice":{"aw-1":"..."}}',
  ].join('\n')
}

export const FORMATIVE_USER_PROMPT =
  'The attached images are school artwork and/or research-workbook pages that a teacher already uploaded. Write the short formative comment from what is visible on those pages. Score each axis separately. Do not use the file name or file size. Do not award an official mark.'

export function formativeUserPrompt(sides: readonly string[]): string {
  const named = [...new Set(sides.filter((side) => side === 'artwork' || side === 'research_workbook'))]
  const scope = named.length > 0 ? named.join(', ') : 'none'
  return `${FORMATIVE_USER_PROMPT}\nSides to score: ${scope}.`
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
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    return bandFromModel(Number(value.trim()))
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5) {
    let best: PracticeBandId = PRACTICE_BAND_IDS[0]
    let dist = Number.POSITIVE_INFINITY
    for (const id of PRACTICE_BAND_IDS) {
      const next = Math.abs(FORMATIVE_BAND_VALUE[id] - value)
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
])

/** Keep a suggestion only when it is specific to one artwork axis. Shared or empty copy is dropped. */
export function tailoredAxisAdvice(raw: unknown): FormativeAdvice {
  if (!raw || typeof raw !== 'object') return {}
  const bag = raw as Record<string, unknown>
  const rows: { id: (typeof CRITERIA_IDS)[number]; text: string }[] = []
  for (const id of CRITERIA_IDS) {
    if (!id.startsWith('aw-')) continue
    const value = bag[id]
    if (typeof value !== 'string') continue
    const text = value.replace(/\s+/g, ' ').trim()
    if (text.length < 8 || text.length > 400) continue
    if (BLOCKED_COMMENT.test(text) || ADVICE_PALE.has(text)) continue
    rows.push({ id, text })
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

export function parseFormativeAxes(raw: unknown): FormativeAxes {
  if (!raw || typeof raw !== 'object') return {}
  const bag = raw as Record<string, unknown>
  const axes: FormativeAxes = {}
  for (const id of CRITERIA_IDS) {
    const value = axisValueFromModel(bag[id])
    if (value == null) continue
    axes[id] = value
  }
  return axes
}

export function parseFormativeModelText(
  raw: string,
): { comment: string; band: PracticeBandId; axes: FormativeAxes; score: number; advice: FormativeAdvice } | null {
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
  const score = laterVisibleLevel(record.score) ?? laterVisibleLevel(FORMATIVE_BAND_VALUE[band])
  if (score == null) return null
  return { comment, band, axes: parseFormativeAxes(record.axes), score, advice: tailoredAxisAdvice(record.advice) }
}

async function packFormativePages(input: {
  fileName: string
  mime: string
  bytes: Uint8Array | null
  pages?: readonly FormativePageInput[]
}): Promise<{ side: string; mime: string; bytes: Uint8Array }[]> {
  const source: FormativePageInput[] = (
    input.pages && input.pages.length > 0
      ? [...input.pages]
      : input.bytes
        ? [{ mime: input.mime, bytes: input.bytes, fileName: input.fileName }]
        : []
  ).filter((page) => page.bytes.byteLength > 0)
  if (source.length === 0) return []
  const share = Math.min(FORMATIVE_PAGE_BYTE_MAX, Math.floor(FORMATIVE_TOTAL_BYTE_MAX / Math.min(4, source.length)))
  const packed: { side: string; mime: string; bytes: Uint8Array }[] = []
  for (const page of source) {
    if (packed.length >= 4) break
    const fitted = await fitFormativePayload({
      side: page.side,
      mime: page.mime,
      bytes: page.bytes,
      fileName: page.fileName || input.fileName,
      maxBytes: share,
    })
    for (const item of fitted) {
      if (packed.length >= 4) break
      if (item.bytes.byteLength === 0 || item.bytes.byteLength > FORMATIVE_PAGE_BYTE_MAX) continue
      packed.push(item)
    }
  }
  const kept: { side: string; mime: string; bytes: Uint8Array }[] = []
  let total = 0
  for (const item of packed) {
    if (kept.length >= 4) break
    if (item.bytes.byteLength > FORMATIVE_TOTAL_BYTE_MAX) continue
    if (kept.length > 0 && total + item.bytes.byteLength > FORMATIVE_TOTAL_BYTE_MAX) continue
    kept.push(item)
    total += item.bytes.byteLength
  }
  return kept
}

function formativeRequestBody(
  locale: string,
  pages: readonly { side: string; mime: string; bytes: Uint8Array }[],
  asPages: boolean,
): string {
  if (asPages) {
    return JSON.stringify({
      locale,
      pages: pages.map((page) => ({
        side: page.side,
        mime: page.mime,
        imageBase64: bytesToBase64(page.bytes),
      })),
    })
  }
  return JSON.stringify({
    locale,
    mime: pages[0].mime,
    imageBase64: bytesToBase64(pages[0].bytes),
  })
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
  let pages = await packFormativePages(input)
  if (pages.length === 0) return { ok: false, reason: 'not_sent' }
  const asPages = Boolean(input.pages && input.pages.length > 0)
  let body = formativeRequestBody(input.locale, pages, asPages)
  while (body.length > FORMATIVE_BODY_CHAR_MAX && pages.length > 1) {
    pages = pages.slice(0, -1)
    body = formativeRequestBody(input.locale, pages, asPages)
  }
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
