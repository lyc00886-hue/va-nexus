import { currentUnitFace, type CropAskGrade } from './cropAsk.ts'

export type ResearchToolUnit = {
  id: string
  title: string
  nodes?: readonly { id: string }[]
}

export type ResearchToolFace = {
  grade: CropAskGrade
  id: string
  title: string
}

/**
 * The unit both tools share. It follows the current course node when that node
 * sits in a Form 4, Form 5, or Form 6 pack, and otherwise the first usable unit.
 * Map mode is not an input, so quest and classic open the same draft.
 */
export function researchToolFace(
  packs: readonly { grade: CropAskGrade; units: readonly ResearchToolUnit[] }[],
  currentNodeId: string | null,
): ResearchToolFace | null {
  if (currentNodeId) {
    for (const pack of packs) {
      for (const unit of pack.units) {
        if (!unit.nodes?.some((node) => node.id === currentNodeId)) continue
        const face = currentUnitFace([unit], unit.id)
        if (face) return { grade: pack.grade, id: face.id, title: face.title }
      }
    }
  }
  for (const pack of packs) {
    const face = currentUnitFace(pack.units, null)
    if (face) return { grade: pack.grade, id: face.id, title: face.title }
  }
  return null
}
