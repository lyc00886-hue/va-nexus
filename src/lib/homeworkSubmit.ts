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
import { DEMO_ASSIGN_ID, F5_DEMO_ASSIGN_ID } from './assignList.ts'
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

/**
 * Teacher mark for one submitted file.
 * The automatic sentence is in-school reference copy and follows the two official files.
 * A confirmed mark is the class shell record for this class.
 * This browser keeps a copy so the shell can open again. The confirmed sentence
 * is also written on the existing class invite route.
 */
export const HW_MARK_KEY = 'va-nexus:hw-teacher-marks:v1'
const MARK_LIMIT = 240

export type HwTeacherMark = {
  id: string
  mark: string
  classId?: string
}

export type FileFollowKind = 'f4' | 'f5'

/** Official Form 4 and Form 5 demo files. Other assignments stay on the older fixed sentence. */
export function fileFollowKind(assignmentId: string): FileFollowKind | null {
  if (assignmentId === DEMO_ASSIGN_ID) return 'f4'
  if (assignmentId === F5_DEMO_ASSIGN_ID) return 'f5'
  return null
}

export function preferredHomework<T extends { id: string; studentId: string; assignmentId: string }>(
  submissions: readonly T[],
  studentId: string,
): T | null {
  const id = studentId.trim()
  if (id === '') return null
  const mine = submissions.filter((row) => row.studentId === id)
  if (mine.length === 0) return null
  return mine.find((row) => row.assignmentId === DEMO_ASSIGN_ID) ?? mine[0]
}

export function sanitizeTeacherMarks(raw: unknown): HwTeacherMark[] {
  if (!raw || typeof raw !== 'object') return []
  const record = raw as { version?: unknown; marks?: unknown }
  if ('version' in record && record.version !== 1) return []
  if (!Array.isArray(record.marks)) return []
  const marks: HwTeacherMark[] = []
  const seen = new Set<string>()
  for (const row of record.marks) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id.trim().slice(0, 120) : ''
    const mark = typeof item.mark === 'string' ? [...item.mark.trim()].slice(0, MARK_LIMIT).join('') : ''
    const classId = typeof item.classId === 'string' ? item.classId.trim().slice(0, 80) : ''
    if (!id || !mark || seen.has(id)) continue
    seen.add(id)
    marks.push(classId ? { id, mark, classId } : { id, mark })
  }
  return marks
}

export function withTeacherMark(
  marks: readonly HwTeacherMark[],
  id: string,
  mark: string,
  classId = '',
): readonly HwTeacherMark[] {
  const cleanId = id.trim().slice(0, 120)
  const clean = [...mark.trim()].slice(0, MARK_LIMIT).join('')
  if (!cleanId || !clean) return marks
  const cleanClass = classId.trim().slice(0, 80)
  const next = marks.filter((row) => row.id !== cleanId)
  const row: HwTeacherMark = cleanClass ? { id: cleanId, mark: clean, classId: cleanClass } : { id: cleanId, mark: clean }
  next.push(row)
  return next
}

/** Local class rows win. Remote rows fill a submission this shell does not have yet. */
export function mergeClassShellMarks(
  local: readonly HwTeacherMark[],
  remote: readonly HwTeacherMark[],
  classId: string,
): HwTeacherMark[] {
  const scope = classId.trim()
  const others = local.filter((row) => row.classId !== scope)
  const mine = new Map(local.filter((row) => row.classId === scope).map((row) => [row.id, row]))
  for (const row of remote) {
    if (row.classId !== scope || mine.has(row.id)) continue
    mine.set(row.id, row)
  }
  return [...others, ...mine.values()]
}

export function teacherMarkForSubmission(marks: readonly HwTeacherMark[], id: string): string | null {
  return marks.find((row) => row.id === id)?.mark ?? null
}

/** Confirmed mark for the nearby-insight file when that file exists, otherwise the first file. */
export function inSchoolMarkForStudent(
  marks: readonly HwTeacherMark[],
  submissions: readonly { id: string; studentId: string; assignmentId: string }[],
  studentId: string,
): string | null {
  const preferred = preferredHomework(submissions, studentId)
  if (!preferred) return null
  return teacherMarkForSubmission(marks, preferred.id)
}

export function adoptClassShellMarks(incoming: readonly HwTeacherMark[], classId: string): void {
  const next = mergeClassShellMarks(markSnapshot, incoming, classId)
  if (next.length === markSnapshot.length && next.every((row, index) => row === markSnapshot[index])) return
  publishMarks(next)
}

function loadMarks(): HwTeacherMark[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(HW_MARK_KEY)
    if (!raw) return []
    return sanitizeTeacherMarks(JSON.parse(raw))
  } catch {
    return []
  }
}

let markSnapshot: readonly HwTeacherMark[] = loadMarks()
const markListeners = new Set<() => void>()

function persistMarks() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(HW_MARK_KEY, JSON.stringify({ version: 1, marks: markSnapshot }))
  } catch {
    /* quota or private mode */
  }
}

function publishMarks(next: readonly HwTeacherMark[]) {
  markSnapshot = next
  persistMarks()
  markListeners.forEach((listener) => listener())
}

function subscribeMarks(cb: () => void) {
  markListeners.add(cb)
  return () => markListeners.delete(cb)
}

function readMarks(): readonly HwTeacherMark[] {
  return markSnapshot
}

export function useHomeworkTeacherMarks(): readonly HwTeacherMark[] {
  return useSyncExternalStore(subscribeMarks, readMarks, readMarks)
}

export function confirmHomeworkTeacherMark(id: string, mark: string, classId = ''): boolean {
  const next = withTeacherMark(markSnapshot, id, mark, classId)
  if (next === markSnapshot) return false
  publishMarks(next)
  return true
}

/**
 * Teacher comment for one submitted file.
 * Editing or replacing the automatic comment stores the new sentence here.
 * The same report path reads it back. No API route is added.
 */
export const HW_COMMENT_KEY = 'va-nexus:hw-teacher-comments:v1'
const COMMENT_LIMIT = 400

export type HwTeacherComment = {
  id: string
  comment: string
}

export function sanitizeTeacherComments(raw: unknown): HwTeacherComment[] {
  if (!raw || typeof raw !== 'object') return []
  const record = raw as { version?: unknown; comments?: unknown }
  if ('version' in record && record.version !== 1) return []
  if (!Array.isArray(record.comments)) return []
  const comments: HwTeacherComment[] = []
  const seen = new Set<string>()
  for (const row of record.comments) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id.trim().slice(0, 120) : ''
    const comment = typeof item.comment === 'string' ? [...item.comment.trim()].slice(0, COMMENT_LIMIT).join('') : ''
    if (!id || !comment || seen.has(id)) continue
    seen.add(id)
    comments.push({ id, comment })
  }
  return comments
}

export function withTeacherComment(
  comments: readonly HwTeacherComment[],
  id: string,
  comment: string,
): readonly HwTeacherComment[] {
  const cleanId = id.trim().slice(0, 120)
  const clean = [...comment.trim()].slice(0, COMMENT_LIMIT).join('')
  if (!cleanId || !clean) return comments
  const next = comments.filter((row) => row.id !== cleanId)
  next.push({ id: cleanId, comment: clean })
  return next
}

export function teacherCommentForSubmission(comments: readonly HwTeacherComment[], id: string): string | null {
  return comments.find((row) => row.id === id)?.comment ?? null
}

/** Saved comment for the nearby-insight file when that file exists, otherwise the first file. */
export function inSchoolCommentForStudent(
  comments: readonly HwTeacherComment[],
  submissions: readonly { id: string; studentId: string; assignmentId: string }[],
  studentId: string,
): string | null {
  const id = studentId.trim()
  if (id === '') return null
  const mine = submissions.filter((row) => row.studentId === id)
  if (mine.length === 0) return null
  const preferred = mine.find((row) => row.assignmentId === DEMO_ASSIGN_ID) ?? mine[0]
  return teacherCommentForSubmission(comments, preferred.id)
}

function loadComments(): HwTeacherComment[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(HW_COMMENT_KEY)
    if (!raw) return []
    return sanitizeTeacherComments(JSON.parse(raw))
  } catch {
    return []
  }
}

let commentSnapshot: readonly HwTeacherComment[] = loadComments()
const commentListeners = new Set<() => void>()

function persistComments() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(HW_COMMENT_KEY, JSON.stringify({ version: 1, comments: commentSnapshot }))
  } catch {
    /* quota or private mode */
  }
}

function publishComments(next: readonly HwTeacherComment[]) {
  commentSnapshot = next
  persistComments()
  commentListeners.forEach((listener) => listener())
}

function subscribeComments(cb: () => void) {
  commentListeners.add(cb)
  return () => commentListeners.delete(cb)
}

function readComments(): readonly HwTeacherComment[] {
  return commentSnapshot
}

export function useHomeworkTeacherComments(): readonly HwTeacherComment[] {
  return useSyncExternalStore(subscribeComments, readComments, readComments)
}

export function saveHomeworkTeacherComment(id: string, comment: string): boolean {
  const next = withTeacherComment(commentSnapshot, id, comment)
  if (next === commentSnapshot) return false
  publishComments(next)
  return true
}
