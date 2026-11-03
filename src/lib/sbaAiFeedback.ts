/**
 * Manual SBA formative feedback. Upload/save never calls the model.
 * The request carries the student's own words and a photo count — never image bytes.
 */

export const SBA_FEEDBACK_MODE = 'sba' as const

export const SBA_FEEDBACK_BODY_KEYS = ['mode', 'locale', 'text', 'photoCount', 'step'] as const

export type SbaFeedbackMaterial = {
  hasMaterial: boolean
  /** Student notes only, capped to the API text limit. */
  text: string
  photoCount: number
}

export type SbaFeedbackRequestBody = {
  mode: typeof SBA_FEEDBACK_MODE
  locale: string
  text: string
  photoCount: number
  step: string
}

const TEXT_LIMIT = 2000
const PHOTO_LIMIT = 24
const STEP_LIMIT = 80

function clampPhotoCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(PHOTO_LIMIT, Math.floor(value))
}

/** Notes and/or a photo count are enough to comment on. Image files are ignored. */
export function sbaFeedbackMaterial(input: {
  note: string
  savedNotes: Array<string | null | undefined>
  photoCount: number
}): SbaFeedbackMaterial {
  const seen = new Set<string>()
  const notes: string[] = []
  for (const raw of [input.note, ...input.savedNotes]) {
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    notes.push(trimmed)
  }
  const text = notes.join('\n\n').slice(0, TEXT_LIMIT)
  const photoCount = clampPhotoCount(input.photoCount)
  return {
    hasMaterial: text.length > 0 || photoCount > 0,
    text,
    photoCount,
  }
}

/**
 * The model runs only after a deliberate 18+ confirm, and only when there is
 * something to comment on. Upload, save, and merely opening the button do not qualify.
 */
export function sbaAiCallAllowed(input: {
  manualConfirm: boolean
  canUseAi: boolean
  hasMaterial: boolean
}): boolean {
  return input.manualConfirm === true && input.canUseAi === true && input.hasMaterial === true
}

const MARK_FIELDS = ['score', 'grade', 'level', 'mark', 'marks', 'band', 'rubric'] as const

/** True only for a formative comment payload: text plus `ai_marks: false`, and no score fields. */
export function sbaFeedbackPayloadIsFormative(
  data: Record<string, unknown>,
): data is Record<string, unknown> & { feedback: string; ai_marks: false } {
  if (data.ai_marks !== false) return false
  if (typeof data.feedback !== 'string' || !data.feedback.trim()) return false
  for (const key of MARK_FIELDS) {
    if (data[key] != null && data[key] !== '') return false
  }
  return true
}

/** JSON body for `/api/feedback`: mode, locale, the student's words, a photo count, and the step label. */
export function sbaFeedbackRequestBody(input: {
  locale: string
  text: string
  photoCount: number
  step: string
}): SbaFeedbackRequestBody {
  return {
    mode: SBA_FEEDBACK_MODE,
    locale: input.locale,
    text: input.text.slice(0, TEXT_LIMIT),
    photoCount: clampPhotoCount(input.photoCount),
    step: input.step.replace(/[\r\n]+/g, ' ').trim().slice(0, STEP_LIMIT),
  }
}
