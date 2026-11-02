/**
 * On-device 4-level self-assessment.
 * Guests and signed-in students share this device store (same pattern as SBA guide
 * checklist ticks). There is no cloud column for these selects yet.
 * Only values 1–4 are kept. Checklists, notes, photos and AI output are never written here.
 */
import { useSyncExternalStore } from 'react'
import { parseSelfLevel } from './abilityChart'

export const SELF_ASSESSMENT_KEY = 'va-nexus:sba-self-assessment:v1'

export type SelfAssessmentSnapshot = {
  selects: Record<string, string>
}

function empty(): SelfAssessmentSnapshot {
  return { selects: {} }
}

function sanitize(raw: unknown): SelfAssessmentSnapshot {
  if (!raw || typeof raw !== 'object') return empty()
  const selectsIn = (raw as { selects?: unknown }).selects
  if (!selectsIn || typeof selectsIn !== 'object') return empty()
  const selects: Record<string, string> = {}
  for (const [id, value] of Object.entries(selectsIn as Record<string, unknown>)) {
    if (id === 'self-aw-5') continue
    const level = parseSelfLevel(value)
    if (level == null) continue
    selects[id] = String(level)
  }
  return { selects }
}

function load(): SelfAssessmentSnapshot {
  if (typeof localStorage === 'undefined') return empty()
  try {
    const raw = localStorage.getItem(SELF_ASSESSMENT_KEY)
    if (!raw) return empty()
    return sanitize(JSON.parse(raw))
  } catch {
    return empty()
  }
}

let snapshot: SelfAssessmentSnapshot = load()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SELF_ASSESSMENT_KEY, JSON.stringify({ version: 1, selects: snapshot.selects }))
  } catch {
    /* quota, private mode, or storage disabled */
  }
}

function publish(next: SelfAssessmentSnapshot) {
  snapshot = next
  persist()
  listeners.forEach((l) => l())
}

export function getSelfAssessment(): SelfAssessmentSnapshot {
  return snapshot
}

export function setSelfSelect(id: string, raw: string) {
  if (!id || id === 'self-aw-5') return
  const level = parseSelfLevel(raw)
  const same = level == null ? !(id in snapshot.selects) : snapshot.selects[id] === String(level)
  if (same) return
  const selects = { ...snapshot.selects }
  if (level == null) delete selects[id]
  else selects[id] = String(level)
  publish({ selects })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== SELF_ASSESSMENT_KEY) return
    try {
      snapshot = event.newValue ? sanitize(JSON.parse(event.newValue)) : empty()
    } catch {
      snapshot = empty()
    }
    listeners.forEach((l) => l())
  })
}

export function useSelfAssessment(): SelfAssessmentSnapshot {
  return useSyncExternalStore(subscribe, getSelfAssessment, getSelfAssessment)
}
