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

/** True only after an explicit gear opt-in, and never while display reduce-motion is on. */
export function softMotionPlay(input: { soundMotion: boolean; reduceMotion: boolean }): boolean {
  return input.soundMotion === true && input.reduceMotion !== true
}
