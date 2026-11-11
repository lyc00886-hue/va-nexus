import { useMemo, useSyncExternalStore } from 'react'
import { useInspectClassStore } from './inspectClass'
import { useTeacherDraftStore } from './useTeacherDraftStore'
import {
  bindCropAskStudent,
  emptyCropAskStore,
  sanitizeCropAskStore,
  withCropAskAnalysis,
  withCropAskCancel,
  withCropAskCleared,
  withCropAskConfirmed,
  withCropAskCrop,
  withCropAskFailure,
  withCropAskGenerating,
  withCropAskImage,
  withCropAskOpen,
  withCropAskUnconfirmed,
  withTeacherSections,
  CROP_ASK_KEY,
  type CropAskBackgroundStatus,
  type CropAskMeta,
  type CropAskPhase,
  type CropAskSections,
  type CropAskStore,
  type CropRect,
} from './cropAsk'

function load(): CropAskStore {
  if (typeof localStorage === 'undefined') return emptyCropAskStore()
  try {
    const raw = localStorage.getItem(CROP_ASK_KEY)
    if (!raw) return emptyCropAskStore()
    return sanitizeCropAskStore(JSON.parse(raw))
  } catch {
    return emptyCropAskStore()
  }
}

let snapshot: CropAskStore = load()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CROP_ASK_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota, private mode, or storage disabled */
  }
}

function publish(next: CropAskStore) {
  if (next === snapshot) return
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
    if (event.key !== CROP_ASK_KEY) return
    try {
      snapshot = event.newValue ? sanitizeCropAskStore(JSON.parse(event.newValue)) : emptyCropAskStore()
    } catch {
      snapshot = emptyCropAskStore()
    }
    listeners.forEach((listener) => listener())
  })
}

export function getCropAskStore(): CropAskStore {
  return snapshot
}

export function setCropAskOpen(open: boolean) {
  publish(withCropAskOpen(snapshot, open))
}

export function saveCropAskImage(meta: CropAskMeta, dataUrl: string, mode: 'replace' | 'keep') {
  publish(withCropAskImage(snapshot, meta, dataUrl, mode))
}

export function saveCropAskCrop(meta: CropAskMeta, crop: CropRect) {
  publish(withCropAskCrop(snapshot, meta, crop))
}

export function clearCropAskRegion(meta: CropAskMeta) {
  publish(withCropAskCleared(snapshot, meta))
}

export function markCropAskGenerating(meta: CropAskMeta) {
  publish(withCropAskGenerating(snapshot, meta))
}

export function cancelCropAskRequest(meta: CropAskMeta, resume: CropAskPhase) {
  publish(withCropAskCancel(snapshot, meta, resume))
}

export function commitCropAskAnalysis(
  meta: CropAskMeta,
  sections: CropAskSections,
  background: CropAskBackgroundStatus | null = null,
) {
  publish(withCropAskAnalysis(snapshot, meta, sections, background))
}

export function failCropAsk(meta: CropAskMeta, reason: 'failed' | 'unavailable', resume: CropAskPhase) {
  publish(withCropAskFailure(snapshot, meta, reason, resume))
}

export function saveCropAskTeacherEdit(id: string, sections: CropAskSections) {
  publish(withTeacherSections(snapshot, id, sections))
}

export function confirmCropAsk(id: string) {
  publish(withCropAskConfirmed(snapshot, id))
}

export function unconfirmCropAsk(id: string) {
  publish(withCropAskUnconfirmed(snapshot, id))
}

export function useCropAskStore(): CropAskStore {
  return useSyncExternalStore(subscribe, getCropAskStore, getCropAskStore)
}

export function useCropAskStudent() {
  const teacher = useTeacherDraftStore()
  const roster = useInspectClassStore()
  return useMemo(
    () =>
      bindCropAskStudent({
        activePortfolio: teacher.activePortfolio,
        students: roster.students,
      }),
    [teacher.activePortfolio, roster.students],
  )
}
