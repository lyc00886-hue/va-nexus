import { useSyncExternalStore } from 'react'
import {
  emptyTeacherDraftStore,
  sanitizeTeacherDraftStore,
  TEACHER_DRAFT_BAND_KEY,
  withActivePortfolio,
  withClearedBand,
  withSavedBand,
  type PracticeBandId,
  type TeacherDraftStore,
} from './teacherDraftBand'

function load(): TeacherDraftStore {
  if (typeof localStorage === 'undefined') return emptyTeacherDraftStore()
  try {
    const raw = localStorage.getItem(TEACHER_DRAFT_BAND_KEY)
    if (!raw) return emptyTeacherDraftStore()
    return sanitizeTeacherDraftStore(JSON.parse(raw))
  } catch {
    return emptyTeacherDraftStore()
  }
}

let snapshot: TeacherDraftStore = load()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      TEACHER_DRAFT_BAND_KEY,
      JSON.stringify({ version: 1, activePortfolio: snapshot.activePortfolio, portfolios: snapshot.portfolios }),
    )
  } catch {
    /* quota, private mode, or storage disabled */
  }
}

function publish(next: TeacherDraftStore) {
  snapshot = next
  persist()
  listeners.forEach((listener) => listener())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== TEACHER_DRAFT_BAND_KEY) return
    try {
      snapshot = event.newValue ? sanitizeTeacherDraftStore(JSON.parse(event.newValue)) : emptyTeacherDraftStore()
    } catch {
      snapshot = emptyTeacherDraftStore()
    }
    listeners.forEach((listener) => listener())
  })
}

export function getTeacherDraftStore(): TeacherDraftStore {
  return snapshot
}

export function setActivePortfolio(portfolio: string) {
  const next = withActivePortfolio(snapshot, portfolio)
  if (next === snapshot) return
  publish(next)
}

export function saveTeacherDraft(portfolio: string, bandId: PracticeBandId) {
  const next = withSavedBand(snapshot, portfolio, bandId)
  if (next === snapshot) return
  publish(next)
}

export function clearTeacherDraft(portfolio: string) {
  const next = withClearedBand(snapshot, portfolio)
  if (next === snapshot) return
  publish(next)
}

export function useTeacherDraftStore(): TeacherDraftStore {
  return useSyncExternalStore(subscribe, getTeacherDraftStore, getTeacherDraftStore)
}
