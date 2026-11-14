/**
 * Classes a teacher is responsible for, stored on this device.
 * The sample class is a label only. Opening one reveals the existing
 * in-school overview; this list does not keep a second roster.
 */
import { useSyncExternalStore } from 'react'
import { portfolioKey, PORTFOLIO_LABEL_MAX } from './teacherDraftBand.ts'

export const CLASS_LIST_KEY = 'va-nexus:class-list:v1'
export const DEMO_CLASS_ID = 'demo-f4'

export type StaffClass = {
  id: string
  name: string
  demo: boolean
}

export type ClassListStore = {
  classes: StaffClass[]
}

export function emptyClassList(): ClassListStore {
  return { classes: [] }
}

export function demoClassList(): ClassListStore {
  return { classes: [{ id: DEMO_CLASS_ID, name: '', demo: true }] }
}

export function sanitizeClassList(raw: unknown): ClassListStore {
  if (!raw || typeof raw !== 'object') return emptyClassList()
  const record = raw as { version?: unknown; classes?: unknown }
  if ('version' in record && record.version !== 1) return emptyClassList()
  if (!Array.isArray(record.classes)) return emptyClassList()
  const classes: StaffClass[] = []
  const seen = new Set<string>()
  let demoKept = false
  for (const row of record.classes) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id || seen.has(id)) continue
    if (item.demo === true) {
      if (demoKept) continue
      demoKept = true
      seen.add(id)
      classes.push({ id, name: '', demo: true })
      continue
    }
    const name = typeof item.name === 'string' ? portfolioKey(item.name) : ''
    if (!name) continue
    seen.add(id)
    classes.push({ id, name: name.slice(0, PORTFOLIO_LABEL_MAX), demo: false })
  }
  return { classes }
}

export function withAddedClass(store: ClassListStore, name: string): ClassListStore {
  const key = portfolioKey(name)
  if (!key) return store
  if (store.classes.some((row) => !row.demo && portfolioKey(row.name) === key)) return store
  const id = `class-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    classes: [...store.classes, { id, name: key.slice(0, PORTFOLIO_LABEL_MAX), demo: false }],
  }
}

function loadClassList(): ClassListStore {
  if (typeof localStorage === 'undefined') return demoClassList()
  try {
    const raw = localStorage.getItem(CLASS_LIST_KEY)
    if (!raw) return demoClassList()
    return sanitizeClassList(JSON.parse(raw))
  } catch {
    return demoClassList()
  }
}

let snapshot: ClassListStore = loadClassList()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CLASS_LIST_KEY, JSON.stringify({ version: 1, classes: snapshot.classes }))
  } catch {
    /* quota or private mode */
  }
}

function publish(next: ClassListStore) {
  snapshot = next
  persist()
  listeners.forEach((listener) => listener())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function readClasses(): StaffClass[] {
  return snapshot.classes
}

export function useClassList(): StaffClass[] {
  return useSyncExternalStore(subscribe, readClasses, readClasses)
}

export function addStaffClass(name: string): boolean {
  const next = withAddedClass(snapshot, name)
  if (next === snapshot) return false
  publish(next)
  return true
}
