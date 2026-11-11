import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { CLASSIC_GRADE_UNITS, SOFT_GO_GRADES, yearUnitsFor } from '../lib/softGoMaps.ts'

const F5_LESSON_COUNTS = [2, 2, 4, 2, 3, 4, 2]
const F6_LESSON_COUNTS = [2, 3, 4, 2, 3, 2]

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PUBLIC = resolve(root, 'public')
const official = JSON.parse(readFileSync(new URL('./f5f6Official.json', import.meta.url), 'utf8')) as {
  f5: OfficialUnit[]
  f6: OfficialUnit[]
}

type OfficialUnit = {
  id: string
  title: { hk: string; hans: string; en: string }
  intro: { hk: string; hans: string; en: string }
  lessons: { id: string; hk: string; hans: string; en: string }[]
}

const FILES = {
  hk: '',
  hans: '.zh-Hans',
  en: '.en',
} as const
const QUESTION_TYPES = ['mcq', 'fill', 'match', 'order', 'dualRead', 'short'] as const
const BANNED = [
  'CCCKLC',
  'Kung Lee',
  '功樂',
  '孔教',
  'HKEAA',
  '真題',
  '真题',
  'S.5',
  'S.6',
  'Exhibition',
  'guided tour',
  '導賞',
  '导赏',
  '參觀',
  '参观',
  '博物館',
  '博物馆',
  '外出',
  '故宮',
  '故宫',
  '虛白齋',
  '虚白斋',
  'DSE work',
  'Orientation',
  'Role taking',
  'Aligned to',
  '待老師審閱',
  '待老师审阅',
  'Pending teacher review',
  '暫無合法圖',
  '暂无合法图',
  'hearts',
  'stamina',
  '火焰',
  '連勝',
  '连胜',
  'streak',
  'F6-U6-MUSEUM',
  'F5-U6-PORTFOLIO',
  '出席校外',
]
const CANTONESE = /[嘅咗唔係喺嘢冇啲佢咁噉嚟睇揀撳啱拎搵乜呢俾嗰哋晒]|點樣|点样/
const PORTFOLIO_LINE = 'Lessons do not use real exam papers or high-score exemplars.'

type Quiz = { type: string; question: string; options: string[]; answer?: string | number | Record<string, string>; wordBank?: string[]; image?: string }
type Lesson = { id: string; title: string; cards: unknown[]; quiz: Quiz[]; coverImage?: string }
type Unit = { id: string; title: string; intro: string; coverImage?: string; lessons: Lesson[] }

function pack(name: string): { units: Unit[] } {
  return JSON.parse(readFileSync(new URL(`../content/${name}`, import.meta.url), 'utf8')) as { units: Unit[] }
}

function localeFile(grade: 'f5' | 'f6', locale: keyof typeof FILES): string {
  return `${grade}-demo${FILES[locale]}.json`
}

describe('Form 5 and Form 6 course packs', () => {
  it('keeps Form 5 to 7 units and 19 lessons, and Form 6 to 6 units and 16 lessons', () => {
    const f5Ids = official.f5.map((unit) => unit.id)
    const f6Ids = official.f6.map((unit) => unit.id)
    assert.deepEqual(f5Ids, [
      'F5-U1-ORIENT',
      'F5-U2-AESTHETIC',
      'F5-U3-HERITAGE',
      'F5-U4-SYMBOL',
      'F5-U5-ROLE',
      'F5-U6-CONTEMP',
      'F5-U7-PORTFOLIO',
    ])
    assert.deepEqual(f6Ids, [
      'F6-U1-ORIENT',
      'F6-U2-MINGQING',
      'F6-U3-DAILY',
      'F6-U4-LITERATI',
      'F6-U5-ROLE',
      'F6-U6-PORTFOLIO',
    ])
    assert.deepEqual([...F5_LESSON_COUNTS], official.f5.map((unit) => unit.lessons.length))
    assert.deepEqual([...F6_LESSON_COUNTS], official.f6.map((unit) => unit.lessons.length))
    assert.equal(official.f5.reduce((sum, unit) => sum + unit.lessons.length, 0), 19)
    assert.equal(official.f6.reduce((sum, unit) => sum + unit.lessons.length, 0), 16)
    for (const grade of ['f5', 'f6'] as const) {
      const spec = official[grade]
      for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
        const units = pack(localeFile(grade, locale)).units
        assert.deepEqual(units.map((unit) => unit.id), spec.map((unit) => unit.id), localeFile(grade, locale))
        units.forEach((unit, index) => {
          const expected = spec[index]
          assert.equal(unit.title, expected.title[locale], `${grade} ${locale} ${unit.id}`)
          assert.equal(unit.intro, expected.intro[locale], `${grade} ${locale} ${unit.id} intro`)
          assert.deepEqual(unit.lessons.map((lesson) => lesson.id), expected.lessons.map((lesson) => lesson.id))
          assert.equal(unit.lessons.length, (grade === 'f5' ? F5_LESSON_COUNTS : F6_LESSON_COUNTS)[index])
          unit.lessons.forEach((lesson, lessonIndex) => {
            assert.equal(lesson.title, expected.lessons[lessonIndex][locale], `${locale} ${lesson.id}`)
          })
        })
      }
    }
  })

  it('uses the same portfolio wording in both English unit intros', () => {
    const f5 = pack('f5-demo.en.json').units.find((unit) => unit.id === 'F5-U7-PORTFOLIO')
    const f6 = pack('f6-demo.en.json').units.find((unit) => unit.id === 'F6-U6-PORTFOLIO')
    assert.equal(f5?.intro.endsWith(PORTFOLIO_LINE), true)
    assert.equal(f6?.intro.endsWith(PORTFOLIO_LINE), true)
    assert.equal(f5?.intro.includes('Do not use real'), false)
    assert.equal(f6?.intro.includes('Do not use real'), false)
    assert.equal(official.f5[6].intro.en.endsWith(PORTFOLIO_LINE), true)
    assert.equal(official.f6[5].intro.en.endsWith(PORTFOLIO_LINE), true)
  })

  it('isolates Form 5 from Form 6 and leaves Form 4 untouched', () => {
    const f5ids = new Set(official.f5.flatMap((unit) => [unit.id, ...unit.lessons.map((lesson) => lesson.id)]))
    const f6ids = new Set(official.f6.flatMap((unit) => [unit.id, ...unit.lessons.map((lesson) => lesson.id)]))
    for (const id of f5ids) assert.equal(f6ids.has(id), false, id)
    for (const id of f6ids) assert.equal(f5ids.has(id), false, id)
    assert.deepEqual(
      yearUnitsFor(official.f5.map((unit) => ({ id: unit.id })), 'f5').map((unit) => unit.id),
      official.f5.map((unit) => unit.id),
    )
    assert.deepEqual(yearUnitsFor(official.f5.map((unit) => ({ id: unit.id })), 'f6'), [])
    assert.deepEqual(
      yearUnitsFor(official.f6.map((unit) => ({ id: unit.id })), 'f6').map((unit) => unit.id),
      official.f6.map((unit) => unit.id),
    )
    assert.deepEqual([...CLASSIC_GRADE_UNITS.f5], official.f5.map((unit) => unit.id))
    assert.deepEqual([...CLASSIC_GRADE_UNITS.f6], official.f6.map((unit) => unit.id))
    for (const name of ['f4-demo.json', 'f4-demo.en.json', 'f4-demo.zh-Hans.json']) {
      const blob = readFileSync(new URL(`../content/${name}`, import.meta.url), 'utf8')
      assert.equal(blob.includes('F5-U1-ORIENT'), false, name)
      assert.equal(blob.includes('F6-U1-ORIENT'), false, name)
    }
  })

  it('gives every new lesson cards, six practice types, and a local plate', () => {
    for (const grade of ['f5', 'f6'] as const) {
      for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
        const name = localeFile(grade, locale)
        for (const unit of pack(name).units) {
          const cover = resolve(PUBLIC, String(unit.coverImage).slice(1))
          assert.ok(statSync(cover).size > 1000, cover)
          for (const lesson of unit.lessons) {
            assert.ok(lesson.cards.length >= 4, `${name} ${lesson.id}`)
            for (const type of QUESTION_TYPES) {
              assert.equal(lesson.quiz.some((quiz) => quiz.type === type), true, `${name} ${lesson.id} ${type}`)
            }
            const lessonCover = resolve(PUBLIC, String(lesson.coverImage).slice(1))
            assert.ok(statSync(lessonCover).size > 1000, lessonCover)
            for (const quiz of lesson.quiz) {
              if (quiz.type === 'fill') assert.ok(quiz.wordBank?.includes(String(quiz.answer)), `${name} ${lesson.id}`)
              if (quiz.type === 'mcq') assert.ok(quiz.options.includes(String(quiz.answer)), `${name} ${lesson.id}`)
              if (quiz.type === 'dualRead') {
                assert.match(String(quiz.image), new RegExp(`/${grade}-dualread/${lesson.id}\\.png$`))
                assert.ok(statSync(resolve(PUBLIC, String(quiz.image).slice(1))).size > 1000, lesson.id)
              }
            }
          }
        }
      }
    }
  })

  it('keeps forbidden words off the new student copy', () => {
    for (const grade of ['f5', 'f6'] as const) {
      for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
        const name = localeFile(grade, locale)
        const blob = JSON.stringify(pack(name))
        for (const word of BANNED) assert.equal(blob.includes(word), false, `${name} ${word}`)
        assert.equal(/\bSoft\b/.test(blob), false, name)
        if (locale === 'hans') assert.equal(CANTONESE.test(blob), false, name)
        if (locale === 'en') {
          assert.equal(blob.includes('S.5'), false, name)
          assert.equal(blob.includes('S.6'), false, name)
        }
      }
    }
  })

  it('shows only the matching year pack on both map modes', () => {
    const map = readFileSync(new URL('../components/game/LearningMap.tsx', import.meta.url), 'utf8')
    const quest = readFileSync(new URL('../components/game/MapQuest.tsx', import.meta.url), 'utf8')
    const grades = readFileSync(new URL('../components/game/ClassicGrades.tsx', import.meta.url), 'utf8')
    const chrome = readFileSync(new URL('../components/game/MapQuestChrome.tsx', import.meta.url), 'utf8')
    assert.match(map, /grade === 'f5'/)
    assert.match(map, /grade === 'f6'/)
    assert.match(map, /getF5Units\(\)/)
    assert.match(map, /getF6Units\(\)/)
    assert.match(map, /map\.f5\.subtitle/)
    assert.match(map, /map\.f6\.subtitle/)
    assert.match(quest, /form === 's5' \? getF5Units\(\)/)
    assert.match(quest, /form === 's6' \? getF6Units\(\)/)
    assert.match(map, /map\.track\.history/)
    assert.match(map, /map\.track\.media/)
    assert.equal(map.includes('map.track.critique'), false)
    assert.equal(quest.includes('map.track.critique'), false)
    assert.equal(map.includes('S.5'), false)
    assert.equal(quest.includes('S.6'), false)
    assert.match(grades, /SOFT_GO_GRADES/)
    assert.deepEqual([...SOFT_GO_GRADES], ['all', 'f4', 'f5', 'f6'])
    assert.match(chrome, /map\.grade\.f5/)
    assert.match(chrome, /map\.grade\.f6/)
    const hant = JSON.parse(readFileSync(new URL('../i18n/zh-Hant.json', import.meta.url), 'utf8')) as Record<string, string>
    const hans = JSON.parse(readFileSync(new URL('../i18n/zh-Hans.json', import.meta.url), 'utf8')) as Record<string, string>
    const en = JSON.parse(readFileSync(new URL('../i18n/en.json', import.meta.url), 'utf8')) as Record<string, string>
    assert.equal(hant['map.grade.f5'], '中五')
    assert.equal(hant['map.grade.f6'], '中六')
    assert.equal(en['map.grade.f5'], 'Form 5')
    assert.equal(en['map.grade.f6'], 'Form 6')
    assert.equal(hant['map.f5.subtitle'], '中五視藝單元。短課卡，然後小測。唔聲稱全日曆每一週完整課。')
    assert.equal(hans['map.f5.subtitle'], '中五视艺单元。短课卡，然后小测。不声称全日历每一周完整课。')
    assert.equal(en['map.f5.subtitle'], 'Form 5 visual arts units. Short cards, then a quiz. This is not a claim that every calendar week has a full lesson.')
    assert.equal(hant['map.f6.subtitle'], '中六視藝單元。短課卡，然後小測。唔聲稱全日曆每一週完整課。')
    assert.equal(existsSync(resolve(root, 'src/content/f5-demo.json')), true)
    assert.equal(existsSync(resolve(root, 'src/content/f6-demo.json')), true)
  })
})
