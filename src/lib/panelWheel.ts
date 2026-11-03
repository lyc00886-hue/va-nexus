/** deltaMode: 0 pixel, 1 line, 2 page (WheelEvent constants, without touching the DOM). */
export function wheelDeltaPixels(
  delta: number,
  deltaMode: number,
  lineHeight: number,
  pageSize: number,
): number {
  if (!Number.isFinite(delta) || delta === 0) return 0
  if (deltaMode === 1) {
    const line = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 16
    return delta * line
  }
  if (deltaMode === 2) {
    const page = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 0
    return delta * page
  }
  return delta
}

/** Clamp a vertical wheel so it stays inside one scroller. */
export function nextContainedScrollTop(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  deltaY: number,
): number {
  const max = Math.max(0, scrollHeight - clientHeight)
  const base = Number.isFinite(scrollTop) ? scrollTop : 0
  const next = base + (Number.isFinite(deltaY) ? deltaY : 0)
  if (next <= 0) return 0
  if (next >= max) return max
  return next
}

export type WheelHit = {
  clientX: number
  clientY: number
  target: unknown
}

export type WheelBox = {
  contains: (node: unknown) => boolean
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * True when the pointer is over the open panel.
 * A wheel whose hit target is the page behind the panel still counts when
 * the coordinates land on the panel box (desktop sticky-header miss).
 */
export function wheelHitsPanel(box: WheelBox, event: WheelHit): boolean {
  if (box.contains(event.target)) return true
  return (
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom
  )
}
