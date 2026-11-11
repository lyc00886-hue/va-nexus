/**
 * Student portfolio score folds. Two groups, this visit only.
 * Empty starts closed. A group with results starts open.
 * A manual change sticks for the visit. Empty → results follows the default
 * only until the student has opened or closed that group.
 * Nothing here is written to storage.
 */
import { useCallback, useState } from 'react'

/** Placeholders that are not a school reference result. */
const NOW_EMPTY = ['未有參考結果', '未有参考结果', 'No reference result yet'] as const

/** Placeholders that are not an AI reference result. */
const LATER_EMPTY = ['未有上傳參考', '未有上传参考', 'No upload reference yet', ...NOW_EMPTY] as const

export type ScoreFoldMemory = {
  open: boolean
  manual: boolean
  hadResults: boolean
}

function meaningful(text: string | null | undefined, empty: readonly string[]): boolean {
  if (typeof text !== 'string') return false
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return false
  return !empty.includes(trimmed)
}

/** Group 1: a school reference band, or school reference comment text. */
export function scoreFoldNowHasResults(input: { band: string | null; comment?: string | null }): boolean {
  if (input.band) return true
  return meaningful(input.comment, NOW_EMPTY)
}

/** Group 2: an approximate band, a reference comment, or a drawable AI reference radar. */
export function scoreFoldLaterHasResults(input: {
  approxBand: string | null
  comment?: string | null
  radarDrawable: boolean
}): boolean {
  if (input.approxBand) return true
  if (input.radarDrawable) return true
  return meaningful(input.comment, LATER_EMPTY)
}

export function initialScoreFold(hasResults: boolean): ScoreFoldMemory {
  return { open: hasResults, manual: false, hadResults: hasResults }
}

export function reduceScoreFold(state: ScoreFoldMemory, hasResults: boolean): ScoreFoldMemory {
  if (state.hadResults === hasResults) return state
  if (!state.manual && !state.hadResults && hasResults) {
    return { open: true, manual: false, hadResults: true }
  }
  return { ...state, hadResults: hasResults }
}

export function toggleScoreFold(state: ScoreFoldMemory): ScoreFoldMemory {
  return { ...state, open: !state.open, manual: true }
}

/** In-memory for this visit. Unmounting the surface starts from the default again. */
export function useScoreFold(hasResults: boolean): { open: boolean; manual: boolean; toggle: () => void } {
  const [state, setState] = useState(() => initialScoreFold(hasResults))
  if (state.hadResults !== hasResults) {
    const next = reduceScoreFold(state, hasResults)
    if (next !== state) setState(next)
  }
  const toggle = useCallback(() => {
    setState((prev) => toggleScoreFold(prev))
  }, [])
  return { open: state.open, manual: state.manual, toggle }
}
