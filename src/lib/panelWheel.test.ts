import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { nextContainedScrollTop, wheelDeltaPixels, wheelHitsPanel, type WheelBox } from './panelWheel.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const box: WheelBox = {
  contains: (node) => node === 'inside',
  left: 100,
  top: 40,
  right: 400,
  bottom: 500,
}

describe('display panel wheel containment', () => {
  it('scrolls inside the panel and stops at both edges', () => {
    assert.equal(nextContainedScrollTop(0, 800, 300, 120), 120)
    assert.equal(nextContainedScrollTop(40, 800, 300, -80), 0)
    assert.equal(nextContainedScrollTop(480, 800, 300, 80), 500)
    assert.equal(nextContainedScrollTop(10, 200, 200, 40), 0)
  })

  it('converts line and page wheel deltas into pixels', () => {
    assert.equal(wheelDeltaPixels(40, 0, 20, 300), 40)
    assert.equal(wheelDeltaPixels(2, 1, 24, 300), 48)
    assert.equal(wheelDeltaPixels(2, 1, Number.NaN, 300), 32)
    assert.equal(wheelDeltaPixels(1, 2, 24, 300), 300)
    assert.equal(wheelDeltaPixels(0, 0, 24, 300), 0)
  })

  it('treats a wheel on the page behind the panel box as the panel', () => {
    assert.equal(wheelHitsPanel(box, { clientX: 10, clientY: 10, target: 'inside' }), true)
    assert.equal(wheelHitsPanel(box, { clientX: 180, clientY: 220, target: 'page' }), true)
    assert.equal(wheelHitsPanel(box, { clientX: 12, clientY: 220, target: 'page' }), false)
    assert.equal(wheelHitsPanel(box, { clientX: 180, clientY: 20, target: 'page' }), false)
  })

  it('wires a non-passive wheel listener and leaves touch containment in CSS', () => {
    const panel = readFileSync(join(root, 'src/components/SenSettingsPanel.tsx'), 'utf8')
    assert.match(panel, /addEventListener\(\s*'wheel'/)
    assert.match(panel, /passive:\s*false/)
    assert.match(panel, /capture:\s*true/)
    assert.match(panel, /preventDefault\(\)/)
    assert.match(panel, /stopPropagation\(\)/)
    assert.equal(/new Audio|HTMLAudioElement|sfx\./.test(panel), false)

    const css = readFileSync(join(root, 'src/index.css'), 'utf8')
    assert.match(css, /\.sen-settings-panel\s*\{[^}]*overscroll-behavior:\s*contain/s)
    assert.match(css, /\.sen-settings-panel\s*\{[^}]*touch-action:\s*pan-y/s)
  })
})
