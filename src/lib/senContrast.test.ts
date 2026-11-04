import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('high contrast under 無障礙', () => {
  it('pins 高對比 next to 寬鬆間距 and strengthens cream, text, and borders', () => {
    const panel = read('src/components/SenSettingsPanel.tsx')
    const css = read('src/index.css')
    const sen = read('src/context/SenContext.tsx')
    const pair = panel.slice(panel.indexOf('data-a11y-pair="spacing-contrast"'), panel.indexOf('settings.soundMotion'))
    assert.match(pair, /sen\.toggle\.dyslexia/)
    assert.match(pair, /support\.contrast/)
    assert.ok(pair.indexOf('sen.toggle.dyslexia') < pair.indexOf('support.contrast'))
    assert.match(panel, /t\('header\.a11y'\)/)
    assert.match(panel, /role="radiogroup"/)
    assert.match(panel, /sen\.font\.md/)
    assert.equal(/SEN mode|Dyslexia/.test(panel), false)
    assert.match(sen, /sen-contrast/)
    assert.match(sen, /settings\.highContrast/)
    assert.match(css, /\.sen-contrast \[class\*='bg-\[#FFF9E9\]'\]/)
    assert.match(css, /\.sen-contrast \[class\*='bg-\[#0D9488\]'\]/)
    assert.match(css, /\.sen-contrast \[class\*='border-slate-'\]/)
    assert.match(css, /\.sen-dyslexia/)
  })
})
