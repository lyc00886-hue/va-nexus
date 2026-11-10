import { useSyncExternalStore } from 'react'
import { SCHOOL_SCORE_SLOT } from './schoolScore'
import {
  SCHOOL_SCORE_LATER_KEY,
  draftFromFile,
  emptyLaterStore,
  isLaterUploadFile,
  laterFeed,
  sanitizeLaterStore,
  withAdjustBand,
  withCommitted,
  type LaterDraft,
  type LaterStore,
} from './schoolScoreLater'
import type { PracticeBandId } from './teacherDraftBand'
import { getDualRadarStore, saveDualAxis } from './useSchoolScoreDual'
import { saveTeacherDraft } from './useTeacherDraftStore'

export type LaterSnapshot = LaterStore & {
  previewUrl: string | null
}

function load(): LaterStore {
  if (typeof localStorage === 'undefined') return emptyLaterStore()
  try {
    const raw = localStorage.getItem(SCHOOL_SCORE_LATER_KEY)
    if (!raw) return emptyLaterStore()
    return sanitizeLaterStore(JSON.parse(raw))
  } catch {
    return emptyLaterStore()
  }
}

let snapshot: LaterSnapshot = { ...load(), previewUrl: null }
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      SCHOOL_SCORE_LATER_KEY,
      JSON.stringify({ version: 1, draft: snapshot.draft }),
    )
  } catch {
    /* quota, private mode, or storage disabled */
  }
}

function publish(draft: LaterDraft | null, previewUrl: string | null = snapshot.previewUrl) {
  snapshot = { draft, previewUrl }
  persist()
  listeners.forEach((listener) => listener())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== SCHOOL_SCORE_LATER_KEY) return
    try {
      const next = event.newValue ? sanitizeLaterStore(JSON.parse(event.newValue)) : emptyLaterStore()
      snapshot = { draft: next.draft, previewUrl: snapshot.previewUrl }
    } catch {
      snapshot = { draft: null, previewUrl: snapshot.previewUrl }
    }
    listeners.forEach((listener) => listener())
  })
}

export function getSchoolScoreLater(): LaterSnapshot {
  return snapshot
}

export function acceptLaterFile(file: File): boolean {
  if (!isLaterUploadFile(file)) return false
  const nextUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null
  const prevUrl = snapshot.previewUrl
  snapshot = { ...snapshot, previewUrl: nextUrl }
  if (prevUrl && prevUrl !== nextUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(prevUrl)
  }
  publish(draftFromFile(file.name, file.size, file.type), nextUrl)
  return true
}

export function setLaterAdjust(band: PracticeBandId | null) {
  const draft = snapshot.draft
  if (!draft) return
  const next = withAdjustBand(draft, band)
  if (next === draft) return
  publish(next)
}

export function keepLaterAi() {
  setLaterAdjust(null)
}

/** Writes the effective band into the school-score slot and fills empty dual-radar axes. */
export function writeLaterAdjust() {
  const draft = snapshot.draft
  if (!draft) return
  const plan = laterFeed(draft, getDualRadarStore())
  saveTeacherDraft(SCHOOL_SCORE_SLOT, plan.band)
  for (const id of plan.axes) saveDualAxis(id, plan.formative)
  const next = withCommitted(draft)
  if (next === draft) return
  publish(next)
}

export function useSchoolScoreLater(): LaterSnapshot {
  return useSyncExternalStore(subscribe, getSchoolScoreLater, getSchoolScoreLater)
}
