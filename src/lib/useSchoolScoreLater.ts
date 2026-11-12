import { useSyncExternalStore } from 'react'
import { postFormativeComment, type FormativeModelResult } from './formativeAiComment.ts'
import { SCHOOL_SCORE_SLOT } from './schoolScore.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  applyAiFallback,
  applyFileNotSent,
  applyModelComment,
  draftFromFile,
  emptyLaterStore,
  isLaterUploadFile,
  laterFeed,
  laterPageSide,
  laterPageSides,
  laterRequiredAxesComplete,
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
    return buf.byteLength > 0 ? buf : null
  } catch {
    return null
  }
}

let inflightKey: string | null = null

/** First ask, then further asks, until the present sides are complete or the call fails. */
export const LATER_AXIS_ATTEMPTS = 3

let laterAxisAttempts = LATER_AXIS_ATTEMPTS

/** Tests only. `null` restores the default attempt bound. */
export function setLaterAxisAttemptsForTests(max: number | null): void {
  laterAxisAttempts = max == null || max < 1 ? LATER_AXIS_ATTEMPTS : Math.floor(max)
}

type FormativeOk = Extract<FormativeModelResult, { ok: true }>

/** Keep axis numbers and artwork notes the model actually returned. Do not fill a gap from the overall score. */
function mergeReturnedAxes(prev: FormativeOk | null, next: FormativeOk): FormativeOk {
  if (!prev) return next
  return {
    ...next,
    axes: { ...prev.axes, ...next.axes },
    advice: { ...prev.advice, ...next.advice },
  }
}

function requestKey(draft: LaterDraft): string {
  const pages = draft.pages
    .map((page) => `${page.side}\u0000${page.fileName}\u0000${page.fileSize}`)
    .sort()
    .join('\n')
  return `${draft.fileName}\u0000${draft.fileSize}\u0000${pages}`
}

function revokeUrl(url: string | null | undefined) {
  if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  URL.revokeObjectURL(url)
}

function dropPreviews(name: string): LaterPagePreview[] {
  const kept: LaterPagePreview[] = []
  for (const preview of snapshot.pagePreviews) {
    if (preview.fileName === name) revokeUrl(preview.url)
    else kept.push(preview)
  }
  return kept
}

function draftFromRemaining(pages: LaterDraft['pages']): LaterDraft | null {
  if (pages.length === 0) return null
  const head = pages[pages.length - 1]
  const earlier = pages.slice(0, -1)
  const base = earlier.length
    ? { ...draftFromFile(earlier[0].fileName, earlier[0].fileSize, earlier[0].mime), pages: earlier }
    : null
  return withUploadedFile(base, head.fileName, head.fileSize, head.mime)
}

/** Take one later file off the list and clear unofficial results mixed with it. */
export function removeLaterFile(fileName: string): boolean {
  const draft = snapshot.draft
  if (!draft) return false
  const name = trimmedUploadName(fileName)
  if (!draft.pages.some((page) => page.fileName === name) && draft.fileName !== name) return false
  const pages = draft.pages.filter((page) => page.fileName !== name)
  const previews = dropPreviews(name)
  const next = draftFromRemaining(pages)
  if (!next) {
    for (const preview of previews) revokeUrl(preview.url)
    revokeUrl(snapshot.previewUrl)
    publish(null, null, [])
    return true
  }
  const previewUrl = previews.length > 0 ? previews[previews.length - 1].url : null
  if (snapshot.previewUrl && snapshot.previewUrl !== previewUrl) revokeUrl(snapshot.previewUrl)
  publish(next, previewUrl, previews)
  return true
}

/** Replace one later file, clear the old unofficial result, and leave a draft ready to request again. */
export function replaceLaterFile(fileName: string, file: File): boolean {
  if (!isLaterUploadFile(file)) return false
  const draft = snapshot.draft
  if (!draft) return false
  const name = trimmedUploadName(fileName)
  if (!draft.pages.some((page) => page.fileName === name) && draft.fileName !== name) return false
  const pages = draft.pages.filter((page) => page.fileName !== name)
  const base = pages.length
    ? { ...draftFromFile(pages[0].fileName, pages[0].fileSize, pages[0].mime), pages }
    : null
  const next = withUploadedFile(base, file.name, file.size, file.type)
  let previews = dropPreviews(name)
  const fileLabel = trimmedUploadName(file.name)
  const side = laterPageSide(fileLabel)
  let previewUrl = snapshot.previewUrl
  if (side && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(file)
    const prev = previews.find((item) => item.side === side && item.fileName === fileLabel)
    if (prev && prev.url !== url) revokeUrl(prev.url)
    previews = previews.filter((item) => !(item.side === side && item.fileName === fileLabel))
    previews.push({ side, fileName: fileLabel, url, mime: file.type })
    if (snapshot.previewUrl && snapshot.previewUrl !== url) revokeUrl(snapshot.previewUrl)
    previewUrl = url
  }
  publish(next, previewUrl, previews)
  return true
}

/** Clears the in-memory later snapshot. Tests only. */
export function resetSchoolScoreLaterForTests(): void {
  inflightKey = null
  laterAxisAttempts = LATER_AXIS_ATTEMPTS
  snapshot = { draft: null, previewUrl: null, pagePreviews: [] }
}

/**
 * Informal later request for the uploaded pages.
 * The student shell starts this after a valid upload. The staff button can start it too.
 * `staff` is accepted so that button can keep its call. It does not gate the request.
 * A second call for the same draft waits out the one already running.
 * A new upload uses a new draft and starts again.
 * When a present side comes back without every axis, this same call asks again
 * until those axes arrive, the attempt bound is reached, or the request fails.
 * The student does not have to replace the file or split it for that follow-up ask.
 * A missing axis is not filled from the overall score.
 * A missing page or a model miss does not invent a visible band and does not write the school reference.
 */
export async function requestLaterComment(
  locale: string,
  staff = false,
): Promise<'idle' | 'model' | 'fallback' | 'unsent'> {
  void staff
  const draft = snapshot.draft
  if (!draft) return 'idle'
  const key = requestKey(draft)
  if (inflightKey === key) return 'idle'
  inflightKey = key
  try {
    return await runLaterComment(locale, key)
  } finally {
    if (inflightKey === key) inflightKey = null
  }
}

async function runLaterComment(
  locale: string,
  key: string,
): Promise<'idle' | 'model' | 'fallback' | 'unsent'> {
  const draft = snapshot.draft
  if (!draft || requestKey(draft) !== key) return 'idle'
  const fileName = draft.fileName
  const previewUrl = snapshot.previewUrl
  const previews = snapshot.pagePreviews
  const selected = draft.pages.slice(0, 4)
  const [loaded, accessToken] = await Promise.all([
    Promise.all(
      selected.map(async (page) => {
        const preview = previews.find((item) => item.side === page.side && item.fileName === page.fileName)
        const bytes = await readPreviewBytes(preview?.url ?? null)
        return { page, preview, bytes }
      }),
    ),
    readAccessToken(),
  ])
  const packed: { side: LaterPageSide; sides: LaterPageSide[]; mime: string; bytes: Uint8Array; fileName: string }[] = []
  for (const item of loaded) {
    if (!item.bytes) continue
    const sides = laterPageSides(item.page.fileName)
    if (sides.length === 0) continue
    packed.push({
      side: sides.includes(item.page.side) ? item.page.side : sides[0],
      sides,
      mime: item.page.mime || item.preview?.mime || '',
      bytes: item.bytes,
      fileName: item.page.fileName,
    })
  }
  const sides = laterPageSides(fileName)
  const side = laterPageSide(fileName)
  const fallbackBytes = packed.length > 0 || !side ? null : await readPreviewBytes(previewUrl)
  const pages =
    packed.length > 0
      ? packed
      : fallbackBytes && side
        ? [{ side, sides, mime: draft.mime, bytes: fallbackBytes, fileName }]
        : []
  const currentBefore = snapshot.draft
  if (!currentBefore || requestKey(currentBefore) !== key) return 'idle'
  if (pages.length === 0) {
    if (!side) {
      publish(applyAiFallback(currentBefore))
      return 'fallback'
    }
    publish(applyFileNotSent(currentBefore))
    return 'unsent'
  }
  let carried: FormativeOk | null = null
  const attempts = laterAxisAttempts
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = snapshot.draft
    if (!current || requestKey(current) !== key) return 'idle'
    const result = await postFormativeComment({
      locale,
      fileName,
      mime: pages[0]?.mime ?? current.mime,
      bytes: pages[0]?.bytes ?? null,
      pages,
      accessToken,
    })
    const after = snapshot.draft
    if (!after || requestKey(after) !== key) return 'idle'
    if (!result.ok) {
      publish(result.reason === 'not_sent' ? applyFileNotSent(after) : applyAiFallback(after))
      return result.reason === 'not_sent' ? 'unsent' : 'fallback'
    }
    carried = mergeReturnedAxes(carried, result)
    const next = applyModelComment(after, carried)
    publish(next)
    if (next.aiStatus !== 'model') return 'fallback'
    if (laterRequiredAxesComplete(next)) return 'model'
  }
  return 'model'
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
