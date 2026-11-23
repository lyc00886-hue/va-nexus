import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { nextLangState, resolveLangState } from './langMode.ts'
import { pairLessonCopy } from './lessonCopyPairs.ts'
import { pickLessonScrollTarget } from './lessonPageScroll.ts'
import type { Lesson } from '../game/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

const BANNED = /[\u7684\u628A\u5572\u4F86\u6765\u771E\u54EA]/

describe('classroom page scroll', () => {
  it('moves the lesson body from the page, and leaves a card that already fits', () => {
    assert.equal(pickLessonScrollTarget([]), null)
    assert.equal(
      pickLessonScrollTarget([{ id: 'body', containsTarget: false, overflows: false }]),
      null,
    )
    assert.equal(
      pickLessonScrollTarget([{ id: 'body', containsTarget: true, overflows: true }]),
      null,
    )
    assert.equal(
      pickLessonScrollTarget([{ id: 'body', containsTarget: false, overflows: true }]),
      'body',
    )
    assert.equal(
      pickLessonScrollTarget([
        { id: 'art', containsTarget: false, overflows: true },
        { id: 'body', containsTarget: false, overflows: true },
      ]),
      'body',
    )
    assert.equal(
      pickLessonScrollTarget([
        { id: 'art', containsTarget: true, overflows: true },
        { id: 'body', containsTarget: false, overflows: true },
      ]),
      null,
    )
    assert.equal(
      pickLessonScrollTarget([{ id: 'art', containsTarget: false, overflows: true }]),
      'art',
    )
  })

  it('wires page scrolling on the classroom shell and keeps the footer in flow', () => {
    const player = read('src/components/game/LessonPlayer.tsx')
    const board = read('src/components/game/ThinPractice.tsx')
    assert.match(player, /bindLessonPageScroll/)
    assert.match(player, /data-lesson-scroll="body"/)
    assert.match(board, /data-lesson-scroll="body"/)
    assert.match(player, /w-full rounded-2xl bg-\[#0D9488\]/)
    assert.match(player, /shadow-\[0_4px_0_#0F766E\]/)
    assert.equal(player.includes('sticky bottom-0'), false)
    assert.match(player, /w-full max-w-none wrap-anywhere space-y-3/)
    assert.match(player, /mx-auto w-full max-w-none wrap-anywhere space-y-4 md:max-w-2xl/)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 14)
  })
})

describe('英中對照 language mode', () => {
  it('locks the locale supplement strings', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    assert.equal(hant['lang.mode.bilingual'], '英中對照')
    assert.equal(hans['lang.mode.bilingual'], '英中对照')
    assert.equal(en['lang.mode.bilingual'], 'English + Chinese')
    assert.equal(hant['lang.mode.bilingual.short'], '對照')
    assert.equal(hans['lang.mode.bilingual.short'], '对照')
    assert.equal(en['lang.mode.bilingual.short'], 'EN/中')
    assert.equal(hant['lang.mode.bilingual.hint'], '同時見到英文同中文')
    assert.equal(hans['lang.mode.bilingual.hint'], '同时见到英文和中文')
    assert.equal(en['lang.mode.bilingual.hint'], 'See English and Chinese together')
    for (const key of ['lang.mode.bilingual', 'lang.mode.bilingual.short', 'lang.mode.bilingual.hint']) {
      assert.equal(overrides[key], hans[key], key)
      assert.equal(BANNED.test(hant[key]), false, key)
    }
    assert.equal(hant['lang.switch'], '語言')
    assert.equal(hans['lang.switch'], '语言')
    assert.equal(en['lang.switch'], 'Language')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hans['qtype.chip.dualRead'], '艺术评赏比较')
    assert.equal(en['qtype.chip.dualRead'], 'Compare works')
    assert.equal(hant['present.standard'], '標準呈現')
    assert.equal(hant['present.easy'], '易讀呈現')
    assert.equal(hant['lp.next'], '下一張')
    assert.equal(hant['lp.check'], '檢查答案')
  })

  it('pairs English with the last Chinese choice, and keeps single languages single', () => {
    const fresh = resolveLangState(null, null, 'zh-HK')
    assert.deepEqual(fresh, { locale: 'zh-Hant', bilingual: false, zhSide: 'zh-Hant' })
    assert.deepEqual(resolveLangState(null, null, 'zh-CN'), {
      locale: 'zh-Hans',
      bilingual: false,
      zhSide: 'zh-Hans',
    })
    const afterHans = nextLangState(fresh, 'zh-Hans')
    assert.deepEqual(afterHans, { locale: 'zh-Hans', bilingual: false, zhSide: 'zh-Hans' })
    const afterEn = nextLangState(afterHans, 'en')
    assert.deepEqual(afterEn, { locale: 'en', bilingual: false, zhSide: 'zh-Hans' })
    assert.deepEqual(nextLangState(afterEn, 'bilingual'), {
      locale: 'zh-Hans',
      bilingual: true,
      zhSide: 'zh-Hans',
    })
    assert.deepEqual(nextLangState(fresh, 'bilingual'), {
      locale: 'zh-Hant',
      bilingual: true,
      zhSide: 'zh-Hant',
    })
    assert.deepEqual(resolveLangState('bilingual', 'zh-Hans', 'en'), {
      locale: 'zh-Hans',
      bilingual: true,
      zhSide: 'zh-Hans',
    })
    assert.deepEqual(resolveLangState('bilingual', null, 'zh-CN'), {
      locale: 'zh-Hant',
      bilingual: true,
      zhSide: 'zh-Hant',
    })
    assert.deepEqual(nextLangState({ locale: 'zh-Hans', bilingual: true, zhSide: 'zh-Hans' }, 'en'), {
      locale: 'en',
      bilingual: false,
      zhSide: 'zh-Hans',
    })
  })

  it('stacks a different English lesson string above Chinese and skips identical lines', () => {
    const zh = {
      id: 'F4-U2-L1',
      title: '觀察同繪畫基礎：線、形、構圖',
      subtitle: '',
      minutes: 1,
      demo: false,
      cards: [
        {
          title: '重點 1',
          body: '寫生由觀察開始：先睇整體形狀同比例，再加細節，唔好一開始就抄陰影。',
          easy: ['先睇整體形狀同比例'],
        },
      ],
      questions: [],
    } satisfies Lesson
    const en = {
      ...zh,
      title: 'Observation and Drawing Basics: Line, Shape, Composition',
      cards: [
        {
          title: 'Key point 1',
          body: 'Drawing from observation starts with looking: overall shape and proportion first, details later—not deepest shadows first.',
          easy: ['Look at overall shape and proportion first'],
        },
      ],
    } satisfies Lesson
    const same = new Map<string, string>()
    pairLessonCopy(zh, { ...en, title: zh.title, cards: zh.cards }, same)
    assert.equal(same.size, 0)
    const paired = new Map<string, string>()
    pairLessonCopy(zh, en, paired)
    assert.equal(paired.get(zh.title), en.title)
    assert.equal(paired.get('重點 1'), 'Key point 1')
    assert.equal(paired.get(zh.cards[0].body), en.cards[0].body)
    const hantPack = JSON.parse(read('src/content/f4-demo.json')) as {
      units: { lessons: { id: string; title: string }[] }[]
    }
    const enPack = JSON.parse(read('src/content/f4-demo.en.json')) as {
      units: { lessons: { id: string; title: string }[] }[]
    }
    const hantTitle = hantPack.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === 'F4-U2-L1')?.title
    const enTitle = enPack.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === 'F4-U2-L1')?.title
    assert.equal(hantTitle, '觀察同繪畫基礎：線、形、構圖')
    assert.equal(enTitle, 'Observation and Drawing Basics: Line, Shape, Composition')
  })
})
