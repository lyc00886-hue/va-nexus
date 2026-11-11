/**
 * Positions for the vertical quest path. Shared by the scene art and the node buttons.
 * Five scene bands reuse one language for every year. The path stays in the open corridor.
 */

export type QuestPathPoint = { x: number; y: number }

export const QUEST_BANDS = ['garden', 'studio', 'classroom', 'frames', 'exam'] as const

export type QuestBandId = (typeof QUEST_BANDS)[number]

export type QuestNodeProgress = 'done' | 'current' | 'locked'

/** Left node, right node. Scene cards sit on the opposite side. */
const NODE_X = [112, 248] as const

const WIDTH = 360
const TOP = 118
/** Room under a two-line unit name so the tag clears the next scene card. */
const GAP = 236

/** Share of the path width used by a unit-name tag. Kept off the scene cards. */
export const QUEST_LABEL_WIDTH_RATIO = 0.44

const LABEL_TOP = 28
const LABEL_HEIGHT = 108

export function questBand(index: number): QuestBandId {
  return QUEST_BANDS[index % QUEST_BANDS.length]
}

/** A framed checkpoint marks the picture-wall band. Other bands use a ring. */
export function questNodeFramed(index: number): boolean {
  return questBand(index) === 'frames'
}

/** Fresh entry starts at the first unit. Earlier units are done; later units stay locked. */
export function questCurrentIndex(completed: number, count: number): number {
  if (count <= 0) return 0
  const done = Math.max(0, Math.floor(completed))
  return Math.min(done, count - 1)
}

export function questNodeProgress(index: number, currentIndex: number): QuestNodeProgress {
  if (index < currentIndex) return 'done'
  if (index === currentIndex) return 'current'
  return 'locked'
}

export function questPathLayout(count: number): { width: number; height: number; points: QuestPathPoint[] } {
  const points = Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    x: NODE_X[index % 2],
    y: TOP + index * GAP,
  }))
  const height = (points[points.length - 1]?.y ?? TOP) + 124
  return { width: WIDTH, height, points }
}

/** Scene card on the side opposite the node, inset from the unit-name tag. */
export function questSceneBox(index: number, point: QuestPathPoint): { x: number; y: number; w: number; h: number } {
  const w = 128
  const h = 124
  const y = point.y - 52
  const x = index % 2 === 0 ? 226 : 6
  return { x, y, w, h }
}

/** Unit-name tag under the node. The box stays in the path corridor, clear of scene art. */
export function questLabelBox(point: QuestPathPoint): { x: number; y: number; w: number; h: number } {
  const w = WIDTH * QUEST_LABEL_WIDTH_RATIO
  return { x: point.x - w / 2, y: point.y + LABEL_TOP, w, h: LABEL_HEIGHT }
}
