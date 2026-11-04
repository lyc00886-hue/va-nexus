import { useEffect, useState } from 'react'
import { mapPathAdvanced, mapWalkMs } from '../game/softMotion'

/**
 * True only during the walk window after the current lesson moves forward.
 * Opening the map, expanding it, or moving backward does not walk.
 */
export function useMapPathAdvance(currentId: string | null, ids: readonly string[]): boolean {
  const [seen, setSeen] = useState(currentId)
  const [walk, setWalk] = useState({ gen: 0, on: false })
  if (currentId !== seen) {
    const forward = mapPathAdvanced(seen, currentId, ids)
    setSeen(currentId)
    if (forward) setWalk((prev) => ({ gen: prev.gen + 1, on: true }))
    else if (walk.on) setWalk((prev) => ({ gen: prev.gen, on: false }))
  }
  useEffect(() => {
    if (!walk.on) return
    const gen = walk.gen
    const timer = window.setTimeout(() => {
      setWalk((prev) => (prev.gen === gen ? { gen, on: false } : prev))
    }, mapWalkMs())
    return () => window.clearTimeout(timer)
  }, [walk.gen, walk.on])
  return walk.on
}
