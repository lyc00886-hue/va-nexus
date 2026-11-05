import { useEffect, useState } from 'react'
import {
  MAP_UX_ONE_VALUE,
  MAP_UX_STORAGE_KEY,
  MAP_VERSION_EVENT,
  mapOneEnabled,
  mapUxPersist,
  mapVersionSearch,
  type MapVersion,
} from './mapUx'

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
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return mapOneEnabled(window.location.search, readStored())
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    writeStored(mapUxPersist(window.location.search))
    const sync = () => {
      const search = window.location.search
      writeStored(mapUxPersist(search))
      setEnabled(mapOneEnabled(search, readStored()))
    }
    window.addEventListener('popstate', sync)
    window.addEventListener(MAP_VERSION_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(MAP_VERSION_EVENT, sync)
    }
  }, [])

  return enabled
}

/** Switch 闖關 / 原版. Persists with the existing map1 flag. `off` stays a classic alias on read. */
export function selectMapVersion(version: MapVersion) {
  if (typeof window === 'undefined') return
  const next = mapVersionSearch(window.location.search, version)
  const url = `${window.location.pathname}${next}${window.location.hash}`
  window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new Event(MAP_VERSION_EVENT))
}
