import { MOTION_V2_CELEBRATE_MS, MOTION_V2_OTTER, SOFT_EVENTS, celebratePoses, type CelebratePose } from '../../game/softMotion'

const SPARKLES = [12, 22, 30, 40] as const

const FRAME_CLASS: Record<CelebratePose, string> = {
  idle: 'soft-celebrate-idle relative z-0 block h-auto w-full',
  clap: 'soft-celebrate-clap absolute inset-0 z-[1] h-full w-full',
  nod: 'soft-celebrate-nod absolute inset-0 z-[2] h-full w-full',
}

/**
 * Lesson-complete still. The mood keeps the check.
 * The otter is a visible idle → clap → nod → idle layer (800ms) when play is on.
 * Gear off or reduce-motion mounts the idle still only. The 6px peek is not this screen.
 */
export function LessonCompleteFrame({ play }: { play: boolean }) {
  const event = SOFT_EVENTS.lessonComplete
  const sequence = celebratePoses(play)
  const shown: CelebratePose[] = play ? ['idle', 'clap', 'nod'] : ['idle']
  return (
    <div
      data-soft-motion={play ? event.motion : 'off'}
      data-soft-event={event.motion}
      data-soft-sfx={event.sfx}
      className={`soft-frame relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl ${play ? 'soft-motion-on' : ''}`}
      style={{
        ['--soft-ms' as string]: `${event.ms}ms`,
        ['--celebrate-ms' as string]: `${MOTION_V2_CELEBRATE_MS}ms`,
      }}
    >
      <img
        src={event.mood}
        alt=""
        width={1152}
        height={864}
        className="soft-check w-full rounded-3xl object-contain"
        decoding="async"
      />
      <div
        className="soft-otter-celebrate pointer-events-none absolute bottom-0 right-0 w-[58%]"
        data-otter-celebrate={play ? 'play' : 'idle'}
        data-celebrate-sequence={sequence.join(' ')}
        data-celebrate-ms={MOTION_V2_CELEBRATE_MS}
        aria-hidden
      >
        {shown.map((pose) => (
          <img
            key={pose}
            src={MOTION_V2_OTTER[pose]}
            alt=""
            width={1024}
            height={1024}
            data-frame={pose}
            className={FRAME_CLASS[pose]}
            decoding="async"
          />
        ))}
      </div>
      {play
        ? SPARKLES.map((left) => (
            <span
              key={left}
              aria-hidden
              className="soft-spark pointer-events-none absolute z-[3] h-1.5 w-1.5 rounded-full bg-[#0D9488]"
              style={{ left: `${left}%`, top: `${18 + (left % 5) * 4}%` }}
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
