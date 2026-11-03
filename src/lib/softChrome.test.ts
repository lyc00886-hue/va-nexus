import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** PEANUTS soft leftover PASS (Drive 1Nnt6ndj) plus the designer gear / group names. */
const COPY = {
  en: {
    'header.senModes': 'Display settings',
    'header.displayMode': 'Display mode',
    'header.a11y': 'Accessibility',
    'sen.quick': 'Display settings',
    'sen.title': 'Display & reading settings',
    'chrome.xp': '{n} learning points',
    'chrome.xpGain': '+{n} learning points',
    'chrome.level': 'Level {n}',
    'chrome.levelTitle': 'Level {n} {title}',
    'chrome.levelXpRow': 'Level {n} {title} · {xp} learning points',
    'rs.step.ai': 'AI learning tip',
  },
  'zh-Hant': {
    'header.senModes': '顯示設定',
    'header.displayMode': '顯示模式',
    'header.a11y': '無障礙',
    'sen.quick': '顯示設定',
    'sen.title': '顯示同閱讀設定',
    'chrome.xp': '{n} 學習點',
    'chrome.xpGain': '+{n} 學習點',
    'chrome.level': '第 {n} 級',
    'chrome.levelTitle': '第 {n} 級 {title}',
    'chrome.levelXpRow': '第 {n} 級 {title} · {xp} 學習點',
    'rs.step.ai': 'AI 學習建議',
  },
  'zh-Hans': {
    'header.senModes': '显示设置',
    'header.displayMode': '显示模式',
    'header.a11y': '无障碍',
    'sen.quick': '显示设置',
    'sen.title': '显示与阅读设置',
    'chrome.xp': '{n} 学习点',
    'chrome.xpGain': '+{n} 学习点',
    'chrome.level': '第 {n} 级',
    'chrome.levelTitle': '第 {n} 级 {title}',
    'chrome.levelXpRow': '第 {n} 级 {title} · {xp} 学习点',
    'rs.step.ai': 'AI 学习建议',
  },
} as const

const FILES = {
  en: 'src/i18n/en.json',
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
} as const

const CHROME = [
  'src/components/Sidebar.tsx',
  'src/components/game/StatCards.tsx',
  'src/components/game/Achievements.tsx',
  'src/components/game/LessonPlayer.tsx',
  'src/components/game/ActivityLog.tsx',
]

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

describe('soft leftover display chrome', () => {
  it('matches the PASS strings, designer gear, and display-mode group name', () => {
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      for (const [key, value] of Object.entries(COPY[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.equal(value.includes('SEN'), false, `${locale} ${key}`)
      }
      assert.equal(bag['checkin.noRecs'].includes('SEN'), false)
    }
  })

  it('keeps the header as two segments and replaces hardcoded XP / Lv labels', () => {
    const header = read('src/components/Header.tsx')
    assert.match(header, /role="radiogroup"/)
    assert.match(header, /aria-label=\{t\('header\.displayMode'\)\}/)
    assert.match(header, /t\('er\.mode\.standard'\)/)
    assert.match(header, /t\('er\.mode\.step'\)/)
    assert.match(header, /t\('header\.a11y'\)/)
    assert.match(header, /bg-\[#0D9488\]/)
    assert.equal(header.includes('header.senModes'), false)
    assert.equal(header.includes('mode.spld'), false)
    assert.equal(header.includes('mode.adhd'), false)
    assert.equal(header.includes('er.mode.literacy'), false)
    assert.equal(header.includes('er.mode.focus'), false)
    assert.equal(/SEN/.test(header), false)

    for (const file of CHROME) {
      const source = read(file)
      assert.equal(/\bLv\./.test(source), false, file)
      assert.equal(/ XP/.test(source), false, file)
      assert.match(source, /chrome\.(xp|xpGain|level|levelTitle|levelXpRow)/)
    }

    const panel = read('src/components/SenSettingsPanel.tsx')
    assert.match(panel, /EasyReadBar/)
    assert.equal(panel.includes('sen.preset.spld'), false)
    assert.equal(panel.includes('sen.preset.adhd'), false)
    assert.equal(/SEN/.test(panel), false)

    const feedback = read('api/feedback.ts')
    assert.match(feedback, /AI 回饋/)
  })

  it('does not wire sound-effect playback', () => {
    const header = read('src/components/Header.tsx')
    const app = read('src/App.tsx')
    assert.equal(/sfx\.|new Audio|HTMLAudioElement/.test(header + app), false)
  })
})
