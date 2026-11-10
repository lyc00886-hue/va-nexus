/**
 * School-score later upload: one-school draft page, approximate reference band,
 * then a teacher adjust that can feed the existing school-score and dual-radar stores.
 * The upload is a local draft. It is not a formal submission and not an official score.
 * A staff click can replace the filename/size stub with a short formative comment and
 * band. Until that click, and whenever the model is unavailable, the stub remains.
 * Nothing here writes the school reference until the teacher confirms.
 * Student self-assessment is not read or written here.
 */
import {
  DUAL_AXIS_IDS,
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
 * School reference takes the effective band. Dual-radar axes that are still empty
 * receive the same formative number the practice-band buttons already write.
 * Axes that already have a staff value stay as they are.
 */
export function laterFeed(
  draft: LaterDraft,
  dual: DualRadarStore,
): { band: PracticeBandId; formative: number; axes: DualAxisId[] } {
  const band = effectiveBand(draft)
  return {
    band,
    formative: formativeForBand(band),
    axes: DUAL_AXIS_IDS.filter((id) => dual.axes[id] == null),
  }
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
  return {
    draft: {
      fileName: draft.fileName.trim().slice(0, 180),
      fileSize: Math.round(draft.fileSize),
      mime: typeof draft.mime === 'string' ? draft.mime.slice(0, 80) : '',
      approxBand,
      stubBand,
      aiStatus,
      aiComment,
      adjustBand,
      committedBand,
    },
  }
}
