import { planGestureAutoRead } from './lessonStepReading.ts'

export type GesturePhase = 'starting' | 'speaking'
export type GestureSession = { key: string; phase: GesturePhase }

export type GestureSpeakHooks = {
  onstart?: () => void
  onend?: () => void
  onerror?: (reason?: string) => void
}

type GestureSpeaker = (text: string, hooks: GestureSpeakHooks) => boolean

let generation = 0
let session: GestureSession | null = null
let attemptedKey: string | undefined
const listeners = new Set<() => void>()
const mountedKeys = new Set<string>()

function publish(next: GestureSession | null) {
  session = next
  listeners.forEach((listener) => listener())
}

export function subscribeGestureAutoRead(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readGestureAutoRead(): GestureSession | null {
  return session
}

export function gestureSessionOwns(key: string | undefined): boolean {
  return Boolean(key && session?.key === key)
}

export function gestureAttempted(key: string | undefined): boolean {
  return Boolean(key && attemptedKey === key)
}

/**
 * Start reading in the click that opens the card.
 * `speak` must call speechSynthesis.speak before it returns when the engine is idle.
 */
export function beginGestureAutoRead(
  input: { auto: boolean; key: string; text: string; stoppedKey?: string },
  speak: GestureSpeaker,
): boolean {
  const plan = planGestureAutoRead(input)
  if (!plan.speak || !plan.key || !plan.text) return false
  if (session?.key === plan.key) return true
  const key = plan.key
  const text = plan.text
  const gen = ++generation
  attemptedKey = key
  publish({ key, phase: 'starting' })
  const hooks: GestureSpeakHooks = {
    onstart: () => {
      if (gen !== generation || session?.key !== key) return
      publish({ key, phase: 'speaking' })
    },
    onend: () => {
      if (gen !== generation || session?.key !== key) return
      // An engine that rejects the utterance can end it before onstart. That is not the student stopping.
      if (session.phase !== 'speaking') return
      publish(null)
    },
    onerror: () => {
      // Keep the stop label. A rejected first utterance must not paint 「朗讀」 before the card is seen.
      if (gen !== generation || session?.key !== key) return
    },
  }
  let ok = false
  try {
    ok = speak(text, hooks)
  } catch {
    ok = false
  }
  if (!ok && generation === gen) {
    if (attemptedKey === key) attemptedKey = undefined
    publish(null)
    return false
  }
  return ok
}

/** Stop this card's auto-read. An idle engine is left alone so the next start is not cancelled. */
export function stopGestureAutoRead(key?: string) {
  if (!session) return
  if (key && session.key !== key) return
  generation += 1
  publish(null)
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  if (!synth.speaking && !synth.pending) return
  synth.cancel()
}

/** Warm the voice list inside the 讀寫支援 click. Does not speak. */
export function primeSpeechEngine() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.resume()
  } catch {
    /* a locked engine can still speak on the later open click */
  }
}

export function retainGestureKey(key: string) {
  mountedKeys.add(key)
}

export function releaseGestureKey(key: string) {
  mountedKeys.delete(key)
  queueMicrotask(() => {
    if (mountedKeys.has(key)) return
    stopGestureAutoRead(key)
  })
}
