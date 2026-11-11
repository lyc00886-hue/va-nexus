import { useSyncExternalStore } from 'react'
import {
  DUAL_RADAR_KEY,
  emptyDualRadarStore,
  sanitizeDualRadarStore,
  withDualAxis,
  type DualRadarStore,
} from './schoolScoreDual.ts'

function load(): DualRadarStore {
  if (typeof localStorage === 'undefined') return emptyDualRadarStore()
  try {
    const raw = localStorage.getItem(DUAL_RADAR_KEY)
    if (!raw) return emptyDualRadarStore()
    return sanitizeDualRadarStore(JSON.parse(raw))
  } catch {
    return emptyDualRadarStore()
  }
}

let snapshot: DualRadarStore = load()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(DUAL_RADAR_KEY, JSON.stringify({ version: 1, axes: snapshot.axes }))
  } catch {
    /* quota, private mode, or storage disabled */
  }
}

function publish(next: DualRadarStore) {
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
    if (event.key !== DUAL_RADAR_KEY) return
    try {
      snapshot = event.newValue ? sanitizeDualRadarStore(JSON.parse(event.newValue)) : emptyDualRadarStore()
    } catch {
      snapshot = emptyDualRadarStore()
    }
    listeners.forEach((listener) => listener())
  })
}

export function getDualRadarStore(): DualRadarStore {
  return snapshot
}

export function saveDualAxis(axisId: string, value: number | null) {
  const next = withDualAxis(snapshot, axisId, value)
  if (next === snapshot) return
  publish(next)
}

export function useSchoolScoreDual(): DualRadarStore {
  return useSyncExternalStore(subscribe, getDualRadarStore, getDualRadarStore)
}
