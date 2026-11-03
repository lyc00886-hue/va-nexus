import { useCallback, useRef, useState } from 'react'
import {
  loadSbaSeriesOutline,
  saveSbaSeriesOutline,
  withChecklistToggle,
  withPieceStatus,
  withPieceText,
  withPieceType,
  withPortfolio,
  withRwbPrompt,
  type OutlinePieceStatus,
  type OutlinePieceType,
  type OutlineState,
  type PieceTextKey,
  type PortfolioKey,
  type RwbStepKey,
} from './sbaSeriesOutline.ts'
import type { SlotId } from './sbaArtworkSlots.ts'

export function useSbaSeriesOutline() {
  const [state, setState] = useState<OutlineState>(() => loadSbaSeriesOutline())
  const ref = useRef(state)

  const commit = useCallback((next: OutlineState) => {
    if (next === ref.current) return
    ref.current = next
    saveSbaSeriesOutline(next)
    setState(next)
  }, [])

  const setPortfolio = useCallback(
    (key: PortfolioKey, value: string) => commit(withPortfolio(ref.current, key, value)),
    [commit],
  )
  const setPieceText = useCallback(
    (slot: SlotId, key: PieceTextKey, value: string) => commit(withPieceText(ref.current, slot, key, value)),
    [commit],
  )
  const setPieceType = useCallback(
    (slot: SlotId, type: OutlinePieceType) => commit(withPieceType(ref.current, slot, type)),
    [commit],
  )
  const setPieceStatus = useCallback(
    (slot: SlotId, status: OutlinePieceStatus) => commit(withPieceStatus(ref.current, slot, status)),
    [commit],
  )
  const setRwb = useCallback(
    (step: RwbStepKey, index: number, value: string) => commit(withRwbPrompt(ref.current, step, index, value)),
    [commit],
  )
  const toggleCheck = useCallback(
    (slot: SlotId, itemId: string) => commit(withChecklistToggle(ref.current, slot, itemId)),
    [commit],
  )
  const replace = useCallback((next: OutlineState) => commit(next), [commit])

  return {
    state,
    setPortfolio,
    setPieceText,
    setPieceType,
    setPieceStatus,
    setRwb,
    toggleCheck,
    replace,
  }
}
