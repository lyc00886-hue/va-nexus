/**
 * Which learning-map accordion sections are open.
 * Separate from portfolio sections, track choice, and lesson progress.
 * Missing ids stay collapsed so a first visit shows only the headers.
 */
export const LEARNING_MAP_SECTIONS_KEY = 'va-nexus:learning-map-sections:v1'

export const LESSON_FOLD_IDS = ['goal', 'steps', 'practice'] as const

export type LessonFoldId = (typeof LESSON_FOLD_IDS)[number]

export type LessonFoldOpen = Record<LessonFoldId, boolean>

export type LearningMapSections = {
  /** Grade / unit cards. Absent or false = collapsed. */
  units: Record<string, boolean>
  /** Lesson rows inside a unit. Absent or false = collapsed. */
  lessons: Record<string, boolean>
  /** Goal / Steps / Practice inside an open lesson. */
  folds: LessonFoldOpen
}

export const DEFAULT_LESSON_FOLDS: LessonFoldOpen = {
  goal: false,
  steps: false,
  practice: false,
}

export type LearningMapSectionStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function storageOr(storage?: LearningMapSectionStorage): LearningMapSectionStorage {
  return storage ?? localStorage
}

function emptySections(): LearningMapSections {
  return { units: {}, lessons: {}, folds: { ...DEFAULT_LESSON_FOLDS } }
}

function boolRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, boolean> = {}
  for (const [key, flag] of Object.entries(value as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    if (typeof flag === 'boolean' && key.length > 0 && key.length < 120) out[key] = flag
  }
  return out
}

export function sectionOpen(map: Record<string, boolean>, id: string): boolean {
  return map[id] === true
}

export function loadLearningMapSections(storage?: LearningMapSectionStorage): LearningMapSections {
  try {
    const raw = storageOr(storage).getItem(LEARNING_MAP_SECTIONS_KEY)
    if (!raw) return emptySections()
    const parsed = JSON.parse(raw) as Partial<LearningMapSections>
    const folds = { ...DEFAULT_LESSON_FOLDS }
    const incoming = parsed.folds
    if (incoming && typeof incoming === 'object') {
      for (const id of LESSON_FOLD_IDS) {
        const flag = (incoming as Partial<LessonFoldOpen>)[id]
        if (typeof flag === 'boolean') folds[id] = flag
      }
    }
    return {
      units: boolRecord(parsed.units),
      lessons: boolRecord(parsed.lessons),
      folds,
    }
  } catch {
    return emptySections()
  }
}

export function saveLearningMapSections(state: LearningMapSections, storage?: LearningMapSectionStorage): void {
  try {
    storageOr(storage).setItem(LEARNING_MAP_SECTIONS_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}
