import { useSyncExternalStore } from 'react'
import { FORMATIVE_PAGE_BYTE_MAX, postFormativeComment } from './formativeAiComment.ts'
import { SCHOOL_SCORE_SLOT } from './schoolScore.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  applyAiFallback,
  applyModelComment,
  emptyLaterStore,
  isLaterUploadFile,
  laterFeed,
  laterPageSide,
  sanitizeLaterStore,
  withAdjustBand,
  withCommitted,
  withUploadedFile,
  type LaterDraft,
  type LaterPageSide,
  type LaterStore,
} from './schoolScoreLater.ts'
import type { PracticeBandId } from './teacherDraftBand.ts'
import { getDualRadarStore, saveDualAxis } from './useSchoolScoreDual.ts'
import { saveTeacherDraft } from './useTeacherDraftStore.ts'

export type LaterPagePreview = {
  side: LaterPageSide
  fileName: string
  url: string
  mime: string
}

export type LaterSnapshot = LaterStore & {
  previewUrl: string | null
  pagePreviews: LaterPagePreview[]
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

let snapshot: LaterSnapshot = { ...load(), previewUrl: null, pagePreviews: [] }
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

function publish(
  draft: LaterDraft | null,
  previewUrl: string | null = snapshot.previewUrl,
  pagePreviews: LaterPagePreview[] = snapshot.pagePreviews,
) {
  snapshot = { draft, previewUrl, pagePreviews }
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
      snapshot = { draft: next.draft, previewUrl: snapshot.previewUrl, pagePreviews: snapshot.pagePreviews }
    } catch {
      snapshot = { draft: null, previewUrl: snapshot.previewUrl, pagePreviews: snapshot.pagePreviews }
    }
    listeners.forEach((listener) => listener())
  })
}

export function getSchoolScoreLater(): LaterSnapshot {
  return snapshot
}

function trimmedUploadName(name: string): string {
  return name.trim().slice(0, 180) || 'page'
}

/** Same later-upload path for one page or several. Pages already stored stay unless replaced by name. */
export function acceptLaterFiles(files: readonly File[]): boolean {
  const accepted = files.filter((file) => isLaterUploadFile(file))
  if (accepted.length === 0) return false
  let draft = snapshot.draft
  let previews = snapshot.pagePreviews.slice()
  for (const file of accepted) {
    draft = withUploadedFile(draft, file.name, file.size, file.type)
    const fileName = trimmedUploadName(file.name)
    const side = laterPageSide(fileName)
    if (!side || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') continue
    const url = URL.createObjectURL(file)
    const prev = previews.find((item) => item.side === side && item.fileName === fileName)
    if (prev && prev.url !== url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(prev.url)
    previews = previews.filter((item) => !(item.side === side && item.fileName === fileName))
    previews.push({ side, fileName, url, mime: file.type })
  }
  const last = accepted[accepted.length - 1]
  const nextUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(last) : null
  const prevUrl = snapshot.previewUrl
  if (prevUrl && prevUrl !== nextUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(prevUrl)
  }
  publish(draft, nextUrl, previews)
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
  try {
    const { supabase } = await import('./supabase')
    if (!supabase) return null
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

const COMMENT_BYTE_BUDGET = 3_200_000

let inflightKey: string | null = null

/**
 * Informal later request for the uploaded pages.
 * The student shell starts this after a valid upload. The staff button can start it too.
 * `staff` is accepted so that button can keep its call. It does not gate the request.
 * A second call for the same draft waits out the one already running.
 * A new upload uses a new draft and starts again.
 * A missing page or a model miss does not invent a visible band and does not write the school reference.
 */
export async function requestLaterComment(locale: string, staff = false): Promise<'idle' | 'model' | 'fallback'> {
  void staff
  const draft = snapshot.draft
  if (!draft) return 'idle'
  const fileName = draft.fileName
  const fileSize = draft.fileSize
  const key = `${fileName}\0${fileSize}`
  if (inflightKey === key) return 'idle'
  inflightKey = key
  try {
    return await runLaterComment(locale, fileName, fileSize)
  } finally {
    if (inflightKey === key) inflightKey = null
  }
}

async function runLaterComment(
  locale: string,
  fileName: string,
  fileSize: number,
): Promise<'idle' | 'model' | 'fallback'> {
  const draft = snapshot.draft
  if (!draft || draft.fileName !== fileName || draft.fileSize !== fileSize) return 'idle'
  const previewUrl = snapshot.previewUrl
  const previews = snapshot.pagePreviews
  const latest = new Map<LaterPageSide, (typeof draft.pages)[number]>()
  for (const page of draft.pages) latest.set(page.side, page)
  const [loaded, accessToken] = await Promise.all([
    Promise.all(
      [...latest.values()].map(async (page) => {
        const preview = previews.find((item) => item.side === page.side && item.fileName === page.fileName)
        const bytes = await readPreviewBytes(preview?.url ?? null)
        return { page, preview, bytes }
      }),
    ),
    readAccessToken(),
  ])
  const packed: { side: LaterPageSide; mime: string; bytes: Uint8Array }[] = []
  let total = 0
  for (const item of loaded) {
    if (!item.bytes || item.bytes.byteLength > FORMATIVE_PAGE_BYTE_MAX) continue
    if (total > 0 && total + item.bytes.byteLength > COMMENT_BYTE_BUDGET) continue
    packed.push({
      side: item.page.side,
      mime: item.page.mime || item.preview?.mime || '',
      bytes: item.bytes,
    })
    total += item.bytes.byteLength
  }
  const fallbackBytes = packed.length > 0 ? null : await readPreviewBytes(previewUrl)
  const pages =
    packed.length > 0
      ? packed
      : fallbackBytes
        ? [{ side: laterPageSide(fileName) ?? undefined, mime: draft.mime, bytes: fallbackBytes }]
        : []
  const result = await postFormativeComment({
    locale,
    fileName: 'page',
    mime: pages[0]?.mime ?? draft.mime,
    bytes: pages[0]?.bytes ?? null,
    pages,
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
  if (plan.band == null || plan.formative == null) return
  saveTeacherDraft(SCHOOL_SCORE_SLOT, plan.band)
  for (const id of plan.axes) saveDualAxis(id, plan.values?.[id] ?? plan.formative)
  const next = withCommitted(draft)
  if (next === draft) return
  publish(next)
}

export function useSchoolScoreLater(): LaterSnapshot {
  return useSyncExternalStore(subscribe, getSchoolScoreLater, getSchoolScoreLater)
}
