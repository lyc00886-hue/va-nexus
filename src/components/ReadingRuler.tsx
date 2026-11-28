import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSen } from '../context/SenContext'

type Band = { left: number; top: number; width: number; height: number }

function lineBand(el: HTMLElement): number {
  const style = getComputedStyle(el)
  const font = Number.parseFloat(style.fontSize)
  const fontPx = Number.isFinite(font) && font > 0 ? font : 16
  const cap = fontPx * 2.4
  const text = el.matches('li, p') ? el : (el.querySelector('li, p') ?? el)
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

function bandAt(clientX: number, clientY: number, target: EventTarget | null): Band | null {
  const node = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  const zone = node?.closest(LINE_SELECTOR)
  if (!(zone instanceof HTMLElement)) return null
  const rect = zone.getBoundingClientRect()
  if (clientY < rect.top || clientY > rect.bottom || clientX < rect.left || clientX > rect.right) return null
  const height = Math.min(lineBand(zone), Math.max(rect.height, 1))
  const top = Math.min(Math.max(clientY - height / 2, rect.top), Math.max(rect.bottom - height, rect.top))
  return { left: rect.left, top, width: rect.width, height }
}

/** Soft line highlight. Position updates have no fade, so reduced motion does not flash. */
export function ReadingRuler() {
  const { settings } = useSen()
  const [band, setBand] = useState<Band | null>(null)

  useEffect(() => {
    if (!settings.ruler) return
    let frame = 0
    let pending: Band | null = null
    const schedule = (next: Band | null) => {
      pending = next
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setBand(pending)
      })
    }
    const onPointer = (event: PointerEvent) => schedule(bandAt(event.clientX, event.clientY, event.target))
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      schedule(bandAt(touch.clientX, touch.clientY, document.elementFromPoint(touch.clientX, touch.clientY)))
    }
    const hide = () => schedule(null)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      setBand(null)
    }
  }, [settings.ruler])

  if (!settings.ruler || typeof document === 'undefined') return null
  return createPortal(
    <div
      data-line-guide={band ? 'on' : 'off'}
      aria-hidden
      className="reading-ruler"
      style={
        band
          ? { left: band.left, top: band.top, width: band.width, height: band.height, visibility: 'visible' }
          : { visibility: 'hidden' }
      }
    />,
    document.body,
  )
}
