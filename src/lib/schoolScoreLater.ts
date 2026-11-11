/**
 * School-score later upload: one-school draft page, approximate reference band,
 * then a teacher adjust that can feed the existing school-score and dual-radar stores.
 * The upload is a local draft. It is not a formal submission and not an official score.
 * A staff click can replace the filename/size stub with a short formative comment and
 * band. Until that click, and whenever the model is unavailable, the stub remains.
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

export type LaterAiStatus = 'idle' | 'model' | 'fallback'

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
  /** Band shown as the reference suggestion. The stub until a model result replaces it. */
  approxBand: PracticeBandId
  /** Filename/size band. Restored when the model is unavailable. */
  stubBand: PracticeBandId
  /** Idle until staff request a comment. Model and fallback both leave the school reference unwritten. */
  aiStatus: LaterAiStatus
  /** Short formative comment. Present only after a model result. */
  aiComment: string | null
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

export function isLaterUploadFile(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase()
  if (type.startsWith('image/')) return true
  if (type === 'application/pdf') return true
  return /\.pdf$/i.test(file.name) && (type === '' || type === 'application/octet-stream')
}

const WORKBOOK_NAME = /工作簿|workbook/i
const ARTWORK_NAME = /作品|評賞|评赏|artwork/i
const EXCLUDED_NAME =
  /練習卷|练习卷|practice[\s._-]*paper|課程|课程|\bcourse\b|地圖|地图|map[\s._-]*card|課卡|课卡/i

/** Practice papers, course pages, and map cards stay out of the scan. */
export function laterScanExcluded(name: string): boolean {
  return EXCLUDED_NAME.test(name)
}

/**
 * Artwork (藝術作品／評賞研究) or research workbook (研究工作簿).
 * Anything else, including an excluded page, is not a scan side.
 */
export function laterPageSide(name: string): LaterPageSide | null {
  if (laterScanExcluded(name)) return null
  if (WORKBOOK_NAME.test(name)) return 'research_workbook'
  if (ARTWORK_NAME.test(name)) return 'artwork'
  return null
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
 * Deterministic stand-in when no live vision model is wired.
 * Same file name and size always return the same practice band.
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
  const approxBand = approximateBandId(fileName, fileSize)
  return {
    fileName,
    fileSize,
    mime: mime.slice(0, 80),
    approxBand,
    stubBand: approxBand,
    aiStatus: 'idle',
    aiComment: null,
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
  const text = value.replace(/\s+/g, ' ').trim().slice(0, 400)
  return text.length >= 8 ? text : null
}

/** Staff confirmed nothing yet. The model result stays off the school reference. */
export function applyModelComment(
  draft: LaterDraft,
  result: { comment: string; band: PracticeBandId },
): LaterDraft {
  const text = commentText(result.comment)
  if (!text || !isPracticeBandId(result.band)) return applyAiFallback(draft)
  return {
    ...draft,
    approxBand: result.band,
    aiStatus: 'model',
    aiComment: text,
  }
}

/** Filename/size band and the existing stub note. Upload and teacher adjust stay available. */
export function applyAiFallback(draft: LaterDraft): LaterDraft {
  if (draft.aiStatus === 'fallback' && draft.aiComment == null && draft.approxBand === draft.stubBand) return draft
  return {
    ...draft,
    approxBand: draft.stubBand,
    aiStatus: 'fallback',
    aiComment: null,
  }
}

export function effectiveBand(draft: LaterDraft): PracticeBandId {
  return draft.adjustBand ?? draft.approxBand
}

export function laterPending(draft: LaterDraft): boolean {
  return draft.committedBand == null || draft.committedBand !== effectiveBand(draft)
}

export function withAdjustBand(draft: LaterDraft, band: PracticeBandId | null): LaterDraft {
  const next = band == null || band === draft.approxBand ? null : band
  if (next === draft.adjustBand) return draft
  return { ...draft, adjustBand: next }
}

export function withCommitted(draft: LaterDraft): LaterDraft {
  const band = effectiveBand(draft)
  if (draft.committedBand === band) return draft
  return { ...draft, committedBand: band }
}

/** Student-visible band: the last teacher write, or the approximate band while it is still pending. */
export function studentVisibleBand(draft: LaterDraft): PracticeBandId {
  return draft.committedBand ?? draft.approxBand
}

/**
 * Formative value for the read-only AI reference radar.
 * Uses the approximate band (model, fallback, or post-upload stub) only.
 * A teacher adjust that has not been written does not change this value.
 */
export function aiReferenceFormative(draft: LaterDraft): number {
  return formativeForBand(draft.approxBand)
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
  band: PracticeBandId
  formative: number
  axes: DualAxisId[]
  /** Per-axis formal draft. Absent when the teacher adjust band is what gets fed. */
  values?: Partial<Record<DualAxisId, number>>
} {
  const band = effectiveBand(draft)
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
  if (!isPracticeBandId(draft.approxBand)) return empty
  const stubBand = isPracticeBandId(draft.stubBand) ? draft.stubBand : draft.approxBand
  let aiStatus: LaterAiStatus = draft.aiStatus === 'model' || draft.aiStatus === 'fallback' ? draft.aiStatus : 'idle'
  const aiComment = aiStatus === 'model' ? commentText(draft.aiComment) : null
  if (aiStatus === 'model' && !aiComment) aiStatus = 'fallback'
  const approxBand = aiStatus === 'fallback' ? stubBand : draft.approxBand
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
      stubBand,
      aiStatus,
      aiComment,
      adjustBand,
      committedBand,
      pages,
      formalAxes: formalAxesForPages(pages),
    },
  }
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
