import { useEffect, useState } from 'react'
import {
  RESEARCH_UX_STEPS_VALUE,
  RESEARCH_UX_STORAGE_KEY,
  researchStepsEnabled,
  researchUxPersist,
} from './researchUx'

function readStored(): string | null {
  try {
    return localStorage.getItem(RESEARCH_UX_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(action: 'set' | 'clear' | 'keep') {
  try {
    if (action === 'set') localStorage.setItem(RESEARCH_UX_STORAGE_KEY, RESEARCH_UX_STEPS_VALUE)
    if (action === 'clear') localStorage.removeItem(RESEARCH_UX_STORAGE_KEY)
  } catch {
    /* private mode / blocked storage — the query param still applies for this load */
  }
}

/** Research page only. False unless this browser opted into the preview shell. */
export function useResearchStepsShell(): boolean {
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return researchStepsEnabled(window.location.search, readStored())
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Remember the query choice for the next visit. First paint already used the same rule.
    writeStored(researchUxPersist(window.location.search))
  }, [])

  return enabled
}
