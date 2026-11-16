import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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
      title: '十一月：認識社區藝術——研究',
      goal: '喺課堂認識咩係社區藝術，配過往案例參考。唔使出外做計劃。',
    },
    'F4-U3-L4': {
      title: '十一月：認識社區藝術——發展同創作',
      goal: '喺課堂睇過往案例，再用課堂練習將認識發展成創作。唔使出外做計劃。',
    },
  },
  'f4-demo.zh-Hans.json': {
    'F4-U2-L3': {
      title: '十一月：设计绘图与设计思维',
      goal: '由「画得像」转向「设计得清楚」——先问功能与观众，再落笔。',
    },
    'F4-U3-L3': {
      title: '十一月：认识社区艺术——研究',
      goal: '在课堂认识什么是社区艺术，并配以往案例参考。不必出外做计划。',
    },
    'F4-U3-L4': {
      title: '十一月：认识社区艺术——发展与创作',
      goal: '在课堂看以往案例，再用课堂练习将认识发展成创作。不必出外做计划。',
    },
  },
  'f4-demo.en.json': {
    'F4-U2-L3': {
      title: 'November: Design drawing and design thinking',
      goal: 'Move from “looks real” to “communicates clearly”—ask who it is for, then draw.',
    },
    'F4-U3-L3': {
      title: 'November: Getting to know community art — research',
      goal: 'In class, learn what community art is, with past cases for reference. You do not need to go out and run a project.',
    },
    'F4-U3-L4': {
      title: 'November: Getting to know community art — develop and make',
      goal: 'In class, look at past cases, then use a classroom exercise to turn that recognition into making. You do not need to go out and run a project.',
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
  '01-quest-f4-complete-path.png': '098339e01f85',
  '02-classic-f4-complete.png': '7302c73e437b',
  '03-f4-lesson-cards-safe.png': 'a58127e58ff6',
  'preview-strip.png': 'eb437f68e474',
} as const

type Quiz = {
  type: string
  question: string
  options: string[]
  answer?: string | number | Record<string, string>
  wordBank?: string[]
  image?: string
  imageCredit?: string
  explain?: string
}

type ArtistMedia = {
  thumb?: string
  license?: string
  credit?: string
  sourceUrl?: string
  reference?: boolean
  artistSiteUrl?: string
}
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

  it('ships local unit covers, the cleared Kahlo artwork, and five reference images', () => {
    const portrait = resolve(PUBLIC, 'content/learning-map-illustrations/artist-thumbs/WEST-KAHLO-01-portrait.jpg')
    assert.ok(existsSync(portrait), portrait)
    const refDir = resolve(PUBLIC, 'content/learning-map-illustrations/artist-refs')
    const refFiles = {
      'HK-PAK-01-reference.png': ['b69153c960e23953b3a4d268a36c33131b5c59e4775a8d851bf3a4be6f03d254', 1011069],
      'HK-LEEKIT-01-reference.png': ['f97cb7754d0e56fdfbf2597f5d692bc7d902471ce859f1c42e1b8578efbaebae', 579284],
      'HK-WUCIUS-01-reference.png': ['7e5afda118d2d2932621da1bf2db4ad17b051687371793c559522c469a315f02', 730779],
      'HK-SHIEH-01-reference.png': ['cf8627b915ffc429a0b897914f42e18f323676666d83d7e28aa13b54cd91efb7', 771923],
      'WEST-HOCKNEY-01-reference.png': ['70de5ad9c1408e3bb854e0cda489039a2e53908fd9857ee6faba8091a8ab0ecd', 864662],
    } as const
    assert.deepEqual(readdirSync(refDir).sort(), Object.keys(refFiles).sort())
    for (const [file, [digest, bytes]] of Object.entries(refFiles)) {
      const buf = readFileSync(resolve(refDir, file))
      assert.equal(buf.length, bytes, file)
      assert.equal(createHash('sha256').update(buf).digest('hex'), digest, file)
    }
    const refThumb = {
      'HK-PAK-01': '/content/learning-map-illustrations/artist-refs/HK-PAK-01-reference.png',
      'HK-LEEKIT-01': '/content/learning-map-illustrations/artist-refs/HK-LEEKIT-01-reference.png',
      'HK-WUCIUS-01': '/content/learning-map-illustrations/artist-refs/HK-WUCIUS-01-reference.png',
      'HK-SHIEH-01': '/content/learning-map-illustrations/artist-refs/HK-SHIEH-01-reference.png',
      'WEST-HOCKNEY-01': '/content/learning-map-illustrations/artist-refs/WEST-HOCKNEY-01-reference.png',
    } as const
    const refSite = {
      'HK-PAK-01': 'https://www.mplus.org.hk/tc/collection/makers/pak-sheung-chuen/',
      'HK-LEEKIT-01': 'https://www.mplus.org.hk/tc/collection/makers/lee-kit/',
      'HK-WUCIUS-01': 'https://www.wongwucius.com/',
      'WEST-HOCKNEY-01': 'https://www.hockney.com/',
    } as const
    const kahlo = {
      thumb: '/content/learning-map-illustrations/artist-thumbs/WEST-KAHLO-01-artwork.png',
      license: 'Public domain',
      credit: 'Frida Kahlo — Self-Portrait Dedicated to Leon Trotsky (1937)',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Frida_Kahlo_-_Autoportrait_d%C3%A9di%C3%A9_%C3%A0_L%C3%A9on_Trotsky.png',
    }
    const emptyArtistLessons = ['F4-U2-L3', 'F4-U3-L3', 'F4-U3-L4']
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
      const lessons = units.flatMap((unit) => unit.lessons)
      const mediaLessons = lessons.filter((lesson) => lesson.artistMedia)
      assert.deepEqual(
        mediaLessons.map((lesson) => lesson.id),
        ['F4-U2-L1', 'F4-U3-L2', 'F4-U4-L1'],
        name,
      )
      const u4 = mediaLessons.find((lesson) => lesson.id === 'F4-U4-L1')
      assert.deepEqual(Object.keys(u4?.artistMedia ?? {}), ['WEST-KAHLO-01', 'HK-SHIEH-01', 'WEST-HOCKNEY-01'], name)
      assert.deepEqual(u4?.artistMedia?.['WEST-KAHLO-01'], kahlo, name)
      assert.equal(u4?.artistMedia?.['HK-SHIEH-01']?.artistSiteUrl, undefined, name)
      for (const id of emptyArtistLessons) {
        const lesson = lessons.find((item) => item.id === id)
        assert.deepEqual(lesson?.artistIds ?? [], [], `${name} ${id}`)
        assert.equal(lesson?.artistMedia, undefined, `${name} ${id}`)
      }
      for (const lesson of lessons) {
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
          if (lesson.id === 'F4-U4-L1' && ref.artistId === 'WEST-KAHLO-01') {
            assert.deepEqual(ref, { artistId: 'WEST-KAHLO-01', ...kahlo })
            assert.equal(ref.reference, undefined)
            assert.equal(ref.artistSiteUrl, undefined)
            assert.ok(statSync(resolve(PUBLIC, ref.thumb!.slice(1))).size > 1000)
            continue
          }
          const thumb = refThumb[ref.artistId as keyof typeof refThumb]
          assert.ok(thumb, ref.artistId)
          const site = refSite[ref.artistId as keyof typeof refSite]
          assert.deepEqual(
            ref,
            site
              ? { artistId: ref.artistId, thumb, reference: true, artistSiteUrl: site }
              : { artistId: ref.artistId, thumb, reference: true },
          )
          assert.equal(ref.license, undefined, ref.artistId)
          assert.equal(ref.credit, undefined, ref.artistId)
          assert.equal(ref.sourceUrl, undefined, ref.artistId)
          if (ref.artistId === 'HK-SHIEH-01') assert.equal(ref.artistSiteUrl, undefined)
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
    assert.deepEqual(
      artistsFromLesson({
        artistIds: ['HK-SHIEH-01', 'HK-PAK-01', 'WEST-KAHLO-01'],
        artistMedia: {
          'HK-SHIEH-01': {
            thumb: 'http://example.invalid/about',
            reference: true,
            license: 'Public domain',
            sourceUrl: 'https://example.com/source',
            artistSiteUrl: 'http://example.invalid/about',
          },
          'HK-PAK-01': {
            thumb: '/content/learning-map-illustrations/artist-refs/../secret.png',
            reference: true,
            artistSiteUrl: 'https://www.mplus.org.hk/tc/collection/makers/pak-sheung-chuen/',
          },
          'WEST-KAHLO-01': {
            thumb: '/content/learning-map-illustrations/artist-thumbs/WEST-KAHLO-01-artwork.png',
            reference: true,
            license: 'Public domain',
            credit: 'not a reference',
            sourceUrl: 'https://commons.wikimedia.org/wiki/File:x.png',
          },
        },
      }),
      [{ artistId: 'HK-SHIEH-01' }, { artistId: 'HK-PAK-01' }, { artistId: 'WEST-KAHLO-01' }],
    )
    assert.deepEqual(
      artistsFromLesson({
        artistIds: ['HK-WUCIUS-01'],
        artistMedia: {
          'HK-WUCIUS-01': {
            thumb: '/content/learning-map-illustrations/artist-refs/HK-WUCIUS-01-reference.png',
            license: 'Public domain',
            sourceUrl: 'https://example.com/source',
            artistSiteUrl: 'https://www.wongwucius.com/',
          },
        },
      }),
      [
        {
          artistId: 'HK-WUCIUS-01',
          thumb: '/content/learning-map-illustrations/artist-refs/HK-WUCIUS-01-reference.png',
          reference: true,
          artistSiteUrl: 'https://www.wongwucius.com/',
        },
      ],
    )
  })

  it('labels reference cards with the reference caption and keeps artwork credit', () => {
    const copy = {
      'zh-Hant.json': {
        'image.reference.caption': '寫實參考圖 · 只供參考 · 自制 · VA-Nexus',
        'map.artists.refAlt': '{name}寫實參考圖',
        'ac.media.artistSite': '藝術家網站',
        'ac.media.artistSite.none': '暫時未有公開網站',
      },
      'en.json': {
        'image.reference.caption': 'Realistic reference image · For reference only · Original · VA-Nexus',
        'map.artists.refAlt': '{name} realistic reference image',
        'ac.media.artistSite': 'Artist website',
        'ac.media.artistSite.none': 'No public website for now',
      },
      'zh-Hans.json': {
        'image.reference.caption': '写实参考图 · 只供参考 · 自制 · VA-Nexus',
        'map.artists.refAlt': '{name}写实参考图',
        'ac.media.artistSite': '艺术家网站',
        'ac.media.artistSite.none': '暂时未有公开网站',
      },
    } as const
    for (const [file, expected] of Object.entries(copy)) {
      const messages = JSON.parse(readFileSync(new URL(`../i18n/${file}`, import.meta.url), 'utf8')) as Record<string, string>
      for (const [key, value] of Object.entries(expected)) {
        assert.equal(messages[key], value, `${file} ${key}`)
      }
      if (file === 'zh-Hant.json') {
        for (const value of Object.values(expected)) assert.equal(/[\u7684\u628A\u5572]/.test(value), false, value)
      }
      if (file === 'zh-Hans.json') {
        assert.equal(messages['image.reference.caption'].includes('\u53C2'), true)
        assert.equal(messages['image.reference.caption'].includes('\u53C3'), false)
        assert.equal(messages['map.artists.refAlt'].includes('\u53C2'), true)
        assert.equal(messages['map.artists.refAlt'].includes('\u53C3'), false)
      }
    }
    const panel = readFileSync(new URL('../components/game/LessonArtists.tsx', import.meta.url), 'utf8')
    assert.match(panel, /image\.reference\.caption/)
    assert.match(panel, /map\.artists\.refAlt/)
    assert.match(panel, /ac\.media\.artistSite\.none/)
    assert.match(panel, /t\('ac\.media\.artistSite'\)/)
    assert.match(panel, /object-cover/)
    assert.match(panel, /object-contain/)
    assert.match(panel, /map\.artists\.thumbAlt/)
    assert.match(panel, /ac\.media\.source/)
    const labels = readFileSync(new URL('./lessonArtistLabels.ts', import.meta.url), 'utf8')
    assert.match(
      labels,
      /const detail = artist\.reference\s*\?\s*t\('image\.reference\.caption'\)\s*: artist\.thumb && artist\.credit\s*\?\s*artist\.credit\s*: t\('ac\.media\.empty'\)/,
    )
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
    const art = readFileSync(new URL('../components/game/LessonCardArt.tsx', import.meta.url), 'utf8')
    assert.match(player, /LessonCardArt/)
    assert.match(player, /card\.image/)
    assert.match(one, /LessonCardArt/)
    assert.match(art, /key=\{image\}/)
    assert.equal(art.includes('loading="lazy"'), false)
    assert.match(art, /if \(!image \|\| failed\) return null/)
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
      '06-u3-l2-dualread.png': 'f5d00ee909a3',
      '07-chrome-qtype-hints.png': 'd410840b0a93',
      'preview-strip.png': '2391005de2a6',
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

  it('replaces only the two November compare-works frames and hangs stem art on existing image fields', () => {
    const player = readFileSync(new URL('../components/game/LessonPlayer.tsx', import.meta.url), 'utf8')
    const one = readFileSync(new URL('../components/game/MapOneLesson.tsx', import.meta.url), 'utf8')
    const thin = readFileSync(new URL('../components/game/ThinPractice.tsx', import.meta.url), 'utf8')
    const adapter = readFileSync(new URL('./content.ts', import.meta.url), 'utf8')
    assert.match(player, /LessonCardArt image=\{q\.image\} credit=\{q\.imageCredit\}/)
    assert.match(one, /LessonCardArt image=\{q\.image\} credit=\{q\.imageCredit\}/)
    assert.match(thin, /LessonCardArt image=\{q\.image\} credit=\{q\.imageCredit\}/)
    assert.match(adapter, /type: 'mcq', prompt: q\.question, options: q\.options, answer: Math\.max\(0, idx\), explain, \.\.\.art/)
    assert.match(adapter, /type: 'fill', prompt, bank, answer, explain, \.\.\.art/)
    assert.match(adapter, /type: 'short', prompt: q\.question, explain, \.\.\.art/)
    const credit = {
      'f4-demo.json': '自制 · VA-Nexus',
      'f4-demo.en.json': 'Original · VA-Nexus',
      'f4-demo.zh-Hans.json': '自制 · VA-Nexus',
    } as const
    const stems: Record<string, (string | null)[]> = {
      'F4-U3-L3': [
        'F4-U3-L3-q0-mcq-ask-first.png',
        'F4-U3-L3-q1-mcq-use-story.png',
        'F4-U3-L3-q2-fill-observe.png',
        'F4-U3-L3-q3-match-methods.png',
        'F4-U3-L3-q4-order-research.png',
        null,
        'F4-U3-L3-q6-short-insight.png',
      ],
      'F4-U3-L4': [
        'F4-U3-L4-q0-mcq-process-trail.png',
        'F4-U3-L4-q1-mcq-learn-method.png',
        'F4-U3-L4-q2-mcq-three-lines.png',
        'F4-U3-L4-q3-fill-reason.png',
        'F4-U3-L4-q4-match-trail.png',
        'F4-U3-L4-q5-order-to-work.png',
        null,
        'F4-U3-L4-q7-short-three-lines.png',
      ],
    }
    const hashes: Record<string, string> = {
      'f4-dualread/F4-U3-L3.png': '7eb69ca3a3c247b2168353e14b9c0b62181a232604dcd390c9c0bb1a7101a009',
      'f4-dualread/F4-U3-L4.png': '34db41ed303dfab790b0c552e7c1e1f94a97a8841c097d3034fd09e1275dd60c',
      'f4-stems/F4-U3-L3-q0-mcq-ask-first.png': '314ab3a883586c1d3aa02a67e69b2a872a574d37041ea49e767de97de723e8d5',
      'f4-stems/F4-U3-L3-q1-mcq-use-story.png': 'bcd638db0bd5ef1ba58fbde8a30a9dfc2ff6df1689a0bf54967e5f7b806ded47',
      'f4-stems/F4-U3-L3-q2-fill-observe.png': 'cab2d3e120951705d5d8b3fda3f28ffc696ffec3c34e721e6121fd16faabdc61',
      'f4-stems/F4-U3-L3-q3-match-methods.png': '704e11b2b56ad2e288c0092a053f13c130726285b08cf6962ddfb29c181e88a2',
      'f4-stems/F4-U3-L3-q4-order-research.png': '1c5b22743c8fb22dca7169839e38a19f87e3da7011120291351b4c57217580a5',
      'f4-stems/F4-U3-L3-q6-short-insight.png': 'cd0b846b2a6a4cc4110878d472dc1216fbb0cf5372931f4742fe7307562dc007',
      'f4-stems/F4-U3-L4-q0-mcq-process-trail.png': '3e72756b9eb72b47cb5ef11198775f380210d7cf4e872efe59eaddc2c56b65c8',
      'f4-stems/F4-U3-L4-q1-mcq-learn-method.png': 'f31289bd089fc7a557828870eeaa3a2a0b18561565b42d0cc7bfd10ff4fa2d02',
      'f4-stems/F4-U3-L4-q2-mcq-three-lines.png': 'ecff434dc77525a9405e05e87c139c74b8513d6adf63b367b13d0d2366a778fa',
      'f4-stems/F4-U3-L4-q3-fill-reason.png': '274d7287f52588a04a70e70afa85b93f0a8916bc2b6b384705c86201c5bec64a',
      'f4-stems/F4-U3-L4-q4-match-trail.png': 'ad0a639f317246f34f33b9ec271428cc6f6e4e7e1cbf5bc73e10ac3047576664',
      'f4-stems/F4-U3-L4-q5-order-to-work.png': '45c3113ce31d2259e3c5ce749beca2e8b97fb5ad147d619ef99f848b67cbe7dc',
      'f4-stems/F4-U3-L4-q7-short-three-lines.png': 'fcf2fc91b62b61ee2263127175d9d9082efc3959ea79be44d2c06a40c31850a1',
      'f4-covers/F4-U3-L3.png': '3ce86562819a66149831216716cf9facfe7df082ab9f574fcf3066ff0125dd6c',
      'f4-covers/F4-U3-L4.png': '742bf5e38f62a42eb64f08df6d8bf72d2d7d8624bd24913e2bc1d6606feb8476',
      'f4-lesson-cards/F4-U3-L3-c0.png': '51cd26fcc28c7337560f0edfe0759ad2c59c5c58e7c998b5c4e506f61dba74b2',
      'f4-lesson-cards/F4-U3-L3-c1.png': '1d385c7c8a4f055f2e9c38f1a8c4cf11bbdb3cb96e977304e3f5445f157a428e',
      'f4-lesson-cards/F4-U3-L4-c0.png': 'c6203beb4da80665849abe8974380390541aed7a6246e59d08da58c6b04d44d0',
      'f4-lesson-cards/F4-U3-L4-c1.png': 'e51f3abe22c95583bb20844f8d8aa513b21f286aae1f374deb894cead0817f68',
      'f4-lesson-cards/F4-U3-L4-c2.png': '57cdc0f044f8e56c1452c90ff3b6e59b880c098e92bbb8bc66b3fd03238a5a47',
    }
    for (const [file, digest] of Object.entries(hashes)) {
      const buf = readFileSync(resolve(PUBLIC, 'content/learning-map-illustrations', file))
      assert.equal(createHash('sha256').update(buf).digest('hex'), digest, file)
    }
    const dualDir = resolve(PUBLIC, 'content/learning-map-illustrations/f4-dualread')
    for (const file of readdirSync(dualDir)) {
      if (file === 'F4-U3-L3.png' || file === 'F4-U3-L4.png') continue
      const buf = readFileSync(resolve(dualDir, file))
      assert.equal(buf.length, 2957, file)
      assert.equal(createHash('sha256').update(buf).digest('hex'), '947bb83ed7ef167d8a2281329ddbae0a8c654112f880f18e4448245c2ede176b', file)
    }
    for (const name of FILES) {
      for (const lesson of pack(name).units.flatMap((unit) => unit.lessons)) {
        const slots = stems[lesson.id]
        if (!slots) {
          for (const quiz of lesson.quiz) {
            assert.equal(String(quiz.image ?? '').includes('/f4-stems/'), false, `${name} ${lesson.id}`)
          }
          continue
        }
        lesson.quiz.forEach((quiz, index) => {
          const file = slots[index]
          const id = `${name} ${lesson.id} q${index}`
          if (!file) {
            assert.equal(quiz.type, 'dualRead', id)
            assert.equal(quiz.image, `/content/learning-map-illustrations/f4-dualread/${lesson.id}.png`, id)
            assert.equal(quiz.imageCredit, credit[name], id)
            return
          }
          assert.equal(quiz.image, `/content/learning-map-illustrations/f4-stems/${file}`, id)
          assert.equal(quiz.imageCredit, credit[name], id)
        })
      }
    }
  })
})
