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
const GAP = 186

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

/** Scene card on the side opposite the node, so furniture does not cover the path. */
export function questSceneBox(index: number, point: QuestPathPoint): { x: number; y: number; w: number; h: number } {
  const w = 148
  const h = 132
  const y = point.y - 62
  const x = index % 2 === 0 ? 206 : 8
  return { x, y, w, h }
}
