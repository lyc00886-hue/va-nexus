import { supabase } from './supabase'
import { randomId } from './deviceId'
import { t } from '../i18n'

export const SBA_BUCKET = 'sba-evidence'
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export type SbaEvidence = {
  id: string
  step: number
  note: string | null
  file_path: string | null
  /** Public URL (Supabase) or object URL (local fallback) */
  url: string | null
  created_at: string
  local?: boolean
}

type Row = {
  id: string
  device_id: string
  step: number
  file_path: string | null
  note: string | null
  created_at: string
}

function publicUrl(path: string | null): string | null {
  if (!path || !supabase) return null
  return supabase.storage.from(SBA_BUCKET).getPublicUrl(path).data.publicUrl
}

function toEvidence(r: Row): SbaEvidence {
  return {
    id: r.id,
    step: r.step,
    note: r.note,
    file_path: r.file_path,
    url: publicUrl(r.file_path),
    created_at: r.created_at,
  }
}

export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return t('sba.err.notImage', { name: file.name })
  if (file.size > MAX_FILE_BYTES) return t('sba.err.tooBig', { name: file.name })
  return null
}

export async function fetchEvidence(deviceId: string): Promise<SbaEvidence[]> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('sba_evidence')
    .select('id, device_id, step, file_path, note, created_at')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(toEvidence)
}

function extOf(file: File): string {
  const fromName = file.name.split('.').pop()
  if (fromName && fromName.length <= 5 && fromName !== file.name) return fromName.toLowerCase()
  return file.type.split('/')[1] || 'jpg'
}

/**
 * Upload photos (if any) + note for a step. One row per photo; the note is
 * attached to every photo row. With no photos, a single note-only row is inserted.
 */
export async function saveEvidence(
  deviceId: string,
  step: number,
  files: File[],
  note: string,
): Promise<SbaEvidence[]> {
  if (!supabase) throw new Error('Supabase not configured')
  const trimmed = note.trim() || null
  const paths: (string | null)[] = []

  for (const file of files) {
    const path = `${deviceId}/step-${step}/${randomId()}.${extOf(file)}`
    const { error } = await supabase.storage
      .from(SBA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' })
    if (error) throw error
    paths.push(path)
  }
  if (paths.length === 0) paths.push(null)

  const rows = paths.map((file_path) => ({ device_id: deviceId, step, file_path, note: trimmed }))
  const { data, error } = await supabase
    .from('sba_evidence')
    .insert(rows)
    .select('id, device_id, step, file_path, note, created_at')
  if (error) throw error
  return (data as Row[]).map(toEvidence)
}

/* ---------- local / offline fallback ---------- */

const LOCAL_KEY = 'va-nexus:sba-local-notes'

type LocalNote = { id: string; step: number; note: string; created_at: string }

export function loadLocalNotes(): SbaEvidence[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const list = raw ? (JSON.parse(raw) as LocalNote[]) : []
    return list.map((n) => ({ ...n, file_path: null, url: null, local: true }))
  } catch {
    return []
  }
}

/** Local fallback: notes persist in localStorage, photos are session-only object URLs. */
export function saveLocal(step: number, files: File[], note: string): SbaEvidence[] {
  const now = new Date().toISOString()
  const trimmed = note.trim() || null
  const items: SbaEvidence[] = files.map((f) => ({
    id: randomId(),
    step,
    note: trimmed,
    file_path: f.name,
    url: URL.createObjectURL(f),
    created_at: now,
    local: true,
  }))
  if (items.length === 0 && trimmed) {
    items.push({ id: randomId(), step, note: trimmed, file_path: null, url: null, created_at: now, local: true })
  }
  if (trimmed) {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as LocalNote[]
      existing.push({ id: items[0].id, step, note: trimmed, created_at: now })
      localStorage.setItem(LOCAL_KEY, JSON.stringify(existing))
    } catch {
      /* storage full / disabled — keep in memory only */
    }
  }
  return items
}

/* ---------- private, signed-in storage (bucket `sba-private`, owner-only RLS) ---------- */

export const SBA_PRIVATE_BUCKET = 'sba-private'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

type PrivateRow = { id: string; user_id: string; step: number; file_path: string | null; note: string | null; created_at: string }
const PRIVATE_COLS = 'id, user_id, step, file_path, note, created_at'

async function withSignedUrls(rows: PrivateRow[]): Promise<SbaEvidence[]> {
  if (!supabase) throw new Error('Supabase not configured')
  const paths = rows.map((r) => r.file_path).filter((p): p is string => Boolean(p))
  const urls = new Map<string, string>()
  if (paths.length) {
    const { data, error } = await supabase.storage.from(SBA_PRIVATE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
    if (error) throw error
    for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl)
  }
  return rows.map((r) => ({
    id: r.id,
    step: r.step,
    note: r.note,
    file_path: r.file_path,
    url: r.file_path ? (urls.get(r.file_path) ?? null) : null,
    created_at: r.created_at,
  }))
}

export async function fetchPrivateEvidence(userId: string): Promise<SbaEvidence[]> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('sba_private_evidence')
    .select(PRIVATE_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return withSignedUrls(data as PrivateRow[])
}

/** Signed-in upload: objects live under `${userId}/step-N/…` in the private bucket. */
export async function savePrivateEvidence(
  userId: string,
  step: number,
  files: File[],
  note: string,
): Promise<SbaEvidence[]> {
  if (!supabase) throw new Error('Supabase not configured')
  const trimmed = note.trim() || null
  const paths: (string | null)[] = []
  for (const file of files) {
    const path = `${userId}/step-${step}/${randomId()}.${extOf(file)}`
    const { error } = await supabase.storage
      .from(SBA_PRIVATE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' })
    if (error) throw error
    paths.push(path)
  }
  if (paths.length === 0) paths.push(null)
  const rows = paths.map((file_path) => ({ user_id: userId, step, file_path, note: trimmed }))
  const { data, error } = await supabase.from('sba_private_evidence').insert(rows).select(PRIVATE_COLS)
  if (error) throw error
  return withSignedUrls(data as PrivateRow[])
}
