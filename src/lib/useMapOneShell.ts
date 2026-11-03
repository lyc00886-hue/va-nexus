import { useEffect, useState } from 'react'
import { MAP_UX_ONE_VALUE, MAP_UX_STORAGE_KEY, mapOneEnabled, mapUxPersist } from './mapUx'

function readStored(): string | null {
  try {
    return localStorage.getItem(MAP_UX_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(action: 'set' | 'clear' | 'keep') {
  try {
    if (action === 'set') localStorage.setItem(MAP_UX_STORAGE_KEY, MAP_UX_ONE_VALUE)
    if (action === 'clear') localStorage.removeItem(MAP_UX_STORAGE_KEY)
  } catch {
    /* private mode / blocked storage — the query param still applies for this load */
  }
}

/** Learning Map only. False unless this browser opted into the one-lesson preview. */
export function useMapOneShell(): boolean {
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return mapOneEnabled(window.location.search, readStored())
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    writeStored(mapUxPersist(window.location.search))
  }, [])

  return enabled
}
