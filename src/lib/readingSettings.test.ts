import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  applyReadingPreset,
  focusClock,
  matchReadingPreset,
  paintedReadingTint,
  READING_DEFAULTS,
  READING_TINT_HEX,
  sanitizeReadingSettings,
  type ReadingSettings,
} from './readingSettings.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

const BANNED_CODEPOINTS = ['的', '把', '啲', '來', '来', '眞', '哪', '界', '呇']

const NEW_KEYS = [
  'sen.presets',
  'sen.presets.desc',
  'sen.preset.lowSensory',
  'sen.preset.lowSensory.hint',
  'sen.preset.spld.hint',
  'sen.preset.adhd.hint',
  'sen.tint',
  'sen.tint.cream',
  'sen.tint.green',
  'sen.tint.blue',
  'sen.tint.desc',
  'sen.toggle.ruler',
  'sen.toggle.ruler.desc',
  'sen.focus.duration',
  'sen.focus.duration.desc',
  'sen.focus.duration.5',
  'sen.focus.duration.10',
  'sen.focus.duration.15',
  'sen.focus.duration.25',
  'sen.toggle.hideTimer',
  'sen.toggle.hideTimer.desc',
] as const

const COPY = {
  'zh-Hant': {
    'sen.presets': '一鍵預設',
    'sen.presets.desc': '撳一下就套用一組設定，之後仍然可以逐項改。',
    'sen.preset.lowSensory': '低感官刺激',
    'sen.preset.lowSensory.hint': '低感官刺激：柔和底色＋減少動態＋關閉音效同動效',
    'sen.preset.spld.hint': '讀寫支援：大字＋易讀間距＋米黄底＋自動朗讀',
    'sen.preset.adhd.hint': '專注支援：專注隧道＋減少動態＋關閉音效',
    'sen.tint': '閱讀底色',
    'sen.tint.cream': '米黄',
    'sen.tint.green': '淡綠',
    'sen.tint.blue': '淺藍',
    'sen.tint.desc': '揀柔和底色，減輕閱讀壓力。開咗高對比就跟高對比，唔同底色一齊叠。',
    'sen.toggle.ruler': '閱讀尺',
    'sen.toggle.ruler.desc': '半透明提示條會跟住游標或手指，幫你唔好跳行。可以隨時關。減少動態開啟時唔會閃。',
    'sen.focus.duration': '專注時長',
    'sen.focus.duration.desc': '預設 25 分鐘。可以改成 5、10 或 15 分鐘。',
    'sen.focus.duration.5': '5 分鐘',
    'sen.focus.duration.10': '10 分鐘',
    'sen.focus.duration.15': '15 分鐘',
    'sen.focus.duration.25': '25 分鐘',
    'sen.toggle.hideTimer': '隱藏倒數計時',
    'sen.toggle.hideTimer.desc': '隱藏倒數數字，減輕時間壓力。隧道仍然跟你揀嘅時長運行。',
  },
  en: {
    'sen.presets': 'One-tap presets',
    'sen.presets.desc': 'Tap once to apply a set of settings. You can still adjust each item afterwards.',
    'sen.preset.lowSensory': 'Low sensory',
    'sen.preset.lowSensory.hint': 'Low sensory: soft tint + reduced motion + mute sound and motion effects',
    'sen.preset.spld.hint': 'Reading support: larger text + easy-read spacing + cream tint + auto read-aloud',
    'sen.preset.adhd.hint': 'Focus support: focus tunnel + reduced motion + mute sound',
    'sen.tint': 'Reading tint',
    'sen.tint.cream': 'Cream',
    'sen.tint.green': 'Pale green',
    'sen.tint.blue': 'Light blue',
    'sen.tint.desc': 'Choose a soft tint to ease visual stress. High contrast replaces these tints; the two do not stack.',
    'sen.toggle.ruler': 'Reading ruler',
    'sen.toggle.ruler.desc':
      'A soft highlight follows the pointer or finger to help you stay on the line. You can turn it off anytime. It does not flash when reduced motion is on.',
    'sen.focus.duration': 'Focus duration',
    'sen.focus.duration.desc': 'Default 25 minutes. You can change it to 5, 10, or 15 minutes.',
    'sen.focus.duration.5': '5 minutes',
    'sen.focus.duration.10': '10 minutes',
    'sen.focus.duration.15': '15 minutes',
    'sen.focus.duration.25': '25 minutes',
    'sen.toggle.hideTimer': 'Hide countdown',
    'sen.toggle.hideTimer.desc':
      'Hide the countdown numbers to ease time pressure. The tunnel still runs for the duration you chose.',
  },
  'zh-Hans': {
    'sen.presets': '一键预设',
    'sen.presets.desc': '点一下就套用一组设置，之后仍然可以逐项改。',
    'sen.preset.lowSensory': '低感官刺激',
    'sen.preset.lowSensory.hint': '低感官刺激：柔和底色＋减少动态＋关闭音效和动效',
    'sen.preset.spld.hint': '读写支持：大字＋易读间距＋米黄底＋自动朗读',
    'sen.preset.adhd.hint': '专注支持：专注隧道＋减少动态＋关闭音效',
    'sen.tint': '阅读底色',
    'sen.tint.cream': '米黄',
    'sen.tint.green': '淡绿',
    'sen.tint.blue': '浅蓝',
    'sen.tint.desc': '选柔和底色，减轻阅读压力。开了高对比就跟高对比，不同底色一起叠。',
    'sen.toggle.ruler': '阅读尺',
    'sen.toggle.ruler.desc': '半透明提示条会跟着光标或手指，帮你不要跳行。可以随时关。减少动态开启时不会闪。',
    'sen.focus.duration': '专注时长',
    'sen.focus.duration.desc': '预设 25 分钟。可以改成 5、10 或 15 分钟。',
    'sen.focus.duration.5': '5 分钟',
    'sen.focus.duration.10': '10 分钟',
    'sen.focus.duration.15': '15 分钟',
    'sen.focus.duration.25': '25 分钟',
    'sen.toggle.hideTimer': '隐藏倒数计时',
    'sen.toggle.hideTimer.desc': '隐藏倒数数字，减轻时间压力。隧道仍然按已选时长运行。',
  },
} as const

describe('deepened display and reading settings', () => {
  it('uses the official locale lines and keeps the live labels', () => {
    const bags = {
      'zh-Hant': JSON.parse(read('src/i18n/zh-Hant.json')) as Record<string, string>,
      en: JSON.parse(read('src/i18n/en.json')) as Record<string, string>,
      'zh-Hans': JSON.parse(read('src/i18n/zh-Hans.json')) as Record<string, string>,
    }
    for (const locale of ['zh-Hant', 'en', 'zh-Hans'] as const) {
      for (const key of NEW_KEYS) assert.equal(bags[locale][key], COPY[locale][key], `${locale} ${key}`)
    }
    assert.equal(bags['zh-Hant']['sen.preset.spld'], '讀寫支援')
    assert.equal(bags['zh-Hant']['sen.preset.adhd'], '專注支援')
    assert.equal(bags['zh-Hant']['sen.reset'], '還原預設')
    assert.equal(bags['zh-Hant']['tts.stop'], '停止')
    assert.equal(bags['zh-Hant']['tts.read'], '朗讀')
    assert.equal(bags['zh-Hant']['lp.step'], '第 {x} 步／共 {y} 步')
    assert.equal(bags.en['lp.step'], 'Step {x} of {y}')
    assert.equal(bags['zh-Hans']['lp.step'], '第 {x} 步／共 {y} 步')
    assert.equal(bags['zh-Hant']['map.motion.off'], '動態：關')
    assert.equal(bags['zh-Hant']['map.motion.on'], '動態：開')
    assert.equal(bags['zh-Hant']['sen.font.lg'], '大')
    const fresh = NEW_KEYS.map((key) => bags['zh-Hant'][key]).join('\n')
    for (const glyph of BANNED_CODEPOINTS) assert.equal(fresh.includes(glyph), false, glyph)
    const banned = /SEN|SpLD|ADHD|ASD|讀寫障礙|自閉症|診斷|diagnosis|medical|\bIQ\b|讀寫友善|極致專注/
    for (const key of NEW_KEYS) {
      assert.equal(banned.test(bags['zh-Hant'][key]), false, key)
      assert.equal(banned.test(bags.en[key]), false, key)
      assert.equal(banned.test(bags['zh-Hans'][key]), false, key)
    }
  })

  it('deepens the three sets and keeps ruler, duration, and hide-countdown out of them', () => {
    const tuned: ReadingSettings = {
      ...READING_DEFAULTS,
      tint: 'green',
      highContrast: true,
      ruler: true,
      focusMinutes: 10,
      hideTimer: true,
      readAloud: true,
      focusTunnel: true,
      fontSize: 'xl',
    }
    const reading = applyReadingPreset(tuned, 'spld')
    assert.equal(reading.fontSize, 'lg')
    assert.equal(reading.dyslexia, true)
    assert.equal(reading.readAloud, true)
    assert.equal(reading.highContrast, false)
    assert.equal(reading.tint, 'cream')
    assert.equal(reading.ruler, true)
    assert.equal(reading.focusMinutes, 10)
    assert.equal(reading.hideTimer, true)
    assert.equal(paintedReadingTint(reading), null)

    const focus = applyReadingPreset(tuned, 'adhd')
    assert.equal(focus.focusTunnel, true)
    assert.equal(focus.reduceMotion, true)
    assert.equal(focus.soundMotion, false)
    assert.equal(focus.focusMinutes, 10)
    assert.equal(focus.hideTimer, true)
    assert.equal(focus.ruler, true)
    assert.equal(matchReadingPreset(focus), 'adhd')

    const quiet = applyReadingPreset({ ...tuned, hideTimer: false, focusMinutes: 15 }, 'lowSensory')
    assert.equal(quiet.tint, 'cream')
    assert.equal(quiet.highContrast, false)
    assert.equal(quiet.reduceMotion, true)
    assert.equal(quiet.soundMotion, false)
    assert.equal(quiet.readAloud, false)
    assert.equal(quiet.focusTunnel, false)
    assert.equal(quiet.ruler, true)
    assert.equal(quiet.focusMinutes, 15)
    assert.equal(quiet.hideTimer, false)
    assert.equal(matchReadingPreset(quiet), 'lowSensory')

    const restored = applyReadingPreset(tuned, 'standard')
    assert.deepEqual(restored, READING_DEFAULTS)
    assert.equal(restored.tint, 'cream')
    assert.equal(restored.ruler, false)
    assert.equal(restored.focusMinutes, 25)
    assert.equal(restored.hideTimer, false)
    assert.equal(matchReadingPreset(restored), 'standard')
  })

  it('keeps stored settings when new fields are missing, and does not stack cream or contrast', () => {
    const legacy = sanitizeReadingSettings({
      fontSize: 'lg',
      highContrast: false,
      dyslexia: true,
      reduceMotion: false,
      soundMotion: false,
      focusTunnel: false,
      readAloud: false,
    })
    assert.equal(legacy.fontSize, 'lg')
    assert.equal(legacy.dyslexia, true)
    assert.equal(legacy.tint, 'cream')
    assert.equal(legacy.ruler, false)
    assert.equal(legacy.focusMinutes, 25)
    assert.equal(legacy.hideTimer, false)
    assert.equal(paintedReadingTint({ tint: 'cream', highContrast: false }), null)
    assert.equal(paintedReadingTint({ tint: 'green', highContrast: true }), null)
    assert.equal(paintedReadingTint({ tint: 'green', highContrast: false }), '#EAF6EF')
    assert.equal(paintedReadingTint({ tint: 'blue', highContrast: false }), '#EAF4F8')
    assert.deepEqual(READING_TINT_HEX, { cream: '#FFF9E9', green: '#EAF6EF', blue: '#EAF4F8' })
    assert.equal(focusClock(25 * 60, false), '25:00')
    assert.equal(focusClock(5 * 60, true), null)
    assert.equal(focusClock(90, false), '01:30')
  })

  it('shows the step line in the tunnel, keeps manual read, and leaves official motion off', () => {
    const player = read('src/components/game/LessonPlayer.tsx')
    const css = read('src/index.css')
    const panel = read('src/components/SenSettingsPanel.tsx')
    const timer = read('src/components/FocusTunnel.tsx')
    assert.match(player, /data-focus-step-label/)
    assert.match(player, /t\('lp\.step'/)
    assert.match(css, /\.sen-focus \[data-lesson-wizard\] \[data-focus-step-label\]/)
    assert.match(css, /#EAF6EF/)
    assert.match(css, /#EAF4F8/)
    assert.match(css, /#0D9488/)
    assert.equal(css.includes("data-reading-tint='cream'"), false)
    assert.match(read('src/components/game/PresentationBar.tsx'), /<ReadAloudButton/)
    assert.match(read('src/components/game/ReadAloudButton.tsx'), /t\('tts\.stop'\)/)
    assert.match(read('src/components/game/ReadAloudButton.tsx'), /t\('tts\.read'\)/)
    assert.match(timer, /const FOCUS_SECONDS = 25 \* 60/)
    assert.match(timer, /focusClock\(left, settings\.hideTimer\)/)
    assert.match(timer, /data-countdown=\{settings\.hideTimer \? 'hidden' : 'shown'\}/)
    assert.match(panel, /sen\.toggle\.ruler/)
    assert.match(panel, /sen\.focus\.duration/)
    assert.match(panel, /sen\.toggle\.hideTimer/)
    assert.equal(panel.includes('0.75x'), false)
    assert.equal(panel.includes('重點精簡'), false)
    assert.match(read('src/game/softMotion.ts'), /SOUND_MOTION_DEFAULT = false/)
    const ruler = read('src/components/ReadingRuler.tsx')
    assert.match(ruler, /data-lesson-body/)
    assert.match(ruler, /passive: true/)
    assert.match(ruler, /caretRangeFromPoint/)
    assert.match(ruler, /caretPositionFromPoint/)
    assert.equal(ruler.includes('backgroundColor'), false)
    assert.match(css, /\.reading-ruler/)
    assert.match(css, /\.sen-reduce-motion \.reading-ruler/)
    assert.equal(css.includes('[data-official-parts] p:hover'), false)
    assert.match(read('src/context/SenContext.tsx'), /dataset\.reduceMotion/)
    assert.match(read('src/components/SenSettingsPanel.tsx'), /data-reduce-motion/)
  })
})
