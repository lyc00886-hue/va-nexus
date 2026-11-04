/** How many nodes past the current lesson the default map shows. */
export const MAP_PATH_AHEAD = 2

export type MapPathViewportNode = {
  id: string
  done: boolean
  current: boolean
}

/**
 * Default path window: one recent done lesson, the current lesson,
 * and up to two nodes ahead. The rest of the year stays behind "show more".
 * Lessons the student already opened stay visible so the player is not clipped.
 */
export function mapPathVisibleIds(
  nodes: readonly MapPathViewportNode[],
  options?: { expanded?: boolean; openIds?: ReadonlySet<string>; ahead?: number },
): string[] {
  if (options?.expanded) return nodes.map((node) => node.id)
  if (nodes.length === 0) return []
  const ahead = options?.ahead ?? MAP_PATH_AHEAD
  let anchor = nodes.findIndex((node) => node.current)
  if (anchor < 0) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].done) {
        anchor = i
        break
      }
    }
  }
  if (anchor < 0) anchor = 0
  const start = anchor > 0 && nodes[anchor - 1].done ? anchor - 1 : anchor
  const end = Math.min(nodes.length - 1, anchor + Math.max(0, ahead))
  const keep = new Set<string>()
  for (let i = start; i <= end; i++) keep.add(nodes[i].id)
  const openIds = options?.openIds
  if (openIds) {
    for (const node of nodes) {
      if (openIds.has(node.id)) keep.add(node.id)
    }
  }
  return nodes.filter((node) => keep.has(node.id)).map((node) => node.id)
}
