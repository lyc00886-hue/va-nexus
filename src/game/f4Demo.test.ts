import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { artistsFromLesson, cardArtFrom, coverFromUnit, learningMapAssetPath } from './f4Media.ts'

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), '../../public')

const FILES = ['f4-demo.json', 'f4-demo.en.json', 'f4-demo.zh-Hans.json'] as const
const UNIT_IDS = [
  'F4-U1-ORIENT',
  'F4-U2-DRAW-DESIGN',
  'F4-U3-COMMUNITY',
  'F4-U4-SELF-RESEARCH',
  'F4-U5-ART-HIST',
  'F4-U6-THEME-SEEDS',
  'F4-U7-EXAM-STRUCT',
]
const LESSON_IDS = [
  'F4-U1-L1',
  'F4-U1-L2',
  'F4-U1-L3',
  'F4-U1-L4',
  'F4-U2-L1',
  'F4-U2-L2',
  'F4-U2-L3',
  'F4-U2-L4',
  'F4-U3-L1',
  'F4-U3-L2',
  'F4-U3-L3',
  'F4-U3-L4',
  'F4-U4-L1',
  'F4-U4-L2',
  'F4-U4-L3',
  'F4-U5-L1',
  'F4-U5-L2',
  'F4-U5-L3',
  'F4-U5-L4',
  'F4-U6-L1',
  'F4-U6-L2',
  'F4-U6-L3',
  'F4-U7-L1',
  'F4-U7-L2',
]
const LESSONS_PER_UNIT = [4, 4, 4, 3, 4, 3, 2]
const QUESTION_TYPES = ['mcq', 'fill', 'match', 'order', 'dualRead', 'short'] as const
const NEW_TITLES = {
  'f4-demo.json': {
    'F4-U1-L3': '藝術辭典：關鍵字同評賞寫作',
    'F4-U1-L4': '藝術時間線：藝術運動同呈現方式',
    'F4-U2-L4': '設計繪圖、設計思維同物料',
    'F4-U4-L3': '主題發展同第二次簡報',
    'F4-U5-L3': '中國書畫史入門：秦漢至魏晉',
    'F4-U5-L4': '中國書畫史同技法入門：唐至五代',
    'F4-U6-L3': '延伸、願望同拼湊',
    'F4-U7-L1': '評賞寫作同主題探索結構',
    'F4-U7-L2': '創作結構練習同媒介',
    'F4-U7-EXAM-STRUCT': '應試練習場：主題視覺呈現同評賞寫作',
  },
  'f4-demo.zh-Hans.json': {
    'F4-U1-L3': '艺术辞典：关键字与评赏写作',
    'F4-U1-L4': '艺术时间线：艺术运动与呈现方式',
    'F4-U2-L4': '设计绘图、设计思维与物料',
    'F4-U4-L3': '主题发展与第二次简报',
    'F4-U5-L3': '中国书画史入门：秦汉至魏晋',
    'F4-U5-L4': '中国书画史与技法入门：唐至五代',
    'F4-U6-L3': '延伸、愿望与拼凑',
    'F4-U7-L1': '评赏写作与主题探索结构',
    'F4-U7-L2': '创作结构练习与媒介',
    'F4-U7-EXAM-STRUCT': '应试练习场：主题视觉呈现与评赏写作',
  },
  'f4-demo.en.json': {
    'F4-U1-L3': 'Art dictionary: keywords and appreciation writing',
    'F4-U1-L4': 'Art timeline: art movements and ways of presentation',
    'F4-U2-L4': 'Design drawing, design thinking and materials',
    'F4-U4-L3': 'Theme development and a second presentation',
    'F4-U5-L3': 'Chinese calligraphy and painting history intro: Qin–Han to Wei–Jin',
    'F4-U5-L4': 'Chinese calligraphy and painting history and technique intro: Tang to Five Dynasties',
    'F4-U6-L3': 'Extend, wish and assemble',
    'F4-U7-L1': 'Appreciation writing and theme exploration structure',
    'F4-U7-L2': 'Making structure practice and media',
    'F4-U7-EXAM-STRUCT': 'Exam practice ground: visual presentation of a theme and appreciation writing',
  },
} as const
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
const SCOUT_PLATES = {
  '01-quest-f4-complete-path.png': '5475cea5fdc2',
  '02-classic-f4-complete.png': 'be729e66b0c7',
  '03-f4-lesson-cards-safe.png': '0386f338a607',
  'preview-strip.png': 'e814f2c34337',
} as const

type Quiz = {
  type: string
  question: string
  options: string[]
  answer?: string | number | Record<string, string>
  wordBank?: string[]
  image?: string
  explain?: string
}

type ArtistMedia = { thumb?: string; license?: string; credit?: string; sourceUrl?: string }
type ContentCard = {
  title?: string
  body?: string
  image?: string
  imageCredit?: string
}
type Lesson = {
  id: string
  title: string
  subtitle?: string
  coverImage?: string
  coverCredit?: string
  cards: (string | ContentCard)[]
  quiz: Quiz[]
  artistIds?: string[]
  artistMedia?: Record<string, ArtistMedia>
}

/** P0 in-lesson slots. null = titled card with no image. */
const NOVEMBER_CARD_IMAGES: Record<(typeof NOVEMBER_LESSONS)[number], (string | null)[]> = {
  'F4-U2-L3': [null, 'F4-U2-L3-c1.png', 'F4-U2-L3-c2.png', null, null],
  'F4-U3-L3': ['F4-U3-L3-c0.png', 'F4-U3-L3-c1.png', null, null, null],
  'F4-U3-L4': ['F4-U3-L4-c0.png', 'F4-U3-L4-c1.png', 'F4-U3-L4-c2.png', null, null],
}
type Unit = { id: string; title: string; intro: string; coverImage?: string; coverCredit?: string; lessons: Lesson[] }

function pack(name: string): { units: Unit[] } {
  const url = new URL(`../content/${name}`, import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as { units: Unit[] }
}

describe('F.4 demo slice', () => {
  it('ships the same seven units and twenty-four lessons in each locale', () => {
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
      assert.equal(lessons.length, 24, name)
      const titles = NEW_TITLES[name]
      assert.equal(units.find((unit) => unit.id === 'F4-U7-EXAM-STRUCT')?.title, titles['F4-U7-EXAM-STRUCT'], name)
      for (const lesson of lessons) {
        const expected = titles[lesson.id as keyof typeof titles]
        if (expected) assert.equal(lesson.title, expected, `${name} ${lesson.id}`)
        assert.ok(lesson.cards.length >= 4, `${name} ${lesson.id}`)
        for (const type of QUESTION_TYPES) {
          assert.equal(
            lesson.quiz.some((quiz) => quiz.type === type),
            true,
            `${name} ${lesson.id} ${type}`,
          )
        }
      }
      for (const [index, unit] of units.entries()) {
        assert.equal(typeof unit.title, 'string')
        assert.ok(unit.title.length > 0)
        assert.equal(typeof unit.intro, 'string')
        assert.equal(unit.intro.includes('內容待老師審閱'), false, `${name} ${unit.id}`)
        assert.equal(unit.intro.includes('内容待老师审阅'), false, `${name} ${unit.id}`)
        assert.equal(/pending teacher review/i.test(unit.intro), false, `${name} ${unit.id}`)
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
    assert.match(map, /text-\[0\.4375rem\]/)
    assert.equal(map.includes('overflow-hidden'), false)
    assert.equal(map.includes('2.1vw'), false)
    assert.equal(map.includes('text-balance'), false)
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

  it('drops image placeholders and does not embed paper or exemplar bodies', () => {
    for (const name of FILES) {
      const blob = JSON.stringify(pack(name))
      assert.equal(blob.includes(PLACEHOLDER[name]), false, name)
      assert.equal(blob.includes('past-paper stub'), false)
      assert.equal(/內容待老師審閱|内容待老师审阅|Pending teacher review/i.test(blob), false, name)
    }
  })

  it('has resolvable mcq, fill, and match answers', () => {
    for (const name of FILES) {
      for (const unit of pack(name).units) {
        for (const lesson of unit.lessons) {
          for (const card of lesson.cards) {
            if (typeof card === 'string') {
              assert.ok(card.length > 0, `${name} ${lesson.id}`)
              continue
            }
            assert.equal(typeof card.body, 'string', `${name} ${lesson.id}`)
            assert.ok((card.body ?? '').length > 0, `${name} ${lesson.id}`)
            assert.equal(typeof card.title, 'string', `${name} ${lesson.id}`)
            assert.ok((card.title ?? '').length > 0, `${name} ${lesson.id}`)
          }
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
            } else if (quiz.type === 'order') {
              assert.ok(quiz.options.length >= 2, id)
              assert.equal(new Set(quiz.options).size, quiz.options.length, id)
            } else if (quiz.type === 'dualRead') {
              assert.equal(quiz.options.length, 2, id)
              assert.match(
                String(quiz.image),
                /^\/content\/learning-map-illustrations\/(?:soft-scout\/f4-dualread|f4-dualread)\//,
                id,
              )
              assert.ok(statSync(resolve(PUBLIC, String(quiz.image).slice(1))).size > 1000, id)
            } else if (quiz.type === 'short') {
              assert.ok(quiz.question.length > 0, id)
            } else {
              assert.fail(`${id} unknown type ${quiz.type}`)
            }
          })
        }
      }
    }
  })

  it('keeps November card images and gives every lesson the six practice types', () => {
    const player = readFileSync(new URL('../components/game/LessonPlayer.tsx', import.meta.url), 'utf8')
    const one = readFileSync(new URL('../components/game/MapOneLesson.tsx', import.meta.url), 'utf8')
    const adapter = readFileSync(new URL('./content.ts', import.meta.url), 'utf8')
    assert.match(player, /LessonCardArt/)
    assert.match(player, /card\.image/)
    assert.match(one, /LessonCardArt/)
    assert.match(adapter, /cardArtFrom/)
    assert.deepEqual(cardArtFrom({}), {})
    assert.deepEqual(cardArtFrom({ image: 'https://example.com/x.png', imageCredit: 'nope' }), {})
    assert.deepEqual(
      cardArtFrom({
        image: '/content/learning-map-illustrations/f4-lesson-cards/F4-U2-L3-c1.png',
        imageCredit: '  自制 · VA-Nexus  ',
      }),
      {
        image: '/content/learning-map-illustrations/f4-lesson-cards/F4-U2-L3-c1.png',
        imageCredit: '自制 · VA-Nexus',
      },
    )
    const prefix = '/content/learning-map-illustrations/f4-lesson-cards/'
    for (const name of FILES) {
      const raw = readFileSync(new URL(`../content/${name}`, import.meta.url), 'utf8')
      assert.equal(/cccklc/i.test(raw), false, name)
      const lessons = pack(name).units.flatMap((unit) => unit.lessons)
      for (const lesson of lessons) {
        const slots = NOVEMBER_CARD_IMAGES[lesson.id as (typeof NOVEMBER_LESSONS)[number]]
        if (!slots) {
          assert.ok(lesson.cards.every((card) => typeof card === 'string'), `${name} ${lesson.id}`)
          continue
        }
        for (const type of QUESTION_TYPES) {
          assert.equal(lesson.quiz.some((quiz) => quiz.type === type), true, `${name} ${lesson.id} ${type}`)
        }
        assert.equal(/CCC|cccklc/i.test(JSON.stringify(lesson)), false, `${name} ${lesson.id}`)
        assert.equal(lesson.cards.length, slots.length, `${name} ${lesson.id}`)
        lesson.cards.forEach((card, index) => {
          assert.equal(typeof card, 'object', `${name} ${lesson.id} ${index}`)
          const row = card as ContentCard
          const file = slots[index]
          if (!file) {
            assert.equal(row.image, undefined, `${name} ${lesson.id} ${index}`)
            return
          }
          assert.equal(row.image, `${prefix}${file}`, `${name} ${lesson.id} ${index}`)
          assert.ok((row.imageCredit ?? '').length > 0, `${name} ${lesson.id} ${index}`)
          assert.ok(statSync(resolve(PUBLIC, row.image!.slice(1))).size > 1000, file)
        })
      }
    }
  })

  it('keeps the early dual-read frames and gives every lesson order, dual-read, and short practice', () => {
    const p0 = ['F4-U1-L1', 'F4-U1-L2', 'F4-U2-L1', 'F4-U2-L2', 'F4-U3-L1', 'F4-U3-L2']
    const hashes: Record<string, string> = {
      '01-u1-l1-dualread.png': 'f5d98ca741dd',
      '02-u1-l2-dualread.png': '75fb6de0c981',
      '03-u2-l1-dualread.png': '62bc72340877',
      '04-u2-l2-dualread.png': 'c952ec78eadc',
      '05-u3-l1-dualread.png': '27e9cdf0c8cd',
      '06-u3-l2-dualread.png': 'd0f689770554',
      '07-chrome-qtype-hints.png': 'd410840b0a93',
      'preview-strip.png': 'af9f26b494c3',
    }
    const dir = resolve(PUBLIC, 'content/learning-map-illustrations/soft-scout/f4-dualread')
    for (const [file, prefix] of Object.entries(hashes)) {
      const buf = readFileSync(resolve(dir, file))
      assert.equal(createHash('sha256').update(buf).digest('hex').slice(0, 12), prefix, file)
    }
    const frames = {
      'F4-U1-L1': '01-u1-l1-dualread.png',
      'F4-U1-L2': '02-u1-l2-dualread.png',
      'F4-U2-L1': '03-u2-l1-dualread.png',
      'F4-U2-L2': '04-u2-l2-dualread.png',
      'F4-U3-L1': '05-u3-l1-dualread.png',
      'F4-U3-L2': '06-u3-l2-dualread.png',
    }
    const scoutDir = resolve(PUBLIC, 'content/learning-map-illustrations/soft-scout/f4-course-content-2611')
    for (const [file, prefix] of Object.entries(SCOUT_PLATES)) {
      const buf = readFileSync(resolve(scoutDir, file))
      assert.equal(createHash('sha256').update(buf).digest('hex').slice(0, 12), prefix, file)
    }
    for (const name of FILES) {
      for (const lesson of pack(name).units.flatMap((unit) => unit.lessons)) {
        const types = lesson.quiz.map((quiz) => quiz.type)
        assert.equal(types.filter((type) => type === 'order').length >= 1, true, lesson.id)
        assert.equal(types.filter((type) => type === 'dualRead').length, 1, lesson.id)
        assert.equal(types.filter((type) => type === 'short').length, 1, lesson.id)
        const dual = lesson.quiz.find((quiz) => quiz.type === 'dualRead')
        if (p0.includes(lesson.id)) {
          assert.equal(
            dual?.image,
            `/content/learning-map-illustrations/soft-scout/f4-dualread/${frames[lesson.id as keyof typeof frames]}`,
            `${name} ${lesson.id}`,
          )
          const added = lesson.quiz.filter((quiz) => quiz.type === 'order' || quiz.type === 'dualRead' || quiz.type === 'short')
          if (lesson.id === 'F4-U2-L2' || lesson.id === 'F4-U3-L1') {
            added.push(...lesson.quiz.filter((quiz) => quiz.type === 'match'))
          }
          const blob = JSON.stringify(added)
          for (const banned of ['streak', 'Soft', 'hearts', 'gems', 'SEN', 'HKEAA', '火焰', '店招', 'claim']) {
            assert.equal(blob.includes(banned), false, `${name} ${lesson.id} ${banned}`)
          }
        } else {
          assert.match(String(dual?.image), /^\/content\/learning-map-illustrations\/f4-dualread\//, lesson.id)
        }
      }
    }
    const hant = pack('f4-demo.json')
    const u3l1 = hant.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === 'F4-U3-L1')
    const u3l2 = hant.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === 'F4-U3-L2')
    assert.match(u3l1?.quiz.find((quiz) => quiz.type === 'short')?.question ?? '', /唔趕/)
    assert.equal((u3l1?.quiz.find((quiz) => quiz.type === 'short')?.question ?? '').includes('streak'), false)
    assert.match(u3l2?.quiz.find((quiz) => quiz.type === 'dualRead')?.question ?? '', /招牌細節/)
    assert.equal((u3l2?.quiz.find((quiz) => quiz.type === 'dualRead')?.question ?? '').includes('店招'), false)
  })
})
