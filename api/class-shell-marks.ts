/**
 * Confirmed teacher marks for one class shell.
 * This is the same confirm path, stored with the class, not a second grading system.
 * Sentences only. No scores, no ranking, no public-exam levels.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FILE_STORE = join(tmpdir(), 'va-nexus-class-shell-marks-v1.json')
const CLASS_RE = /^[A-Za-z0-9-]{1,80}$/
const ID_LIMIT = 120
const MARK_LIMIT = 240
const CLASS_CAP = 400

export type ClassShellMark = { id: string; classId: string; mark: string }
export type ClassShellStore = { marks: ClassShellMark[] }
export type ClassShellResult = { ok: boolean; reason?: string; marks?: ClassShellMark[] }

export function emptyClassShellStore(): ClassShellStore {
  return { marks: [] }
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

function stripControls(value: string): string {
  let out = ''
  for (const char of value) {
    const point = char.codePointAt(0) ?? 0
    if (point >= 32 && point !== 127) out += char
  }
  return out
}

function cleanClassId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  return CLASS_RE.test(value) ? value : ''
}

function cleanOwner(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  return /^[A-Za-z0-9-]{8,80}$/.test(value) ? value : ''
}

function cleanId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = stripControls(raw).trim().slice(0, ID_LIMIT)
  return value
}

function cleanMark(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return [...stripControls(raw).trim()].slice(0, MARK_LIMIT).join('')
}

function copyMark(row: ClassShellMark): ClassShellMark {
  return { id: row.id, classId: row.classId, mark: row.mark }
}

export function applyClassShellMarks(
  store: ClassShellStore,
  action: string,
  payload: unknown,
): { store: ClassShellStore; result: ClassShellResult } {
  const body = asRecord(payload) ?? {}
  const classId = cleanClassId(body.classId)
  const ownerId = cleanOwner(body.ownerId)
  if (!classId || !ownerId) return { store, result: { ok: false, reason: 'invalid' } }
  const marks = store.marks.map(copyMark)

  if (action === 'list') {
    return { store, result: { ok: true, marks: marks.filter((row) => row.classId === classId).map(copyMark) } }
  }

  if (action === 'confirm') {
    const id = cleanId(body.id)
    const mark = cleanMark(body.mark)
    if (!id || !mark) return { store, result: { ok: false, reason: 'invalid' } }
    const next = marks.filter((row) => !(row.classId === classId && row.id === id))
    if (next.length >= CLASS_CAP && !marks.some((row) => row.classId === classId && row.id === id)) {
      return { store, result: { ok: false, reason: 'full' } }
    }
    next.push({ id, classId, mark })
    const stored = { marks: next }
    return {
      store: stored,
      result: { ok: true, marks: next.filter((row) => row.classId === classId).map(copyMark) },
    }
  }

  return { store, result: { ok: false, reason: 'action' } }
}

function readLocal(): ClassShellStore {
  try {
    const parsed = JSON.parse(readFileSync(FILE_STORE, 'utf8')) as { marks?: unknown }
    if (!parsed || !Array.isArray(parsed.marks)) return emptyClassShellStore()
    const marks: ClassShellMark[] = []
    const seen = new Set<string>()
    for (const row of parsed.marks) {
      const item = asRecord(row)
      if (!item) continue
      const classId = cleanClassId(item.classId)
      const id = cleanId(item.id)
      const mark = cleanMark(item.mark)
      if (!classId || !id || !mark) continue
      const key = `${classId}\n${id}`
      if (seen.has(key)) continue
      seen.add(key)
      marks.push({ id, classId, mark })
    }
    return { marks }
  } catch {
    return emptyClassShellStore()
  }
}

let memory: ClassShellStore | null = null
let persistLocal = true
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function localApply(action: string, payload: unknown): ClassShellResult {
  if (!memory) memory = persistLocal ? readLocal() : emptyClassShellStore()
  const next = applyClassShellMarks(memory, action, payload)
  memory = next.store
  if (persistLocal) {
    try {
      writeFileSync(FILE_STORE, JSON.stringify({ version: 1, marks: memory.marks }))
    } catch {
      /* read-only function image */
    }
  }
  return next.result
}

export function resetClassShellStoreForTests(): void {
  memory = emptyClassShellStore()
  persistLocal = false
}

function json(status: number, body: ClassShellResult): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function statusFor(result: ClassShellResult): number {
  if (result.ok) return 200
  if (result.reason === 'full') return 429
  if (result.reason === 'action') return 404
  return 400
}

function hostOf(value: string): string {
  try {
    return new URL(value).host.toLowerCase()
  } catch {
    return ''
  }
}

function sameOriginAllowed(request: Request): boolean {
  const declared = request.headers.get('origin') || request.headers.get('referer')
  if (!declared) return true
  const host = hostOf(declared)
  if (!host) return false
  const hosts = new Set<string>()
  const fromUrl = hostOf(request.url)
  if (fromUrl) hosts.add(fromUrl)
  const headerHost = request.headers.get('host')?.trim().toLowerCase()
  if (headerHost) hosts.add(headerHost)
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase()
  if (forwarded) hosts.add(forwarded)
  return hosts.has(host)
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text()
  if (text.length > 8_000) return null
  try {
    const parsed = JSON.parse(text) as unknown
    return asRecord(parsed)
  } catch {
    return null
  }
}

export async function handleClassShellMarks(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, reason: 'method' })
  if (!sameOriginAllowed(request)) return json(403, { ok: false, reason: 'origin' })
  const body = await readBody(request)
  if (!body) return json(400, { ok: false, reason: 'invalid' })
  const action = typeof body.action === 'string' ? body.action : ''
  if (action !== 'list' && action !== 'confirm') return json(404, { ok: false, reason: 'action' })
  const result = await enqueue(async () => localApply(action, body))
  return json(statusFor(result), result)
}

export default {
  fetch: handleClassShellMarks,
}
