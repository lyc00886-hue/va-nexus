/** Positions for the static vertical quest path. Shared by the art and the node buttons. */

export type QuestPathPoint = { x: number; y: number }

export function questPathLayout(count: number): { width: number; height: number; points: QuestPathPoint[] } {
  const width = 360
  const gap = 132
  const top = 64
  const points = Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    x: index % 2 === 0 ? 118 : 248,
    y: top + index * gap,
  }))
  const height = (points[points.length - 1]?.y ?? top) + 78
  return { width, height, points }
}
