import { MOOD_OTTER_PEEK, SOFT_EVENTS } from '../../game/softMotion'

const SPARKLES = [14, 30, 48, 62, 76, 88] as const

/**
 * One-shot lesson-complete frame. The mood already holds the check and otter.
 * Peek is the re-passed otter. Sparkles render only while motion is allowed.
 */
export function LessonCompleteFrame({ play }: { play: boolean }) {
  const event = SOFT_EVENTS.lessonComplete
  return (
    <div
      data-soft-motion={play ? event.motion : 'off'}
      data-soft-event={event.motion}
      data-soft-sfx={event.sfx}
      className={`soft-frame relative mx-auto w-full max-w-sm ${play ? 'soft-motion-on' : ''}`}
      style={{ ['--soft-ms' as string]: `${event.ms}ms` }}
    >
      <img
        src={event.mood}
        alt=""
        width={1152}
        height={864}
        className="soft-check w-full rounded-3xl object-contain"
        decoding="async"
      />
      <img
        src={MOOD_OTTER_PEEK}
        alt=""
        width={160}
        height={160}
        data-otter="peek"
        className="soft-otter pointer-events-none absolute bottom-1 right-1 h-16 w-16 rounded-2xl bg-[#FFF9E9] object-cover object-top shadow-sm"
        decoding="async"
      />
      {play
        ? SPARKLES.map((left) => (
            <span
              key={left}
              aria-hidden
              className="soft-spark pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[#0D9488]"
              style={{ left: `${left}%`, top: `${16 + (left % 7) * 6}%` }}
            />
          ))
        : null}
    </div>
  )
}

/** Open-chest end frame. The raster is already open; motion is one warm glow. */
export function ChestOpenFrame({ play }: { play: boolean }) {
  const event = SOFT_EVENTS.chestOpen
  return (
    <div
      data-soft-motion={play ? event.motion : 'off'}
      data-soft-event={event.motion}
      data-soft-sfx={event.sfx}
      className={`soft-frame relative mx-auto w-full max-w-xs ${play ? 'soft-motion-on' : ''}`}
    >
      <img
        src={event.mood}
        alt=""
        width={1152}
        height={864}
        className="soft-chest w-full rounded-3xl object-contain"
        decoding="async"
      />
      {play ? <span aria-hidden className="soft-chest-glow pointer-events-none absolute inset-6 rounded-3xl" /> : null}
    </div>
  )
}

/** Short step confirmation. Omitted when motion is off so the step change stays instant. */
export function StepAdvanceMark({ play, tick }: { play: boolean; tick: number }) {
  if (!play || tick < 1) return null
  const event = SOFT_EVENTS.stepAdvance
  return (
    <img
      key={tick}
      src={event.mood}
      alt=""
      width={1152}
      height={864}
      data-soft-motion={event.motion}
      data-soft-event={event.motion}
      data-soft-sfx={event.sfx}
      className="soft-step-mood mx-auto h-12 w-auto max-w-full object-contain"
      decoding="async"
    />
  )
}
