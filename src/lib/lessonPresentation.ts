import { useSyncExternalStore } from 'react'
import type { MessageKey } from '../i18n'
import { joinedClassMemberId } from './classInvite.ts'
import { HW_LEARNER_ID } from './homeworkSubmit.ts'

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

/** Per-student presentation override set by the teacher on this device. */
export const PRESENT_OVERRIDE_KEY = 'va-nexus:present-override:v1'

export type PresentOverride = {
  studentId: string
  mode: PresentationMode
}

export function presentationStudentId(): string {
  return joinedClassMemberId() ?? HW_LEARNER_ID
}

export function sanitizePresentationOverrides(raw: unknown): PresentOverride[] {
  if (!raw || typeof raw !== 'object') return []
  const record = raw as { version?: unknown; rows?: unknown }
  if ('version' in record && record.version !== 1) return []
  if (!Array.isArray(record.rows)) return []
  const rows: PresentOverride[] = []
  const seen = new Set<string>()
  for (const row of record.rows) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const studentId = typeof item.studentId === 'string' ? item.studentId.trim().slice(0, 80) : ''
    const mode = item.mode === 'easy' || item.mode === 'standard' ? item.mode : null
    if (!studentId || !mode || seen.has(studentId)) continue
    seen.add(studentId)
    rows.push({ studentId, mode })
  }
  return rows
}

export function withPresentationOverride(
  rows: readonly PresentOverride[],
  studentId: string,
  mode: PresentationMode,
): readonly PresentOverride[] {
  const id = studentId.trim().slice(0, 80)
  if (!id || (mode !== 'easy' && mode !== 'standard')) return rows
  if (rows.some((row) => row.studentId === id && row.mode === mode)) return rows
  const next = rows.filter((row) => row.studentId !== id)
  next.push({ studentId: id, mode })
  return next
}

export function presentationOverrideFor(rows: readonly PresentOverride[], studentId: string): PresentationMode | null {
  const id = studentId.trim()
  if (!id) return null
  return rows.find((row) => row.studentId === id)?.mode ?? null
}

/** Teacher override when one is stored; otherwise the presentation already chosen on this device. */
export function effectivePresentation(
  rows: readonly PresentOverride[],
  studentId: string,
  local: PresentationMode,
): PresentationMode {
  return presentationOverrideFor(rows, studentId) ?? local
}

function loadOverrides(): PresentOverride[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PRESENT_OVERRIDE_KEY)
    if (!raw) return []
    return sanitizePresentationOverrides(JSON.parse(raw))
  } catch {
    return []
  }
}

let overrideSnapshot: readonly PresentOverride[] = loadOverrides()
const overrideListeners = new Set<() => void>()

function persistOverrides() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PRESENT_OVERRIDE_KEY, JSON.stringify({ version: 1, rows: overrideSnapshot }))
  } catch {
    /* quota or private mode */
  }
}

function publishOverrides(next: readonly PresentOverride[]) {
  overrideSnapshot = next
  persistOverrides()
  overrideListeners.forEach((listener) => listener())
}

function subscribeOverrides(cb: () => void) {
  overrideListeners.add(cb)
  return () => overrideListeners.delete(cb)
}

function readOverrides(): readonly PresentOverride[] {
  return overrideSnapshot
}

export function usePresentationOverrides(): readonly PresentOverride[] {
  return useSyncExternalStore(subscribeOverrides, readOverrides, readOverrides)
}

export function setPresentationOverride(studentId: string, mode: PresentationMode): boolean {
  const next = withPresentationOverride(overrideSnapshot, studentId, mode)
  if (next === overrideSnapshot) return false
  publishOverrides(next)
  return true
}

export function useTeacherPresentation(): PresentationMode | null {
  return presentationOverrideFor(usePresentationOverrides(), presentationStudentId())
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
