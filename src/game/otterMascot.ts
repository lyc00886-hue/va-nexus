/**
 * Otter mascot B — static poses for mid-flow praise, lesson done, and an optional chest.
 * Copy is DICK PASS (mascot.encourage / mascot.complete / mascot.chest*).
 * Chest is offered only after a mainline map unit or a research quest is completed.
 * `?otter=0` keeps the classic trophy result and does not grant the chest bonus.
 */

export const OTTER_POSES = ['encourage', 'complete', 'chest'] as const
export type OtterPoseId = (typeof OTTER_POSES)[number]
export type OtterEnter = 'step' | 'celebrate'

/** Step-to-step pose fade. Designer lock: ≤200ms. */
export const OTTER_STEP_MS = 200
/** Chest celebrate enter. Designer lock: 400–600ms. Reduce-motion uses 0 (instant, no loop). */
export const OTTER_CELEBRATE_MS = 500

/** One chest, existing learning points. Matches mascot.chest.reward (＋10 學習點 / +10 learning points / ＋10 学习点). */
export const OTTER_CHEST_XP = 10
export const OTTER_CHEST_AWARD_PREFIX = 'otter-chest:'

export const OTTER_STORAGE_KEY = 'va-nexus:otter-mascot'

export const OTTER_SRC: Record<OtterPoseId, string> = {
  encourage: '/otter/otter-encourage.png',
  complete: '/otter/otter-complete.png',
  chest: '/otter/otter-chest.png',
}

export type UnitSlice = { id: string; nodeIds: readonly string[] }

export type ChestOffer = { offer: true; key: string } | { offer: false; key: null }

export function otterChestAwardKey(scope: string): string {
  return `${OTTER_CHEST_AWARD_PREFIX}${scope}`
}

/** 0 = instant swap (reduce motion). Otherwise the locked enter duration. Never a loop. */
export function otterEnterMs(reduceMotion: boolean, enter: OtterEnter): number {
  if (reduceMotion) return 0
  return enter === 'celebrate' ? OTTER_CELEBRATE_MS : OTTER_STEP_MS
}

export function queryOtterFlag(search: string): 'on' | 'off' | null {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(raw).get('otter')
  if (value === '0' || value === 'off') return 'off'
  if (value === '1' || value === 'on') return 'on'
  return null
}

/** Query wins over the stored opt-out. Unset stays on so the preview shows the three poses. */
export function resolveOtterMascotEnabled(search: string, stored: string | null): boolean {
  const flag = queryOtterFlag(search)
  if (flag === 'off') return false
  if (flag === 'on') return true
  return stored !== '0'
}

export function unitSliceFor(lessonId: string, units: readonly UnitSlice[]): UnitSlice | null {
  for (const unit of units) {
    if (unit.nodeIds.length === 0) continue
    if (unit.nodeIds.includes(lessonId)) return unit
  }
  return null
}

/**
 * Chest celebrate is optional and only for a first pass that finishes a map unit,
 * or a first pass of a research quest. A single lesson that leaves the unit open
 * does not offer a chest. Replays do not offer another chest.
 */
export function chestOffer(input: {
  kind: 'lesson' | 'quest'
  passed: boolean
  id: string
  unit: UnitSlice | null
  completedBefore: (id: string) => boolean
}): ChestOffer {
  if (!input.passed) return { offer: false, key: null }
  if (input.kind === 'quest') {
    if (input.completedBefore(input.id)) return { offer: false, key: null }
    return { offer: true, key: `quest:${input.id}` }
  }
  const unit = input.unit
  if (!unit || unit.nodeIds.length === 0) return { offer: false, key: null }
  if (!unit.nodeIds.includes(input.id)) return { offer: false, key: null }
  if (input.completedBefore(input.id)) return { offer: false, key: null }
  const finishesUnit = unit.nodeIds.every((nodeId) => nodeId === input.id || input.completedBefore(nodeId))
  if (!finishesUnit) return { offer: false, key: null }
  return { offer: true, key: `unit:${unit.id}` }
}
