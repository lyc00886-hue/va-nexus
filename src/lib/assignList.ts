/**
 * Work a teacher publishes for one class, stored on this device.
 * The sample item is a label only. Its visible name, date, and note
 * come from assign.staff demo copy, not from a second roster.
 */
import { useSyncExternalStore } from 'react'
import { DEMO_CLASS_ID } from './classList.ts'
import { portfolioKey } from './teacherDraftBand.ts'

export const ASSIGN_LIST_KEY = 'va-nexus:assign-list:v1'
export const DEMO_ASSIGN_ID = 'demo-november'

export type AssignAttach = 'none' | 'paper'

export type StaffAssignment = {
  id: string
  classId: string
  title: string
  due: string
  instructions: string
  attach: AssignAttach
  demo: boolean
}

export type AssignStore = {
  assignments: StaffAssignment[]
}

export type PublishInput = {
  classId: string
  title: string
  due: string
  instructions: string
  attach: AssignAttach
}

export type AssignmentCopy = {
  title: string
  due: string
  instructions: string
}

export function emptyAssignList(): AssignStore {
  return { assignments: [] }
}

export function demoAssignList(): AssignStore {
  return {
    assignments: [
      {
        id: DEMO_ASSIGN_ID,
        classId: DEMO_CLASS_ID,
        title: '',
        due: '',
        instructions: '',
        attach: 'paper',
        demo: true,
      },
    ],
  }
}

function isAttach(value: unknown): value is AssignAttach {
  return value === 'none' || value === 'paper'
}

export function sanitizeAssignList(raw: unknown): AssignStore {
  if (!raw || typeof raw !== 'object') return emptyAssignList()
  const record = raw as { version?: unknown; assignments?: unknown }
  if ('version' in record && record.version !== 1) return emptyAssignList()
  if (!Array.isArray(record.assignments)) return emptyAssignList()
  const assignments: StaffAssignment[] = []
  const seen = new Set<string>()
  let demoKept = false
  for (const row of record.assignments) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id || seen.has(id) || !isAttach(item.attach)) continue
    if (item.demo === true) {
      if (demoKept) continue
      demoKept = true
      seen.add(id)
      assignments.push({
        id,
        classId: DEMO_CLASS_ID,
        title: '',
        due: '',
        instructions: '',
        attach: item.attach,
        demo: true,
      })
      continue
    }
    const classId = typeof item.classId === 'string' ? item.classId.trim() : ''
    const title = typeof item.title === 'string' ? portfolioKey(item.title) : ''
    const due = typeof item.due === 'string' ? portfolioKey(item.due) : ''
    const instructions = typeof item.instructions === 'string' ? portfolioKey(item.instructions) : ''
    if (!classId || !title || !due) continue
    seen.add(id)
    assignments.push({ id, classId, title, due, instructions, attach: item.attach, demo: false })
  }
  return { assignments }
}

export function withPublishedAssignment(store: AssignStore, input: PublishInput, id?: string): AssignStore {
  const classId = typeof input.classId === 'string' ? input.classId.trim() : ''
  const title = portfolioKey(typeof input.title === 'string' ? input.title : '')
  const due = portfolioKey(typeof input.due === 'string' ? input.due : '')
  const instructions = portfolioKey(typeof input.instructions === 'string' ? input.instructions : '')
  if (!classId || !title || !due || !isAttach(input.attach)) return store
  const nextId = (id ?? `assign-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`).trim()
  if (!nextId || store.assignments.some((row) => row.id === nextId)) return store
  return {
    assignments: [
      ...store.assignments,
      { id: nextId, classId, title, due, instructions, attach: input.attach, demo: false },
    ],
  }
}

export function assignmentsForClass(store: AssignStore, classId: string): StaffAssignment[] {
  return store.assignments.filter((row) => row.classId === classId)
}

/** Demo rows show the official sample copy. Published rows show what was stored. */
export function visibleAssignment(row: StaffAssignment, demo: AssignmentCopy): AssignmentCopy & { attach: AssignAttach } {
  if (row.demo) return { title: demo.title, due: demo.due, instructions: demo.instructions, attach: row.attach }
  return { title: row.title, due: row.due, instructions: row.instructions, attach: row.attach }
}

function loadAssignList(): AssignStore {
  if (typeof localStorage === 'undefined') return demoAssignList()
  try {
    const raw = localStorage.getItem(ASSIGN_LIST_KEY)
    if (!raw) return demoAssignList()
    return sanitizeAssignList(JSON.parse(raw))
  } catch {
    return demoAssignList()
  }
}

let snapshot: AssignStore = loadAssignList()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ASSIGN_LIST_KEY, JSON.stringify({ version: 1, assignments: snapshot.assignments }))
  } catch {
    /* quota or private mode */
  }
}

function publish(next: AssignStore) {
  snapshot = next
  persist()
  listeners.forEach((listener) => listener())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function readAssignments(): StaffAssignment[] {
  return snapshot.assignments
}

export function useAssignList(): StaffAssignment[] {
  return useSyncExternalStore(subscribe, readAssignments, readAssignments)
}

export function publishStaffAssignment(input: PublishInput): boolean {
  const next = withPublishedAssignment(snapshot, input)
  if (next === snapshot) return false
  publish(next)
  return true
}
