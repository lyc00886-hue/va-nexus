import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { artistsFromLesson, cardArtFrom, coverFromUnit, learningMapAssetPath, plateFrom } from './f4Media.ts'

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
  plate?: { image?: string; title?: string; artist?: string; year?: string; source?: string; intro?: string; license?: string }
  right?: { image?: string; title?: string; artist?: string; year?: string; source?: string; intro?: string; license?: string }
  profile?: unknown
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

  it('ships local unit covers, the cleared Kahlo artwork, and reference images', () => {
    const portrait = resolve(PUBLIC, 'content/learning-map-illustrations/artist-thumbs/WEST-KAHLO-01-portrait.jpg')
    assert.ok(existsSync(portrait), portrait)
    const refDir = resolve(PUBLIC, 'content/learning-map-illustrations/artist-refs')
    const refFiles = {
      'HK-PAK-01-reference.png': ['b69153c960e23953b3a4d268a36c33131b5c59e4775a8d851bf3a4be6f03d254', 1011069],
      'HK-LEEKIT-01-reference.png': ['f97cb7754d0e56fdfbf2597f5d692bc7d902471ce859f1c42e1b8578efbaebae', 579284],
      'HK-WUCIUS-01-reference.png': ['7e5afda118d2d2932621da1bf2db4ad17b051687371793c559522c469a315f02', 730779],
      'HK-SHIEH-01-reference.png': ['cf8627b915ffc429a0b897914f42e18f323676666d83d7e28aa13b54cd91efb7', 771923],
      'WEST-HOCKNEY-01-reference.png': ['70de5ad9c1408e3bb854e0cda489039a2e53908fd9857ee6faba8091a8ab0ecd', 864662],
      'FR-CAILLEBOTTE-01-reference.png': ['6aa98113c7f1f6d3919266e775657b8c92f7a53b37e2579147b777038de27a3d', 550754],
      'DK-HAMMERSHOI-01-reference.png': ['3cd39f486bc269bf6c6066c70e3a315320efd0542356599b700c682f0dea884a', 534741],
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
      'FR-CAILLEBOTTE-01': '/content/learning-map-illustrations/artist-refs/FR-CAILLEBOTTE-01-reference.png',
      'DK-HAMMERSHOI-01': '/content/learning-map-illustrations/artist-refs/DK-HAMMERSHOI-01-reference.png',
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
              if (lesson.id === 'F4-U3-L3' || lesson.id === 'F4-U3-L4') {
                assert.equal(quiz.image, undefined, id)
                assert.equal(quiz.imageCredit, undefined, id)
                assert.match(String(quiz.plate?.image), /\/f4-pd\/met-/, id)
                assert.match(String(quiz.right?.image), /\/f4-pd\/met-/, id)
              } else if (lesson.id === 'F4-U3-L2') {
                assert.equal(quiz.image, undefined, id)
                assert.equal(quiz.imageCredit, undefined, id)
                assert.match(String(quiz.plate?.image), /^\/content\/learning-map-illustrations\/f4-pd\//, id)
                assert.match(String(quiz.right?.image), /^\/content\/learning-map-illustrations\/f4-pd\//, id)
                assert.ok(statSync(resolve(PUBLIC, String(quiz.plate?.image).slice(1))).size > 1000, id)
                assert.ok(statSync(resolve(PUBLIC, String(quiz.right?.image).slice(1))).size > 1000, id)
              } else {
                assert.match(
                  String(quiz.image),
                  /^\/content\/learning-map-illustrations\/(?:soft-scout\/f4-dualread|f4-dualread)\//,
                  id,
                )
                assert.ok(statSync(resolve(PUBLIC, String(quiz.image).slice(1))).size > 1000, id)
              }
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
      {},
    )
    assert.deepEqual(
      cardArtFrom({
        image: '/content/learning-map-illustrations/met-open/435884.jpg',
      }),
      { image: '/content/learning-map-illustrations/met-open/435884.jpg' },
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
          if (lesson.id === 'F4-U3-L3' || lesson.id === 'F4-U3-L4') {
            const met = row as ContentCard & { imageTitle?: string; imageArtist?: string; imageYear?: string; imageSource?: string; imageLicense?: string }
            assert.match(String(met.image), /\/met-open\/\d+\.jpg$/, `${name} ${lesson.id} ${index}`)
            assert.equal(met.imageCredit, undefined, `${name} ${lesson.id} ${index}`)
            assert.equal(met.imageSource, 'Metropolitan Museum of Art, New York, NY')
            assert.equal(met.imageLicense, 'Public Domain · The Met Open Access')
            assert.ok(met.imageTitle && met.imageArtist && met.imageYear)
            assert.ok(statSync(resolve(PUBLIC, met.image!.slice(1))).size > 1000)
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
    const p0 = ['F4-U1-L1', 'F4-U1-L2', 'F4-U2-L1', 'F4-U2-L2', 'F4-U3-L1']
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
        } else if (lesson.id === 'F4-U3-L2') {
          assert.equal(dual?.image, undefined, `${name} ${lesson.id}`)
          assert.equal(dual?.imageCredit, undefined, `${name} ${lesson.id}`)
          assert.match(String(dual?.plate?.image), /\/f4-pd\//, `${name} ${lesson.id}`)
          assert.match(String(dual?.right?.image), /\/f4-pd\//, `${name} ${lesson.id}`)
          const added = lesson.quiz.filter((quiz) => quiz.type === 'order' || quiz.type === 'dualRead' || quiz.type === 'short')
          const blob = JSON.stringify(added)
          for (const banned of ['streak', 'Soft', 'hearts', 'gems', 'SEN', 'HKEAA', '火焰', '店招', 'claim', '招牌細節', '自制', 'Self-made']) {
            assert.equal(blob.includes(banned), false, `${name} ${lesson.id} ${banned}`)
          }
        } else if (lesson.id === 'F4-U3-L3' || lesson.id === 'F4-U3-L4') {
          assert.equal(dual?.image, undefined, `${name} ${lesson.id}`)
          assert.match(String(dual?.plate?.image), /\/f4-pd\//, `${name} ${lesson.id}`)
          assert.match(String(dual?.right?.image), /\/f4-pd\//, `${name} ${lesson.id}`)
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
    assert.equal(
      u3l2?.quiz.find((quiz) => quiz.type === 'dualRead')?.question,
      '藝術評賞比較：《Paris Street; Rainy Day》雨中街道 vs 《Moonlight, Strandgade 30》室內窗光。邊張較適合做「課題」？點解？（一句）',
    )
    assert.equal((u3l2?.quiz.find((quiz) => quiz.type === 'dualRead')?.question ?? '').includes('店招'), false)
    assert.equal((u3l2?.quiz.find((quiz) => quiz.type === 'dualRead')?.question ?? '').includes('招牌細節'), false)
    assert.deepEqual(u3l2?.artistIds, ['FR-CAILLEBOTTE-01', 'DK-HAMMERSHOI-01'])
    const l2Copy = {
      'f4-demo.json': {
        card3: '卡耶博特常觀察雨中街道同行人，由公共空間嘅環境搵出主題。',
        card4: '哈默修伊常觀察家居室內嘅窗、門同地面光，由日常起居空間搵出主題。',
        card5:
          '練習：喺課室用教師提供或已有嘅相片、物件、速寫，揀三個「符號／物件／聲音」筆記，寫佢哋點樣可以變成探討主題嘅問題。課堂已提供已核實授權嘅參考作品圖，請一併睇出處同簡介。',
        fill: '卡耶博特常由雨中＿＿觀察公共空間，再搵主題。',
        fillAnswer: '街道',
        fillExplain: '畫面見到濕石路、行人同傘，係由市區街道觀察環境。',
        match: ['卡耶博特', '哈默修伊'],
        matchAnswer: {
          卡耶博特: '雨中街道／公共空間觀察',
          哈默修伊: '室內窗光同日常起居空間',
        },
        matchExplain: '兩位都由環境觀察搵主題，但焦點唔同。',
        dual: '藝術評賞比較：《Paris Street; Rainy Day》雨中街道 vs 《Moonlight, Strandgade 30》室內窗光。邊張較適合做「課題」？點解？（一句）',
        labels: ['邊張做課題', '點解一句'],
        explain: '練習結構 · 唔係真題',
        source: 'Art Institute of Chicago／Wikimedia Commons',
        intro:
          '畫面係雨中巴黎街道路口：濕石板路、行人同傘、路燈同街角樓宇。卡耶博特由公共街道觀察市區環境，再形成主題。',
        introRight:
          '畫面係空置室內：窗、門、牆板，同落喺地板上嘅窗格光。哈默修伊由日常起居空間嘅光同結構觀察，再形成主題。',
      },
      'f4-demo.zh-Hans.json': {
        card3: '卡耶博特常观察雨中街道与行人，由公共空间环境找出主题。',
        card4: '哈默修伊常观察家居室內窗、门与地面光，由日常起居空间找出主题。',
        card5:
          '练习：在课室用教师提供或已有的照片、物件、速写，选三个「符号／物件／声音」笔记，写它们怎样可以变成探讨主题的问题。课堂已提供已核实授权参考作品图，请一并看出处与简介。',
        fill: '卡耶博特常由雨中＿＿观察公共空间，再找主题。',
        fillAnswer: '街道',
        fillExplain: '画面可见湿石路、行人与伞，是由市区街道观察环境。',
        match: ['卡耶博特', '哈默修伊'],
        matchAnswer: {
          卡耶博特: '雨中街道／公共空间观察',
          哈默修伊: '室內窗光与日常起居空间',
        },
        matchExplain: '两位都由环境观察找主题，但焦点不同。',
        dual: '艺术评赏比较：《Paris Street; Rainy Day》雨中街道 vs 《Moonlight, Strandgade 30》室內窗光。哪张更适合做「课题」？为什么？（一句）',
        labels: ['哪张做课题', '为什么一句'],
        explain: '练习结构 · 不是真题',
        source: 'Art Institute of Chicago／Wikimedia Commons',
        intro:
          '画面是雨中巴黎街道路口：湿石板路、行人与伞、路灯与街角楼宇。卡耶博特由公共街道观察市区环境，再形成主题。',
        introRight:
          '画面是空置室內：窗、门、墙板，以及落在地板上窗格光。哈默修伊由日常起居空间光与结构观察，再形成主题。',
      },
      'f4-demo.en.json': {
        card3: 'Caillebotte often observes rainy streets and passers-by, finding a theme from the public environment.',
        card4: 'Hammershøi often observes windows, doors, and floor-light in a domestic interior, finding a theme from everyday living space.',
        card5:
          'Practice: in class, use teacher-provided or already available photos, objects, or sketches. Note three symbols, objects, or sounds and how each could become a question for exploring the theme. Use the licensed reference works provided in class, together with their sources and introductions.',
        fill: 'Caillebotte often observes public space from a rainy ____, then finds a theme.',
        fillAnswer: 'street',
        fillExplain: 'The picture shows a wet stone street, walkers, and umbrellas: observation from an urban street.',
        match: ['Caillebotte', 'Hammershøi'],
        matchAnswer: {
          Caillebotte: 'Rainy street / observing public space',
          'Hammershøi': 'Interior window-light and everyday living space',
        },
        matchExplain: 'Both start from observing an environment, with different focuses.',
        dual: 'Compare works: the rainy street in Paris Street; Rainy Day vs the interior window-light in Moonlight, Strandgade 30 — which is better as a “topic”, and why (one line)?',
        labels: ['Which one for the topic', 'Why'],
        explain: 'Practice structure · not a real paper',
        source: 'Art Institute of Chicago / Wikimedia Commons',
        intro:
          'The picture is a rainy Paris street intersection: wet stone paving, walkers and umbrellas, a lamp-post, and corner buildings. Caillebotte observes a public street and forms a theme from that urban environment.',
        introRight:
          'The picture is an empty interior: a window, a door, wall panels, and a window-grid of light on the floor. Hammershøi observes light and structure in everyday living space, and forms a theme from that.',
      },
    } as const
    for (const name of FILES) {
      const lesson = pack(name).units.flatMap((unit) => unit.lessons).find((item) => item.id === 'F4-U3-L2')
      const expected = l2Copy[name]
      assert.equal(lesson?.cards[2], expected.card3, name)
      assert.equal(lesson?.cards[3], expected.card4, name)
      assert.equal(lesson?.cards[4], expected.card5, name)
      const fill = lesson?.quiz.find((quiz) => quiz.type === 'fill')
      const match = lesson?.quiz.find((quiz) => quiz.type === 'match')
      const dual = lesson?.quiz.find((quiz) => quiz.type === 'dualRead')
      assert.equal(fill?.question, expected.fill, name)
      assert.equal(fill?.answer, expected.fillAnswer, name)
      assert.equal(fill?.explain, expected.fillExplain, name)
      assert.deepEqual(match?.options, [...expected.match], name)
      assert.deepEqual(match?.answer, expected.matchAnswer, name)
      assert.equal(match?.explain, expected.matchExplain, name)
      assert.equal(dual?.question, expected.dual, name)
      assert.deepEqual(dual?.options, [...expected.labels], name)
      assert.equal(dual?.explain, expected.explain, name)
      assert.equal(dual?.plate?.title, 'Paris Street; Rainy Day', name)
      assert.equal(dual?.plate?.artist, 'Gustave Caillebotte', name)
      assert.equal(dual?.plate?.year, '1877', name)
      assert.equal(dual?.plate?.source, expected.source, name)
      assert.equal(dual?.plate?.intro, expected.intro, name)
      assert.equal(dual?.plate?.license, undefined, name)
      assert.equal(dual?.right?.title, 'Moonlight, Strandgade 30', name)
      assert.equal(dual?.right?.artist, 'Vilhelm Hammershøi', name)
      assert.equal(dual?.right?.year, '1900–1906', name)
      assert.equal(dual?.right?.source, 'Metropolitan Museum of Art, New York, NY', name)
      assert.equal(dual?.right?.intro, expected.introRight, name)
      assert.equal(dual?.right?.license, undefined, name)
      assert.deepEqual(lesson?.artistIds, ['FR-CAILLEBOTTE-01', 'DK-HAMMERSHOI-01'], name)
    }
    const plates = {
      'commons-caillebotte-paris-street-rainy-day.jpg': ['e7e4dd6c3ff799538a1873c1e90df17c96cf9375d67e8a6947cc96efcfc9c45a', 5370449],
      'met-441933-hammershoi-moonlight-strandgade-30.jpg': ['418da7d5d0d59bf7097c25a12cc65a57e825aface7bcb64a4d19240e2e2929d3', 2658660],
    } as const
    for (const [file, [digest, bytes]] of Object.entries(plates)) {
      const buf = readFileSync(resolve(PUBLIC, 'content/learning-map-illustrations/f4-pd', file))
      assert.equal(buf.length, bytes, file)
      assert.equal(createHash('sha256').update(buf).digest('hex'), digest, file)
    }
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
      'f4-dualread/F4-U3-L3.png': 'c95975ad611c6464dabc9e4cd69408c5e8ac8a96eee0e6c3e5b1eeeb5935b2dc',
      'f4-dualread/F4-U3-L4.png': '6129eb3eaca70073d83708218d71861e3ec87543cf4a949e39115360b46e7587',
      'f4-covers/F4-U3-L3.png': '3ce86562819a66149831216716cf9facfe7df082ab9f574fcf3066ff0125dd6c',
      'f4-covers/F4-U3-L4.png': '742bf5e38f62a42eb64f08df6d8bf72d2d7d8624bd24913e2bc1d6606feb8476',
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
            assert.equal(quiz.image, undefined, id)
            assert.equal(quiz.imageCredit, undefined, id)
            assert.equal(String(quiz.plate?.image ?? '').includes('/f4-dualread/'), false, id)
            assert.equal(String(quiz.right?.image ?? '').includes('/f4-dualread/'), false, id)
            return
          }
          const met = quiz as typeof quiz & { imageTitle?: string; imageArtist?: string; imageYear?: string; imageSource?: string; imageLicense?: string }
          assert.match(String(met.image), /\/met-open\/\d+\.jpg$/, id)
          assert.equal(met.imageCredit, undefined, id)
          assert.equal(met.imageSource, 'Metropolitan Museum of Art, New York, NY', id)
          assert.equal(met.imageLicense, 'Public Domain · The Met Open Access', id)
          assert.ok(met.imageTitle && met.imageArtist && met.imageYear, id)
        })
      }
    }
  })

  it('shows verified public-domain artist works on the November appreciation comparisons', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    const messages = (file: string) => JSON.parse(readFileSync(resolve(root, file), 'utf8')) as Record<string, string>
    const hant = messages('src/i18n/zh-Hant.json')
    const en = messages('src/i18n/en.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    const source = 'Metropolitan Museum of Art, New York, NY'
    const pdZh = 'Public Domain\uFF0FCC0'
    const pdEn = 'Public Domain / CC0'
    const shared = {
      'lesson.f4u3l3.appr.left.title': 'Piazza San Marco',
      'lesson.f4u3l3.appr.left.artist': 'Canaletto (Giovanni Antonio Canal)',
      'lesson.f4u3l3.appr.left.year': 'late 1720s',
      'lesson.f4u3l3.appr.right.title': 'Fireworks at Ry\u014dgoku Bridge, from the series One Hundred Famous Views of Edo',
      'lesson.f4u3l3.appr.right.artist': 'Utagawa Hiroshige',
      'lesson.f4u3l3.appr.right.year': '1858',
      'lesson.f4u3l4.appr.left.title': 'The Third-Class Carriage',
      'lesson.f4u3l4.appr.left.artist': 'Honor\u00e9 Daumier',
      'lesson.f4u3l4.appr.left.year': '1864',
      'lesson.f4u3l4.appr.right.title': 'The Horse Fair',
      'lesson.f4u3l4.appr.right.artist': 'Rosa Bonheur',
      'lesson.f4u3l4.appr.right.year': '1852\u201355',
    } as const
    const intro = {
      'zh-Hant': {
        'lesson.f4u3l3.appr.left.intro':
          '畫面以廣場地磚同兩旁拱廊拉開空間，遠景聖馬可教堂同鐘樓立喺正中。無數細小人影散落廣場，有人行過、有人聚埋。作品將威尼斯公共廣場寫成日常聚集同路過嘅地方。',
        'lesson.f4u3l3.appr.right.intro':
          '夜空佔畫面上半，煙火同煙霞散開；下半係河面、船隻同兩岸燈火。橋同舟上聚集好多細小觀者。作品將江戶兩國橋寫成夏夜公眾一齊睇煙火嘅地方。',
        'lesson.f4u3l4.appr.left.intro':
          '車廂入面，前景三位旅客坐得接近，身形同籃子佔去大部分畫面；後排仲有更多人影。光線由左面窗戶入嚟，衣著同姿勢對比較靜。作品將公共列車三等車廂寫成普通人一齊上路嘅情境。',
        'lesson.f4u3l4.appr.right.intro':
          '巨大畫面由左至右排開奔走同受控嘅馬群，人同馬交織成斜向動勢。地面塵土同遠景樹列托出室外場地。作品將巴黎馬市寫成公開買賣、展示力氣同技藝嘅場所。',
      },
      en: {
        'lesson.f4u3l3.appr.left.intro':
          'The piazza is organised by the paved floor and the arcades on both sides, with the basilica and campanile closing the far end. Tiny figures walk or gather across the open square. The painting presents a Venetian public place as a space of everyday meeting and passage.',
        'lesson.f4u3l3.appr.right.intro':
          'The upper half is night sky, with fireworks and smoke opening out; the lower half is the river, boats, and lights along both banks. Many small spectators gather on the bridge and in the boats. The print presents Ry\u014dgoku Bridge in Edo as a public place where people watch a summer night display together.',
        'lesson.f4u3l4.appr.left.intro':
          'In the carriage, three travellers sit close in the foreground; their bodies and a basket fill much of the picture, with more figures behind. Light enters from a window at the left, and the poses stay quiet. The painting presents a third-class public train compartment as a situation where ordinary people travel together.',
        'lesson.f4u3l4.appr.right.intro':
          'The large canvas spreads a controlled yet running herd of horses from left to right, with riders and handlers woven into a diagonal movement. Dust on the ground and a line of trees at the back mark an outdoor site. The painting presents a Paris horse market as a public place of sale, strength, and skill.',
      },
      'zh-Hans': {
        'lesson.f4u3l3.appr.left.intro':
          '画面以广场地砖与两旁拱廊拉开空间，远景圣马可教堂与钟楼立于正中。无数细小人影散落广场，有人走过、有人聚在一起。作品将威尼斯公共广场写成日常聚集与路过之地方。',
        'lesson.f4u3l3.appr.right.intro':
          '夜空占画面上半，烟火与烟霞散开；下半是河面、船只与两岸灯火。桥与舟上聚集许多细小观者。作品将江户两国桥写成夏夜公众一齐看烟火之地方。',
        'lesson.f4u3l4.appr.left.intro':
          '车厢里面，前景三位旅客坐得接近，身形与篮子占去大部分画面；后排还有更多人影。光线由左面窗户射入，衣着与姿势对比较静。作品将公共列车三等车厢写成普通人一齐上路之情境。',
        'lesson.f4u3l4.appr.right.intro':
          '巨大画面由左至右排开奔走与受控之马群，人与马交织成斜向动势。地面尘土与远景树列托出室外场地。作品将巴黎马市写成公开买卖、展示力气与技艺之场所。',
      },
    } as const
    const files = {
      'f4-demo.json': hant,
      'f4-demo.en.json': en,
      'f4-demo.zh-Hans.json': hans,
    } as const
    const localeOf = {
      'f4-demo.json': 'zh-Hant',
      'f4-demo.en.json': 'en',
      'f4-demo.zh-Hans.json': 'zh-Hans',
    } as const
    const plates = {
      'F4-U3-L3': {
        left: 'met-435839-canaletto-piazza-san-marco.jpg',
        right: 'met-37093-hiroshige-fireworks-ryogoku.jpg',
        prefix: 'lesson.f4u3l3.appr',
      },
      'F4-U3-L4': {
        left: 'met-436095-daumier-third-class-carriage.jpg',
        right: 'met-435702-bonheur-horse-fair.jpg',
        prefix: 'lesson.f4u3l4.appr',
      },
    } as const
    const hashes: Record<string, [string, number]> = {
      'met-435839-canaletto-piazza-san-marco.jpg': ['421620346ab5b7fa084ab229148833c7880dfec0b6f53fd2a72eeb562315dfb0', 3661754],
      'met-37093-hiroshige-fireworks-ryogoku.jpg': ['84bf671b8378b577c19b6fa7a8b19ac4d68ad3712e8be4d0492e34f17d09d773', 2990431],
      'met-436095-daumier-third-class-carriage.jpg': ['a02482e97ed89950037a8467d84206cd6dba2f13b8c34feb0486ace054f3c3f7', 4215589],
      'met-435702-bonheur-horse-fair.jpg': ['c905acf8e02c24c5b30f90ad040a8afe43b7b8d2c65faf75b81ac3c53b535be2', 2692523],
    }
    const kept = {
      'f4-demo.json': {
        'F4-U3-L3': {
          question: '藝術評賞比較：左、右都係社區藝術。各寫一句——你見到邊種視覺元素或組織原理？作品同地方、人有咩關係？',
          options: ['左圖一句', '右圖一句'],
          explain: '練習結構 · 唔係真題',
        },
        'F4-U3-L4': {
          question: '藝術評賞比較：左、右都係社區藝術。各寫一句——你見到邊種視覺元素或組織原理？作品想帶出咩？',
          options: ['左圖一句', '右圖一句'],
          explain: '練習結構 · 唔係真題',
        },
      },
      'f4-demo.en.json': {
        'F4-U3-L3': {
          question:
            'Compare works: both sides are community art. One line each — which visual elements or organisational principles do you see? How does the work relate to place and people?',
          options: ['Left image', 'Right image'],
          explain: 'Practice structure · not a real paper',
        },
        'F4-U3-L4': {
          question:
            'Compare works: both sides are community art. One line each — which visual elements or organisational principles do you see? What does the work bring out?',
          options: ['Left image', 'Right image'],
          explain: 'Practice structure · not a real paper',
        },
      },
      'f4-demo.zh-Hans.json': {
        'F4-U3-L3': {
          question: '艺术评赏比较：左、右都是社区艺术。各写一句——你见到何种视觉元素或组织原理？作品同地方、人有什么关系？',
          options: ['左图一句', '右图一句'],
          explain: '练习结构 · 不是真题',
        },
        'F4-U3-L4': {
          question: '艺术评赏比较：左、右都是社区艺术。各写一句——你见到何种视觉元素或组织原理？作品想带出什么？',
          options: ['左图一句', '右图一句'],
          explain: '练习结构 · 不是真题',
        },
      },
    } as const
    assert.equal(hant['art.intro'], '作品簡介')
    assert.equal(en['art.intro'], 'Work introduction')
    assert.equal(hans['art.intro'], '作品简介')
    assert.equal(overrides['art.intro'], hans['art.intro'])
    assert.equal(hant['art.attr.title'], '題名')
    assert.equal(en['art.attr.title'], 'Artwork title')
    assert.equal(hans['art.attr.title'], '题名')
    assert.equal(hant['art.attr.artist'], '藝術家')
    assert.equal(en['art.attr.artist'], 'Artist')
    assert.equal(hans['art.attr.artist'], '艺术家')
    assert.equal(hant['art.attr.year'], '年份')
    assert.equal(en['art.attr.year'], 'Year')
    assert.equal(hans['art.attr.year'], '年份')
    assert.equal(hant['art.attr.source'], '館藏／出處')
    assert.equal(en['art.attr.source'], 'Museum / collection')
    assert.equal(hans['art.attr.source'], '馆藏／出处')
    assert.equal(hant['art.attr.license'], '授權狀態')
    assert.equal(en['art.attr.license'], 'License status')
    assert.equal(hans['art.attr.license'], '授权状态')
    assert.equal(hant['art.attr.pd'], pdZh)
    assert.equal(en['art.attr.pd'], pdEn)
    assert.equal(hans['art.attr.pd'], pdZh)
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(en['qtype.chip.dualRead'], 'Compare works')
    assert.equal(hans['qtype.chip.dualRead'], '艺术评赏比较')
    const forbidden = ['\u7684', '\u628a', '\u5572', '\u4f86', '\u6765', '\u771e']
    const newKeys = Object.keys(hant).filter((key) => key === 'art.intro' || key.includes('.appr.'))
    assert.equal(newKeys.length, 25)
    for (const key of newKeys) {
      assert.equal(en[key].length > 0, true, key)
      assert.equal(hans[key], overrides[key], key)
      for (const glyph of forbidden) {
        assert.equal(hant[key].includes(glyph), false, `${key} ${glyph}`)
        assert.equal(hans[key].includes(glyph), false, `${key} hans ${glyph}`)
      }
    }
    for (const [key, value] of Object.entries(shared)) {
      assert.equal(hant[key], value, key)
      assert.equal(en[key], value, key)
      assert.equal(hans[key], value, key)
    }
    for (const [key, value] of Object.entries(intro['zh-Hant'])) assert.equal(hant[key], value, key)
    for (const [key, value] of Object.entries(intro.en)) assert.equal(en[key], value, key)
    for (const [key, value] of Object.entries(intro['zh-Hans'])) assert.equal(hans[key], value, key)
    assert.equal(hant['lesson.f4u3l3.appr.left.intro'].includes('\u55ba'), true)
    assert.equal(hant['lesson.f4u3l4.appr.left.intro'].includes('\u569f'), true)
    assert.equal(hant['lesson.f4u3l3.appr.left.intro'].includes('立喂'), false)
    assert.equal(hant['lesson.f4u3l4.appr.left.intro'].includes('入嚏'), false)
    for (const [name, digest] of Object.entries(hashes)) {
      const buf = readFileSync(resolve(PUBLIC, 'content/learning-map-illustrations/f4-pd', name))
      assert.equal(buf.length, digest[1], name)
      assert.equal(createHash('sha256').update(buf).digest('hex'), digest[0], name)
    }
    const thin = readFileSync(new URL('../components/game/ThinPractice.tsx', import.meta.url), 'utf8')
    assert.match(thin, /t\('art\.intro'\)/)
    assert.match(thin, /t\('art\.attr\.pd'\)/)
    assert.match(thin, /data-testid="dualread-plate-right"/)
    assert.match(thin, /data-image="omitted"/)
    assert.equal(thin.includes('plate.license'), false)
    const api = readdirSync(resolve(root, 'api')).filter((file) => file.endsWith('.ts'))
    assert.equal(api.length, 12)
    for (const name of FILES) {
      const bag = files[name]
      const locale = localeOf[name]
      for (const lesson of pack(name).units.flatMap((unit) => unit.lessons)) {
        const spec = plates[lesson.id as keyof typeof plates]
        if (!spec) continue
        const dual = lesson.quiz.find((quiz) => quiz.type === 'dualRead')
        const keep = kept[name][lesson.id as keyof (typeof kept)[typeof name]]
        assert.equal(dual?.question, keep.question, `${name} ${lesson.id}`)
        assert.deepEqual(dual?.options, [...keep.options], `${name} ${lesson.id}`)
        assert.equal(dual?.explain, keep.explain, `${name} ${lesson.id}`)
        assert.equal(dual?.image, undefined, `${name} ${lesson.id}`)
        assert.equal(dual?.profile, undefined, `${name} ${lesson.id}`)
        const blob = JSON.stringify(dual)
        assert.equal(blob.includes('十面靈璧'), false, name)
        assert.equal(blob.includes('The Sixteen Luohans'), false, name)
        assert.equal(blob.includes('/f4-dualread/'), false, name)
        for (const side of ['left', 'right'] as const) {
          const plate = side === 'left' ? dual?.plate : dual?.right
          const prefix = `${spec.prefix}.${side}`
          assert.equal(plate?.image, `/content/learning-map-illustrations/f4-pd/${spec[side]}`, `${name} ${prefix}`)
          assert.equal(plate?.title, bag[`${prefix}.title`], prefix)
          assert.equal(plate?.artist, bag[`${prefix}.artist`], prefix)
          assert.equal(plate?.year, bag[`${prefix}.year`], prefix)
          assert.equal(plate?.source, source, prefix)
          assert.equal(plate?.intro, intro[locale][`${prefix}.intro` as keyof (typeof intro)[typeof locale]], prefix)
          assert.equal(plate?.license, undefined, prefix)
          assert.equal(bag[`${prefix}.license`], bag['art.attr.pd'], prefix)
          const parsed = plateFrom(plate)
          assert.equal(parsed?.intro, plate?.intro, prefix)
          assert.ok(statSync(resolve(PUBLIC, String(plate?.image).slice(1))).size > 1000, prefix)
        }
      }
    }
    const plain = plateFrom({
      image: '/content/learning-map-illustrations/f5-pd/wubin-ten-views-lingbi-front-detail.jpg',
      title: 'plate',
      artist: 'artist',
      year: 'year',
      source: 'source',
    })
    assert.ok(plain)
    assert.equal(plain.intro, undefined)
    assert.equal('intro' in plain, false)
  })
})
