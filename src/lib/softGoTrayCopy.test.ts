import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** Soft GO ④ celebrate tray + mild learning points. Table wins. */
const COPY = {
  en: {
    'tray.correct.title': 'Nice!',
    'tray.correct.cta': 'Continue',
    'tray.wrong.title': 'Try again',
    'tray.wrong.cta': 'Continue',
    'tray.complete.title': 'Lesson done',
    'tray.complete.cta': 'Next lesson',
    'tray.softSkip': 'Later',
    'lp.gain': '+{n} learning points',
    'lp.level': 'Level {n}',
    'lp.tip': 'Finish lessons to earn learning points',
  },
  'zh-Hant': {
    'tray.correct.title': '做得好！',
    'tray.correct.cta': '繼續',
    'tray.wrong.title': '再試一次',
    'tray.wrong.cta': '繼續',
    'tray.complete.title': '這一課完成',
    'tray.complete.cta': '下一課',
    'tray.softSkip': '稍後',
    'lp.gain': '＋{n} 學習點',
    'lp.level': '等級 {n}',
    'lp.tip': '完成課會累積學習點',
  },
  'zh-Hans': {
    'tray.correct.title': '做得好！',
    'tray.correct.cta': '继续',
    'tray.wrong.title': '再试一次',
    'tray.wrong.cta': '继续',
    'tray.complete.title': '这一课完成',
    'tray.complete.cta': '下一课',
    'tray.softSkip': '稍后',
    'lp.gain': '＋{n} 学习点',
    'lp.level': '等级 {n}',
    'lp.tip': '完成课会累积学习点',
  },
} as const

const BANNED = /streak|hearts|gems|XP|經驗值|经验值|領取|领取|火焰|付費|付费|SEN|診斷|诊断/i

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

describe('Soft GO ④ tray and learning-point copy', () => {
  it('matches the 3-locale table and stays off the never list', () => {
    const files = {
      en: 'src/i18n/en.json',
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = messages(files[locale])
      for (const [key, value] of Object.entries(COPY[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.equal(BANNED.test(value), false, `${locale} ${key}`)
      }
    }
  })

  it('wires the live celebrate tray and learning-point chrome to those keys', () => {
    const map = read('src/components/game/MapOneLesson.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    const achievements = read('src/components/game/Achievements.tsx')
    const frames = read('src/components/game/SoftMotion.tsx')

    for (const key of [
      'tray.complete.title',
      'tray.complete.cta',
      'tray.correct.title',
      'tray.wrong.title',
      'tray.softSkip',
      'lp.tip',
      'lp.gain',
    ]) {
      assert.equal(map.includes(`'${key}'`), true, key)
    }
    assert.equal(map.includes('mascot.chest.reward'), false)
    assert.equal(map.includes('celebrate.soft'), false)

    for (const key of ['tray.correct.title', 'tray.wrong.title', 'tray.complete.title', 'lp.gain', 'lp.tip']) {
      assert.equal(player.includes(`'${key}'`), true, key)
    }
    assert.equal(achievements.includes("'lp.level'"), true)
    assert.match(frames, /w-\[43\.5%\]/)
    assert.equal(frames.includes('w-[58%]'), false)
  })
})
