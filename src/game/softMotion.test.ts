import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { coverFromUnit } from './f4Media.ts'
import {
  MOOD_EMPTY_MAP,
  MOOD_OTTER_PEEK,
  SOFT_EVENTS,
  SOUND_MOTION_DEFAULT,
  softMotionPlay,
} from './softMotion.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const PUBLIC = join(root, 'public')

const MAP_UNITS = [
  'U1-CN-MODERN',
  'U2-HK-IDENTITY',
  'U3-WEST-MODERN',
  'U4-CN-CONTEMP',
  'U5-COMPARE',
  'U6-MQ-WUMEN',
  'U7-SELF-HERITAGE',
  'U8-CN-SYMBOLS',
  'U9-ROLE-TAKING',
  'U10-YBA-CN',
  'U11-EXHIBIT-REVIEW',
]

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('early wire covers and soft motion', () => {
  it('keeps sound and motion off unless the gear switch is on', () => {
    assert.equal(SOUND_MOTION_DEFAULT, false)
    assert.equal(softMotionPlay({ soundMotion: false, reduceMotion: false }), false)
    assert.equal(softMotionPlay({ soundMotion: false, reduceMotion: true }), false)
    assert.equal(softMotionPlay({ soundMotion: true, reduceMotion: true }), false)
    assert.equal(softMotionPlay({ soundMotion: true, reduceMotion: false }), true)
    const settings = read('src/context/SenContext.tsx')
    assert.match(settings, /soundMotion: false/)
    assert.match(settings, /dataset\.soundMotion/)
    const panel = read('src/components/SenSettingsPanel.tsx')
    assert.match(panel, /settings\.soundMotion/)
    assert.equal(/new Audio|HTMLAudioElement|sfx\./.test(panel), false)
  })

  it('aligns the three events with sfx ids and one-shot timings', () => {
    assert.equal(SOFT_EVENTS.lessonComplete.motion, 'motion.lessonComplete')
    assert.equal(SOFT_EVENTS.lessonComplete.sfx, 'sfx.lessonComplete')
    assert.equal(SOFT_EVENTS.lessonComplete.ms >= 450 && SOFT_EVENTS.lessonComplete.ms <= 700, true)
    assert.equal(SOFT_EVENTS.chestOpen.sfx, 'sfx.chestOpen')
    assert.equal(SOFT_EVENTS.chestOpen.ms >= 300 && SOFT_EVENTS.chestOpen.ms <= 500, true)
    assert.equal(SOFT_EVENTS.stepAdvance.sfx, 'sfx.stepAdvance')
    assert.equal(SOFT_EVENTS.stepAdvance.ms >= 120 && SOFT_EVENTS.stepAdvance.ms <= 220, true)
    const css = read('src/index.css')
    assert.match(css, /prefers-reduced-motion: reduce/)
    assert.match(css, /html:not\(\[data-sound-motion='on'\]\)/)
    assert.match(css, /\.sen-reduce-motion \.soft-step-mood/)
    assert.equal(css.includes('infinite'), false)
    for (const mood of [MOOD_EMPTY_MAP, MOOD_OTTER_PEEK, ...Object.values(SOFT_EVENTS).map((event) => event.mood)]) {
      const file = join(PUBLIC, mood.slice(1))
      assert.equal(existsSync(file), true, mood)
      assert.equal(statSync(file).size > 1000, true, mood)
    }
  })

  it('wires eleven art-history unit covers and leaves lesson tiles unwired', () => {
    for (const name of ['art-history-map.json', 'art-history-map.en.json', 'art-history-map.zh-Hans.json']) {
      const pack = JSON.parse(read(`src/content/${name}`)) as {
        units: { id: string; coverImage?: string; coverCredit?: string; lessons: { coverImage?: string }[] }[]
      }
      assert.deepEqual(
        pack.units.map((unit) => unit.id),
        MAP_UNITS,
        name,
      )
      for (const unit of pack.units) {
        const cover = coverFromUnit(unit)
        assert.equal(cover.coverImage, `/content/learning-map-illustrations/map-covers/${unit.id}.png`, name)
        assert.ok((cover.coverCredit ?? '').length > 0, name)
        assert.ok(statSync(join(PUBLIC, cover.coverImage!.slice(1))).size > 1000, unit.id)
        for (const lesson of unit.lessons) assert.equal(lesson.coverImage, undefined)
      }
    }
    const hans = read('src/content/art-history-map.zh-Hans.json')
    const hant = read('src/content/art-history-map.json')
    assert.match(hans, /文征明/)
    assert.equal(hans.includes('文徵明'), false)
    assert.match(hant, /文徵明/)
  })

  it('uses one primary action and the gear copy on celebrate, empty, chest, and step', () => {
    const lesson = read('src/components/game/MapOneLesson.tsx')
    const chest = read('src/components/game/OtterPose.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    assert.match(lesson, /LessonCompleteFrame/)
    assert.match(lesson, /StepAdvanceMark/)
    assert.match(chest, /otter-chest-open/)
    assert.match(chest, /otter-chest-skip/)
    assert.match(chest, /ChestOpenFrame/)
    assert.match(player, /chrome\.xpGain/)
    assert.match(player, /w-full rounded-2xl bg-\[#0D9488\]/)
    assert.equal(/\bLv\./.test(lesson + player), false)
    assert.equal(/ XP/.test(lesson + player), false)
    const copy = {
      'zh-Hant': ['音效同動效', '完成課時可播短動畫同音效；預設關閉。跟系統「減少動態效果」。'],
      en: ['Sound & motion', 'Short animations and sounds when you finish a lesson. Off by default. Follows Reduce Motion.'],
      'zh-Hans': ['音效和动效', '完成课时可播短动画和音效；默认关闭。跟随系统「减少动态效果」。'],
    } as const
    const files = {
      'zh-Hant': 'src/i18n/zh-Hant.json',
      en: 'src/i18n/en.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = JSON.parse(read(files[locale])) as Record<string, string>
      assert.equal(bag['settings.soundMotion'], copy[locale][0])
      assert.equal(bag['settings.soundMotion.desc'], copy[locale][1])
      assert.equal(bag['settings.soundMotion'].includes('SEN'), false)
      assert.equal(bag['chrome.xp'].includes('XP'), false)
    }
  })
})
