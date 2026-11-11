/**
 * School-score later upload: one-school draft page, approximate reference band,
 * then a teacher adjust that can feed the existing school-score and dual-radar stores.
 * The upload is a local draft. It is not a formal submission and not an official score.
 * A staff click can replace the empty unofficial band with a short formative comment,
 * one visible band, and per-axis values read from the uploaded pages against the
 * locked school-score v1 criteria. Until that result, and whenever it is missing or
 * invalid, the visible band stays unset. A filename or file size is never a visible score.
 * Nothing here writes the school reference until the teacher confirms.
 * Student self-assessment is not read or written here.
 *
 * Full scan reads only already-uploaded artwork pages (藝術作品／評賞研究)
 * and research-workbook pages (研究工作簿). A missing side is skipped.
 * Course pages, practice papers, and map cards are not scanned.
 * 自動計出嚟嘅校內學校參考草稿先到教師面。
 * It is not written onto the student surface, and it does not replace the approximate band.
 */
import {
  DUAL_AXIS_IDS,
  DUAL_CHARTS,
  formativeForBand,
  type DualAxisId,
  type DualRadarStore,
} from './schoolScoreDual.ts'
import { PRACTICE_BAND_IDS, type PracticeBandId } from './teacherDraftBand.ts'

export const SCHOOL_SCORE_LATER_KEY = 'va-nexus:school-score-later:v1'

export const SCHOOL_SCORE_LATER_SCOUT_DIR =
  '/content/learning-map-illustrations/soft-scout/school-score-soft-later-upload-ai-2611'

export const SCHOOL_SCORE_LATER_PLATES = {
  staff: `${SCHOOL_SCORE_LATER_SCOUT_DIR}/01-staff-upload-ai-adjust.png`,
  student: `${SCHOOL_SCORE_LATER_SCOUT_DIR}/02-student-progress-readonly.png`,
  flow: `${SCHOOL_SCORE_LATER_SCOUT_DIR}/03-disclaimer-soft-never-flow.png`,
  strip: `${SCHOOL_SCORE_LATER_SCOUT_DIR}/preview-strip.png`,
} as const

/** sha256 of the scout plates. Prefixes: 01 c28f3039cdb8 · 02 21c72ac97da6 · 03 5ec791b1ae39 · strip 320be4632146. */
export const SCHOOL_SCORE_LATER_SHA256 = {
  '01-staff-upload-ai-adjust.png': 'c28f3039cdb8084254ae8054605ca0217b263dad3dc1c244ee19b116f57f8f50',
  '02-student-progress-readonly.png': '21c72ac97da68bbf66189eae3163b44bbeec142eb2628bdcd8ec746fabf0d2f3',
  '03-disclaimer-soft-never-flow.png': '5ec791b1ae39367c33a27dbc4ad58830ce69f9eb3a5cada5f6aa60e4ff15b915',
  'preview-strip.png': '320be4632146cfe4baa30d61600ad7dfa50e675fafb30431a4116f19beb5c3be',
} as const

const BAND_SET = new Set<string>(PRACTICE_BAND_IDS)

export type LaterAiStatus = 'idle' | 'model' | 'fallback' | 'unsent'

/** The two scan sides. There is no third category. */
export type LaterPageSide = 'artwork' | 'research_workbook'

export type LaterPage = {
  fileName: string
  fileSize: number
  mime: string
  side: LaterPageSide
}

export type LaterDraft = {
  fileName: string
  fileSize: number
  mime: string
  /**
   * Visible unofficial band. Null until a model result read from the pages.
   * Never a filename or file-size hash.
   */
  approxBand: PracticeBandId | null
  /** Idle until staff request a comment. Model and fallback both leave the school reference unwritten. */
  aiStatus: LaterAiStatus
  /** Short formative comment. Present only after a model result. */
  aiComment: string | null
  /**
   * Per-axis unofficial reference for the student radars.
   * Only axes the model returned for a side that was actually uploaded.
   * Missing axes stay missing. They are not filled from `approxBand`.
   */
  aiAxes: Partial<Record<DualAxisId, number>>
  /** Null follows the approximate band. */
  adjustBand: PracticeBandId | null
  /** Last band written into the school reference. Null until the teacher writes. */
  committedBand: PracticeBandId | null
  /** Artwork and research-workbook pages already on this upload path. */
  pages: LaterPage[]
  /**
   * School-internal formal draft on the official /5 map.
   * Teacher surface only, until confirm or adjust feeds it.
   * Derived from `pages`. Never replaces `approxBand`.
   */
  formalAxes: Partial<Record<DualAxisId, number>>
}

export type LaterStore = {
  draft: LaterDraft | null
}

export function isPracticeBandId(value: unknown): value is PracticeBandId {
  return typeof value === 'string' && BAND_SET.has(value)
}

const LATER_FILE_EXT = /\.(?:pdf|png|jpe?g|webp|gif)$/i

export function isLaterUploadFile(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase().split(';')[0].trim()
  if (type.startsWith('image/')) return true
  if (type === 'application/pdf') return true
  return (type === '' || type === 'application/octet-stream') && LATER_FILE_EXT.test(file.name)
}

const WORKBOOK_NAME = /工作簿|workbook/i
const EXCLUDED_NAME =
  /練習卷|练习卷|practice[\s._-]*paper|課程|课程|\bcourse\b|地圖|地图|map[\s._-]*card|課卡|课卡/i

/** Practice papers, course pages, and map cards stay out of the scan. */
export function laterScanExcluded(name: string): boolean {
  return EXCLUDED_NAME.test(name)
}

/**
 * Artwork (藝術作品／評賞研究) or research workbook (研究工作簿).
 * A clearly workbook-named file is the research workbook.
 * Every other later file that is not an excluded name is artwork,
 * including an ordinary photo or PDF name. An excluded name is not a scan side.
 */
export function laterPageSide(name: string): LaterPageSide | null {
  if (laterScanExcluded(name)) return null
  if (WORKBOOK_NAME.test(name)) return 'research_workbook'
  return 'artwork'
}

export function upsertLaterPage(pages: readonly LaterPage[], page: LaterPage): LaterPage[] {
  const next = pages.filter((item) => !(item.side === page.side && item.fileName === page.fileName))
  next.push(page)
  return next
}

/**
 * Official 10-axis draft (artwork 6 + research workbook 4) on the existing /5 map.
 * A side with no pages is omitted. Axis values use only the pages of that side.
 */
export function formalAxesForPages(pages: readonly LaterPage[]): Partial<Record<DualAxisId, number>> {
  const axes: Partial<Record<DualAxisId, number>> = {}
  for (const chart of DUAL_CHARTS) {
    const sidePages = pages.filter((page) => page.side === chart.id && laterPageSide(page.fileName) === chart.id)
    if (sidePages.length === 0) continue
    const body = sidePages
      .map((page) => `${page.fileName}\n${Math.max(0, Math.round(page.fileSize))}`)
      .sort()
      .join('\n')
    const size = sidePages.reduce((sum, page) => sum + Math.max(0, Math.round(page.fileSize)), 0)
    for (const id of chart.axes) {
      axes[id] = formativeForBand(approximateBandId(`${body}\n${id}`, size))
    }
  }
  return axes
}

/**
 * Teacher formal-draft stand-in only.
 * Same file name and size always return the same practice band.
 * Not a visible unofficial band, and not a student radar axis.
 */
export function approximateBandId(name: string, size: number): PracticeBandId {
  const input = `${name}\n${Math.max(0, Math.round(size))}`
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return PRACTICE_BAND_IDS[(hash >>> 0) % PRACTICE_BAND_IDS.length]
}

export function emptyLaterStore(): LaterStore {
  return { draft: null }
}

export function draftFromFile(name: string, size: number, mime: string): LaterDraft {
  const fileName = name.trim().slice(0, 180) || 'page'
  const fileSize = Math.max(0, Math.round(size))
  return {
    fileName,
    fileSize,
    mime: mime.slice(0, 80),
    approxBand: null,
    aiStatus: 'idle',
    aiComment: null,
    aiAxes: {},
    adjustBand: null,
    committedBand: null,
    pages: [],
    formalAxes: {},
  }
}

/**
 * Same later-upload path. Keeps pages already stored for the other side.
 * An excluded name does not join the scan and does not erase pages already there.
 * The approximate band stays the latest file's own band.
 */
export function withUploadedFile(prev: LaterDraft | null, name: string, size: number, mime: string): LaterDraft {
  const head = draftFromFile(name, size, mime)
  const side = laterPageSide(head.fileName)
  const kept = (prev?.pages ?? []).filter((page) => laterPageSide(page.fileName) === page.side)
  const pages = side
    ? upsertLaterPage(kept, {
        fileName: head.fileName,
        fileSize: head.fileSize,
        mime: head.mime,
        side,
      })
    : kept
  return {
    ...head,
    pages,
    formalAxes: formalAxesForPages(pages),
  }
}

function commentText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim().slice(0, 800)
  return text.length >= 8 ? text : null
}

const AI_AXIS_VALUES = new Set<number>([1.25, 2.5, 3.5, 4.5])

/** Keep model axes only for sides that were uploaded, and only on the four practice-band values. */
export function axesForUploadedSides(
  axes: Partial<Record<DualAxisId, number>> | undefined,
  pages: readonly LaterPage[],
): Partial<Record<DualAxisId, number>> {
  const sides = new Set(pages.map((page) => page.side))
  const out: Partial<Record<DualAxisId, number>> = {}
  if (!axes) return out
  for (const id of DUAL_AXIS_IDS) {
    const value = axes[id]
    if (value == null || !AI_AXIS_VALUES.has(value)) continue
    const side = id.startsWith('aw-') ? 'artwork' : 'research_workbook'
    if (!sides.has(side)) continue
    out[id] = value
  }
  return out
}

/** Staff confirmed nothing yet. The model result stays off the school reference. */
export function applyModelComment(
  draft: LaterDraft,
  result: { comment: string; band: PracticeBandId; axes?: Partial<Record<DualAxisId, number>> },
): LaterDraft {
  const text = commentText(result.comment)
  if (!text || !isPracticeBandId(result.band)) return applyAiFallback(draft)
  return {
    ...draft,
    approxBand: result.band,
    aiStatus: 'model',
    aiComment: text,
    aiAxes: axesForUploadedSides(result.axes, draft.pages),
  }
}

/**
 * The file is already in the portfolio, but it could not be sent to the model.
 * No visible band and no per-axis values. This is not a model miss.
 */
export function applyFileNotSent(draft: LaterDraft): LaterDraft {
  if (
    draft.aiStatus === 'unsent' &&
    draft.aiComment == null &&
    draft.approxBand == null &&
    Object.keys(draft.aiAxes).length === 0
  ) {
    return draft
  }
  return {
    ...draft,
    approxBand: null,
    aiStatus: 'unsent',
    aiComment: null,
    aiAxes: {},
  }
}

/** No visible band and no per-axis values. Upload and teacher adjust stay available. */
export function applyAiFallback(draft: LaterDraft): LaterDraft {
  if (
    draft.aiStatus === 'fallback' &&
    draft.aiComment == null &&
    draft.approxBand == null &&
    Object.keys(draft.aiAxes).length === 0
  ) {
    return draft
  }
  return {
    ...draft,
    approxBand: null,
    aiStatus: 'fallback',
    aiComment: null,
    aiAxes: {},
  }
}

export function effectiveBand(draft: LaterDraft): PracticeBandId | null {
  return draft.adjustBand ?? draft.approxBand
}

export function laterPending(draft: LaterDraft): boolean {
  const band = effectiveBand(draft)
  if (band == null) return true
  return draft.committedBand == null || draft.committedBand !== band
}

export function withAdjustBand(draft: LaterDraft, band: PracticeBandId | null): LaterDraft {
  const next = band == null || band === draft.approxBand ? null : band
  if (next === draft.adjustBand) return draft
  return { ...draft, adjustBand: next }
}

export function withCommitted(draft: LaterDraft): LaterDraft {
  const band = effectiveBand(draft)
  if (band == null || draft.committedBand === band) return draft
  return { ...draft, committedBand: band }
}

/**
 * Unofficial band on the student shell.
 * A model result only. A teacher write stays on the school reference.
 * A filename or file size never becomes this band.
 */
export function studentVisibleBand(draft: LaterDraft): PracticeBandId | null {
  if (draft.aiStatus !== 'model') return null
  return draft.approxBand
}

/**
 * Formative value for the visible unofficial band.
 * Null until a model result. A teacher adjust does not change this value.
 */
export function aiReferenceFormative(draft: LaterDraft): number | null {
  const band = studentVisibleBand(draft)
  if (band == null) return null
  return formativeForBand(band)
}

/**
 * Per-axis values for one student radar.
 * Null unless every axis on that chart came back from the model.
 * Does not copy the overall band onto a missing axis.
 */
export function aiReferenceAxes(draft: LaterDraft, ids: readonly DualAxisId[]): number[] | null {
  if (draft.aiStatus !== 'model' || ids.length < 3) return null
  const values: number[] = []
  for (const id of ids) {
    const value = draft.aiAxes[id]
    if (value == null) return null
    values.push(value)
  }
  return values
}

/**
 * School reference takes the effective band.
 * With no teacher adjust and a formal draft, empty axes on the scanned sides
 * receive that draft. Otherwise empty axes receive the band's formative number.
 * Axes that already have a staff value stay as they are.
 * An excluded page with nothing to scan does not fill axes.
 */
export function laterFeed(
  draft: LaterDraft,
  dual: DualRadarStore,
): {
  band: PracticeBandId | null
  formative: number | null
  axes: DualAxisId[]
  /** Per-axis formal draft. Absent when the teacher adjust band is what gets fed. */
  values?: Partial<Record<DualAxisId, number>>
} {
  const band = effectiveBand(draft)
  if (band == null) return { band: null, formative: null, axes: [] }
  const formative = formativeForBand(band)
  const empty = DUAL_AXIS_IDS.filter((id) => dual.axes[id] == null)
  const formalIds = DUAL_AXIS_IDS.filter((id) => draft.formalAxes[id] != null)
  if (draft.adjustBand == null && formalIds.length > 0) {
    const axes = formalIds.filter((id) => dual.axes[id] == null)
    const values: Partial<Record<DualAxisId, number>> = {}
    for (const id of axes) values[id] = draft.formalAxes[id]
    return { band, formative, axes, values }
  }
  if (draft.adjustBand == null && laterScanExcluded(draft.fileName) && formalIds.length === 0) {
    return { band, formative, axes: [] }
  }
  return { band, formative, axes: empty }
}

export function sanitizeLaterStore(raw: unknown): LaterStore {
  const empty = emptyLaterStore()
  if (!raw || typeof raw !== 'object') return empty
  const record = raw as { version?: unknown; draft?: unknown }
  if (record.version !== 1 || !record.draft || typeof record.draft !== 'object') return empty
  const draft = record.draft as Record<string, unknown>
  if (typeof draft.fileName !== 'string' || !draft.fileName.trim()) return empty
  if (typeof draft.fileSize !== 'number' || !Number.isFinite(draft.fileSize) || draft.fileSize < 0) return empty
  let aiStatus: LaterAiStatus =
    draft.aiStatus === 'model' || draft.aiStatus === 'fallback' || draft.aiStatus === 'unsent' ? draft.aiStatus : 'idle'
  let aiComment = aiStatus === 'model' ? commentText(draft.aiComment) : null
  let approxBand = aiStatus === 'model' && isPracticeBandId(draft.approxBand) ? draft.approxBand : null
  if (aiStatus === 'model' && (!aiComment || approxBand == null)) {
    aiStatus = 'fallback'
    aiComment = null
    approxBand = null
  }
  const adjustBand = isPracticeBandId(draft.adjustBand) && draft.adjustBand !== approxBand ? draft.adjustBand : null
  const committedBand = isPracticeBandId(draft.committedBand) ? draft.committedBand : null
  const fileName = draft.fileName.trim().slice(0, 180)
  const fileSize = Math.round(draft.fileSize)
  const mime = typeof draft.mime === 'string' ? draft.mime.slice(0, 80) : ''
  const pages = pagesForDraft(draft, fileName, fileSize, mime)
  return {
    draft: {
      fileName,
      fileSize,
      mime,
      approxBand,
      aiStatus,
      aiComment,
      aiAxes: aiStatus === 'model' ? axesForUploadedSides(readStoredAxes(draft.aiAxes), pages) : {},
      adjustBand,
      committedBand,
      pages,
      formalAxes: formalAxesForPages(pages),
    },
  }
}

function readStoredAxes(raw: unknown): Partial<Record<DualAxisId, number>> {
  if (!raw || typeof raw !== 'object') return {}
  const bag = raw as Record<string, unknown>
  const out: Partial<Record<DualAxisId, number>> = {}
  for (const id of DUAL_AXIS_IDS) {
    const value = bag[id]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    let best: number | null = null
    let dist = Number.POSITIVE_INFINITY
    for (const official of AI_AXIS_VALUES) {
      const next = Math.abs(official - value)
      if (next < dist) {
        dist = next
        best = official
      }
    }
    if (best == null || dist > 0.5) continue
    out[id] = best
  }
  return out
}

function sanitizePages(raw: unknown): LaterPage[] {
  if (!Array.isArray(raw)) return []
  let pages: LaterPage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    if (typeof record.fileName !== 'string' || !record.fileName.trim()) continue
    if (typeof record.fileSize !== 'number' || !Number.isFinite(record.fileSize) || record.fileSize < 0) continue
    const fileName = record.fileName.trim().slice(0, 180)
    const side = laterPageSide(fileName)
    if (side == null) continue
    pages = upsertLaterPage(pages, {
      fileName,
      fileSize: Math.round(record.fileSize),
      mime: typeof record.mime === 'string' ? record.mime.slice(0, 80) : '',
      side,
    })
  }
  return pages
}

/** Older drafts have no page list. A classifiable file is the scan page, so nobody re-uploads it. */
function pagesForDraft(draft: Record<string, unknown>, fileName: string, fileSize: number, mime: string): LaterPage[] {
  if (Array.isArray(draft.pages)) return sanitizePages(draft.pages)
  const side = laterPageSide(fileName)
  if (!side) return []
  return [{ fileName, fileSize, mime, side }]
}
