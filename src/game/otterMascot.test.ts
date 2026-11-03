import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  OTTER_CELEBRATE_MS,
  OTTER_CHEST_AWARD_PREFIX,
  OTTER_CHEST_XP,
  OTTER_SRC,
  OTTER_STEP_MS,
  chestOffer,
  otterChestAwardKey,
  otterEnterMs,
  queryOtterFlag,
  resolveOtterMascotEnabled,
  unitSliceFor,
} from './otterMascot.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const COPY = {
  'mascot.encourage': { 'zh-Hant': '加油呀！', en: 'Keep going!', 'zh-Hans': '加油呀！' },
  'mascot.complete': { 'zh-Hant': '做得好！', en: 'Nice work!', 'zh-Hans': '做得好！' },
  'mascot.chest': { 'zh-Hant': '開箱！', en: 'Open it!', 'zh-Hans': '开箱！' },
  'mascot.chest.reward': { 'zh-Hant': '＋10 學習點', en: '+10 learning points', 'zh-Hans': '＋10 学习点' },
  'mascot.chest.cta': { 'zh-Hant': '開箱', en: 'Open', 'zh-Hans': '开箱' },
  'mascot.chest.skip': { 'zh-Hant': '稍後', en: 'Later', 'zh-Hans': '稍后' },
} as const

const BANNED =
  /hearts?|super|hkeaa|upgrade|fomo|score|grade|分數|成绩|成績|付費|付费|限時|限时|倒計|倒计/i

function readJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>
}

describe('otter mascot copy (DICK PASS)', () => {
  const zhHant = readJson(join(root, 'src/i18n/zh-Hant.json'))
  const en = readJson(join(root, 'src/i18n/en.json'))
  const zhHans = readJson(join(root, 'src/i18n/zh-Hans.json'))
  const files = { 'zh-Hant': zhHant, en, 'zh-Hans': zhHans }

  for (const [key, locales] of Object.entries(COPY)) {
    for (const [locale, expected] of Object.entries(locales)) {
      it(`${locale} ${key} is the passed line`, () => {
        const value = files[locale as keyof typeof files][key]
        assert.equal(value, expected)
        assert.equal(BANNED.test(value), false)
        if (locale === 'en') assert.equal(value.trim().split(/\s+/).length <= 8, true)
        else assert.equal([...value].length <= 12, true)
      })
    }
  }
})

describe('otter pose timing and chest rules', () => {
  it('fades steps within 200ms and celebrates within 400–600ms', () => {
    assert.equal(OTTER_STEP_MS <= 200, true)
    assert.equal(OTTER_CELEBRATE_MS >= 400 && OTTER_CELEBRATE_MS <= 600, true)
    assert.equal(otterEnterMs(false, 'step'), OTTER_STEP_MS)
    assert.equal(otterEnterMs(false, 'celebrate'), OTTER_CELEBRATE_MS)
  })

  it('reduce-motion is an instant swap', () => {
    assert.equal(otterEnterMs(true, 'step'), 0)
    assert.equal(otterEnterMs(true, 'celebrate'), 0)
  })

  it('offers one chest only when a unit or quest is first completed', () => {
    const unit = { id: 'U1', nodeIds: ['U1-L1', 'U1-L2'] }
    const none = () => false
    assert.deepEqual(
      chestOffer({ kind: 'lesson', passed: true, id: 'U1-L1', unit, completedBefore: none }),
      { offer: false, key: null },
    )
    assert.deepEqual(
      chestOffer({
        kind: 'lesson',
        passed: true,
        id: 'U1-L2',
        unit,
        completedBefore: (id) => id === 'U1-L1',
      }),
      { offer: true, key: 'unit:U1' },
    )
    assert.deepEqual(
      chestOffer({
        kind: 'lesson',
        passed: false,
        id: 'U1-L2',
        unit,
        completedBefore: (id) => id === 'U1-L1',
      }),
      { offer: false, key: null },
    )
    assert.deepEqual(
      chestOffer({
        kind: 'lesson',
        passed: true,
        id: 'U1-L2',
        unit,
        completedBefore: () => true,
      }),
      { offer: false, key: null },
    )
    assert.deepEqual(
      chestOffer({ kind: 'quest', passed: true, id: 'Q1', unit: null, completedBefore: none }),
      { offer: true, key: 'quest:Q1' },
    )
    assert.deepEqual(
      chestOffer({
        kind: 'quest',
        passed: true,
        id: 'Q1',
        unit: null,
        completedBefore: (id) => id === 'Q1',
      }),
      { offer: false, key: null },
    )
    assert.deepEqual(
      chestOffer({ kind: 'lesson', passed: true, id: 'orphan', unit: null, completedBefore: none }),
      { offer: false, key: null },
    )
  })

  it('finds the unit that owns a lesson and ignores empty slices', () => {
    const units = [
      { id: 'empty', nodeIds: [] },
      { id: 'F4-U1', nodeIds: ['F4-U1-L1', 'F4-U1-L2'] },
    ]
    assert.equal(unitSliceFor('missing', units), null)
    assert.equal(unitSliceFor('F4-U1-L2', units)?.id, 'F4-U1')
  })

  it('grants the chest bonus once, through the existing XP award key', () => {
    assert.equal(OTTER_CHEST_XP, 10)
    assert.equal(otterChestAwardKey('quest:Q1'), `${OTTER_CHEST_AWARD_PREFIX}quest:Q1`)
    const sync = readFileSync(join(root, 'src/lib/progressSync.ts'), 'utf8')
    assert.match(sync, /OTTER_CHEST_AWARD_PREFIX/)
    assert.match(sync, /OTTER_CHEST_XP/)
  })

  it('lets ?otter=0 keep the classic path and ?otter=1 turn poses back on', () => {
    assert.equal(queryOtterFlag('?otter=0'), 'off')
    assert.equal(queryOtterFlag('otter=off'), 'off')
    assert.equal(queryOtterFlag('?otter=1'), 'on')
    assert.equal(queryOtterFlag(''), null)
    assert.equal(resolveOtterMascotEnabled('', null), true)
    assert.equal(resolveOtterMascotEnabled('', '0'), false)
    assert.equal(resolveOtterMascotEnabled('?otter=1', '0'), true)
    assert.equal(resolveOtterMascotEnabled('?otter=0', null), false)
  })

  it('ships the three pose files and wires them without the alt lines', () => {
    for (const pose of ['encourage', 'complete', 'chest'] as const) {
      const file = join(root, 'public', OTTER_SRC[pose])
      assert.equal(existsSync(file), true)
      assert.equal(statSync(file).size > 1000, true)
    }
    const player = readFileSync(join(root, 'src/components/game/LessonPlayer.tsx'), 'utf8')
    const pose = readFileSync(join(root, 'src/components/game/OtterPose.tsx'), 'utf8')
    assert.match(player, /otter-pose-encourage/)
    assert.match(player, /otter-pose-complete/)
    assert.match(player, /OtterChest/)
    assert.match(pose, /otter-chest-skip/)
    assert.match(pose, /otter-chest-open/)
    assert.match(pose, /otter-pose-chest/)
    assert.match(player, /Trophy/)
    assert.match(player, /if \(otterOn && offer\.offer\)/)
    assert.equal(player.includes('mascot.encourage.alt'), false)
    assert.equal(pose.includes('animate-bounce'), false)
    assert.equal(pose.includes('infinite'), false)
    assert.equal(BANNED.test(pose), false)
  })
})
