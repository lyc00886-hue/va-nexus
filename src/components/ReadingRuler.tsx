import { useEffect } from 'react'
import { useSen } from '../context/SenContext'

const LINE_SELECTOR = [
  '[data-lesson-body]',
  '[data-official-parts] p',
  '[data-official-parts] h3',
  '[data-official-parts] h4',
  '[data-lesson-scroll] h3',
].join(', ')

type LineBox = { left: number; top: number; width: number; height: number }

function caretHit(x: number, y: number): Node | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y)
    if (range?.startContainer) return range.startContainer
  }
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y)
    if (pos?.offsetNode) return pos.offsetNode
  }
  return null
}

function zoneOf(node: Node | null): HTMLElement | null {
  const el = node instanceof Element ? node : node?.parentElement
  const zone = el?.closest(LINE_SELECTOR)
  return zone instanceof HTMLElement ? zone : null
}

function lineRects(zone: HTMLElement): DOMRect[] {
  const rects: DOMRect[] = []
  const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if ((node.textContent ?? '').trim()) {
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (rect.width > 0 && rect.height > 0 && rect.height < 80) rects.push(rect)
      }
    }
    node = walker.nextNode()
  }
  return rects
}

/** Viewport line box under the pointer. One wrapped line, not the whole paragraph. */
function lineBoxAt(x: number, y: number): LineBox | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const zone = zoneOf(caretHit(x, y)) ?? zoneOf(document.elementFromPoint(x, y))
  if (!zone) return null
  const host = zone.getBoundingClientRect()
  if (y < host.top - 3 || y > host.bottom + 3 || x < host.left - 3 || x > host.right + 3) return null
  const rects = lineRects(zone)
  let line = rects.find((rect) => y >= rect.top - 2 && y <= rect.bottom + 2)
  if (!line && rects.length > 0) {
    line = rects.reduce((best, rect) => {
      const mid = (rect.top + rect.bottom) / 2
      const bestMid = (best.top + best.bottom) / 2
      return Math.abs(mid - y) < Math.abs(bestMid - y) ? rect : best
    })
  }
  if (!line) return null
  const top = Math.max(line.top, host.top)
  const bottom = Math.min(line.bottom, host.bottom)
  const height = bottom - top
  if (height < 1 || host.width < 1) return null
  return { left: host.left, top, width: host.width, height }
}

function pointOf(event: Event): { x: number; y: number } | null {
  if (window.TouchEvent && event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0]
    if (!touch || !Number.isFinite(touch.clientX) || !Number.isFinite(touch.clientY)) return null
    return { x: touch.clientX, y: touch.clientY }
  }
  if (event instanceof MouseEvent && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    return { x: event.clientX, y: event.clientY }
  }
  return null
}

/** Soft one-line guide. Follows pointer and finger from the event coordinates. No fade. */
export function ReadingRuler() {
  const { settings } = useSen()

  useEffect(() => {
    if (!settings.ruler) return
    const bar = document.createElement('div')
    bar.className = 'reading-ruler'
    bar.setAttribute('data-line-guide', 'off')
    bar.setAttribute('aria-hidden', 'true')
    bar.setAttribute('popover', 'manual')
    bar.style.visibility = 'hidden'
    document.documentElement.appendChild(bar)
    try {
      bar.showPopover()
    } catch {
      /* the fixed bar stays on the root when the top layer is unavailable */
    }

    const paint = (box: LineBox | null) => {
      if (!box) {
        bar.style.visibility = 'hidden'
        bar.setAttribute('data-line-guide', 'off')
        return
      }
      bar.style.visibility = 'visible'
      bar.style.left = `${box.left}px`
      bar.style.top = `${box.top}px`
      bar.style.width = `${box.width}px`
      bar.style.height = `${box.height}px`
      bar.setAttribute('data-line-guide', 'on')
    }

    let lastX = Number.NaN
    let lastY = Number.NaN
    const follow = (x: number, y: number) => {
      lastX = x
      lastY = y
      paint(lineBoxAt(x, y))
    }
    const onEvent = (event: Event) => {
      const point = pointOf(event)
      if (!point) return
      follow(point.x, point.y)
    }
    const onScroll = () => {
      if (!Number.isFinite(lastX) || !Number.isFinite(lastY)) return
      paint(lineBoxAt(lastX, lastY))
    }
    const hide = () => paint(null)
    const listen = { passive: true, capture: true } as const
    const types = [
      'pointermove',
      'mousemove',
      'pointerrawupdate',
      'pointerover',
      'mouseover',
      'pointerdown',
      'mousedown',
      'touchstart',
      'touchmove',
    ]
    for (const type of types) window.addEventListener(type, onEvent, listen)
    document.addEventListener('scroll', onScroll, listen)
    window.addEventListener('blur', hide)
    return () => {
      for (const type of types) window.removeEventListener(type, onEvent, listen)
      document.removeEventListener('scroll', onScroll, listen)
      window.removeEventListener('blur', hide)
      try {
        bar.hidePopover()
      } catch {
        /* already closed */
      }
      bar.remove()
    }
  }, [settings.ruler])

  return null
}
