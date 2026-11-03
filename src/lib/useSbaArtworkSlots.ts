import { useCallback, useRef, useState } from 'react'
import {
  loadSbaArtworkSlots,
  saveSbaArtworkSlots,
  type PieceType,
  type SbaArtworkSlotsState,
  type SlotId,
} from './sbaArtworkSlots'

export function useSbaArtworkSlots() {
  const [state, setState] = useState<SbaArtworkSlotsState>(() => loadSbaArtworkSlots())
  const ref = useRef(state)

  const commit = useCallback((next: SbaArtworkSlotsState) => {
    ref.current = next
    saveSbaArtworkSlots(next)
    setState(next)
  }, [])

  const setActive = useCallback(
    (active: SlotId) => {
      if (ref.current.active === active) return
      commit({ ...ref.current, active })
    },
    [commit],
  )

  const setType = useCallback(
    (slot: SlotId, type: PieceType | null) => {
      if (ref.current.types[slot] === type) return
      commit({ ...ref.current, types: { ...ref.current.types, [slot]: type } })
    },
    [commit],
  )

  const tagEvidence = useCallback(
    (ids: string[], slot: SlotId) => {
      if (ids.length === 0) return
      const evidenceSlots = { ...ref.current.evidenceSlots }
      let changed = false
      for (const id of ids) {
        if (evidenceSlots[id] !== slot) {
          evidenceSlots[id] = slot
          changed = true
        }
      }
      if (!changed) return
      commit({ ...ref.current, evidenceSlots })
    },
    [commit],
  )

  const untagEvidence = useCallback(
    (id: string) => {
      if (!(id in ref.current.evidenceSlots)) return
      const evidenceSlots = { ...ref.current.evidenceSlots }
      delete evidenceSlots[id]
      commit({ ...ref.current, evidenceSlots })
    },
    [commit],
  )

  return {
    active: state.active,
    types: state.types,
    setActive,
    setType,
    tagEvidence,
    untagEvidence,
  }
}
