import type { MessageKey } from '../i18n'

/** Student choice inside 閱讀設定. Separate from the existing 易讀 support toggle. */
export type PresentationMode = 'standard' | 'easy'

const STORAGE_KEY = 'va-nexus:lesson-presentation'

export function loadPresentation(): PresentationMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'easy' || raw === 'standard') return raw
  } catch {
    /* this device may block storage */
  }
  return 'standard'
}

export function savePresentation(mode: PresentationMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* this device may block storage */
  }
}

/** Official range for presentation and easier-reading sentence building. */
export function appreciationScope(lessonId: string): boolean {
  return /^F4-U3-L[1-4]$/.test(lessonId) || /^F5-U3-L[1-4]$/.test(lessonId)
}

const F5_COMPARE: MessageKey[] = ['kw.ink', 'kw.brush', 'kw.theme']
const F4_L2_COMPARE: MessageKey[] = ['kw.rain', 'kw.window', 'kw.env']
const F4_L2_BUILD: MessageKey[] = ['chip.feel', 'chip.surface', 'chip.form', 'chip.meaning', 'chip.value']

export const DIRECTION_KEYS: MessageKey[] = ['dir.feel', 'dir.surface', 'dir.form', 'dir.meaning', 'dir.value']

/** Keyword chips under an easier-reading comparison. Empty when this lesson has no official set. */
export function comparisonChipKeys(lessonId: string): MessageKey[] {
  if (/^F5-U3-L[1-4]$/.test(lessonId)) return F5_COMPARE
  if (lessonId === 'F4-U3-L2') return F4_L2_COMPARE
  return []
}

/** Pieces a student can tap while building an easier-reading appreciation. */
export function sentenceChipKeys(lessonId: string): MessageKey[] {
  if (lessonId === 'F4-U3-L2') return F4_L2_BUILD
  if (/^F5-U3-L[1-4]$/.test(lessonId)) return F5_COMPARE
  if (appreciationScope(lessonId)) return DIRECTION_KEYS
  return []
}

/** Short lines for easier-reading prompts. The source string is unchanged. */
export function easyPromptLines(text: string): string[] {
  const parts = text
    .split(/(?<=。)/)
    .map((line) => line.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [text]
}
