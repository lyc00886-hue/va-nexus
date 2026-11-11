/**
 * In-school practice bank shared by the quest map and the classic map.
 * Multiple choice can be marked on this device. Long and process items
 * record submitted or not submitted. Nothing here calls a marker.
 */
import { useSyncExternalStore } from 'react'
import { requestOpenTab } from './openTab.ts'
import { portfolioKey } from './teacherDraftBand.ts'

export const INSPECT_PRACTICE_KEY = 'va-nexus:inspect-practice:v1'
export const INSPECT_OPEN_KEY = 'va-nexus:inspect-open'
export const INSPECT_OPEN_EVENT = 'va-nexus:inspect-open'

export const INSPECT_GRADES = ['f4', 'f5', 'f6'] as const
export type InspectGrade = (typeof INSPECT_GRADES)[number]

export const INSPECT_AXES = ['theme', 'research', 'media', 'process', 'reflect', 'visual'] as const
export type InspectAxis = (typeof INSPECT_AXES)[number]

export const INSPECT_GRADE_TOTAL = { f4: 15, f5: 15, f6: 14 } as const

const GRADE_SET = new Set<string>(INSPECT_GRADES)
const AXIS_SET = new Set<string>(INSPECT_AXES)

export type InspectItemType = 'mcq' | 'long' | 'sba-process'

export type InspectItem = {
  id: string
  type: InspectItemType
  unitId?: string
  axis?: InspectAxis
  title: string
  question: string
  options?: string[]
  answer?: number
  explain?: string
  hint?: string
}

export type InspectBank = {
  version: number
  id: string
  grade: InspectGrade
  label: string
  disclaimer: string
  items: InspectItem[]
}

export type InspectAttemptStatus = 'draft' | 'submitted'

export type InspectAttempt = {
  status: InspectAttemptStatus
  choice?: number
  text?: string
}

export type InspectPracticeStore = {
  byName: Record<string, Record<string, InspectAttempt>>
}

export type PracticeSummary = {
  submitted: number
  total: number
  submittedIds: string[]
  mcCorrect: number
  mcTotal: number
  writtenDone: number
  writtenTotal: number
}

export function isInspectGrade(value: unknown): value is InspectGrade {
  return typeof value === 'string' && GRADE_SET.has(value)
}

export function bankIdForGrade(grade: InspectGrade): string {
  return `inspect-${grade}`
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function parseItem(raw: unknown): InspectItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = text(row.id)
  const title = text(row.title)
  const question = text(row.question)
  if (!id || !title || !question) return null
  if (row.type !== 'mcq' && row.type !== 'long' && row.type !== 'sba-process') return null
  const item: InspectItem = { id, type: row.type, title, question }
  if (row.unitId != null) {
    const unitId = text(row.unitId)
    if (!unitId) return null
    item.unitId = unitId
  }
  if (row.type === 'sba-process') {
    if (typeof row.axis !== 'string' || !AXIS_SET.has(row.axis)) return null
    item.axis = row.axis as InspectAxis
    const hint = text(row.hint)
    if (!hint) return null
    item.hint = hint
  }
  if (row.type === 'long') {
    const hint = text(row.hint)
    if (!hint) return null
    item.hint = hint
  }
  if (row.type === 'mcq') {
    if (!Array.isArray(row.options) || row.options.length !== 4) return null
    const options = row.options.map((option) => text(option))
    if (options.some((option) => !option)) return null
    if (typeof row.answer !== 'number' || !Number.isInteger(row.answer) || row.answer < 0 || row.answer > 3) return null
    const explain = text(row.explain)
    if (!explain) return null
    item.options = options as string[]
    item.answer = row.answer
    item.explain = explain
  }
  return item
}

export function parseInspectBank(raw: unknown): InspectBank | null {
  if (!raw || typeof raw !== 'object') return null
  const file = raw as Record<string, unknown>
  if (file.version !== 1 || !isInspectGrade(file.grade)) return null
  const id = text(file.id)
  const label = text(file.label)
  const disclaimer = text(file.disclaimer)
  if (!id || !label || !disclaimer || !Array.isArray(file.items)) return null
  const items: InspectItem[] = []
  for (const row of file.items) {
    const item = parseItem(row)
    if (!item) return null
    items.push(item)
  }
  return { version: 1, id, grade: file.grade, label, disclaimer, items }
}

export function summarizePractice(bank: InspectBank | null, attempts: Record<string, InspectAttempt> | undefined): PracticeSummary {
  const empty: PracticeSummary = {
    submitted: 0,
    total: bank?.items.length ?? 0,
    submittedIds: [],
    mcCorrect: 0,
    mcTotal: 0,
    writtenDone: 0,
    writtenTotal: 0,
  }
  if (!bank) return empty
  for (const item of bank.items) {
    const attempt = attempts?.[item.id]
    const submitted = attempt?.status === 'submitted'
    if (item.type === 'mcq') {
      empty.mcTotal += 1
      if (submitted && typeof attempt?.choice === 'number') {
        empty.submitted += 1
        empty.submittedIds.push(item.id)
        if (attempt.choice === item.answer) empty.mcCorrect += 1
      }
    } else {
      empty.writtenTotal += 1
      if (submitted && typeof attempt?.text === 'string' && attempt.text.trim() !== '') {
        empty.submitted += 1
        empty.writtenDone += 1
        empty.submittedIds.push(item.id)
      }
    }
  }
  return empty
}

export function emptyInspectPracticeStore(): InspectPracticeStore {
  return { byName: {} }
}

function parseAttempt(raw: unknown): InspectAttempt | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (row.status !== 'draft' && row.status !== 'submitted') return null
  const attempt: InspectAttempt = { status: row.status }
  if (typeof row.choice === 'number' && Number.isInteger(row.choice) && row.choice >= 0 && row.choice <= 3) {
    attempt.choice = row.choice
  }
  if (typeof row.text === 'string') attempt.text = row.text.slice(0, 8000)
  return attempt
}

export function sanitizeInspectPracticeStore(raw: unknown): InspectPracticeStore {
  const empty = emptyInspectPracticeStore()
  if (!raw || typeof raw !== 'object') return empty
  const record = raw as { version?: unknown; byName?: unknown }
  if ('version' in record && record.version !== 1) return empty
  if (!record.byName || typeof record.byName !== 'object') return empty
  const byName: InspectPracticeStore['byName'] = {}
  for (const [rawName, bucket] of Object.entries(record.byName as Record<string, unknown>)) {
    const name = rawName === '' ? '' : portfolioKey(rawName)
    if (rawName !== '' && !name) continue
    if (!bucket || typeof bucket !== 'object') continue
    const attempts: Record<string, InspectAttempt> = {}
    for (const [itemId, value] of Object.entries(bucket as Record<string, unknown>)) {
      const id = itemId.trim()
      if (!id) continue
      const attempt = parseAttempt(value)
      if (attempt) attempts[id] = attempt
    }
    byName[name] = attempts
  }
  return { byName }
}

function writeAttempt(
  store: InspectPracticeStore,
  name: string,
  itemId: string,
  attempt: InspectAttempt,
  lockSubmitted: boolean,
): InspectPracticeStore {
  const key = name.trim() === '' ? '' : portfolioKey(name)
  if (name.trim() !== '' && !key) return store
  const bucket = store.byName[key] ?? {}
  if (lockSubmitted && bucket[itemId]?.status === 'submitted') return store
  if (bucket[itemId]?.status === attempt.status && bucket[itemId]?.choice === attempt.choice && bucket[itemId]?.text === attempt.text) {
    return store
  }
  return { byName: { ...store.byName, [key]: { ...bucket, [itemId]: attempt } } }
}

export function withMcqChoice(store: InspectPracticeStore, name: string, itemId: string, choice: number): InspectPracticeStore {
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return store
  const key = name.trim() === '' ? '' : portfolioKey(name)
  if (store.byName[key]?.[itemId]?.status === 'submitted') return store
  return writeAttempt(store, name, itemId, { status: 'draft', choice }, true)
}

export function withSubmittedMcq(store: InspectPracticeStore, name: string, itemId: string, choice: number): InspectPracticeStore {
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return store
  return writeAttempt(store, name, itemId, { status: 'submitted', choice }, true)
}

export function withDraftText(store: InspectPracticeStore, name: string, itemId: string, text: string): InspectPracticeStore {
  const key = name.trim() === '' ? '' : portfolioKey(name)
  const prev = store.byName[key]?.[itemId]
  if (prev?.status === 'submitted') return store
  return writeAttempt(store, name, itemId, { status: 'draft', text: text.slice(0, 8000) }, true)
}

export function withSubmittedText(store: InspectPracticeStore, name: string, itemId: string, text: string): InspectPracticeStore {
  const body = text.trim()
  if (!body) return store
  return writeAttempt(store, name, itemId, { status: 'submitted', text: text.slice(0, 8000) }, true)
}

export function attemptsFor(store: InspectPracticeStore, name: string): Record<string, InspectAttempt> {
  const key = name.trim() === '' ? '' : portfolioKey(name)
  return store.byName[key] ?? {}
}

function loadPractice(): InspectPracticeStore {
  if (typeof localStorage === 'undefined') return emptyInspectPracticeStore()
  try {
    const raw = localStorage.getItem(INSPECT_PRACTICE_KEY)
    if (!raw) return emptyInspectPracticeStore()
    return sanitizeInspectPracticeStore(JSON.parse(raw))
  } catch {
    return emptyInspectPracticeStore()
  }
}

let practiceSnapshot: InspectPracticeStore = loadPractice()
const practiceListeners = new Set<() => void>()

function persistPractice() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(INSPECT_PRACTICE_KEY, JSON.stringify({ version: 1, byName: practiceSnapshot.byName }))
  } catch {
    /* quota or private mode */
  }
}

function publishPractice(next: InspectPracticeStore) {
  practiceSnapshot = next
  persistPractice()
  practiceListeners.forEach((listener) => listener())
}

function subscribePractice(cb: () => void) {
  practiceListeners.add(cb)
  return () => practiceListeners.delete(cb)
}

export function getInspectPracticeStore(): InspectPracticeStore {
  return practiceSnapshot
}

export function useInspectPracticeStore(): InspectPracticeStore {
  return useSyncExternalStore(subscribePractice, getInspectPracticeStore, getInspectPracticeStore)
}

export function chooseInspectMcq(name: string, itemId: string, choice: number) {
  const next = withMcqChoice(practiceSnapshot, name, itemId, choice)
  if (next !== practiceSnapshot) publishPractice(next)
}

export function submitInspectMcq(name: string, itemId: string, choice: number) {
  const next = withSubmittedMcq(practiceSnapshot, name, itemId, choice)
  if (next !== practiceSnapshot) publishPractice(next)
}

export function saveInspectDraft(name: string, itemId: string, text: string) {
  const next = withDraftText(practiceSnapshot, name, itemId, text)
  if (next !== practiceSnapshot) publishPractice(next)
}

export function submitInspectText(name: string, itemId: string, text: string) {
  const next = withSubmittedText(practiceSnapshot, name, itemId, text)
  if (next !== practiceSnapshot) publishPractice(next)
}

export function peekInspectOpen(): InspectGrade | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(INSPECT_OPEN_KEY)
    return isInspectGrade(raw) ? raw : null
  } catch {
    return null
  }
}

/** Quest map and classic map both open this same practice group. */
export function requestOpenInspect(grade: InspectGrade) {
  try {
    sessionStorage.setItem(INSPECT_OPEN_KEY, grade)
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INSPECT_OPEN_EVENT, { detail: grade }))
  }
  requestOpenTab('practice')
}
