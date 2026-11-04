import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { coverFromUnit } from './f4Media.ts'
import {
  CELEBRATE_CUTS_MS,
  MOTION_V2_CELEBRATE_MS,
  MOTION_V2_OTTER,
  MOOD_EMPTY_MAP,
  MOOD_OTTER_PEEK,
  SOFT_EVENTS,
  SOUND_MOTION_DEFAULT,
  celebratePoses,
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

  it('plays a visible otter clap and nod once, and stays on idle when motion is off', () => {
    assert.equal(MOTION_V2_CELEBRATE_MS >= 700 && MOTION_V2_CELEBRATE_MS <= 900, true)
    assert.equal(CELEBRATE_CUTS_MS[0], 0)
    assert.equal(CELEBRATE_CUTS_MS[CELEBRATE_CUTS_MS.length - 1], MOTION_V2_CELEBRATE_MS)
    const clapHold = CELEBRATE_CUTS_MS[2] - CELEBRATE_CUTS_MS[1]
    assert.equal(clapHold >= 220 && clapHold <= 300, true)
    for (let i = 1; i < CELEBRATE_CUTS_MS.length; i++) {
      assert.equal(CELEBRATE_CUTS_MS[i] > CELEBRATE_CUTS_MS[i - 1], true)
    }
    assert.deepEqual(celebratePoses(false), ['idle'])
    assert.deepEqual(celebratePoses(true), ['idle', 'clap', 'nod', 'idle'])
    assert.equal(softMotionPlay({ soundMotion: false, reduceMotion: false }), false)
    assert.equal(softMotionPlay({ soundMotion: true, reduceMotion: true }), false)
    for (const pose of ['idle', 'clap', 'nod'] as const) {
      assert.match(MOTION_V2_OTTER[pose], /\/moods\/motion-v2\/otter-celebrate-(idle|clap|nod)\.png$/)
      const file = join(PUBLIC, MOTION_V2_OTTER[pose].slice(1))
      assert.equal(existsSync(file), true, pose)
      assert.equal(statSync(file).size > 1000, true, pose)
    }
    const frames = read('src/components/game/SoftMotion.tsx')
    assert.match(frames, /data-otter-celebrate/)
    assert.match(frames, /data-celebrate-sequence/)
    assert.equal(frames.includes('data-otter="peek"'), false)
    assert.equal(frames.includes('MOOD_OTTER_PEEK'), false)
    assert.equal(frames.includes('infinite'), false)
    const css = read('src/index.css')
    const celebrate = css.slice(css.indexOf('Character celebrate'), css.indexOf('.soft-motion-on .soft-spark'))
    assert.match(celebrate, /soft-celebrate-idle/)
    assert.match(celebrate, /soft-celebrate-clap/)
    assert.match(celebrate, /soft-celebrate-nod/)
    assert.match(celebrate, /--celebrate-ms, 800ms/)
    assert.match(celebrate, /animation-timing-function: step-start/)
    assert.match(celebrate, /56\.25%/)
    assert.equal(celebrate.includes('cubic-bezier'), false)
    assert.match(css, /animation-iteration-count: 1/)
    const hash = (pose: 'idle' | 'clap' | 'nod') =>
      createHash('sha256').update(readFileSync(join(PUBLIC, MOTION_V2_OTTER[pose].slice(1)))).digest('hex')
    assert.equal(hash('idle'), '934e62059641e4baef987540c6318098515ec19b2469e0dafe2fe2d0f612bf6f')
    assert.equal(hash('clap'), 'cc79a0a91189589f8eaf4eeb24ce2358f382f427858988ec80279acb4787a75a')
    assert.equal(hash('nod'), 'f8dc210fdf0147c62b6ee13b6b92efbaee2fbb16ab239771fb08684063ce19f1')
    assert.match(css, /\.sen-reduce-motion \.soft-celebrate-clap/)
    assert.match(css, /html:not\(\[data-sound-motion='on'\]\) \.soft-celebrate-nod/)
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
