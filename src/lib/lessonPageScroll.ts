import { nextContainedScrollTop, wheelDeltaPixels } from './panelWheel.ts'

export type LessonScrollId = 'body' | 'art'

export type LessonScrollCandidate = {
  id: LessonScrollId
  containsTarget: boolean
  overflows: boolean
}

/**
 * Classroom page wheel: move the lesson body when the pointer is outside it.
 * A wheel already on an overflowing scroller stays with that scroller.
 * A card that fits without scrolling is left alone.
 */
export function pickLessonScrollTarget(candidates: readonly LessonScrollCandidate[]): LessonScrollId | null {
  const live = candidates.filter((candidate) => candidate.overflows)
  if (live.length === 0) return null
  if (live.some((candidate) => candidate.containsTarget)) return null
  if (live.some((candidate) => candidate.id === 'body')) return 'body'
  if (live.some((candidate) => candidate.id === 'art')) return 'art'
  return null
}

function lineBox(el: HTMLElement): number {
  const style = getComputedStyle(el)
  const parsed = Number.parseFloat(style.lineHeight)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  const font = Number.parseFloat(style.fontSize)
  return Number.isFinite(font) && font > 0 ? font * 1.5 : 16
}

function scrollId(node: HTMLElement): LessonScrollId {
  return node.getAttribute('data-lesson-scroll') === 'art' ? 'art' : 'body'
}

export function resolveLessonScrollElement(root: HTMLElement, eventTarget: EventTarget | null): HTMLElement | null {
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-lesson-scroll]')]
  const candidates = nodes.map((node) => ({
    id: scrollId(node),
    containsTarget: eventTarget instanceof Node && node.contains(eventTarget),
    overflows: node.scrollHeight > node.clientHeight + 1,
    node,
  }))
  const pick = pickLessonScrollTarget(candidates)
  if (!pick) return null
  return candidates.find((candidate) => candidate.id === pick && candidate.overflows)?.node ?? null
}

/** Wheel and touch on the classroom page move the lesson body, including the cream page around the card. */
export function bindLessonPageScroll(root: HTMLElement): () => void {
  const onWheel = (event: WheelEvent) => {
    if (event.deltaY === 0) return
    const target = resolveLessonScrollElement(root, event.target)
    if (!target) return
    const delta = wheelDeltaPixels(event.deltaY, event.deltaMode, lineBox(target), target.clientHeight)
    const next = nextContainedScrollTop(target.scrollTop, target.scrollHeight, target.clientHeight, delta)
    if (next === target.scrollTop) return
    target.scrollTop = next
    event.preventDefault()
  }

  let originY = 0
  let dragging: HTMLElement | null = null
  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      dragging = null
      return
    }
    dragging = resolveLessonScrollElement(root, event.target)
    originY = event.touches[0]?.clientY ?? 0
  }
  const onTouchMove = (event: TouchEvent) => {
    if (!dragging || event.touches.length !== 1) return
    const y = event.touches[0]?.clientY ?? originY
    const delta = originY - y
    originY = y
    const next = nextContainedScrollTop(dragging.scrollTop, dragging.scrollHeight, dragging.clientHeight, delta)
    if (next === dragging.scrollTop) return
    dragging.scrollTop = next
    event.preventDefault()
  }
  const endTouch = () => {
    dragging = null
  }

  root.addEventListener('wheel', onWheel, { capture: true, passive: false })
  root.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  root.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
  root.addEventListener('touchend', endTouch, { capture: true })
  root.addEventListener('touchcancel', endTouch, { capture: true })
  return () => {
    root.removeEventListener('wheel', onWheel, { capture: true })
    root.removeEventListener('touchstart', onTouchStart, { capture: true })
    root.removeEventListener('touchmove', onTouchMove, { capture: true })
    root.removeEventListener('touchend', endTouch, { capture: true })
    root.removeEventListener('touchcancel', endTouch, { capture: true })
  }
}
