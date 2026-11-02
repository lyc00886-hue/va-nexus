import { supabase } from './supabase'
import { randomId } from './deviceId'

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
  if (!file.type.startsWith('image/')) return `「${file.name}」唔係圖片檔（只接受 image/*）`
  if (file.size > MAX_FILE_BYTES) return `「${file.name}」超過 5 MB`
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
