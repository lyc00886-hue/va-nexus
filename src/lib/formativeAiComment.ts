/**
 * School-internal formative comment + approximate band.
 * The comment is organised on the existing school criteria labels.
 * It is not an official SBA, HKEAA, or public-exam score.
 */
import { CRITERIA_IDS, PRACTICE_BAND_IDS, type PracticeBandId } from './teacherDraftBand.ts'

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
  /5\*\*|97分|全校降分|未達標|未达标|公開試結果|公开试结果|公開試預測|公开试预测|正式分數|正式分数|official grade|official score|ArtInSight|洞察藝術|洞察艺术/i

export const FORMATIVE_COMMENT_PATH = '/api/formative-comment'
export const FORMATIVE_PAGE_BYTE_MAX = 3_500_000

const PAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

export type FormativeAxis = { id: (typeof CRITERIA_IDS)[number]; label: string }

export type FormativeModelResult =
  | { ok: true; comment: string; band: PracticeBandId }
  | { ok: false; reason: 'unavailable' }

function axisLocale(locale: string): 'zh-Hant' | 'zh-Hans' | 'en' {
  if (locale === 'en') return 'en'
  if (locale === 'zh-Hans') return 'zh-Hans'
  return 'zh-Hant'
}

export function formativeAxisLabels(locale: string): FormativeAxis[] {
  const pack = AXIS_LABELS[axisLocale(locale)]
  return CRITERIA_IDS.map((id) => ({ id, label: pack[id] }))
}

export function formativeCommentSystem(labels: readonly string[], locale: string): string {
  const language = locale === 'en' ? 'English' : locale === 'zh-Hans' ? 'Simplified Chinese' : 'Traditional Chinese'
  return [
    'You write one short school-internal formative reference comment on a visual-arts workbook page.',
    'Organize the comment against these existing school criteria. Do not invent new axes:',
    ...labels.map((label) => `- ${label}`),
    'Choose one approximate band id: practice-emerging, practice-developing, practice-secure, or practice-strong.',
    'Those ids are the school practice bands 起步 / 發展中 / 穩固 / 良好. They are unofficial.',
    'This is not an SBA remark, not an HKEAA score, and not a public-exam prediction.',
    'Do not write a generic art-criticism essay. At most two sentences, tied to criteria visible on the page.',
    `Write the comment in ${language}.`,
    'Reply with JSON only: {"comment":"...","band":"practice-secure"}',
  ].join('\n')
}

export const FORMATIVE_USER_PROMPT =
  'The attached file is one school workbook page that a teacher already uploaded. Write the short formative comment from what is visible on that page. Do not award an official mark.'

export function formativePageMime(name: string, mime: string): string | null {
  const type = mime.toLowerCase().split(';')[0].trim()
  if (PAGE_MIME.has(type)) return type
  if (type === 'image/jpg') return 'image/jpeg'
  if (/\.pdf$/i.test(name)) return 'application/pdf'
  if (/\.png$/i.test(name)) return 'image/png'
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg'
  if (/\.webp$/i.test(name)) return 'image/webp'
  if (/\.gif$/i.test(name)) return 'image/gif'
  return null
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

export function parseFormativeModelText(raw: string): { comment: string; band: PracticeBandId } | null {
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
  const record = data as { comment?: unknown; band?: unknown }
  if (typeof record.comment !== 'string') return null
  const comment = record.comment.replace(/\s+/g, ' ').trim()
  if (comment.length < 8 || comment.length > 400) return null
  if (BLOCKED_COMMENT.test(comment)) return null
  const band = bandFromModel(record.band)
  if (!band) return null
  return { comment, band }
}

export async function postFormativeComment(input: {
  locale: string
  fileName: string
  mime: string
  bytes: Uint8Array | null
  accessToken?: string | null
  fetchImpl?: typeof fetch
}): Promise<FormativeModelResult> {
  const mime = formativePageMime(input.fileName, input.mime)
  if (!mime || !input.bytes || input.bytes.byteLength === 0 || input.bytes.byteLength > FORMATIVE_PAGE_BYTE_MAX) {
    return { ok: false, reason: 'unavailable' }
  }
  const fetchImpl = input.fetchImpl ?? fetch
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`
    const res = await fetchImpl(FORMATIVE_COMMENT_PATH, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locale: input.locale,
        mime,
        imageBase64: bytesToBase64(input.bytes),
      }),
    })
    const data: unknown = await res.json().catch(() => null)
    if (!res.ok || !data || typeof data !== 'object') return { ok: false, reason: 'unavailable' }
    const record = data as { ok?: unknown; comment?: unknown; band?: unknown }
    if (record.ok !== true) return { ok: false, reason: 'unavailable' }
    const parsed = parseFormativeModelText(JSON.stringify({ comment: record.comment, band: record.band }))
    if (!parsed) return { ok: false, reason: 'unavailable' }
    return { ok: true, comment: parsed.comment, band: parsed.band }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
