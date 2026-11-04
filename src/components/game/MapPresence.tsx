import { useEffect, useState } from 'react'
import { useSen } from '../../context/SenContext'
import {
  MAP_BLINK_MS,
  MAP_WALK_MS,
  MOTION_V2_MAP,
  mapMotionPlay,
  mapPoseDelay,
  mapPresencePose,
  type MapPose,
} from '../../game/softMotion'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return reduced
}

/**
 * One img. The next pose replaces its src.
 * Stacked opacities would ghost the RGB walk frames over the idle still, so they are not used.
 * The first pose is set while rendering. Later cuts are timers, not a CSS crossfade.
 */
function useMapPose(play: boolean, advancing: boolean): MapPose {
  const key = !play ? 'off' : advancing ? 'walk' : 'rest'
  const [seen, setSeen] = useState(key)
  const [pose, setPose] = useState<MapPose>(key === 'walk' ? 'walk-1' : 'idle')
  if (key !== seen) {
    setSeen(key)
    setPose(key === 'walk' ? 'walk-1' : 'idle')
  }
  useEffect(() => {
    if (!play) return
    let stopped = false
    let timer = 0
    const started = performance.now()
    const schedule = (elapsed: number) => {
      timer = window.setTimeout(() => {
        if (stopped) return
        const nowElapsed = performance.now() - started
        const next = mapPresencePose({ play: true, advancing, elapsedMs: nowElapsed })
        setPose((prev) => (prev === next ? prev : next))
        schedule(nowElapsed)
      }, mapPoseDelay(advancing, elapsed))
    }
    schedule(0)
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [play, advancing])
  return play ? pose : 'idle'
}

/** Otter on the current map node. Gear off or reduce-motion is the idle still. */
export function MapPresence({ advancing }: { advancing: boolean }) {
  const { settings } = useSen()
  const prefersReducedMotion = usePrefersReducedMotion()
  const play = mapMotionPlay({
    soundMotion: settings.soundMotion,
    reduceMotion: settings.reduceMotion,
    prefersReducedMotion,
  })
  const pose = useMapPose(play, play && advancing)
  useEffect(() => {
    if (!play) return
    for (const src of Object.values(MOTION_V2_MAP)) {
      const img = new Image()
      img.src = src
    }
  }, [play])
  return (
    <div
      data-otter-map={play ? 'play' : 'idle'}
      data-map-pose={pose}
      data-map-advance={play && advancing ? 'on' : 'off'}
      data-map-blink-ms={MAP_BLINK_MS}
      data-map-walk-ms={MAP_WALK_MS}
      className="soft-map-otter relative mx-auto w-36 overflow-hidden rounded-[1.6rem] bg-[#FFF9E9] ring-4 ring-[#b7ebe4] shadow-[0_0_22px_rgba(47,157,150,0.35)]"
      aria-hidden
    >
      <img
        src={MOTION_V2_MAP[pose]}
        alt=""
        width={1024}
        height={1024}
        data-frame={pose}
        draggable={false}
        className="block h-auto w-full"
        style={{ transition: 'none', animation: 'none', opacity: 1 }}
        decoding="sync"
      />
    </div>
  )
}
