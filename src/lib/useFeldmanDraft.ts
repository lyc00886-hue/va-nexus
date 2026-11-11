import { useSyncExternalStore } from 'react'
import {
  bringSectionIntoStep,
  emptyFeldmanDraft,
  sanitizeFeldmanDraft,
  withFeldmanArtwork,
  withFeldmanStep,
  FELDMAN_DRAFT_KEY,
  type BringResult,
  type FeldmanDraft,
  type FeldmanStepId,
} from './feldmanDraft'

function load(): FeldmanDraft {
  if (typeof localStorage === 'undefined') return emptyFeldmanDraft()
  try {
    const raw = localStorage.getItem(FELDMAN_DRAFT_KEY)
    if (!raw) return emptyFeldmanDraft()
    return sanitizeFeldmanDraft(JSON.parse(raw))
  } catch {
    return emptyFeldmanDraft()
  }
}

let snapshot: FeldmanDraft = load()
const listeners = new Set<() => void>()

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FELDMAN_DRAFT_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota, private mode, or storage disabled */
  }
}

function publish(next: FeldmanDraft) {
  if (next === snapshot) return
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
    if (event.key !== FELDMAN_DRAFT_KEY) return
    try {
      snapshot = event.newValue ? sanitizeFeldmanDraft(JSON.parse(event.newValue)) : emptyFeldmanDraft()
    } catch {
      snapshot = emptyFeldmanDraft()
    }
    listeners.forEach((listener) => listener())
  })
}

export function getFeldmanDraft(): FeldmanDraft {
  return snapshot
}

export function setFeldmanArtwork(artwork: string) {
  publish(withFeldmanArtwork(snapshot, artwork))
}

export function updateFeldmanStep(step: FeldmanStepId, recipe: (current: string) => string) {
  publish(withFeldmanStep(snapshot, step, recipe(snapshot.steps[step])))
}

export function bringFeldmanStep(step: FeldmanStepId, sectionText: string, confirm: boolean): BringResult {
  const outcome = bringSectionIntoStep(snapshot, step, sectionText, confirm)
  if (outcome.result === 'written') publish(outcome.draft)
  return outcome.result
}

export function useFeldmanDraft(): FeldmanDraft {
  return useSyncExternalStore(subscribe, getFeldmanDraft, getFeldmanDraft)
}
