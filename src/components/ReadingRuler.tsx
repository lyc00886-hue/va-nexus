import { useEffect } from 'react'
import { useSen } from '../context/SenContext'

const LINE_SELECTOR = [
  '[data-lesson-body]',
  '[data-official-parts] p',
  '[data-official-parts] h3',
  '[data-official-parts] h4',
  '[data-lesson-scroll] h3',
].join(', ')

const LINE_MARK = 'data-reading-line'

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
  const marked = document
    .elementsFromPoint(x, y)
    .find((el) => el instanceof HTMLElement && el.hasAttribute(LINE_MARK))
  if (marked instanceof HTMLElement) return boxFromMark(marked)
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

function boxFromMark(el: HTMLElement): LineBox | null {
  const zone = el.closest(LINE_SELECTOR)
  const host = zone instanceof HTMLElement ? zone.getBoundingClientRect() : el.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  if (rect.height < 1 || host.width < 1) return null
  const top = Math.max(rect.top, host.top)
  const bottom = Math.min(rect.bottom, host.bottom)
  const height = bottom - top
  if (height < 1) return null
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

function unwrapLines(root: ParentNode) {
  const parents = new Set<Node>()
  for (const span of [...root.querySelectorAll(`[${LINE_MARK}]`)]) {
    const parent = span.parentNode
    span.replaceWith(document.createTextNode(span.textContent ?? ''))
    if (parent) parents.add(parent)
  }
  for (const parent of parents) parent.normalize()
}

/** One span per wrapped line, so a device-mode cursor can rest on that line alone. */
function splitLines(root: ParentNode) {
  const zones = [...root.querySelectorAll(LINE_SELECTOR)]
  for (const zone of zones) {
    if (!(zone instanceof HTMLElement) || zone.closest(`[${LINE_MARK}]`)) continue
    const texts: Text[] = []
    const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      const parent = node.parentElement
      if (parent?.closest(`[${LINE_MARK}]`)) {
        node = walker.nextNode()
        continue
      }
      if ((node.textContent ?? '').trim()) texts.push(node as Text)
      node = walker.nextNode()
    }
    for (const text of texts) splitText(text)
  }
}

function splitText(text: Text) {
  const content = text.textContent ?? ''
  if (!content.trim() || !text.parentNode) return
  const range = document.createRange()
  const groups: { start: number; end: number; top: number }[] = []
  for (let i = 0; i < content.length; i += 1) {
    range.setStart(text, i)
    range.setEnd(text, i + 1)
    const rect = range.getClientRects()[0]
    if (!rect || rect.width < 0.2 || rect.height < 1) continue
    const top = Math.round(rect.top)
    const last = groups[groups.length - 1]
    if (!last || Math.abs(last.top - top) > 1) groups.push({ start: i, end: i + 1, top })
    else last.end = i + 1
  }
  if (groups.length === 0) return
  const frag = document.createDocumentFragment()
  let cursor = 0
  for (const group of groups) {
    if (group.start > cursor) frag.append(content.slice(cursor, group.start))
    const span = document.createElement('span')
    span.setAttribute(LINE_MARK, '')
    span.textContent = content.slice(group.start, group.end)
    frag.append(span)
    cursor = group.end
  }
  if (cursor < content.length) frag.append(content.slice(cursor))
  text.parentNode.replaceChild(frag, text)
}

/** Soft one-line guide. Follows pointer and finger. No fade. */
export function ReadingRuler() {
  const { settings } = useSen()

  useEffect(() => {
    if (!settings.ruler) return
    const bar = document.createElement('div')
    bar.className = 'reading-ruler'
    bar.setAttribute('data-line-guide', 'off')
    bar.setAttribute('aria-hidden', 'true')
    bar.style.visibility = 'hidden'
    document.documentElement.appendChild(bar)

    let framing = false
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

    const reframe = () => {
      if (framing) return
      framing = true
      unwrapLines(document)
      splitLines(document)
      framing = false
    }
    reframe()

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
    // The device-mode cursor updates which line span is hovered without a pointermove.
    let hoverEl: Element | null = null
    let watch = 0
    const watchHover = () => {
      watch = window.requestAnimationFrame(watchHover)
      const el = document.querySelector(`[${LINE_MARK}]:hover`)
      if (!(el instanceof HTMLElement)) return
      if (el === hoverEl) return
      const box = boxFromMark(el)
      if (!box) return
      // Ignore a hover resting far from the last delivered pointer point.
      if (Number.isFinite(lastY) && Math.abs(box.top + box.height / 2 - lastY) > box.height * 1.5) return
      hoverEl = el
      paint(box)
    }
    watch = window.requestAnimationFrame(watchHover)
    const listen = { passive: true, capture: true } as const
    const types = [
      'pointermove',
      'mousemove',
      'pointerrawupdate',
      'pointerover',
      'mouseover',
      'pointerenter',
      'mouseenter',
      'pointerdown',
      'mousedown',
      'touchstart',
      'touchmove',
    ]
    for (const type of types) {
      window.addEventListener(type, onEvent, listen)
      document.addEventListener(type, onEvent, listen)
    }
    document.addEventListener('scroll', onScroll, listen)
    window.addEventListener('resize', reframe)
    window.addEventListener('blur', hide)
    const observer = new MutationObserver((records) => {
      if (framing) return
      const needs = records.some((record) => {
        const nodes: Node[] = [record.target, ...record.addedNodes]
        return nodes.some((node) => {
          const el = node instanceof Element ? node : node.parentElement
          if (!el || el.closest(`[${LINE_MARK}]`)) return false
          return Boolean(
            el.matches(LINE_SELECTOR) || el.querySelector(LINE_SELECTOR) || el.closest(LINE_SELECTOR),
          )
        })
      })
      if (needs) window.requestAnimationFrame(reframe)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.cancelAnimationFrame(watch)
      for (const type of types) {
        window.removeEventListener(type, onEvent, listen)
        document.removeEventListener(type, onEvent, listen)
      }
      document.removeEventListener('scroll', onScroll, listen)
      window.removeEventListener('resize', reframe)
      window.removeEventListener('blur', hide)
      observer.disconnect()
      framing = true
      unwrapLines(document)
      bar.remove()
    }
  }, [settings.ruler])

  return null
}
