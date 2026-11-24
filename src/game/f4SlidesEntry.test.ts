import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const F4_DEMO_SLIDES_URL = 'https://gamma.app/docs/-il0yjfxm1yuw5gd'
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const messages = (path: string) => JSON.parse(read(path)) as Record<string, string>

const KEYS = ['lesson.slides.label', 'lesson.slides.open', 'lesson.slides.hint'] as const

/** Cells copied from the official locale table. Do not edit by hand. */
const OFFICIAL = JSON.parse(String.raw`{"lesson.slides.label":{"zh-Hant":"課堂投影片","en":"Classroom slides","zh-Hans":"课堂投影片"},"lesson.slides.open":{"zh-Hant":"打開投影片","en":"Open slides","zh-Hans":"打开投影片"},"lesson.slides.hint":{"zh-Hant":"用呢份投影片，等你更容易明白課題。","en":"Use this slide deck so you can understand the topic more easily.","zh-Hans":"用这份投影片，等你更容易明白课题。"}}`) as Record<(typeof KEYS)[number], { 'zh-Hant': string; en: string; 'zh-Hans': string }>

describe('Form 4 demo slides entry', () => {
  it('keeps the three new strings byte-identical to the official locale table', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const en = messages('src/i18n/en.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    for (const key of KEYS) {
      for (const [file, bag, locale] of [
        ['zh-Hant', hant, 'zh-Hant'],
        ['en', en, 'en'],
        ['zh-Hans', hans, 'zh-Hans'],
        ['overrides', overrides, 'zh-Hans'],
      ] as const) {
        const got = bag[key]
        const exp = OFFICIAL[key][locale]
        assert.equal(got, exp, `${file} ${key}`)
        assert.equal(Buffer.from(got, 'utf8').equals(Buffer.from(exp, 'utf8')), true, `${file} ${key}`)
        assert.equal(got.includes(F4_DEMO_SLIDES_URL), false, key)
        assert.equal(got.includes('gamma.app'), false, key)
      }
      assert.equal([...hant[key]].some((ch) => ch.codePointAt(0) === 0x7684), false, key)
      assert.equal(hant[key].includes('簡報'), false, key)
      assert.equal(hans[key].includes('简报'), false, key)
    }
  })

  it('opens one external Form 4 shell entry and does not copy it onto units, lessons, or other years', () => {
    assert.equal(F4_DEMO_SLIDES_URL, 'https://gamma.app/docs/-il0yjfxm1yuw5gd')
    const entry = read('src/components/game/F4SlidesEntry.tsx')
    const year = read('src/components/game/F4YearList.tsx')
    const quest = read('src/components/game/MapQuest.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    assert.equal(entry.split(F4_DEMO_SLIDES_URL).length - 1, 1)
    assert.match(entry, /target="_blank"/)
    assert.match(entry, /rel="noopener noreferrer"/)
    assert.equal(entry.includes('iframe'), false)
    assert.equal(entry.includes('download'), false)
    assert.equal(entry.includes('lesson.slides.label'), true)
    assert.equal(entry.includes('lesson.slides.open'), true)
    assert.equal(entry.includes('lesson.slides.hint'), true)
    assert.match(year, /gradeKey === 'map\.grade\.f4' \? <F4SlidesEntry \/> : null/)
    assert.equal(year.slice(year.indexOf('units.map')).includes('F4SlidesEntry'), false)
    assert.match(quest, /form === 's4' && !openYear \?/)
    assert.match(quest, /<F4SlidesEntry \/>/)
    const panel = quest.slice(quest.indexOf('function F4UnitPanel'))
    assert.equal(panel.includes('F4SlidesEntry'), false)
    assert.equal(panel.includes('gamma.app'), false)
    assert.equal(player.includes('F4SlidesEntry'), false)
    assert.equal(player.includes('gamma.app'), false)
    assert.equal(player.includes('il0yjfxm1yuw5gd'), false)
    const src = read('src/components/game/F4SlidesEntry.tsx') + year + quest
    assert.equal(src.split('gamma.app').length - 1, 1)
    for (const file of [
      'src/content/f4-demo.json',
      'src/content/f4-demo.en.json',
      'src/content/f4-demo.zh-Hans.json',
      'src/content/f5-demo.json',
      'src/content/f5-demo.en.json',
      'src/content/f5-demo.zh-Hans.json',
      'src/content/f6-demo.json',
      'src/content/f6-demo.en.json',
      'src/content/f6-demo.zh-Hans.json',
      'vercel.json',
    ]) {
      assert.equal(read(file).includes('gamma.app'), false, file)
      assert.equal(read(file).includes('il0yjfxm1yuw5gd'), false, file)
    }
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 12)
    const hant = messages('src/i18n/zh-Hant.json')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.match(hant['lesson.f4u4l2.part.expression'], /第一次簡報/)
    assert.match(hant['lesson.f4u4l3.part.principle'], /簡報二/)
    assert.equal(hant['present.standard'], '標準呈現')
    assert.equal(hant['present.easy'], '易讀呈現')
    assert.equal(hant['tts.read'], '朗讀')
    assert.equal(entry.includes('softMotion'), false)
    assert.equal(entry.includes('Duolingo'), false)
    assert.equal(entry.includes('SEN'), false)
  })
})
