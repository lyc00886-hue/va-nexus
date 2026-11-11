import { useSyncExternalStore } from 'react'
import { FORMATIVE_PAGE_BYTE_MAX, postFormativeComment } from './formativeAiComment'
import { SCHOOL_SCORE_SLOT } from './schoolScore'
import {
  SCHOOL_SCORE_LATER_KEY,
  applyAiFallback,
  applyModelComment,
  emptyLaterStore,
  isLaterUploadFile,
  laterFeed,
  sanitizeLaterStore,
  withAdjustBand,
  withCommitted,
  withUploadedFile,
  type LaterDraft,
  type LaterStore,
} from './schoolScoreLater'
import { supabase } from './supabase'
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

/** Same later-upload path for one page or several. Pages already stored stay unless replaced by name. */
export function acceptLaterFiles(files: readonly File[]): boolean {
  const accepted = files.filter((file) => isLaterUploadFile(file))
  if (accepted.length === 0) return false
  let draft = snapshot.draft
  for (const file of accepted) draft = withUploadedFile(draft, file.name, file.size, file.type)
  const last = accepted[accepted.length - 1]
  const nextUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(last) : null
  const prevUrl = snapshot.previewUrl
  if (prevUrl && prevUrl !== nextUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(prevUrl)
  }
  publish(draft, nextUrl)
  return true
}

export function acceptLaterFile(file: File): boolean {
  return acceptLaterFiles([file])
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

async function readAccessToken(): Promise<string | null> {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function readPreviewBytes(previewUrl: string | null): Promise<Uint8Array | null> {
  if (!previewUrl) return null
  try {
    const res = await fetch(previewUrl)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    return buf.byteLength > 0 && buf.byteLength <= FORMATIVE_PAGE_BYTE_MAX ? buf : null
  } catch {
    return null
  }
}

/**
 * Staff-only request. A missing model, a missing page, or a non-staff caller
 * leaves the school reference untouched and keeps the filename/size stub.
 */
export async function requestLaterComment(locale: string, staff: boolean): Promise<'idle' | 'model' | 'fallback'> {
  if (!staff) return 'idle'
  const draft = snapshot.draft
  if (!draft) return 'idle'
  const fileName = draft.fileName
  const fileSize = draft.fileSize
  const previewUrl = snapshot.previewUrl
  const [bytes, accessToken] = await Promise.all([readPreviewBytes(previewUrl), readAccessToken()])
  const result = await postFormativeComment({
    locale,
    fileName,
    mime: draft.mime,
    bytes,
    accessToken,
  })
  const current = snapshot.draft
  if (!current || current.fileName !== fileName || current.fileSize !== fileSize) return 'idle'
  const next = result.ok ? applyModelComment(current, result) : applyAiFallback(current)
  publish(next)
  return next.aiStatus === 'model' ? 'model' : 'fallback'
}

/** Writes the effective band into the school-score slot and fills empty dual-radar axes. */
export function writeLaterAdjust() {
  const draft = snapshot.draft
  if (!draft) return
  const plan = laterFeed(draft, getDualRadarStore())
  saveTeacherDraft(SCHOOL_SCORE_SLOT, plan.band)
  for (const id of plan.axes) saveDualAxis(id, plan.values?.[id] ?? plan.formative)
  const next = withCommitted(draft)
  if (next === draft) return
  publish(next)
}

export function useSchoolScoreLater(): LaterSnapshot {
  return useSyncExternalStore(subscribe, getSchoolScoreLater, getSchoolScoreLater)
}
