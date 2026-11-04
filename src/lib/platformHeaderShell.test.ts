import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  PLATFORM_HEADER_HIDE_ACC_PX,
  PLATFORM_HEADER_SHOW_ACC_PX,
  PLATFORM_HEADER_TOP_PX,
  stepPlatformHeader,
  type PlatformHeaderStep,
} from './platformHeaderShell.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function step(over: Partial<PlatformHeaderStep> = {}) {
  return stepPlatformHeader({
    scrollY: 200,
    delta: 0,
    acc: 0,
    collapsed: false,
    mobile: true,
    path: true,
    anchored: false,
    hidePast: 80,
    ...over,
  })
}

describe('platform header shell', () => {
  it('stays visible at the top of the path', () => {
    assert.equal(step({ scrollY: 0, delta: 40 }).collapsed, false)
    assert.equal(step({ scrollY: 0, delta: 40 }).acc, 0)
    assert.equal(step({ scrollY: PLATFORM_HEADER_TOP_PX, delta: 30 }).collapsed, false)
  })

  it('hides after a downward scroll once the header has left the flow', () => {
    const started = step({ scrollY: 90, delta: 10 })
    assert.equal(started.collapsed, false)
    assert.equal(started.acc, 10)
    const hidden = step({ scrollY: 100, delta: PLATFORM_HEADER_HIDE_ACC_PX - 10, acc: started.acc })
    assert.equal(hidden.collapsed, true)
    assert.equal(hidden.acc, 0)
  })

  it('waits until the in-flow header has cleared, then hides on the next downward tick', () => {
    const early = step({ scrollY: 40, delta: 40, hidePast: 80 })
    assert.equal(early.collapsed, false)
    assert.equal(early.acc, 40)
    const hidden = step({ scrollY: 90, delta: 10, acc: early.acc, hidePast: 80 })
    assert.equal(hidden.collapsed, true)
  })

  it('reveals on an upward scroll and when the path is back at the top', () => {
    assert.equal(step({ scrollY: 160, delta: -PLATFORM_HEADER_SHOW_ACC_PX, collapsed: true }).collapsed, false)
    assert.equal(step({ scrollY: 160, delta: -(PLATFORM_HEADER_SHOW_ACC_PX - 1), collapsed: true }).collapsed, true)
    assert.equal(step({ scrollY: 0, delta: -2, collapsed: true }).collapsed, false)
  })

  it('stays hidden through a small downward nudge', () => {
    assert.equal(step({ scrollY: 220, delta: 6, collapsed: true }).collapsed, true)
  })

  it('stays visible on desktop, off the path, and while the gear panel is open', () => {
    assert.equal(step({ mobile: false, delta: 80, collapsed: true }).collapsed, false)
    assert.equal(step({ path: false, delta: 80, collapsed: true }).collapsed, false)
    assert.equal(step({ anchored: true, delta: 80, collapsed: true }).collapsed, false)
    assert.equal(step({ hidePast: 0, delta: 80, collapsed: true }).collapsed, false)
  })

  it('starts a new accumulation when the scroll direction flips', () => {
    const next = step({ scrollY: 120, delta: -4, acc: 20 })
    assert.equal(next.collapsed, false)
    assert.equal(next.acc, -4)
  })

  it('keeps the gear entry and does not touch the path, celebrate cut, or motion default', () => {
    const header = readFileSync(join(root, 'src/components/Header.tsx'), 'utf8')
    const css = readFileSync(join(root, 'src/index.css'), 'utf8')
    const map = readFileSync(join(root, 'src/components/game/LearningMap.tsx'), 'utf8')
    const path = readFileSync(join(root, 'src/components/game/MapPath.tsx'), 'utf8')
    const motion = readFileSync(join(root, 'src/game/softMotion.ts'), 'utf8')
    assert.match(header, /data-sen-trigger/)
    assert.match(header, /t\('header\.a11y'\)/)
    assert.match(header, /t\('header\.subtitle'\)/)
    assert.match(header, /platform-header/)
    assert.match(css, /@media \(max-width: 767px\) \{\s*\n\s*\.platform-header/)
    assert.match(css, /\.platform-header\[data-collapsed='true'\]/)
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.platform-header/)
    assert.match(map, /data-map-chrome="path"/)
    assert.match(map, /bg-\[#FFF9E9\]/)
    assert.match(map, /bg-\[#0D9488\]/)
    assert.equal(map.includes('StatCards'), false)
    assert.match(path, /rounded-full/)
    assert.match(motion, /SOUND_MOTION_DEFAULT = false/)
    assert.match(motion, /CELEBRATE_CUTS_MS/)
  })
})
