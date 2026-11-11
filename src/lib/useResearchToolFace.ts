import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { getF4Units } from '../game/f4Demo'
import { getF5Units } from '../game/f5Demo'
import { getF6Units } from '../game/f6Demo'
import { researchToolFace, type ResearchToolFace } from './researchToolPair'

export function useResearchToolFace(): ResearchToolFace | null {
  const { currentNodeId } = useGame()
  const f4 = getF4Units()
  const f5 = getF5Units()
  const f6 = getF6Units()
  return useMemo(
    () =>
      researchToolFace(
        [
          { grade: 'f4', units: f4 },
          { grade: 'f5', units: f5 },
          { grade: 'f6', units: f6 },
        ],
        currentNodeId,
      ),
    [f4, f5, f6, currentNodeId],
  )
}
