import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { artistsFromLesson, coverFromUnit, learningMapAssetPath } from './f4Media.ts'

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), '../../public')

const FILES = ['f4-demo.json', 'f4-demo.en.json', 'f4-demo.zh-Hans.json'] as const
const UNIT_IDS = [
  'F4-U1-ORIENT',
  'F4-U2-DRAW-DESIGN',
  'F4-U3-COMMUNITY',
  'F4-U4-SELF-RESEARCH',
  'F4-U5-ART-HIST',
  'F4-U6-THEME-SEEDS',
]
const LESSON_IDS = [
  'F4-U1-L1',
  'F4-U1-L2',
  'F4-U2-L1',
  'F4-U2-L2',
  'F4-U2-L3',
  'F4-U3-L1',
  'F4-U3-L2',
  'F4-U3-L3',
  'F4-U3-L4',
  'F4-U4-L1',
  'F4-U4-L2',
  'F4-U5-L1',
  'F4-U5-L2',
  'F4-U6-L1',
  'F4-U6-L2',
]
const LESSONS_PER_UNIT = [2, 3, 4, 2, 2, 2]
const NOVEMBER_LESSONS = ['F4-U2-L3', 'F4-U3-L3', 'F4-U3-L4'] as const
const NOVEMBER_COPY = {
  'f4-demo.json': {
    'F4-U2-L3': {
      title: '十一月：設計繪圖同設計思維',
      goal: '由「畫得似」轉去「設計得清楚」——先問功能同觀眾，再落筆。',
    },
    'F4-U3-L3': {
      title: '十一月：社區藝術計劃——研究',
      goal: '主題來自真實環境——人物、地方、習慣、物件；做社區藝術研究。',
    },
    'F4-U3-L4': {
      title: '十一月：社區藝術計劃——發展同創作',
      goal: '把研究變成創作——繪畫、設計、雕塑或其他媒介都可以。',
    },
  },
  'f4-demo.zh-Hans.json': {
    'F4-U2-L3': {
      title: '十一月：设计绘图与设计思维',
      goal: '由「画得像」转向「设计得清楚」——先问功能与观众，再落笔。',
    },
    'F4-U3-L3': {
      title: '十一月：社区艺术计划——研究',
      goal: '主题来自真实环境——人物、地方、习惯、物件；做社区艺术研究。',
    },
    'F4-U3-L4': {
      title: '十一月：社区艺术计划——发展与创作',
      goal: '把研究变成创作——绘画、设计、雕塑或其他媒介都可以。',
    },
  },
  'f4-demo.en.json': {
    'F4-U2-L3': {
      title: 'November: Design drawing and design thinking',
      goal: 'Move from “looks real” to “communicates clearly”—ask who it is for, then draw.',
    },
    'F4-U3-L3': {
      title: 'November: Community art project — research',
      goal: 'Grow themes from real places—people, habits, objects, spaces—through community-art research.',
    },
    'F4-U3-L4': {
      title: 'November: Community art project — develop and make',
      goal: 'Turn research into making—painting, design, sculpture or other media.',
    },
  },
} as const
const SYLLABUS_YEAR = /20\d{2}\s*[-/–—]\s*(?:20)?\d{2}/
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
  subtitle?: string
  coverImage?: string
  coverCredit?: string
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
  it('ships the same six units and fifteen lessons in each locale', () => {
    for (const name of FILES) {
      const units = pack(name).units
      assert.deepEqual(
        units.map((unit) => unit.id),
        UNIT_IDS,
        name,
      )
      const lessons = units.flatMap((unit) => unit.lessons)
      assert.deepEqual(
        lessons.map((lesson) => lesson.id),
        LESSON_IDS,
        name,
      )
      assert.equal(lessons.length, 15, name)
      assert.equal(
        lessons.reduce((n, lesson) => n + lesson.cards.length, 0),
        75,
        name,
      )
      assert.equal(
        lessons.reduce((n, lesson) => n + lesson.quiz.length, 0),
        55,
        name,
      )
      for (const [index, unit] of units.entries()) {
        assert.equal(typeof unit.title, 'string')
        assert.ok(unit.title.length > 0)
        assert.equal(typeof unit.intro, 'string')
        assert.equal(unit.lessons.length, LESSONS_PER_UNIT[index], `${name} ${unit.id}`)
        assert.equal(SYLLABUS_YEAR.test(unit.title), false, `${name} ${unit.id} title`)
        assert.equal(SYLLABUS_YEAR.test(unit.intro), false, `${name} ${unit.id} intro`)
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
        assert.ok(cover.coverImage, name)
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

  it('overlays the lesson title on November covers, not the short goal', () => {
    const map = readFileSync(new URL('../components/game/LearningMap.tsx', import.meta.url), 'utf8')
    assert.match(map, /title=\{node\.title\}/)
    assert.equal(map.includes('title={node.subtitle}'), false)
    assert.match(map, /data-cover-title=\{title\}/)
    for (const id of NOVEMBER_LESSONS) {
      assert.match(map, new RegExp(`'${id}'`))
    }
    assert.equal(/\bLv\./.test(map), false)
    assert.equal(/ XP/.test(map), false)
    assert.equal(map.includes('SEN'), false)
  })

  it('wires every F.4 lesson tile to a local cover, and keeps November titles', () => {
    for (const name of FILES) {
      const lessons = pack(name).units.flatMap((unit) => unit.lessons)
      const copy = NOVEMBER_COPY[name]
      for (const lesson of lessons) {
        if (NOVEMBER_LESSONS.includes(lesson.id as (typeof NOVEMBER_LESSONS)[number])) {
          const expected = copy[lesson.id as keyof typeof copy]
          assert.equal(lesson.title, expected.title, `${name} ${lesson.id}`)
          assert.equal(lesson.subtitle, expected.goal, `${name} ${lesson.id}`)
        }
        const cover = coverFromUnit(lesson)
        assert.equal(cover.coverImage, `/content/learning-map-illustrations/f4-covers/${lesson.id}.png`, name)
        assert.equal(cover.coverCredit, lesson.coverCredit, name)
        assert.ok((cover.coverCredit ?? '').length > 0, name)
        assert.ok(statSync(resolve(PUBLIC, cover.coverImage.slice(1))).size > 1000, lesson.id)
        if (NOVEMBER_LESSONS.includes(lesson.id as (typeof NOVEMBER_LESSONS)[number])) {
          const blob = JSON.stringify(lesson)
          assert.equal(/HKEAA|考評局|考评局|SEN|IQ|FOMO/.test(blob), false, `${name} ${lesson.id}`)
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

  it('does not put a syllabus year on the F.4 map chrome', () => {
    for (const file of ['zh-Hant.json', 'en.json', 'zh-Hans.json']) {
      const messages = JSON.parse(readFileSync(new URL(`../i18n/${file}`, import.meta.url), 'utf8')) as Record<string, string>
      for (const key of ['map.track.f4', 'map.f4.subtitle']) {
        assert.equal(SYLLABUS_YEAR.test(messages[key] ?? ''), false, `${file} ${key}`)
      }
      assert.equal(/四個單元|四个单元|four units/.test(messages['map.f4.subtitle'] ?? ''), false, file)
    }
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
