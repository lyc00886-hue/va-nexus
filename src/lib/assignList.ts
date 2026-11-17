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
export const F5_DEMO_ASSIGN_ID = 'demo-f5-heritage'

const OFFICIAL_DEMO_IDS = [DEMO_ASSIGN_ID, F5_DEMO_ASSIGN_ID] as const

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

function officialDemo(id: string, attach: AssignAttach = 'paper'): StaffAssignment {
  return {
    id,
    classId: DEMO_CLASS_ID,
    title: '',
    due: '',
    instructions: '',
    attach,
    demo: true,
  }
}

function isOfficialDemoId(id: string): boolean {
  return (OFFICIAL_DEMO_IDS as readonly string[]).includes(id)
}

export function demoAssignList(): AssignStore {
  return {
    assignments: OFFICIAL_DEMO_IDS.map((id) => officialDemo(id)),
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
  for (const row of record.assignments) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id || seen.has(id) || !isAttach(item.attach)) continue
    if (item.demo === true) {
      if (!isOfficialDemoId(id)) continue
      seen.add(id)
      assignments.push(officialDemo(id, item.attach))
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
  return { assignments: withOfficialDemos(assignments) }
}

/** Keep every official demo row. A saved list that only has the Form 4 sample still gains the Form 5 sample. */
function withOfficialDemos(assignments: StaffAssignment[]): StaffAssignment[] {
  const present = new Set(assignments.map((row) => row.id))
  const missing = OFFICIAL_DEMO_IDS.filter((id) => !present.has(id))
  if (missing.length === 0) return assignments
  const demos: StaffAssignment[] = []
  const rest: StaffAssignment[] = []
  for (const row of assignments) {
    if (row.demo && isOfficialDemoId(row.id)) demos.push(row)
    else rest.push(row)
  }
  const byId = new Map(demos.map((row) => [row.id, row]))
  for (const id of missing) byId.set(id, officialDemo(id))
  const ordered = OFFICIAL_DEMO_IDS.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })
  return [...ordered, ...rest]
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
export function visibleAssignment(
  row: StaffAssignment,
  demo: AssignmentCopy,
  f5demo?: AssignmentCopy,
): AssignmentCopy & { attach: AssignAttach } {
  if (row.demo && row.id === F5_DEMO_ASSIGN_ID && f5demo) {
    return { title: f5demo.title, due: f5demo.due, instructions: f5demo.instructions, attach: row.attach }
  }
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

export function publishStaffAssignment(input: PublishInput): string | null {
  const id = `assign-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const next = withPublishedAssignment(snapshot, input, id)
  if (next === snapshot) return null
  publish(next)
  return id
}
