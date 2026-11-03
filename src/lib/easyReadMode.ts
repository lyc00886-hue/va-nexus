/**
 * Step-by-step / easy-read display preference.
 * Optional, off by default. Not a diagnosis and not a label.
 * Storage is `display.stepByStep` plus optional `teacherPreset` only.
 * SBA's 38 short screens are a later pass — this module does not store them.
 */

export const STEP_BY_STEP_STORAGE_KEY = 'display.stepByStep'
export const STEP_PLACE_KEY = 'display.stepByStep.place'
export const EASY_READ_FLAG = 'easyReadMode'
export const STEP_BY_STEP_ON_EVENT = 'display_step_by_step_on'

/** Primary control is these two choices. Assists are not part of this list. */
export const STEP_BY_STEP_CHOICES = ['standard', 'step'] as const
export type StepByStepChoice = (typeof STEP_BY_STEP_CHOICES)[number]

const BANNED_FIELDS = ['diagnosis', 'senLabel', 'disabilityCategory', 'medicalCode', 'sen', 'iq', 'spld'] as const

export type PriorSupports = { focusTunnel: boolean; easyRead: boolean }

export type StepByStepStored = {
  on: boolean
  teacherPreset: boolean
  /** True after the student flips the control, so a teacher preset cannot force it back on. */
  studentSet: boolean
  /** Soft preview. Classic pages stay unchanged until this is set. */
  preview: boolean
  priorSupports?: PriorSupports
}

export const STEP_BY_STEP_DEFAULT: StepByStepStored = {
  on: false,
  teacherPreset: false,
  studentSet: false,
  preview: false,
}

export type StepStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export type EasyReadQuery = 'stepByStep' | 'easyRead' | 'classic' | 'off' | null

export type EasyEmptyKind = 'offline' | 'no-lessons' | 'no-content' | 'next-lesson'

function searchParams(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q)
}

/** Known values only. `map1` and `steps` belong to other previews and are ignored here. */
export function easyReadQuery(search: string): EasyReadQuery {
  const raw = searchParams(search).get('ux')
  if (raw === 'stepByStep' || raw === 'easyRead' || raw === 'classic' || raw === 'off') return raw
  return null
}

export function effectiveStepByStep(stored: StepByStepStored): boolean {
  if (stored.studentSet) return stored.on
  return stored.on || stored.teacherPreset
}

export function applyEasyReadQuery(
  search: string,
  stored: StepByStepStored,
): { stored: StepByStepStored; restore: PriorSupports | null } {
  const query = easyReadQuery(search)
  if (query === 'stepByStep') {
    return { stored: { ...stored, preview: true, on: true, studentSet: true }, restore: null }
  }
  if (query === 'easyRead') return { stored: { ...stored, preview: true }, restore: null }
  if (query === 'classic' || query === 'off') {
    return {
      stored: { ...stored, preview: false, on: false, studentSet: true, priorSupports: undefined },
      restore: stored.priorSupports ?? null,
    }
  }
  return { stored, restore: null }
}

function parsePrior(value: unknown): PriorSupports | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  if (typeof row.focusTunnel !== 'boolean' || typeof row.easyRead !== 'boolean') return undefined
  return { focusTunnel: row.focusTunnel, easyRead: row.easyRead }
}

export function loadStepByStep(storage: StepStorage): StepByStepStored {
  try {
    const raw = storage.getItem(STEP_BY_STEP_STORAGE_KEY)
    if (!raw) return { ...STEP_BY_STEP_DEFAULT }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const key of Object.keys(parsed)) {
      if (key.startsWith('sen_') || (BANNED_FIELDS as readonly string[]).includes(key)) delete parsed[key]
    }
    return {
      on: parsed.on === true,
      teacherPreset: parsed.teacherPreset === true,
      studentSet: parsed.studentSet === true,
      preview: parsed.preview === true,
      priorSupports: parsePrior(parsed.priorSupports),
    }
  } catch {
    return { ...STEP_BY_STEP_DEFAULT }
  }
}

export function saveStepByStep(storage: StepStorage, stored: StepByStepStored): void {
  const body: StepByStepStored = {
    on: stored.on,
    teacherPreset: stored.teacherPreset,
    studentSet: stored.studentSet,
    preview: stored.preview,
  }
  if (stored.priorSupports) body.priorSupports = { ...stored.priorSupports }
  storage.setItem(STEP_BY_STEP_STORAGE_KEY, JSON.stringify(body))
}

export function stepByStepAnalytics(on: boolean): { name: typeof STEP_BY_STEP_ON_EVENT; flag: typeof EASY_READ_FLAG } | null {
  if (!on) return null
  return { name: STEP_BY_STEP_ON_EVENT, flag: EASY_READ_FLAG }
}

/** Manual read-aloud is available when step-by-step, reading help, or focus is on. */
export function manualListenVisible(input: { step: boolean; literacy: boolean; focus: boolean }): boolean {
  return input.step || input.literacy || input.focus
}

export function pickEasyEmpty(input: {
  offline: boolean
  hasDownload: boolean
  lessonCount: number
  stepCount?: number | null
  hasCurrent: boolean
}): EasyEmptyKind | null {
  if (input.offline && !input.hasDownload) return 'offline'
  if (input.lessonCount <= 0) return 'no-lessons'
  if (input.stepCount === 0) return 'no-content'
  if (!input.hasCurrent) return 'next-lesson'
  return null
}

export function showOfflineNote(offline: boolean, hasDownload: boolean): boolean {
  return offline && hasDownload
}

export function sentenceChunks(text: string): string[] {
  const parts: string[] = []
  for (const line of text.split(/\n+/)) {
    const bits = line.split(/([。！？.!?]+)/)
    let current = ''
    for (const bit of bits) {
      if (!bit) continue
      if (/^[。！？.!?]+$/.test(bit)) {
        current += bit
        const trimmed = current.trim()
        if (trimmed) parts.push(trimmed)
        current = ''
      } else {
        current += bit
      }
    }
    const rest = current.trim()
    if (rest) parts.push(rest)
  }
  return parts
}

/** Easy-read chunking uses the short lines. Otherwise the screen keeps the full card. */
export function readLines(card: { body: string; easy: readonly string[] }, chunk: boolean): string[] {
  if (!chunk) {
    const body = card.body.trim()
    return body ? [body] : []
  }
  const easy = card.easy.map((line) => line.trim()).filter(Boolean)
  if (easy.length) return easy
  return sentenceChunks(card.body).slice(0, 2)
}

export function readPlace(storage: StepStorage, lessonId: string): number {
  try {
    const raw = storage.getItem(STEP_PLACE_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const value = parsed[lessonId]
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

export function writePlace(storage: StepStorage, lessonId: string, index: number): void {
  const next: Record<string, number> = {}
  try {
    const raw = storage.getItem(STEP_PLACE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'number' && value >= 0) next[key] = Math.floor(value)
      }
    }
  } catch {
    /* replace a corrupt place map */
  }
  next[lessonId] = Math.max(0, Math.floor(index))
  storage.setItem(STEP_PLACE_KEY, JSON.stringify(next))
}

export function publishStepByStepOn(): void {
  const event = stepByStepAnalytics(true)
  if (!event || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(event.name, { detail: { flag: event.flag } }))
}
