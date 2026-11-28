import { useEffect } from 'react'
import { useSen } from '../context/SenContext'

type Band = { zone: HTMLElement; top: number; height: number }

function lineBand(el: HTMLElement): number {
  const style = getComputedStyle(el)
  const font = Number.parseFloat(style.fontSize)
  const fontPx = Number.isFinite(font) && font > 0 ? font : 16
  const cap = fontPx * 2.4
  const text = el.matches('li, p, h3, h4') ? el : (el.querySelector('li, p, h3, h4') ?? el)
  const node = [...text.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim())
  if (node?.textContent) {
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, Math.min(node.textContent.length, 1))
    const box = range.getClientRects()[0]
    if (box && box.height > 0 && box.height <= cap) return box.height
  }
  const parsed = Number.parseFloat(style.lineHeight)
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= cap) return parsed
  return fontPx * 1.6
}

const LINE_SELECTOR = [
  '[data-lesson-body]',
  '[data-official-parts] p',
  '[data-official-parts] h3',
  '[data-official-parts] h4',
  '[data-lesson-scroll] h3',
].join(', ')

function bandAt(clientX: number, clientY: number): Band | null {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null
  const hit = document.elementFromPoint(clientX, clientY)
  const node = hit instanceof Element ? hit : null
  const zone = node?.closest(LINE_SELECTOR)
  if (!(zone instanceof HTMLElement)) return null
  const rect = zone.getBoundingClientRect()
  if (clientY < rect.top || clientY > rect.bottom || clientX < rect.left || clientX > rect.right) return null
  const height = Math.min(lineBand(zone), Math.max(rect.height, 1))
  const top = Math.min(Math.max(clientY - rect.top - height / 2, 0), Math.max(rect.height - height, 0))
  return { zone, top, height }
}

/** Soft line highlight inside the lesson line. No fade, so reduced motion does not flash. */
export function ReadingRuler() {
  const { settings } = useSen()

  useEffect(() => {
    if (!settings.ruler) return
    const bar = document.createElement('div')
    bar.className = 'reading-ruler'
    bar.setAttribute('data-line-guide', 'off')
    bar.setAttribute('aria-hidden', 'true')
    bar.hidden = true
    let frame = 0
    let pending: Band | null = null
    let host: HTMLElement | null = null
    let hostPosition = ''

    const releaseHost = () => {
      if (!host) return
      host.style.position = hostPosition
      host = null
      hostPosition = ''
    }

    const paint = () => {
      frame = 0
      if (!pending) {
        bar.hidden = true
        bar.setAttribute('data-line-guide', 'off')
        releaseHost()
        return
      }
      if (host !== pending.zone) {
        releaseHost()
        host = pending.zone
        hostPosition = host.style.position
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
        host.appendChild(bar)
      }
      bar.hidden = false
      bar.style.top = `${pending.top}px`
      bar.style.height = `${pending.height}px`
      bar.setAttribute('data-line-guide', 'on')
    }

    const schedule = (next: Band | null) => {
      pending = next
      if (frame) return
      frame = window.requestAnimationFrame(paint)
    }

    const onPoint = (event: MouseEvent) => schedule(bandAt(event.clientX, event.clientY))
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      schedule(bandAt(touch.clientX, touch.clientY))
    }
    const hide = () => schedule(null)
    const listen = { passive: true, capture: true } as const

    // Device mode on a phone turns a pointer drag into mousemove only.
    // pointermove.target stays on the first line, so the line comes from the coordinates.
    document.addEventListener('pointermove', onPoint, listen)
    document.addEventListener('mousemove', onPoint, listen)
    document.addEventListener('pointerdown', onPoint, listen)
    document.addEventListener('mousedown', onPoint, listen)
    document.addEventListener('touchstart', onTouch, listen)
    document.addEventListener('touchmove', onTouch, listen)
    window.addEventListener('blur', hide)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', onPoint, listen)
      document.removeEventListener('mousemove', onPoint, listen)
      document.removeEventListener('pointerdown', onPoint, listen)
      document.removeEventListener('mousedown', onPoint, listen)
      document.removeEventListener('touchstart', onTouch, listen)
      document.removeEventListener('touchmove', onTouch, listen)
      window.removeEventListener('blur', hide)
      releaseHost()
      bar.remove()
    }
  }, [settings.ruler])

  return null
}
