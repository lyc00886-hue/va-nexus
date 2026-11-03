import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { artistsFromLesson, coverFromUnit, learningMapAssetPath } from './f4Media.ts'

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), '../../public')

const FILES = ['f4-demo.json', 'f4-demo.en.json', 'f4-demo.zh-Hans.json'] as const
const UNIT_IDS = ['F4-U1-ORIENT', 'F4-U2-DRAW-DESIGN', 'F4-U3-COMMUNITY', 'F4-U4-SELF-RESEARCH']
const PLACEHOLDER = {
  'f4-demo.json': '暫無合法圖',
  'f4-demo.en.json': '[No cleared image yet]',
  'f4-demo.zh-Hans.json': '暂无合法图',
} as const

type Quiz = {
  type: string
  question: string
  options: string[]
  answer: string | number | Record<string, string>
  wordBank?: string[]
}

type ArtistMedia = { thumb?: string; license?: string; credit?: string; sourceUrl?: string }
type Lesson = {
  id: string
  title: string
  cards: string[]
  quiz: Quiz[]
  artistIds?: string[]
  artistMedia?: Record<string, ArtistMedia>
}
type Unit = { id: string; title: string; intro: string; coverImage?: string; coverCredit?: string; lessons: Lesson[] }

function pack(name: string): { units: Unit[] } {
  const url = new URL(`../content/${name}`, import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as { units: Unit[] }
}

describe('F.4 demo slice', () => {
  it('ships the same four units and eight lessons in each locale', () => {
    for (const name of FILES) {
      const units = pack(name).units
      assert.deepEqual(
        units.map((unit) => unit.id),
        UNIT_IDS,
        name,
      )
      const lessons = units.flatMap((unit) => unit.lessons)
      assert.equal(lessons.length, 8, name)
      assert.equal(
        lessons.reduce((n, lesson) => n + lesson.cards.length, 0),
        40,
        name,
      )
      assert.equal(
        lessons.reduce((n, lesson) => n + lesson.quiz.length, 0),
        30,
        name,
      )
      for (const unit of units) {
        assert.equal(typeof unit.title, 'string')
        assert.ok(unit.title.length > 0)
        assert.equal(typeof unit.intro, 'string')
        assert.equal(unit.lessons.length, 2)
      }
    }
  })

  it('keeps lesson ids and quiz types aligned across locales', () => {
    const signature = (name: string) =>
      pack(name)
        .units.map((unit) =>
          unit.lessons.map((lesson) => `${lesson.id}:${lesson.quiz.map((q) => q.type).join(',')}`).join('|'),
        )
        .join('||')
    const base = signature(FILES[0])
    for (const name of FILES.slice(1)) assert.equal(signature(name), base, name)
  })

  it('ships local unit covers and only the cleared Kahlo artwork thumb', () => {
    const portrait = resolve(PUBLIC, 'content/learning-map-illustrations/artist-thumbs/WEST-KAHLO-01-portrait.jpg')
    assert.ok(existsSync(portrait), portrait)
    for (const name of FILES) {
      const units = pack(name).units
      const blob = JSON.stringify(units)
      assert.equal(blob.includes('WEST-KAHLO-01-portrait'), false, name)
      for (const unit of units) {
        const cover = coverFromUnit(unit)
        assert.equal(cover.coverImage, `/content/learning-map-illustrations/f4-covers/${unit.id}.png`, name)
        assert.equal(typeof cover.coverCredit, 'string', name)
        assert.ok((cover.coverCredit ?? '').length > 0, name)
        const file = resolve(PUBLIC, cover.coverImage.slice(1))
        assert.ok(statSync(file).size > 1000, file)
      }
      const mediaLessons = units.flatMap((unit) => unit.lessons).filter((lesson) => lesson.artistMedia)
      assert.equal(mediaLessons.length, 1, name)
      assert.equal(mediaLessons[0].id, 'F4-U4-L1', name)
      assert.deepEqual(Object.keys(mediaLessons[0].artistMedia ?? {}), ['WEST-KAHLO-01'], name)
      for (const lesson of units.flatMap((unit) => unit.lessons)) {
        const refs = artistsFromLesson(lesson)
        if (!lesson.artistIds?.length) {
          assert.equal(refs, undefined, `${name} ${lesson.id}`)
          continue
        }
        assert.ok(refs, `${name} ${lesson.id}`)
        assert.deepEqual(
          refs.map((ref) => ref.artistId),
          lesson.artistIds,
          `${name} ${lesson.id}`,
        )
        for (const ref of refs) {
          const cleared = lesson.id === 'F4-U4-L1' && ref.artistId === 'WEST-KAHLO-01'
          if (cleared) {
            assert.equal(ref.thumb, '/content/learning-map-illustrations/artist-thumbs/WEST-KAHLO-01-artwork.png')
            assert.equal(ref.license, 'Public domain')
            assert.match(ref.credit ?? '', /Frida Kahlo/)
            assert.match(ref.sourceUrl ?? '', /^https:\/\/commons\.wikimedia\.org\//)
            assert.ok(statSync(resolve(PUBLIC, ref.thumb.slice(1))).size > 1000)
          } else {
            assert.equal(ref.thumb, undefined, ref.artistId)
            assert.equal(ref.credit, undefined, ref.artistId)
            assert.equal(ref.sourceUrl, undefined, ref.artistId)
          }
        }
      }
    }
  })

  it('ignores missing covers and refuses remote or parent-path thumbs', () => {
    assert.deepEqual(coverFromUnit({}), {})
    assert.deepEqual(coverFromUnit({ coverImage: 'https://example.com/cover.png', coverCredit: 'nope' }), {})
    assert.equal(learningMapAssetPath('/content/learning-map-illustrations/../secret.png'), undefined)
    assert.equal(artistsFromLesson({}), undefined)
    const refs = artistsFromLesson({
      artistIds: ['WEST-KAHLO-01', 'HK-SHIEH-01'],
      artistMedia: {
        'WEST-KAHLO-01': { thumb: 'https://upload.wikimedia.org/x.png', credit: 'remote', license: 'Public domain' },
      },
    })
    assert.deepEqual(refs, [{ artistId: 'WEST-KAHLO-01' }, { artistId: 'HK-SHIEH-01' }])
  })

  it('keeps image placeholders and does not embed paper or exemplar bodies', () => {
    for (const name of FILES) {
      const blob = JSON.stringify(pack(name))
      assert.ok(blob.includes(PLACEHOLDER[name]), name)
      assert.equal(blob.includes('past-paper stub'), false)
    }
  })

  it('has resolvable mcq, fill, and match answers', () => {
    for (const name of FILES) {
      for (const unit of pack(name).units) {
        for (const lesson of unit.lessons) {
          assert.ok(lesson.cards.every((card) => typeof card === 'string' && card.length > 0))
          lesson.quiz.forEach((quiz, index) => {
            const id = `${name} ${lesson.id} q${index + 1}`
            if (quiz.type === 'mcq') {
              const idx = typeof quiz.answer === 'number' ? quiz.answer : quiz.options.indexOf(String(quiz.answer))
              assert.ok(idx >= 0 && idx < quiz.options.length, id)
            } else if (quiz.type === 'fill') {
              const answer = String(quiz.answer)
              assert.ok(quiz.wordBank?.includes(answer), id)
              assert.match(quiz.question, /＿|__/, id)
            } else if (quiz.type === 'match') {
              const map = quiz.answer as Record<string, string>
              assert.deepEqual(quiz.options.slice().sort(), Object.keys(map).slice().sort(), id)
            } else {
              assert.fail(`${id} unknown type ${quiz.type}`)
            }
          })
        }
      }
    }
  })
})
