/**
 * Browser door to the shared classroom route.
 * The roster lives on that route. These keys only remember which room this device opened.
 */
import { useEffect, useSyncExternalStore } from 'react'

const OWNER_KEY = 'va-nexus:class-owner:v1'
const MEMBER_KEY = 'va-nexus:class-member:v1'
const JOINED_KEY = 'va-nexus:class-joined:v1'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const TOKEN_RE = /^[A-Za-z0-9-]{8,80}$/

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
  name: string
  members: { id: string }[]
  submissions: { memberId: string; assignmentId: string; fileName: string }[]
  assignments: InviteAssignment[]
}

type InviteResult = {
  ok: boolean
  reason?: string
  room?: InviteRoom
  rooms?: InviteRoom[]
}

type JoinedPointer = { code: string }

let rooms: InviteRoom[] = []
let joined: InviteRoom | null = null
let listGen = 0
let joinedGen = 0
const roomListeners = new Set<() => void>()
const joinedListeners = new Set<() => void>()

function emitRooms() {
  roomListeners.forEach((listener) => listener())
}

function emitJoined() {
  joinedListeners.forEach((listener) => listener())
}

function browserToken(prefix: string): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let token = prefix
  for (const value of bytes) token += ALPHABET[value % ALPHABET.length]
  return token
}

function readToken(key: string, prefix: string): string {
  try {
    const saved = localStorage.getItem(key)?.trim() ?? ''
    if (TOKEN_RE.test(saved)) return saved
    const next = browserToken(prefix)
    localStorage.setItem(key, next)
    return next
  } catch {
    return browserToken(prefix)
  }
}

export function classOwnerId(): string {
  return readToken(OWNER_KEY, 'o')
}

export function classMemberId(): string {
  return readToken(MEMBER_KEY, 'm')
}

function readJoinedPointer(): JoinedPointer | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(JOINED_KEY) ?? '') as { code?: unknown }
    const code = typeof parsed.code === 'string' ? parsed.code.trim().toUpperCase() : ''
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) return null
    return { code }
  } catch {
    return null
  }
}

function writeJoinedPointer(code: string) {
  try {
    localStorage.setItem(JOINED_KEY, JSON.stringify({ code }))
  } catch {
    /* private mode */
  }
}

async function postInvite(body: Record<string, unknown>): Promise<InviteResult | null> {
  try {
    const res = await fetch('/api/class-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const parsed = (await res.json()) as InviteResult
    if (!parsed || typeof parsed !== 'object' || parsed.ok !== true) return null
    return parsed
  } catch {
    return null
  }
}

function isRoom(value: unknown): value is InviteRoom {
  if (!value || typeof value !== 'object') return false
  const room = value as InviteRoom
  return typeof room.id === 'string' && typeof room.code === 'string' && typeof room.name === 'string'
}

export async function refreshRealClassrooms(): Promise<InviteRoom[]> {
  const gen = listGen
  const result = await postInvite({ action: 'list', ownerId: classOwnerId() })
  if (gen !== listGen || !result?.rooms) return rooms
  rooms = result.rooms.filter(isRoom)
  emitRooms()
  return rooms
}

export async function createRealClassroom(name: string): Promise<InviteRoom | null> {
  const result = await postInvite({ action: 'create', ownerId: classOwnerId(), name })
  if (!result?.room || !isRoom(result.room)) return null
  listGen += 1
  rooms = [...rooms.filter((room) => room.id !== result.room?.id), result.room]
  emitRooms()
  return result.room
}

export async function publishRealAssignment(input: {
  classId: string
  assignmentId: string
  title: string
  due: string
  instructions: string
  attach: 'none' | 'paper'
}): Promise<void> {
  const result = await postInvite({
    action: 'publish',
    ownerId: classOwnerId(),
    id: input.classId,
    assignmentId: input.assignmentId,
    title: input.title,
    due: input.due,
    instructions: input.instructions,
    attach: input.attach,
  })
  if (!result?.room || !isRoom(result.room)) return
  rooms = rooms.map((room) => (room.id === result.room?.id ? result.room : room))
  emitRooms()
}

export async function refreshJoinedClassroom(): Promise<InviteRoom | null> {
  const pointer = readJoinedPointer()
  if (!pointer) {
    if (joined) {
      joined = null
      emitJoined()
    }
    return null
  }
  const gen = joinedGen
  const result = await postInvite({
    action: 'get',
    code: pointer.code,
    memberId: classMemberId(),
  })
  if (gen !== joinedGen || !result?.room || !isRoom(result.room)) return joined
  joined = result.room
  emitJoined()
  return joined
}

export async function joinRealClassroom(code: string): Promise<InviteRoom | null> {
  const result = await postInvite({
    action: 'join',
    code,
    memberId: classMemberId(),
  })
  if (!result?.room || !isRoom(result.room)) return null
  joinedGen += 1
  writeJoinedPointer(result.room.code)
  joined = result.room
  emitJoined()
  return result.room
}

export async function submitJoinedHomework(input: { assignmentId: string; fileName: string }): Promise<boolean> {
  const pointer = readJoinedPointer()
  if (!pointer) return false
  const result = await postInvite({
    action: 'submit',
    code: pointer.code,
    memberId: classMemberId(),
    assignmentId: input.assignmentId,
    fileName: input.fileName,
  })
  if (!result?.room || !isRoom(result.room)) return false
  joined = result.room
  emitJoined()
  return true
}

function subscribeRooms(cb: () => void) {
  roomListeners.add(cb)
  return () => roomListeners.delete(cb)
}

function subscribeJoined(cb: () => void) {
  joinedListeners.add(cb)
  return () => joinedListeners.delete(cb)
}

function watchRoom(refresh: () => Promise<unknown>): () => void {
  let stop = false
  const tick = () => {
    if (!stop) void refresh()
  }
  tick()
  const id = window.setInterval(tick, 3000)
  const onFocus = () => tick()
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
  return () => {
    stop = true
    window.clearInterval(id)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onFocus)
  }
}

let roomUsers = 0
let roomStop: (() => void) | null = null
let joinedUsers = 0
let joinedStop: (() => void) | null = null

export function useRealClassrooms(): InviteRoom[] {
  const snapshot = useSyncExternalStore(subscribeRooms, () => rooms, () => rooms)
  useEffect(() => {
    roomUsers += 1
    if (roomUsers === 1) roomStop = watchRoom(refreshRealClassrooms)
    return () => {
      roomUsers -= 1
      if (roomUsers === 0 && roomStop) {
        roomStop()
        roomStop = null
      }
    }
  }, [])
  return snapshot
}

export function useJoinedClassroom(): InviteRoom | null {
  const snapshot = useSyncExternalStore(subscribeJoined, () => joined, () => null)
  useEffect(() => {
    joinedUsers += 1
    if (joinedUsers === 1) joinedStop = watchRoom(refreshJoinedClassroom)
    return () => {
      joinedUsers -= 1
      if (joinedUsers === 0 && joinedStop) {
        joinedStop()
        joinedStop = null
      }
    }
  }, [])
  return snapshot
}
