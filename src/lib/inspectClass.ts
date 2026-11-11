/**
 * Teacher class list for in-school practice.
 * Names stay on this device and use the same portfolio key as the teacher-draft band.
 */
import { useSyncExternalStore } from 'react'
import type { InspectGrade } from './inspectPractice.ts'
import { isInspectGrade } from './inspectPractice.ts'
import { portfolioKey, PORTFOLIO_LABEL_MAX } from './teacherDraftBand.ts'

export const INSPECT_CLASS_KEY = 'va-nexus:inspect-class:v1'

export const DEMO_IDS = ['a', 'b', 'c'] as const
export type InspectDemoId = (typeof DEMO_IDS)[number]

export type InspectStudent = {
  id: string
  name: string
  grade: InspectGrade | null
  manualAttention: boolean
  demoId: InspectDemoId | null
}

export type InspectClassStore = {
  students: InspectStudent[]
}

export type InspectStatus = {
  missing: boolean
  behind: boolean
  attention: boolean
  steady: boolean
}

export type DemoNames = Record<InspectDemoId, string>

const DEMO_SET = new Set<string>(DEMO_IDS)

export function emptyInspectClass(): InspectClassStore {
  return { students: [] }
}

export function demoInspectClass(): InspectClassStore {
  return {
    students: [
      { id: 'demo-a', name: '', grade: 'f4', manualAttention: false, demoId: 'a' },
      { id: 'demo-b', name: '', grade: 'f4', manualAttention: false, demoId: 'b' },
      { id: 'demo-c', name: '', grade: 'f4', manualAttention: false, demoId: 'c' },
    ],
  }
}

export function inspectDisplayName(student: InspectStudent, demoNames: DemoNames): string {
  if (student.demoId) return demoNames[student.demoId]
  return student.name
}

function isDemoId(value: unknown): value is InspectDemoId {
  return typeof value === 'string' && DEMO_SET.has(value)
}

export function sanitizeInspectClass(raw: unknown): InspectClassStore {
  if (!raw || typeof raw !== 'object') return emptyInspectClass()
  const record = raw as { version?: unknown; students?: unknown }
  if ('version' in record && record.version !== 1) return emptyInspectClass()
  if (!Array.isArray(record.students)) return emptyInspectClass()
  const students: InspectStudent[] = []
  const seen = new Set<string>()
  for (const row of record.students) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id || seen.has(id)) continue
    const demoId = item.demoId == null ? null : isDemoId(item.demoId) ? item.demoId : null
    if (item.demoId != null && !demoId) continue
    const name = typeof item.name === 'string' ? portfolioKey(item.name) : ''
    if (!name && !demoId) continue
    const grade = item.grade == null ? null : isInspectGrade(item.grade) ? item.grade : null
    if (item.grade != null && !grade) continue
    seen.add(id)
    students.push({
      id,
      name,
      grade,
      manualAttention: item.manualAttention === true,
      demoId,
    })
  }
  return { students }
}

export function withAddedStudent(store: InspectClassStore, name: string, grade: InspectGrade): InspectClassStore {
  const key = portfolioKey(name)
  if (!key || !isInspectGrade(grade)) return store
  if (store.students.some((student) => portfolioKey(student.name) === key)) return store
  const id = `inspect-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    students: [
      ...store.students,
      { id, name: key.slice(0, PORTFOLIO_LABEL_MAX), grade, manualAttention: false, demoId: null },
    ],
  }
}

export function withAttention(store: InspectClassStore, id: string, attention: boolean): InspectClassStore {
  const index = store.students.findIndex((student) => student.id === id)
  if (index < 0) return store
  if (store.students[index].manualAttention === attention) return store
  const students = store.students.slice()
  students[index] = { ...students[index], manualAttention: attention }
  return { students }
}

/**
 * Work-list flags. A student may carry more than one.
 * Missing: any in-school item for that grade is still unsubmitted.
 * Behind: submitted count is under half, or map units are still 0 while someone else has finished a unit.
 * Attention: the teacher marked it, or missing and behind together, or there is no confirmed band and no artwork or research record.
 */
export function statusForStudent(input: {
  grade: InspectGrade | null
  submitted: number
  total: number
  manualAttention: boolean
  completedUnitCount: number | null
  othersCompletedUnits: boolean
  hasArtwork: boolean
  hasResearch: boolean
  hasConfirmedBand: boolean
}): InspectStatus {
  const due = input.grade != null && input.total > 0
  const missing = due && input.submitted < input.total
  const behindByCount = due && input.submitted * 2 < input.total
  const behindByMap = input.completedUnitCount === 0 && input.othersCompletedUnits
  const behind = behindByCount || behindByMap
  const noRecord = !input.hasConfirmedBand && !input.hasArtwork && !input.hasResearch
  const attention = input.manualAttention || (missing && behind) || noRecord
  return {
    missing,
    behind,
    attention,
    steady: !missing && !behind && !attention,
  }
}

export function sortWorkList<T extends { status: InspectStatus }>(rows: readonly T[]): T[] {
  const rank = (status: InspectStatus) => (status.attention ? 0 : status.missing ? 1 : status.behind ? 2 : 3)
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rank(a.row.status) - rank(b.row.status) || a.index - b.index)
    .map((entry) => entry.row)
}

function loadClass(): InspectClassStore {
  if (typeof localStorage === 'undefined') return demoInspectClass()
  try {
    const raw = localStorage.getItem(INSPECT_CLASS_KEY)
    if (!raw) return demoInspectClass()
    return sanitizeInspectClass(JSON.parse(raw))
  } catch {
    return demoInspectClass()
  }
}

let classSnapshot: InspectClassStore = loadClass()
const classListeners = new Set<() => void>()

function persistClass() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(INSPECT_CLASS_KEY, JSON.stringify({ version: 1, students: classSnapshot.students }))
  } catch {
    /* quota or private mode */
  }
}

function publishClass(next: InspectClassStore) {
  classSnapshot = next
  persistClass()
  classListeners.forEach((listener) => listener())
}

function subscribeClass(cb: () => void) {
  classListeners.add(cb)
  return () => classListeners.delete(cb)
}

export function getInspectClassStore(): InspectClassStore {
  return classSnapshot
}

export function useInspectClassStore(): InspectClassStore {
  return useSyncExternalStore(subscribeClass, getInspectClassStore, getInspectClassStore)
}

export function addInspectStudent(name: string, grade: InspectGrade) {
  const next = withAddedStudent(classSnapshot, name, grade)
  if (next === classSnapshot) return false
  publishClass(next)
  return true
}

export function toggleInspectAttention(id: string) {
  const current = classSnapshot.students.find((student) => student.id === id)
  if (!current) return
  const next = withAttention(classSnapshot, id, !current.manualAttention)
  if (next !== classSnapshot) publishClass(next)
}
