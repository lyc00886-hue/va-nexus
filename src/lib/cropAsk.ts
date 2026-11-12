/**
 * Look closely: one device-local draft library for both maps.
 * A draft is learning support. It never writes a practice band,
 * a school reference, or an official score.
 */
import { portfolioKey } from './teacherDraftBand.ts'

export const CROP_ASK_KEY = 'va-nexus:crop-ask:v1'
export const CROP_ASK_PATH = '/api/crop-ask'

export const CROP_ASK_AXES = ['theme', 'research', 'media', 'process', 'reflect', 'visual'] as const
export type CropAskAxis = (typeof CROP_ASK_AXES)[number]

export const CROP_ASK_GRADES = ['f4', 'f5', 'f6'] as const
export type CropAskGrade = (typeof CROP_ASK_GRADES)[number]

export const CROP_ASK_DEMOS = ['a', 'b', 'c'] as const
export type CropAskDemoId = (typeof CROP_ASK_DEMOS)[number]

export type CropAskPhase =
  | 'noImage'
  | 'needCrop'
  | 'ready'
  | 'generating'
  | 'pending'
  | 'edited'
  | 'confirmed'
  | 'failed'

export type CropRect = { x: number; y: number; w: number; h: number }

export type CropAskSections = {
  seen: string
  understood: string
  evidence: string
}

/** Result of checking the uploaded image before the three sections are written. */
export type CropAskBackgroundStatus = 'found' | 'notFound' | 'failed'

export type GroundingChunk = { uri: string; title: string }

export type CropAskBackgroundLookup =
  | { status: 'found'; title: string; artist: string; background: string; meaning: string }
  | { status: 'notFound' | 'failed' }

export type CropAskDraft = {
  id: string
  unitId: string
  unitTitle: string
  grade: CropAskGrade
  studentId: string
  studentKey: string
  demoId: CropAskDemoId | null
  imageDataUrl: string | null
  crop: CropRect | null
  sections: CropAskSections | null
  modelSections: CropAskSections | null
  /** How the uploaded image's background check ended. Null on older drafts. */
  background: CropAskBackgroundStatus | null
  /** Reasonable estimate for an unconfirmed work. Null when confirmed, or when no estimate was made. */
  speculation: string | null
  axes: CropAskAxis[]
  status: CropAskPhase
  failReason: 'failed' | 'unavailable' | null
  updatedAt: string
}

export type CropAskStore = {
  version: 1
  open: boolean
  drafts: CropAskDraft[]
}

export type CropAskMeta = {
  unitId: string
  unitTitle: string
  grade: CropAskGrade
  studentId: string
  studentKey: string
  demoId: CropAskDemoId | null
  now?: string
}

export type CropAskResult =
  | { ok: true; sections: CropAskSections; background: CropAskBackgroundStatus | null; speculation: string | null }
  | { ok: false; reason: 'failed' | 'unavailable' | 'aborted' }

/** Shown inside 「點樣理解」 only when the uploaded work is not confirmed. */
export type SpeculationDisplay = { kind: 'hidden' } | { kind: 'estimate'; text: string } | { kind: 'pending' }

const AXIS_SET = new Set<string>(CROP_ASK_AXES)
const GRADE_SET = new Set<string>(CROP_ASK_GRADES)
const DEMO_SET = new Set<string>(CROP_ASK_DEMOS)
const SECTION_MIN = 4
const SECTION_MAX = 500
const SPECULATION_MIN = 8
const SPECULATION_MAX = 500
const DATA_URL_MAX = 900_000
const UNIT_ID = /^F[456]-U\d+-[A-Z0-9-]+$/

const BLOCKED_ANALYSIS =
  /practice-emerging|practice-developing|practice-secure|practice-strong|起步|發展中|发展中|穩固|稳固|良好|正式成績|正式成绩|正式分數|正式分数|公開試成績|公开试成绩|ArtInSight|洞察藝術|洞察艺术|ArtGPT|crop-and-ask|5\*\*|HKEAA/i

/** An estimate must not name a work, an artist, a school, or a date the crop did not confirm. */
const SPECULATION_FORBIDDEN =
  /作品名|作者|畫家|画家|畫派|画派|流派|風格歸屬|风格归属|正式鑑定|正式鉴定|已知出處|已知出处|formal identification|known source|attributed to|\bthe artist\b|\bthe title\b|\bartist is\b|\btitle is\b|《[^》]{1,60}》|\b(?:1[0-9]{3}|20[0-2][0-9])\b/i

const UNIT_AXES: Record<string, readonly CropAskAxis[]> = {
  'F4-U2-DRAW-DESIGN': ['theme', 'visual'],
  'F4-U3-COMMUNITY': ['research', 'process'],
  'F4-U4-SELF-RESEARCH': ['research', 'reflect'],
  'F5-U2-AESTHETIC': ['theme', 'visual'],
  'F5-U3-HERITAGE': ['research', 'process'],
  'F5-U7-PORTFOLIO': ['process', 'reflect'],
  'F6-U3-DAILY': ['theme', 'visual'],
  'F6-U4-LITERATI': ['research', 'reflect'],
  'F6-U6-PORTFOLIO': ['process', 'reflect'],
}

export function emptyCropAskStore(): CropAskStore {
  return { version: 1, open: false, drafts: [] }
}

export function referenceAxesForUnit(unitId: string): CropAskAxis[] {
  const mapped = UNIT_AXES[unitId]
  const axes = (mapped ?? ['visual']).filter((id) => AXIS_SET.has(id))
  const unique = [...new Set(axes)]
  if (unique.length === 0 || unique.length >= CROP_ASK_AXES.length) return ['visual']
  return unique
}

export function currentUnitFace(
  units: readonly { id: string; title: string }[],
  openId: string | null,
): { id: string; title: string } | null {
  const usable = units.filter((unit) => UNIT_ID.test(unit.id) && unit.title.trim())
  if (usable.length === 0) return null
  if (openId) {
    const open = usable.find((unit) => unit.id === openId)
    if (open) return { id: open.id, title: open.title.trim() }
  }
  return { id: usable[0].id, title: usable[0].title.trim() }
}

export function bindCropAskStudent(input: {
  activePortfolio: string
  students: readonly { id: string; name: string; demoId: CropAskDemoId | null }[]
}): { studentId: string; studentKey: string; demoId: CropAskDemoId | null } {
  const key = portfolioKey(input.activePortfolio)
  if (key) {
    const named = input.students.find((student) => !student.demoId && portfolioKey(student.name) === key)
    if (named) return { studentId: named.id, studentKey: portfolioKey(named.name), demoId: null }
    return { studentId: `name:${key}`, studentKey: key, demoId: null }
  }
  const demo = input.students.find((student) => student.demoId === 'a') ?? input.students.find((student) => student.demoId)
  if (demo?.demoId) return { studentId: demo.id, studentKey: `demo:${demo.demoId}`, demoId: demo.demoId }
  return { studentId: 'device', studentKey: '', demoId: null }
}

export function staffUsesDemo(
  students: readonly { demoId: string | null }[],
  rows: readonly { demoId: CropAskDemoId | null }[],
): boolean {
  if (rows.some((row) => row.demoId)) return true
  return students.length > 0 && students.every((student) => student.demoId)
}

export function staffNeedsNames(
  students: readonly { name: string; demoId: string | null }[],
  rows: readonly { studentKey: string; demoId: CropAskDemoId | null }[],
): boolean {
  const roster = students.some((student) => student.demoId || student.name.trim())
  if (roster) return false
  return rows.every((row) => !row.studentKey && !row.demoId)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

/** A region inside the image. The full frame is not a region. */
export function normalizeCrop(rect: CropRect | null | undefined): CropRect | null {
  if (!rect) return null
  const x = Number(rect.x)
  const y = Number(rect.y)
  const w = Number(rect.w)
  const h = Number(rect.h)
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null
  const left = clamp(Math.min(x, x + w), 0, 1)
  const top = clamp(Math.min(y, y + h), 0, 1)
  const width = clamp(Math.abs(w), 0, 1 - left)
  const height = clamp(Math.abs(h), 0, 1 - top)
  if (width < 0.04 || height < 0.04) return null
  if (width >= 0.98 && height >= 0.98) return null
  return { x: round4(left), y: round4(top), w: round4(width), h: round4(height) }
}

export function cropSourceRect(
  imageWidth: number,
  imageHeight: number,
  crop: CropRect | null,
): { sx: number; sy: number; sw: number; sh: number } | null {
  const norm = normalizeCrop(crop)
  if (!norm) return null
  const width = Math.round(imageWidth)
  const height = Math.round(imageHeight)
  if (width < 2 || height < 2) return null
  const sx = Math.round(norm.x * width)
  const sy = Math.round(norm.y * height)
  const sw = Math.max(1, Math.round(norm.w * width))
  const sh = Math.max(1, Math.round(norm.h * height))
  if (sw < 8 || sh < 8) return null
  if (sx <= 1 && sy <= 1 && sw >= width - 2 && sh >= height - 2) return null
  return { sx, sy, sw: Math.min(sw, width - sx), sh: Math.min(sh, height - sy) }
}

export function requestGuard(input: { hasImage: boolean; crop: CropRect | null }): 'ok' | 'noImage' | 'needCrop' {
  if (!input.hasImage) return 'noImage'
  if (!normalizeCrop(input.crop)) return 'needCrop'
  return 'ok'
}

export function existingUploadedImage(input: { previewUrl: string | null; mime: string | null }): string | null {
  if (!input.previewUrl || !input.mime) return null
  if (!input.mime.toLowerCase().startsWith('image/')) return null
  if (input.previewUrl.startsWith('javascript:')) return null
  return input.previewUrl
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function cleanSectionText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = cleanLine(value).slice(0, SECTION_MAX)
  if (text.length < SECTION_MIN || text.length > SECTION_MAX) return null
  if (BLOCKED_ANALYSIS.test(text)) return null
  return text
}

export function parseCropAskSections(raw: unknown): CropAskSections | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if ('band' in record || 'score' in record || 'grade' in record) return null
  const seen = cleanSectionText(record.seen)
  const understood = cleanSectionText(record.understood)
  const evidence = cleanSectionText(record.evidence)
  if (!seen || !understood || !evidence) return null
  return { seen, understood, evidence }
}

function parseModelRecord(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1))
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export function parseCropAskModelText(raw: string): CropAskSections | null {
  const record = parseModelRecord(raw)
  if (!record) return null
  return parseCropAskSections(record)
}

function cleanSpeculation(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = cleanLine(value).slice(0, SPECULATION_MAX)
  if (text.length < SPECULATION_MIN) return null
  if (BLOCKED_ANALYSIS.test(text) || SPECULATION_FORBIDDEN.test(text)) return null
  if (/^(unknown|n\/a|none|null|pending|不詳|不详|未知)$/i.test(text)) return null
  return text
}

/** A confirmed work never keeps an estimate. An empty or unsafe estimate becomes pending. */
export function speculationForStatus(status: CropAskBackgroundStatus | null, value: unknown): string | null {
  if (status !== 'notFound' && status !== 'failed') return null
  return cleanSpeculation(value)
}

export function readModelSpeculation(raw: string): string | null {
  const record = parseModelRecord(raw)
  if (!record) return null
  return cleanSpeculation(record.speculation)
}

export function speculationDisplay(background: CropAskBackgroundStatus | null, speculation: string | null): SpeculationDisplay {
  const text = speculationForStatus(background, speculation)
  if (background !== 'notFound' && background !== 'failed') return { kind: 'hidden' }
  if (!text) return { kind: 'pending' }
  return { kind: 'estimate', text }
}

/**
 * Confirmed background stays the understood text alone.
 * An unconfirmed block adds the marked estimate, or the pending sentence when none was made.
 */
export function understoodBringText(input: {
  understood: string
  background: CropAskBackgroundStatus | null
  speculation: string | null
  note: string
  pending: string
}): string {
  const display = speculationDisplay(input.background, input.speculation)
  if (display.kind === 'hidden') return input.understood
  if (display.kind === 'pending') {
    const line = cleanLine(input.pending)
    return line ? `${input.understood}\n\n${line}` : input.understood
  }
  const note = cleanLine(input.note)
  const marked = note ? `${note}\n${display.text}` : display.text
  return `${input.understood}\n\n${marked}`
}

export function teacherSectionText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = cleanLine(value).slice(0, SECTION_MAX)
  if (!text) return null
  return text
}

const BACKGROUND_MISS = [
  'Background check: this uploaded image was not confirmed as a known artwork that can be found online, the background search failed, or it looks like a student exercise or a private photo.',
  'In the understood section, write how this cropped region can be understood from what is visible in the crop and the current unit.',
  'Add a speculation field: a reasonable estimate of the likely theme, or of the meaning this crop may express, using only visual elements that are visible in THIS crop and aligned to the current unit.',
  'The estimate must be specific to this crop. Do not use a generic sentence that is unrelated to the crop.',
  'Do not invent a title, an artist, a school or style attribution, or historical facts that are not visible in the crop.',
  'Do not present the estimate as a confirmed source, an artist biography, or a formal identification.',
  'If you cannot make a reasonable estimate, or the crop has too little to go on, set speculation to an empty string. Do not invent an estimate.',
].join('\n')

function backgroundClause(background: CropAskBackgroundLookup): string {
  if (background.status !== 'found') return BACKGROUND_MISS
  return [
    'Background check: web search confirmed the whole uploaded image matches a publicly listed artwork.',
    `Title: ${background.title}`,
    `Artist: ${background.artist}`,
    `Background: ${background.background}`,
    `Meaning: ${background.meaning}`,
    'In the understood section only, add this background and this meaning, and still write about the cropped region and the current unit.',
    'Do not replace this confirmed background with a reasonable estimate.',
    'Do not describe the confirmed background as only a reasonable estimate.',
    'Do not add a speculation field.',
    'The attached image for these three sections is still the cropped region only.',
    'This is learning support, not a formal identification and not a mark.',
  ].join('\n')
}

export function cropAskSystem(locale: string, unitTitle: string, background?: CropAskBackgroundLookup): string {
  const language = locale === 'en' ? 'English' : locale === 'zh-Hans' ? 'Simplified Chinese' : 'Traditional Chinese (Hong Kong)'
  const unit = cleanLine(unitTitle).slice(0, 200) || 'the current unit'
  const unconfirmed = background != null && background.status !== 'found'
  const reply = unconfirmed
    ? 'Reply with JSON only: {"seen":"...","understood":"...","evidence":"...","speculation":"..."}'
    : 'Reply with JSON only: {"seen":"...","understood":"...","evidence":"..."}'
  const base = [
    'You write a structured learning-support note about one cropped region of a student artwork.',
    'The attached image is the selected region only. Do not describe anything outside it, and do not switch to the whole artwork.',
    `The student's current unit is: ${unit}.`,
    'Write three short sections:',
    '- seen: what is visible inside the region',
    '- understood: how this region can be understood, in light of the current unit',
    '- evidence: places or details inside the region that support that reading',
    'This is learning support. It is not an official grade, not an SBA score, not a public-exam result, and not a practice band.',
    'Do not assign a band or a numeric mark.',
    'Do not use four-step criticism titles. Do not invent details that are not visible.',
    `Write in ${language}.`,
    reply,
  ].join('\n')
  if (!background) return base
  return `${base}\n${backgroundClause(background)}`
}

function normBackground(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
}

function decodeUri(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function backgroundField(value: unknown, max: number, min: number): string | null {
  if (typeof value !== 'string') return null
  const text = cleanLine(value).slice(0, max)
  if (text.length < min || BLOCKED_ANALYSIS.test(text)) return null
  if (/^(unknown|n\/a|none|不詳|不详|未知)$/i.test(text)) return null
  return text
}

/**
 * A known work is accepted only when search results actually name it.
 * A model title with no matching public source is treated as unconfirmed.
 */
export function readBackgroundDecision(text: string, chunks: readonly GroundingChunk[]): CropAskBackgroundLookup {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return { status: 'failed' }
  let record: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1))
    if (!parsed || typeof parsed !== 'object') return { status: 'failed' }
    record = parsed as Record<string, unknown>
  } catch {
    return { status: 'failed' }
  }
  if (record.known !== true) return { status: 'notFound' }
  const title = backgroundField(record.title, 120, 2)
  const artist = backgroundField(record.artist, 120, 2)
  const background = backgroundField(record.background, 400, 8)
  const meaning = backgroundField(record.meaning, 400, 8)
  if (!title || !artist || !background || !meaning) return { status: 'notFound' }
  const https = chunks.some((chunk) => /^https:\/\//i.test(chunk.uri))
  if (!https) return { status: 'notFound' }
  const needle = normBackground(title).replace(/^(the|a|an)\s+/, '')
  const hay = chunks
    .map((chunk) => normBackground(`${chunk.title} ${decodeUri(chunk.uri)}`))
    .join('\n')
  if (needle.length < 2 || !hay.includes(needle)) return { status: 'notFound' }
  return { status: 'found', title, artist, background, meaning }
}

export const CROP_ASK_USER_PROMPT =
  'The attached image is only the cropped region. Describe that region in the three sections. Do not award a grade.'

function backgroundStatus(value: unknown): CropAskBackgroundStatus | null {
  return value === 'found' || value === 'notFound' || value === 'failed' ? value : null
}

export async function postCropAsk(input: {
  locale: string
  unitTitle: string
  imageBase64: string
  sourceImageBase64?: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}): Promise<CropAskResult> {
  const imageBase64 = input.imageBase64.replace(/\s/g, '')
  if (!imageBase64 || imageBase64.length > 2_000_000) return { ok: false, reason: 'failed' }
  const sourceImageBase64 = input.sourceImageBase64?.replace(/\s/g, '') ?? ''
  if (input.signal?.aborted) return { ok: false, reason: 'aborted' }
  const fetchImpl = input.fetchImpl ?? fetch
  const body: {
    locale: string
    unitTitle: string
    mime: 'image/jpeg'
    imageBase64: string
    sourceImageBase64?: string
  } = {
    locale: input.locale,
    unitTitle: cleanLine(input.unitTitle).slice(0, 200),
    mime: 'image/jpeg',
    imageBase64,
  }
  if (sourceImageBase64 && sourceImageBase64.length <= 2_000_000) body.sourceImageBase64 = sourceImageBase64
  try {
    const res = await fetchImpl(CROP_ASK_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: input.signal,
    })
    if (input.signal?.aborted) return { ok: false, reason: 'aborted' }
    const data: unknown = await res.json().catch(() => null)
    if (res.status === 503) return { ok: false, reason: 'unavailable' }
    if (!res.ok || !data || typeof data !== 'object') return { ok: false, reason: 'failed' }
    const record = data as { ok?: unknown; band?: unknown; background?: unknown; speculation?: unknown }
    if (record.ok !== true || 'band' in record) return { ok: false, reason: 'failed' }
    const sections = parseCropAskSections(data)
    if (!sections) return { ok: false, reason: 'failed' }
    const background = backgroundStatus(record.background)
    return { ok: true, sections, background, speculation: speculationForStatus(background, record.speculation) }
  } catch (error) {
    const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
    if (input.signal?.aborted || name === 'AbortError') return { ok: false, reason: 'aborted' }
    return { ok: false, reason: 'unavailable' }
  }
}

function isGrade(value: unknown): value is CropAskGrade {
  return typeof value === 'string' && GRADE_SET.has(value)
}

function isDemo(value: unknown): value is CropAskDemoId {
  return typeof value === 'string' && DEMO_SET.has(value)
}

function isPhase(value: unknown): value is CropAskPhase {
  return (
    value === 'noImage' ||
    value === 'needCrop' ||
    value === 'ready' ||
    value === 'generating' ||
    value === 'pending' ||
    value === 'edited' ||
    value === 'confirmed' ||
    value === 'failed'
  )
}

function storedSections(value: unknown): CropAskSections | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const seen = teacherSectionText(record.seen)
  const understood = teacherSectionText(record.understood)
  const evidence = teacherSectionText(record.evidence)
  if (!seen || !understood || !evidence) return null
  return { seen, understood, evidence }
}

function storedAxes(value: unknown, unitId: string): CropAskAxis[] {
  const incoming = Array.isArray(value) ? value.filter((id): id is CropAskAxis => typeof id === 'string' && AXIS_SET.has(id)) : []
  const unique = [...new Set(incoming)]
  if (unique.length === 0 || unique.length >= CROP_ASK_AXES.length) return referenceAxesForUnit(unitId)
  return unique
}

function imageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return null
  if (value.length > DATA_URL_MAX) return null
  return value
}

function sanitizeDraft(raw: unknown): CropAskDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const unitId = typeof item.unitId === 'string' ? item.unitId : ''
  const unitTitle = typeof item.unitTitle === 'string' ? cleanLine(item.unitTitle).slice(0, 200) : ''
  if (!UNIT_ID.test(unitId) || !unitTitle || !isGrade(item.grade)) return null
  const studentId = typeof item.studentId === 'string' ? item.studentId.trim().slice(0, 240) : ''
  if (!studentId) return null
  const demoId = item.demoId == null ? null : isDemo(item.demoId) ? item.demoId : null
  if (item.demoId != null && !demoId) return null
  const crop = normalizeCrop(item.crop as CropRect | null)
  const sections = storedSections(item.sections)
  const modelSections = storedSections(item.modelSections)
  const background = backgroundStatus(item.background)
  const speculation = speculationForStatus(background, item.speculation)
  let status: CropAskPhase = isPhase(item.status) ? item.status : 'ready'
  if (status === 'generating') status = sections ? 'pending' : crop ? 'ready' : 'needCrop'
  if ((status === 'pending' || status === 'edited' || status === 'confirmed') && !sections) status = crop ? 'ready' : 'needCrop'
  const failReason = item.failReason === 'failed' || item.failReason === 'unavailable' ? item.failReason : null
  return {
    id: `${studentId}::${unitId}`,
    unitId,
    unitTitle,
    grade: item.grade,
    studentId,
    studentKey: typeof item.studentKey === 'string' ? portfolioKey(item.studentKey) : '',
    demoId,
    imageDataUrl: imageUrl(item.imageDataUrl),
    crop,
    sections,
    modelSections,
    background,
    speculation,
    axes: storedAxes(item.axes, unitId),
    status,
    failReason,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt.slice(0, 40) : '',
  }
}

export function sanitizeCropAskStore(raw: unknown): CropAskStore {
  if (!raw || typeof raw !== 'object') return emptyCropAskStore()
  const record = raw as { version?: unknown; open?: unknown; drafts?: unknown }
  if ('version' in record && record.version !== 1) return emptyCropAskStore()
  const open = record.open === true
  if (!Array.isArray(record.drafts)) return { version: 1, open, drafts: [] }
  const drafts: CropAskDraft[] = []
  const seen = new Set<string>()
  for (const row of record.drafts) {
    const draft = sanitizeDraft(row)
    if (!draft || seen.has(draft.id)) continue
    seen.add(draft.id)
    drafts.push(draft)
  }
  return { version: 1, open, drafts: drafts.slice(-12) }
}

export function displayPhase(draft: CropAskDraft | null, hasImage: boolean): CropAskPhase {
  if (!hasImage) return 'noImage'
  if (!draft) return 'needCrop'
  if (draft.status === 'generating') return 'generating'
  if (draft.status === 'failed') return 'failed'
  if (draft.status === 'pending' || draft.status === 'edited' || draft.status === 'confirmed') {
    return draft.sections && draft.crop ? draft.status : draft.crop ? 'ready' : 'needCrop'
  }
  if (!draft.crop) return 'needCrop'
  return 'ready'
}

function metaOk(meta: CropAskMeta): boolean {
  return UNIT_ID.test(meta.unitId) && cleanLine(meta.unitTitle).length > 0 && isGrade(meta.grade) && meta.studentId.trim().length > 0
}

function draftId(meta: CropAskMeta): string {
  return `${meta.studentId.trim()}::${meta.unitId}`
}

function stamp(meta: CropAskMeta): string {
  return meta.now ?? new Date().toISOString()
}

function blank(meta: CropAskMeta): CropAskDraft {
  return {
    id: draftId(meta),
    unitId: meta.unitId,
    unitTitle: cleanLine(meta.unitTitle).slice(0, 200),
    grade: meta.grade,
    studentId: meta.studentId.trim(),
    studentKey: portfolioKey(meta.studentKey),
    demoId: meta.demoId,
    imageDataUrl: null,
    crop: null,
    sections: null,
    modelSections: null,
    background: null,
    speculation: null,
    axes: referenceAxesForUnit(meta.unitId),
    status: 'noImage',
    failReason: null,
    updatedAt: stamp(meta),
  }
}

function upsert(store: CropAskStore, draft: CropAskDraft): CropAskStore {
  const index = store.drafts.findIndex((item) => item.id === draft.id)
  const drafts = store.drafts.slice()
  if (index >= 0) drafts[index] = draft
  else drafts.push(draft)
  return { ...store, drafts }
}

function find(store: CropAskStore, meta: CropAskMeta): CropAskDraft | null {
  return store.drafts.find((item) => item.id === draftId(meta)) ?? null
}

function retitle(draft: CropAskDraft, meta: CropAskMeta): CropAskDraft {
  return {
    ...draft,
    unitTitle: cleanLine(meta.unitTitle).slice(0, 200),
    grade: meta.grade,
    studentKey: portfolioKey(meta.studentKey),
    demoId: meta.demoId,
    updatedAt: stamp(meta),
  }
}

export function findCropAskDraft(store: CropAskStore, unitId: string, studentId: string): CropAskDraft | null {
  return store.drafts.find((item) => item.unitId === unitId && item.studentId === studentId) ?? null
}

export function withCropAskOpen(store: CropAskStore, open: boolean): CropAskStore {
  if (store.open === open) return store
  return { ...store, open }
}

export function withCropAskImage(store: CropAskStore, meta: CropAskMeta, dataUrl: string, mode: 'replace' | 'keep'): CropAskStore {
  if (!metaOk(meta) || !imageUrl(dataUrl)) return store
  const current = find(store, meta) ?? blank(meta)
  if (mode === 'keep' && current.imageDataUrl === dataUrl) return store
  const next = retitle(current, meta)
  next.imageDataUrl = dataUrl
  next.failReason = null
  if (mode === 'replace') {
    next.crop = null
    next.sections = null
    next.modelSections = null
    next.background = null
    next.speculation = null
    next.status = 'needCrop'
    next.axes = referenceAxesForUnit(meta.unitId)
  }
  return upsert(store, next)
}

export function withCropAskCrop(store: CropAskStore, meta: CropAskMeta, crop: CropRect | null): CropAskStore {
  if (!metaOk(meta)) return store
  const current = find(store, meta)
  if (!current?.imageDataUrl) return store
  const norm = normalizeCrop(crop)
  if (!norm) return store
  if (current.crop && current.crop.x === norm.x && current.crop.y === norm.y && current.crop.w === norm.w && current.crop.h === norm.h) {
    return store
  }
  const next = retitle(current, meta)
  next.crop = norm
  next.sections = null
  next.modelSections = null
  next.background = null
  next.speculation = null
  next.status = 'ready'
  next.failReason = null
  return upsert(store, next)
}

export function withCropAskCleared(store: CropAskStore, meta: CropAskMeta): CropAskStore {
  const current = find(store, meta)
  if (!current || (!current.crop && !current.sections)) return store
  const next = retitle(current, meta)
  next.crop = null
  next.sections = null
  next.modelSections = null
  next.background = null
  next.speculation = null
  next.status = current.imageDataUrl ? 'needCrop' : 'noImage'
  next.failReason = null
  return upsert(store, next)
}

export function withCropAskGenerating(store: CropAskStore, meta: CropAskMeta): CropAskStore {
  const current = find(store, meta)
  if (!current?.imageDataUrl || !current.crop) return store
  if (current.status === 'generating' && current.failReason == null) return store
  const next = retitle(current, meta)
  next.status = 'generating'
  next.failReason = null
  return upsert(store, next)
}

export function withCropAskAnalysis(
  store: CropAskStore,
  meta: CropAskMeta,
  sections: CropAskSections,
  background: CropAskBackgroundStatus | null = null,
  speculation: string | null = null,
): CropAskStore {
  const current = find(store, meta)
  const parsed = parseCropAskSections(sections)
  if (!current?.imageDataUrl || !current.crop || !parsed) return store
  const next = retitle(current, meta)
  const status = backgroundStatus(background)
  next.sections = parsed
  next.modelSections = parsed
  next.background = status
  next.speculation = speculationForStatus(status, speculation)
  next.status = 'pending'
  next.failReason = null
  next.axes = referenceAxesForUnit(meta.unitId)
  return upsert(store, next)
}

export function withCropAskFailure(
  store: CropAskStore,
  meta: CropAskMeta,
  reason: 'failed' | 'unavailable',
  resume: CropAskPhase,
): CropAskStore {
  const current = find(store, meta)
  if (!current) return store
  const next = retitle(current, meta)
  next.failReason = reason
  const held = resume === 'pending' || resume === 'edited' || resume === 'confirmed'
  if (held && current.sections) next.status = resume
  else {
    next.status = 'failed'
    next.sections = null
    next.background = null
    next.speculation = null
  }
  return upsert(store, next)
}

export function withCropAskCancel(store: CropAskStore, meta: CropAskMeta, resume: CropAskPhase): CropAskStore {
  const current = find(store, meta)
  if (!current || current.status !== 'generating') return store
  const next = retitle(current, meta)
  if ((resume === 'pending' || resume === 'edited' || resume === 'confirmed') && current.sections) next.status = resume
  else if (current.sections && current.crop) next.status = 'pending'
  else next.status = current.crop ? 'ready' : current.imageDataUrl ? 'needCrop' : 'noImage'
  next.failReason = null
  return upsert(store, next)
}

export function withTeacherSections(store: CropAskStore, id: string, sections: CropAskSections, now?: string): CropAskStore {
  const current = store.drafts.find((item) => item.id === id)
  const seen = teacherSectionText(sections.seen)
  const understood = teacherSectionText(sections.understood)
  const evidence = teacherSectionText(sections.evidence)
  if (!current?.modelSections || !seen || !understood || !evidence) return store
  const nextSections = { seen, understood, evidence }
  const changed =
    nextSections.seen !== current.modelSections.seen ||
    nextSections.understood !== current.modelSections.understood ||
    nextSections.evidence !== current.modelSections.evidence
  const status: CropAskPhase = changed ? 'edited' : current.status === 'confirmed' ? 'confirmed' : 'pending'
  if (
    current.sections &&
    current.sections.seen === nextSections.seen &&
    current.sections.understood === nextSections.understood &&
    current.sections.evidence === nextSections.evidence &&
    current.status === status
  ) {
    return store
  }
  return upsert(store, { ...current, sections: nextSections, status, failReason: null, updatedAt: now ?? new Date().toISOString() })
}

export function withCropAskConfirmed(store: CropAskStore, id: string, now?: string): CropAskStore {
  const current = store.drafts.find((item) => item.id === id)
  if (!current?.sections) return store
  if (current.status !== 'pending' && current.status !== 'edited' && current.status !== 'confirmed') return store
  if (current.status === 'confirmed') return store
  return upsert(store, { ...current, status: 'confirmed', failReason: null, updatedAt: now ?? new Date().toISOString() })
}

export function withCropAskUnconfirmed(store: CropAskStore, id: string, now?: string): CropAskStore {
  const current = store.drafts.find((item) => item.id === id)
  if (!current || current.status !== 'confirmed' || !current.sections) return store
  const changed =
    !current.modelSections ||
    current.sections.seen !== current.modelSections.seen ||
    current.sections.understood !== current.modelSections.understood ||
    current.sections.evidence !== current.modelSections.evidence
  return upsert(store, {
    ...current,
    status: changed ? 'edited' : 'pending',
    updatedAt: now ?? new Date().toISOString(),
  })
}

export type CropAskReview = {
  id: string
  unitId: string
  unitTitle: string
  grade: CropAskGrade
  studentKey: string
  demoId: CropAskDemoId | null
  status: 'pending' | 'edited' | 'confirmed'
  sections: CropAskSections
  axes: CropAskAxis[]
  crop: CropRect | null
  imageDataUrl: string | null
  background: CropAskBackgroundStatus | null
  speculation: string | null
}

export function reviewDrafts(store: CropAskStore): CropAskReview[] {
  const rows: CropAskReview[] = []
  for (const draft of store.drafts) {
    if (!draft.sections) continue
    if (draft.status !== 'pending' && draft.status !== 'edited' && draft.status !== 'confirmed') continue
    rows.push({
      id: draft.id,
      unitId: draft.unitId,
      unitTitle: draft.unitTitle,
      grade: draft.grade,
      studentKey: draft.studentKey,
      demoId: draft.demoId,
      status: draft.status,
      sections: draft.sections,
      axes: draft.axes,
      crop: draft.crop,
      imageDataUrl: draft.imageDataUrl,
      background: draft.background,
      speculation: draft.speculation,
    })
  }
  return rows
}

export function pendingReviewCount(store: CropAskStore): number {
  return reviewDrafts(store).filter((row) => row.status === 'pending' || row.status === 'edited').length
}
