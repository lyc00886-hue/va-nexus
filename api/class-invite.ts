/**
 * Shared real classrooms and invite codes.
 * A teacher copies the code and hands it over. This route does not send it.
 * Classmates join by typing the code. The roster is the response, not this device's localStorage.
 * A confirmed teacher sentence for one class stays on this same route.
 */
import { randomInt } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/
const TOKEN_RE = /^[A-Za-z0-9-]{8,80}$/
const ROOM_CAP = 5000
const OWNER_CAP = 20
const MEMBER_CAP = 60
const ASSIGN_CAP = 30
const FILE_STORE = join(tmpdir(), 'va-nexus-class-invite-v1.json')

export type InviteMember = { id: string }
export type InviteSubmission = { memberId: string; assignmentId: string; fileName: string }
export type InviteAssignment = {
  id: string
  title: string
  due: string
  instructions: string
  attach: 'none' | 'paper'
  demo: boolean
}
export type InviteRoom = {
  id: string
  code: string
  ownerId: string
  /** Signed-in teacher. Empty when the room is still only on the device token. */
  sessionUserId: string
  name: string
  members: InviteMember[]
  submissions: InviteSubmission[]
  assignments: InviteAssignment[]
}
export type InviteStore = { rooms: InviteRoom[] }
export type ClassShellMark = { id: string; classId: string; mark: string }
export type ClassShellStore = { marks: ClassShellMark[] }
export type InviteResult = {
  ok: boolean
  reason?: string
  room?: InviteRoom
  rooms?: InviteRoom[]
  marks?: ClassShellMark[]
}

export function emptyInviteStore(): InviteStore {
  return { rooms: [] }
}

export function makeInviteCode(draw: (max: number) => number = (max) => randomInt(max)): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += INVITE_ALPHABET[draw(INVITE_ALPHABET.length)]
  return code
}

export function makeInviteToken(prefix: string, draw: (max: number) => number = (max) => randomInt(max)): string {
  let token = prefix
  for (let i = 0; i < 8; i++) token += INVITE_ALPHABET[draw(INVITE_ALPHABET.length)]
  return token
}

function stripControls(value: string): string {
  let out = ''
  for (const char of value) {
    const point = char.codePointAt(0) ?? 0
    if (point >= 32 && point !== 127) out += char
  }
  return out
}

function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return stripControls(raw).trim().slice(0, 200)
}

function cleanToken(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  return TOKEN_RE.test(value) ? value : ''
}

function cleanCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim().toUpperCase()
  return CODE_RE.test(value) ? value : ''
}

function cleanFileName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return stripControls(raw).trim().slice(0, 200)
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

function copyRoom(room: InviteRoom): InviteRoom {
  return {
    id: room.id,
    code: room.code,
    ownerId: room.ownerId,
    sessionUserId: room.sessionUserId || '',
    name: room.name,
    members: room.members.map((member) => ({ id: member.id })),
    submissions: room.submissions.map((row) => ({
      memberId: row.memberId,
      assignmentId: row.assignmentId,
      fileName: row.fileName,
    })),
    assignments: room.assignments.map((row) => ({
      id: row.id,
      title: row.title,
      due: row.due,
      instructions: row.instructions,
      attach: row.attach,
      demo: row.demo,
    })),
  }
}

/** Owner view. The response keeps the device token off the session field. */
function ownerView(room: InviteRoom): InviteRoom {
  return { ...copyRoom(room), sessionUserId: '' }
}

function codeView(room: InviteRoom, memberId: string): InviteRoom {
  return {
    id: room.id,
    code: room.code,
    ownerId: '',
    sessionUserId: '',
    name: room.name,
    members: room.members.filter((member) => member.id === memberId).map((member) => ({ id: member.id })),
    submissions: room.submissions
      .filter((row) => row.memberId === memberId)
      .map((row) => ({ memberId: row.memberId, assignmentId: row.assignmentId, fileName: row.fileName })),
    assignments: room.assignments.map((row) => ({
      id: row.id,
      title: row.title,
      due: row.due,
      instructions: row.instructions,
      attach: row.attach,
      demo: row.demo,
    })),
  }
}

function sameName(room: InviteRoom, ownerId: string, name: string): boolean {
  return room.ownerId === ownerId && room.name === name
}

function sessionToken(raw: unknown): string {
  return cleanToken(raw)
}

/** Device token or the signed-in teacher. A list click does not insert a room. */
function roomVisible(room: InviteRoom, ownerId: string, sessionUserId: string): boolean {
  if (ownerId && room.ownerId === ownerId) return true
  return sessionUserId !== '' && room.sessionUserId === sessionUserId
}

export function applyInvite(store: InviteStore, action: string, payload: unknown): { store: InviteStore; result: InviteResult } {
  const body = asRecord(payload) ?? {}
  const rooms = store.rooms.map(copyRoom)

  if (action === 'list') {
    const ownerId = cleanToken(body.ownerId)
    const sessionUserId = sessionToken(body.sessionUserId)
    if (!ownerId && !sessionUserId) return { store, result: { ok: false, reason: 'invalid' } }
    let next = rooms
    let claimed = false
    if (ownerId && sessionUserId) {
      next = rooms.map((room) => {
        if (room.ownerId !== ownerId || room.sessionUserId) return room
        claimed = true
        return { ...room, sessionUserId }
      })
    }
    const result = { ok: true, rooms: next.filter((room) => roomVisible(room, ownerId, sessionUserId)).map(ownerView) }
    if (!claimed) return { store, result }
    return { store: { rooms: next }, result }
  }

  if (action === 'get') {
    const code = cleanCode(body.code)
    const memberId = cleanToken(body.memberId)
    if (code) {
      const room = rooms.find((row) => row.code === code)
      if (!room) return { store, result: { ok: false, reason: 'missing' } }
      return { store, result: { ok: true, room: codeView(room, memberId) } }
    }
    const id = cleanToken(body.id)
    const ownerId = cleanToken(body.ownerId)
    const sessionUserId = sessionToken(body.sessionUserId)
    if (!id || !ownerId) return { store, result: { ok: false, reason: 'invalid' } }
    const room = rooms.find((row) => row.id === id && roomVisible(row, ownerId, sessionUserId))
    if (!room) return { store, result: { ok: false, reason: 'missing' } }
    return { store, result: { ok: true, room: ownerView(room) } }
  }

  if (action === 'create') {
    const ownerId = cleanToken(body.ownerId)
    const sessionUserId = sessionToken(body.sessionUserId)
    const name = cleanName(body.name)
    const id = cleanToken(body.id)
    const code = cleanCode(body.code)
    if (!ownerId || !name || !id || !code) return { store, result: { ok: false, reason: 'invalid' } }
    const existing = rooms.find((room) => sameName(room, ownerId, name))
    if (existing) {
      if (sessionUserId && !existing.sessionUserId) {
        const claimed = rooms.map((room) => (room.id === existing.id ? { ...room, sessionUserId } : room))
        return { store: { rooms: claimed }, result: { ok: true, room: ownerView({ ...existing, sessionUserId }) } }
      }
      return { store, result: { ok: true, room: ownerView(existing) } }
    }
    if (rooms.length >= ROOM_CAP) return { store, result: { ok: false, reason: 'full' } }
    if (rooms.filter((room) => room.ownerId === ownerId).length >= OWNER_CAP) {
      return { store, result: { ok: false, reason: 'full' } }
    }
    if (rooms.some((room) => room.id === id || room.code === code)) {
      return { store, result: { ok: false, reason: 'conflict' } }
    }
    const room: InviteRoom = {
      id,
      code,
      ownerId,
      sessionUserId,
      name,
      members: [],
      submissions: [],
      assignments: [],
    }
    const next = { rooms: [...rooms, room] }
    return { store: next, result: { ok: true, room: ownerView(room) } }
  }

  if (action === 'join') {
    const code = cleanCode(body.code)
    const memberId = cleanToken(body.memberId)
    if (!code || !memberId) return { store, result: { ok: false, reason: 'invalid' } }
    const index = rooms.findIndex((room) => room.code === code)
    if (index < 0) return { store, result: { ok: false, reason: 'missing' } }
    const room = rooms[index]
    if (!room.members.some((member) => member.id === memberId)) {
      if (room.members.length >= MEMBER_CAP) return { store, result: { ok: false, reason: 'full' } }
      room.members = [...room.members, { id: memberId }]
    }
    const next = { rooms: rooms.map((row, at) => (at === index ? room : row)) }
    return { store: next, result: { ok: true, room: codeView(room, memberId) } }
  }

  if (action === 'submit') {
    const code = cleanCode(body.code)
    const memberId = cleanToken(body.memberId)
    const assignmentId = cleanToken(body.assignmentId) || cleanName(body.assignmentId)
    const fileName = cleanFileName(body.fileName)
    if (!code || !memberId || !assignmentId || !fileName) return { store, result: { ok: false, reason: 'invalid' } }
    if (assignmentId.length > 80) return { store, result: { ok: false, reason: 'invalid' } }
    const index = rooms.findIndex((room) => room.code === code)
    if (index < 0) return { store, result: { ok: false, reason: 'missing' } }
    const room = rooms[index]
    if (!room.members.some((member) => member.id === memberId)) {
      return { store, result: { ok: false, reason: 'missing' } }
    }
    const submission = { memberId, assignmentId, fileName }
    const submissions = room.submissions.filter(
      (row) => !(row.memberId === memberId && row.assignmentId === assignmentId),
    )
    room.submissions = [...submissions, submission]
    const next = { rooms: rooms.map((row, at) => (at === index ? room : row)) }
    return { store: next, result: { ok: true, room: codeView(room, memberId) } }
  }

  if (action === 'publish') {
    const ownerId = cleanToken(body.ownerId)
    const sessionUserId = sessionToken(body.sessionUserId)
    const id = cleanToken(body.id)
    const assignmentId = cleanToken(body.assignmentId)
    const title = cleanName(body.title)
    const due = cleanName(body.due)
    const instructions = cleanName(body.instructions)
    const attach = body.attach === 'none' || body.attach === 'paper' ? body.attach : ''
    if (!ownerId || !id || !assignmentId || !title || !due || !attach) {
      return { store, result: { ok: false, reason: 'invalid' } }
    }
    const index = rooms.findIndex((room) => room.id === id && roomVisible(room, ownerId, sessionUserId))
    if (index < 0) return { store, result: { ok: false, reason: 'missing' } }
    const room = rooms[index]
    if (!room.assignments.some((row) => row.id === assignmentId)) {
      if (room.assignments.length >= ASSIGN_CAP) return { store, result: { ok: false, reason: 'full' } }
      room.assignments = [
        ...room.assignments,
        { id: assignmentId, title, due, instructions, attach, demo: false },
      ]
    }
    const next = { rooms: rooms.map((row, at) => (at === index ? room : row)) }
    return { store: next, result: { ok: true, room: ownerView(room) } }
  }

  return { store, result: { ok: false, reason: 'action' } }
}

function readLocal(): InviteStore {
  try {
    const parsed = JSON.parse(readFileSync(FILE_STORE, 'utf8')) as { rooms?: unknown }
    if (!parsed || !Array.isArray(parsed.rooms)) return emptyInviteStore()
    const rooms: InviteRoom[] = []
    for (const row of parsed.rooms) {
      const record = asRecord(row)
      if (!record) continue
      const id = cleanToken(record.id)
      const code = cleanCode(record.code)
      const ownerId = cleanToken(record.ownerId)
      const sessionUserId = cleanToken(record.sessionUserId)
      const name = cleanName(record.name)
      if (!id || !code || !ownerId || !name) continue
      rooms.push({
        id,
        code,
        ownerId,
        sessionUserId,
        name,
        members: Array.isArray(record.members)
          ? record.members.flatMap((member) => {
              const item = asRecord(member)
              const memberId = item ? cleanToken(item.id) : ''
              return memberId ? [{ id: memberId }] : []
            })
          : [],
        submissions: Array.isArray(record.submissions)
          ? record.submissions.flatMap((entry) => {
              const item = asRecord(entry)
              if (!item) return []
              const memberId = cleanToken(item.memberId)
              const assignmentId = typeof item.assignmentId === 'string' ? item.assignmentId.trim().slice(0, 80) : ''
              const fileName = cleanFileName(item.fileName)
              if (!memberId || !assignmentId || !fileName) return []
              return [{ memberId, assignmentId, fileName }]
            })
          : [],
        assignments: Array.isArray(record.assignments)
          ? record.assignments.flatMap((entry) => {
              const item = asRecord(entry)
              if (!item) return []
              const assignmentId = cleanToken(item.id)
              const title = cleanName(item.title)
              const due = cleanName(item.due)
              const instructions = cleanName(item.instructions)
              const attach = item.attach === 'none' || item.attach === 'paper' ? item.attach : ''
              if (!assignmentId || !title || !due || !attach) return []
              return [{ id: assignmentId, title, due, instructions, attach, demo: false }]
            })
          : [],
      })
    }
    return { rooms }
  } catch {
    return emptyInviteStore()
  }
}

let memory: InviteStore | null = null
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

const MARK_LIMIT = 240
const MARK_CAP = 400
let markRows: ClassShellMark[] = []
let marksReady = false

export function emptyClassShellStore(): ClassShellStore {
  return { marks: [] }
}

function cleanClassId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  return /^[A-Za-z0-9-]{1,80}$/.test(value) ? value : ''
}

function cleanMarkId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let out = ''
  for (const char of raw.trim()) {
    const point = char.codePointAt(0) ?? 0
    if (point >= 32 && point !== 127) out += char
  }
  return out.slice(0, 120)
}

function cleanMarkText(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let out = ''
  for (const char of raw.trim()) {
    const point = char.codePointAt(0) ?? 0
    if (point >= 32 && point !== 127) out += char
  }
  return [...out].slice(0, MARK_LIMIT).join('')
}

function copyMark(row: ClassShellMark): ClassShellMark {
  return { id: row.id, classId: row.classId, mark: row.mark }
}

function readMarkRows(raw: unknown): ClassShellMark[] {
  const record = asRecord(raw)
  if (!record || !Array.isArray(record.marks)) return []
  const marks: ClassShellMark[] = []
  const seen = new Set<string>()
  for (const row of record.marks) {
    const item = asRecord(row)
    if (!item) continue
    const classId = cleanClassId(item.classId)
    const id = cleanMarkId(item.id)
    const mark = cleanMarkText(item.mark)
    if (!classId || !id || !mark) continue
    const key = `${classId}\n${id}`
    if (seen.has(key)) continue
    seen.add(key)
    marks.push({ id, classId, mark })
  }
  return marks
}

export function applyClassShellMarks(
  store: ClassShellStore,
  action: string,
  payload: unknown,
): { store: ClassShellStore; result: InviteResult } {
  const body = asRecord(payload) ?? {}
  const classId = cleanClassId(body.classId)
  const ownerId = cleanToken(body.ownerId)
  if (!classId || !ownerId) return { store, result: { ok: false, reason: 'invalid' } }
  const marks = store.marks.map(copyMark)
  if (action === 'mark-list') {
    return { store, result: { ok: true, marks: marks.filter((row) => row.classId === classId).map(copyMark) } }
  }
  if (action === 'mark-confirm') {
    const id = cleanMarkId(body.id)
    const mark = cleanMarkText(body.mark)
    if (!id || !mark) return { store, result: { ok: false, reason: 'invalid' } }
    const exists = marks.some((row) => row.classId === classId && row.id === id)
    if (!exists && marks.length >= MARK_CAP) return { store, result: { ok: false, reason: 'full' } }
    const next = marks.filter((row) => !(row.classId === classId && row.id === id))
    next.push({ id, classId, mark })
    return {
      store: { marks: next },
      result: { ok: true, marks: next.filter((row) => row.classId === classId).map(copyMark) },
    }
  }
  return { store, result: { ok: false, reason: 'action' } }
}

function loadMarks() {
  if (marksReady) return
  marksReady = true
  if (!persistLocal) return
  try {
    markRows = readMarkRows(JSON.parse(readFileSync(FILE_STORE, 'utf8')))
  } catch {
    markRows = []
  }
}

function writeDisk() {
  if (!persistLocal) return
  try {
    writeFileSync(FILE_STORE, JSON.stringify({ version: 1, rooms: (memory ?? emptyInviteStore()).rooms, marks: markRows }))
  } catch {
    /* private mode or a read-only function image */
  }
}

function localApply(action: string, payload: unknown): InviteResult {
  if (!memory) memory = persistLocal ? readLocal() : emptyInviteStore()
  loadMarks()
  const next = applyInvite(memory, action, payload)
  memory = next.store
  writeDisk()
  return next.result
}

function localApplyMarks(action: string, payload: unknown): InviteResult {
  if (!memory) memory = persistLocal ? readLocal() : emptyInviteStore()
  loadMarks()
  const next = applyClassShellMarks({ marks: markRows }, action, payload)
  markRows = next.store.marks
  writeDisk()
  return next.result
}

export function resetLocalInviteStoreForTests(): void {
  memory = emptyInviteStore()
  markRows = []
  marksReady = true
  persistLocal = false
}

function supabaseEnv(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !key || url.includes('YOUR_PROJECT') || key === 'your_supabase_anon_key') return null
  return { url, key }
}

function bearerToken(request: Request): string {
  const value = request.headers.get('authorization')?.trim() ?? ''
  const match = /^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(value)
  return match?.[1] ?? ''
}

async function remoteApply(action: string, payload: unknown, accessToken = ''): Promise<InviteResult | null> {
  const env = supabaseEnv()
  if (!env) return null
  try {
    const res = await fetch(`${env.url}/rest/v1/rpc/class_invite_dispatch`, {
      method: 'POST',
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${accessToken || env.key}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({ p_action: action, p_payload: payload ?? {} }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as InviteResult
    if (!body || typeof body !== 'object' || typeof body.ok !== 'boolean') return null
    return body
  } catch {
    return null
  }
}

/** Prefer the signed-in teacher. A rejected token still lists by the device token. */
async function dispatchRemote(action: string, payload: unknown, accessToken: string): Promise<InviteResult | null> {
  if (!supabaseEnv()) return null
  if (accessToken) {
    const authed = await remoteApply(action, payload, accessToken)
    if (authed) return authed
  }
  return remoteApply(action, payload)
}

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 600
const rateHits = new Map<string, number[]>()

function rateLimited(request: Request, now = Date.now()): boolean {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const key = forwarded || request.headers.get('x-real-ip')?.trim() || 'local'
  const recent = (rateHits.get(key) ?? []).filter((at) => now - at < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    rateHits.set(key, recent)
    return true
  }
  recent.push(now)
  rateHits.set(key, recent)
  return false
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

function json(status: number, body: InviteResult): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function statusFor(result: InviteResult): number {
  if (result.ok) return 200
  if (result.reason === 'missing') return 404
  if (result.reason === 'conflict') return 409
  if (result.reason === 'full') return 429
  if (result.reason === 'action') return 404
  return 400
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text()
  if (text.length > 20_000) return null
  try {
    const parsed = JSON.parse(text) as unknown
    return asRecord(parsed)
  } catch {
    return null
  }
}

export async function handleClassInvite(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, reason: 'method' })
  if (!sameOriginAllowed(request)) return json(403, { ok: false, reason: 'origin' })
  if (rateLimited(request)) return json(429, { ok: false, reason: 'full' })
  const body = await readBody(request)
  if (!body) return json(400, { ok: false, reason: 'invalid' })
  delete body.sessionUserId
  const accessToken = bearerToken(request)
  const action = typeof body.action === 'string' ? body.action : ''
  if (action === 'mark-list' || action === 'mark-confirm') {
    const result = await enqueue(async () => localApplyMarks(action, body))
    return json(statusFor(result), result)
  }
  if (action === 'create') {
    const ownerId = cleanToken(body.ownerId)
    const name = cleanName(body.name)
    if (!ownerId || !name) return json(400, { ok: false, reason: 'invalid' })
    for (let attempt = 0; attempt < 5; attempt++) {
      const payload = { ownerId, name, id: makeInviteToken('r'), code: makeInviteCode() }
      const remote = await dispatchRemote('create', payload, accessToken)
      const result = remote ?? (await enqueue(async () => localApply('create', payload)))
      if (result.ok || result.reason !== 'conflict') return json(statusFor(result), result)
    }
    return json(409, { ok: false, reason: 'conflict' })
  }
  const allowed = action === 'list' || action === 'get' || action === 'join' || action === 'submit' || action === 'publish'
  if (!allowed) return json(404, { ok: false, reason: 'action' })
  const remote = await dispatchRemote(action, body, accessToken)
  if (supabaseEnv() && !remote) return json(502, { ok: false, reason: 'unavailable' })
  const result = remote ?? (await enqueue(async () => localApply(action, body)))
  return json(statusFor(result), result)
}

export default {
  fetch: handleClassInvite,
}
