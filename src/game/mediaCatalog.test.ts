import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { assembleMediaUnits, EXPECTED_MEDIA_IDS, isSequentialUnlocked, mediaAim, type MediaUnitSource } from './mediaCatalog.ts'

function pack(name: string): { units: MediaUnitSource[] } {
  const url = new URL(`../content/${name}`, import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as { units: MediaUnitSource[] }
}

const FORBIDDEN = ['Paper 2 只收 2D', 'Paper 2 只收2D', 'Paper 2 accepts 2D only', 'Paper 2 only accepts 2D']

describe('media catalog', () => {
  it('keeps 13 media with pen and photography as first-class ids', () => {
    assert.deepEqual(EXPECTED_MEDIA_IDS, [
      'M1-PAINTING',
      'M2-DRAWING',
      'M3-SCULPTURE',
      'M4-PRINTMAKING',
      'M5-FASHION',
      'M6-PAPER-SCULPTURE',
      'M7-CLAY',
      'M8-COLLAGE',
      'M9-COLOUR-PENCIL-PASTEL',
      'M10-WATERCOLOUR',
      'M11-INK',
      'M12-PEN',
      'M13-PHOTO',
    ])
  })

  it('ships the same 13 units in each locale and keeps paper2 notes verbatim', () => {
    const files = [
      ['media-intro.json', 'zh-Hant'],
      ['media-intro.en.json', 'en'],
      ['media-intro.zh-Hans.json', 'zh-Hans'],
    ] as const
    for (const [name, locale] of files) {
      const raw = pack(name)
      const blob = JSON.stringify(raw)
      for (const phrase of FORBIDDEN) assert.equal(blob.includes(phrase), false, `${name} contains ${phrase}`)
      assert.equal(raw.units.length, 13, name)
      const units = assembleMediaUnits(raw.units, locale)
      assert.deepEqual(
        units.map((u) => u.id),
        EXPECTED_MEDIA_IDS,
        name,
      )
      assert.equal(units.filter((u) => u.pending).length, 0, name)
      let lessons = 0
      let quizzes = 0
      for (const src of raw.units) {
        const got = units.find((u) => u.id === src.id)
        assert.ok(got)
        assert.equal(got.paper2Applicable, src.paper2Applicable)
        assert.equal(got.paper2Note, src.paper2Note)
        assert.equal(got.title, src.title)
        const srcLessons = src.lessons as { quiz: unknown[] }[]
        lessons += srcLessons.length
        quizzes += srcLessons.reduce((sum, lesson) => sum + lesson.quiz.length, 0)
      }
      assert.equal(lessons, 39, name)
      assert.equal(quizzes, 78, name)
      const clay = units.find((u) => u.id === 'M7-CLAY')
      const clayText = `${clay?.title ?? ''} ${clay?.intro} ${clay?.paper2Note}`
      assert.equal(clay?.paper2Applicable, false)
      if (locale === 'en') {
        assert.match(clayText, /陶泥/)
        assert.match(clayText, /ceramic/i)
      } else {
        assert.match(clayText, /陶泥/)
        assert.match(clayText, /陶土/)
        assert.match(clayText, /陶瓷/)
      }
      assert.equal(units.find((u) => u.id === 'M11-INK')?.paper2Applicable, true)
      assert.match(`${units.find((u) => u.id === 'M11-INK')?.title} ${units.find((u) => u.id === 'M11-INK')?.paper2Note}`, /水墨|ink/i)
      assert.equal(units.find((u) => u.id === 'M12-PEN')?.pending, false)
      assert.equal(units.find((u) => u.id === 'M13-PHOTO')?.pending, false)
      assert.equal(units.find((u) => u.id === 'M3-SCULPTURE')?.paper2Applicable, false)
      assert.equal(units.find((u) => u.id === 'M6-PAPER-SCULPTURE')?.paper2Applicable, false)
    }
  })

  it('stubs missing pen and photography instead of dropping them', () => {
    const raw = pack('media-intro.json').units.filter((u) => u.id !== 'M12-PEN' && u.id !== 'M13-PHOTO')
    const units = assembleMediaUnits(raw, 'zh-Hant')
    assert.equal(units.length, 13)
    const pen = units.find((u) => u.id === 'M12-PEN')
    const photo = units.find((u) => u.id === 'M13-PHOTO')
    assert.equal(pen?.pending, true)
    assert.equal(photo?.pending, true)
    assert.match(pen?.title ?? '', /針筆/)
    assert.match(photo?.title ?? '', /攝影/)
    assert.equal(pen?.paper2Note, '')
    assert.equal(units.find((u) => u.id === 'M1-PAINTING')?.pending, false)
  })

  it('returns pending stubs for every medium when the pack is missing', () => {
    const units = assembleMediaUnits(null, 'en')
    assert.equal(units.length, 13)
    assert.ok(units.every((u) => u.pending && u.paper2Note === '' && u.lessons.length === 0))
    assert.match(units.find((u) => u.id === 'M12-PEN')?.title ?? '', /Technical pen/)
    assert.match(units.find((u) => u.id === 'M13-PHOTO')?.title ?? '', /Photography/)
    assert.equal(units.find((u) => u.id === 'M7-CLAY')?.paper2Applicable, false)
  })

  it('unlocks lessons inside one medium in order', () => {
    const ids = ['M12-L1', 'M12-L2', 'M12-L3']
    const done = new Set<string>()
    const completed = (id: string) => done.has(id)
    assert.equal(isSequentialUnlocked(ids, 'M12-L1', completed), true)
    assert.equal(isSequentialUnlocked(ids, 'M12-L2', completed), false)
    done.add('M12-L1')
    assert.equal(isSequentialUnlocked(ids, 'M12-L2', completed), true)
    assert.equal(isSequentialUnlocked(ids, 'M12-L3', completed), false)
    assert.equal(isSequentialUnlocked(ids, 'M1-L1', completed), false)
  })

  it('shows a short teaching aim and keeps the exam caveat in paper2Note', () => {
    const clay = pack('media-intro.json').units.find((u) => u.id === 'M7-CLAY')
    const aim = mediaAim(String(clay?.intro ?? ''))
    assert.match(aim, /陶泥/)
    assert.match(aim, /陶土/)
    assert.match(aim, /陶瓷/)
    assert.equal(aim.includes('SBA'), false)
    assert.equal(aim.includes('只收'), false)
    const sculpture = pack('media-intro.en.json').units.find((u) => u.id === 'M3-SCULPTURE')
    const enAim = mediaAim(String(sculpture?.intro ?? ''))
    assert.match(enAim, /^Short unit on form/)
    assert.equal(enAim.includes('Paper 2'), false)
    const units = assembleMediaUnits(pack('media-intro.json').units, 'zh-Hant')
    assert.equal(units.find((u) => u.id === 'M7-CLAY')?.paper2Note.includes('SBA'), true)
  })
})
