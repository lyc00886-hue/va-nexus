/**
 * Homework a student hands in for one published assignment.
 * Rows stay on this device and are scoped to the class.
 * They are not written into the private portfolio or the owner-only evidence bucket.
 * That bucket's RLS lets an owner read their own objects, so a class teacher
 * cannot list or open another student's file there. This store is how the teacher
 * of this class sees who handed work in and opens a submitted file.
 * No API route is added.
 */
import { useSyncExternalStore } from 'react'
import { DEMO_ASSIGN_ID } from './assignList.ts'
import { DEMO_CLASS_ID } from './classList.ts'

export const HW_LIST_KEY = 'va-nexus:hw-submissions:v1'
export const HW_FILE_BYTES = 5 * 1024 * 1024
export const HW_ROSTER_IDS = ['demo-a', 'demo-b', 'demo-c'] as const
export const HW_LEARNER_ID = 'demo-c'

const SEEDED_DEMO = new Set<string>(['demo-a', 'demo-b'])

export type HwSubmission = {
  id: string
  classId: string
  assignmentId: string
  studentId: string
  fileName: string
  demo: boolean
}

export type HwStore = {
  submissions: HwSubmission[]
}

export type HwRow = {
  studentId: string
  status: 'submitted' | 'missing'
  submission: HwSubmission | null
}

export type HwCounts = {
  submitted: number
  missing: number
  total: number
}

export function emptyHomework(): HwStore {
  return { submissions: [] }
}

export function demoHomework(): HwStore {
  return {
    submissions: [
      {
        id: 'hw-demo-a',
        classId: DEMO_CLASS_ID,
        assignmentId: DEMO_ASSIGN_ID,
        studentId: 'demo-a',
        fileName: '',
        demo: true,
      },
      {
        id: 'hw-demo-b',
        classId: DEMO_CLASS_ID,
        assignmentId: DEMO_ASSIGN_ID,
        studentId: 'demo-b',
        fileName: '',
        demo: true,
      },
    ],
  }
}

export function homeworkRosterIds(classId: string, demoClass: boolean): readonly string[] {
  if (demoClass || classId === DEMO_CLASS_ID) return HW_ROSTER_IDS
  return []
}

export function homeworkSubmissionId(classId: string, assignmentId: string, studentId: string): string {
  if (
    classId === DEMO_CLASS_ID &&
    assignmentId === DEMO_ASSIGN_ID &&
    (studentId === 'demo-a' || studentId === 'demo-b' || studentId === 'demo-c')
  ) {
    return `hw-${studentId}`
  }
  return `hw-${classId}-${assignmentId}-${studentId}`
}

export function sanitizeHomework(raw: unknown): HwStore {
  if (!raw || typeof raw !== 'object') return emptyHomework()
  const record = raw as { version?: unknown; submissions?: unknown }
  if ('version' in record && record.version !== 1) return emptyHomework()
  if (!Array.isArray(record.submissions)) return emptyHomework()
  const submissions: HwSubmission[] = []
  const seen = new Set<string>()
  for (const row of record.submissions) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    if (item.demo === true) {
      const studentId = typeof item.studentId === 'string' ? item.studentId.trim() : ''
      if (!SEEDED_DEMO.has(studentId)) continue
      const id = `hw-${studentId}`
      if (seen.has(id)) continue
      seen.add(id)
      submissions.push({
        id,
        classId: DEMO_CLASS_ID,
        assignmentId: DEMO_ASSIGN_ID,
        studentId,
        fileName: '',
        demo: true,
      })
      continue
    }
    const classId = typeof item.classId === 'string' ? item.classId.trim() : ''
    const assignmentId = typeof item.assignmentId === 'string' ? item.assignmentId.trim() : ''
    const studentId = typeof item.studentId === 'string' ? item.studentId.trim() : ''
    const fileName = typeof item.fileName === 'string' ? item.fileName.trim().slice(0, 200) : ''
    if (!classId || !assignmentId || !studentId || !fileName) continue
    const id = homeworkSubmissionId(classId, assignmentId, studentId)
    if (seen.has(id)) continue
    seen.add(id)
    submissions.push({ id, classId, assignmentId, studentId, fileName, demo: false })
  }
  return { submissions }
}

export function withHomeworkSubmission(
  store: HwStore,
  input: { classId: string; assignmentId: string; studentId: string; fileName: string },
): HwStore {
  const classId = input.classId.trim()
  const assignmentId = input.assignmentId.trim()
  const studentId = input.studentId.trim()
  const fileName = input.fileName.trim().slice(0, 200)
  if (!classId || !assignmentId || !studentId || !fileName) return store
  const id = homeworkSubmissionId(classId, assignmentId, studentId)
  const next: HwSubmission = { id, classId, assignmentId, studentId, fileName, demo: false }
  const index = store.submissions.findIndex((row) => row.id === id)
  if (index < 0) return { submissions: [...store.submissions, next] }
  const submissions = store.submissions.slice()
  submissions[index] = next
  return { submissions }
}

export function homeworkForAssignment(store: HwStore, classId: string, assignmentId: string): HwSubmission[] {
  return store.submissions.filter((row) => row.classId === classId && row.assignmentId === assignmentId)
}

export function homeworkRows(store: HwStore, classId: string, assignmentId: string, roster: readonly string[]): HwRow[] {
  const found = new Map(homeworkForAssignment(store, classId, assignmentId).map((row) => [row.studentId, row]))
  return roster.map((studentId) => {
    const submission = found.get(studentId) ?? null
    return { studentId, status: submission ? 'submitted' : 'missing', submission }
  })
}

export function homeworkCounts(rows: readonly { status: HwRow['status'] }[]): HwCounts {
  const submitted = rows.filter((row) => row.status === 'submitted').length
  const total = rows.length
  return { submitted, missing: total - submitted, total }
}

/** Locked plate copy is 2 submitted and 1 missing out of 3. */
export function homeworkPlateMatch(counts: HwCounts): boolean {
  return counts.submitted === 2 && counts.missing === 1 && counts.total === 3
}

export function homeworkFileLabel(row: HwSubmission, generic: string): string {
  const name = row.fileName.trim()
  if (row.demo || name === '') return generic
  return name
}

export function homeworkFileError(file: { name: string; type: string; size: number }): 'type' | 'size' | null {
  const name = file.name.toLowerCase()
  const pdf = file.type === 'application/pdf' || name.endsWith('.pdf')
  const image = file.type.startsWith('image/')
  if (!pdf && !image) return 'type'
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > HW_FILE_BYTES) return 'size'
  return null
}

type SessionFile = { url: string; mime: string }
const sessionFiles = new Map<string, SessionFile>()

export function rememberHomeworkFile(id: string, file: File): void {
  const prev = sessionFiles.get(id)
  if (prev && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(prev.url)
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return
  sessionFiles.set(id, { url: URL.createObjectURL(file), mime: file.type || 'application/pdf' })
}

export function homeworkSessionFile(id: string): SessionFile | null {
  return sessionFiles.get(id) ?? null
}

function loadHomework(): HwStore {
  if (typeof localStorage === 'undefined') return demoHomework()
  try {
    const raw = localStorage.getItem(HW_LIST_KEY)
    if (!raw) return demoHomework()
    return sanitizeHomework(JSON.parse(raw))
  } catch {
    return demoHomework()
  }
}

let snapshot: HwStore = loadHomework()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(HW_LIST_KEY, JSON.stringify({ version: 1, submissions: snapshot.submissions }))
  } catch {
    /* quota or private mode */
  }
}

function publish(next: HwStore) {
  snapshot = next
  persist()
  listeners.forEach((listener) => listener())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function readSubmissions(): HwSubmission[] {
  return snapshot.submissions
}

export function useHomeworkSubmissions(): HwSubmission[] {
  return useSyncExternalStore(subscribe, readSubmissions, readSubmissions)
}

export function submitHomework(input: {
  classId: string
  assignmentId: string
  studentId: string
  fileName: string
}): boolean {
  const next = withHomeworkSubmission(snapshot, input)
  if (next === snapshot) return false
  publish(next)
  return true
}
