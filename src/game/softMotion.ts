/**
 * Soft celebrate motion aligned with sfx.lessonComplete / sfx.chestOpen / sfx.stepAdvance.
 * The early-wire pack has no audio files, so cues are visual only.
 * Public default is off. prefers-reduced-motion stays off unless the gear toggle is on.
 * The display "reduce motion" switch still wins.
 */

export const SOUND_MOTION_DEFAULT = false

export const SOFT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const SOFT_EVENTS = {
  lessonComplete: {
    motion: 'motion.lessonComplete',
    sfx: 'sfx.lessonComplete',
    ms: 560,
    min: 450,
    max: 700,
    mood: '/content/learning-map-illustrations/moods/mood-lessonComplete.png',
  },
  chestOpen: {
    motion: 'motion.chestOpen',
    sfx: 'sfx.chestOpen',
    ms: 400,
    min: 300,
    max: 500,
    mood: '/content/learning-map-illustrations/moods/mood-chestOpen.png',
  },
  stepAdvance: {
    motion: 'motion.stepAdvance',
    sfx: 'sfx.stepAdvance',
    ms: 180,
    min: 120,
    max: 220,
    mood: '/content/learning-map-illustrations/moods/mood-stepAdvance.png',
  },
} as const

export type SoftEventId = keyof typeof SOFT_EVENTS

export const MOOD_EMPTY_MAP = '/content/learning-map-illustrations/moods/mood-empty-map.png'
export const MOOD_OTTER_PEEK = '/content/learning-map-illustrations/moods/mood-otter-peek.png'

/**
 * Motion v2 lesson-complete character. Paths stay stable if a frame file is replaced.
 * Idle, chest-paws clap, and happy chin-tuck nod are the aligned set.
 * One hard-cut pass, 700–900ms, no loop.
 */
export const MOTION_V2_CELEBRATE_MS = 800

/** Hard-cut edges in ms: idle, clap, nod, idle. No two poses share a millisecond. */
export const CELEBRATE_CUTS_MS = [0, 200, 450, 700, 800] as const

export const MOTION_V2_OTTER = {
  idle: '/content/learning-map-illustrations/moods/motion-v2/otter-celebrate-idle.png',
  clap: '/content/learning-map-illustrations/moods/motion-v2/otter-celebrate-clap.png',
  nod: '/content/learning-map-illustrations/moods/motion-v2/otter-celebrate-nod.png',
} as const

export type CelebratePose = keyof typeof MOTION_V2_OTTER

/** Gear off or reduce-motion stays on the idle still. Otherwise idle → clap → nod → idle. */
export function celebratePoses(play: boolean): readonly CelebratePose[] {
  return play ? ['idle', 'clap', 'nod', 'idle'] : ['idle']
}

/** True only after an explicit gear opt-in, and never while display reduce-motion is on. */
export function softMotionPlay(input: { soundMotion: boolean; reduceMotion: boolean }): boolean {
  return input.soundMotion === true && input.reduceMotion !== true
}

/**
 * Map path presence. Separate from the celebrate stills.
 * Idle and a short blink while the otter waits. Walk frames only while the path moves forward.
 * One pose is shown at a time. Gear off, the reduce-motion switch, or prefers-reduced-motion stays on idle.
 */
export const MOTION_V2_MAP = {
  idle: '/content/learning-map-illustrations/moods/motion-v2/otter-map-idle.png',
  blink: '/content/learning-map-illustrations/moods/motion-v2/otter-map-blink.png',
  'walk-1': '/content/learning-map-illustrations/moods/motion-v2/otter-map-walk-1.png',
  'walk-2': '/content/learning-map-illustrations/moods/motion-v2/otter-map-walk-2.png',
} as const

export type MapPose = keyof typeof MOTION_V2_MAP

/** Closed-eye hold. Soft note 120–180ms. */
export const MAP_BLINK_MS = 150

/** Open-eye hold between blinks. Slow loop, not a flicker. */
export const MAP_IDLE_HOLD_MS = 2800

/** One stride. Soft note 600–800ms per step. */
export const MAP_WALK_MS = 700

/** One forward move plays walk-1 then walk-2, then returns to the idle blink. */
export const MAP_WALK_POSES = ['walk-1', 'walk-2'] as const

export function mapWalkMs(): number {
  return MAP_WALK_MS * MAP_WALK_POSES.length
}

/** Gear off or any reduce-motion signal stays on the idle still. */
export function mapMotionPlay(input: {
  soundMotion: boolean
  reduceMotion: boolean
  prefersReducedMotion?: boolean
}): boolean {
  return softMotionPlay({
    soundMotion: input.soundMotion,
    reduceMotion: input.reduceMotion === true || input.prefersReducedMotion === true,
  })
}

/** True when the current lesson id moves forward along the path order. */
export function mapPathAdvanced(fromId: string | null, toId: string | null, ids: readonly string[]): boolean {
  if (!fromId || !toId || fromId === toId) return false
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  return from >= 0 && to > from
}

/** Hard-cut pose. Walk wins over the blink loop. Motion off is always idle. */
export function mapPresencePose(input: { play: boolean; advancing: boolean; elapsedMs: number }): MapPose {
  if (!input.play) return 'idle'
  const elapsed = Math.max(0, input.elapsedMs)
  if (input.advancing) {
    const step = Math.floor(elapsed / MAP_WALK_MS)
    if (step >= 0 && step < MAP_WALK_POSES.length) return MAP_WALK_POSES[step]
    return 'idle'
  }
  const cycle = MAP_IDLE_HOLD_MS + MAP_BLINK_MS
  const at = elapsed % cycle
  return at >= MAP_IDLE_HOLD_MS ? 'blink' : 'idle'
}

/** Milliseconds until the next hard cut. Never zero, so a timer cannot spin. */
export function mapPoseDelay(advancing: boolean, elapsedMs: number): number {
  const elapsed = Math.max(0, elapsedMs)
  if (advancing) {
    const step = Math.floor(elapsed / MAP_WALK_MS)
    if (step < MAP_WALK_POSES.length) {
      const into = elapsed - step * MAP_WALK_MS
      return Math.max(16, MAP_WALK_MS - into)
    }
  }
  const cycle = MAP_IDLE_HOLD_MS + MAP_BLINK_MS
  const at = elapsed % cycle
  if (at < MAP_IDLE_HOLD_MS) return Math.max(16, MAP_IDLE_HOLD_MS - at)
  return Math.max(16, cycle - at)
}
