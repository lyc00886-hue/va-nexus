import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { critiqueMayCite, critiqueObjectKey, critiqueSentenceFor, objectFollowsLesson } from './classroomCritique.ts'
import { verifiedAppreciationList, type AppreciationPack, type VerifiedWork } from './verifiedArtworks.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const json = (path: string) => JSON.parse(read(path)) as Record<string, string>
const pack = (path: string) => JSON.parse(read(path)) as AppreciationPack

const FORBIDDEN = ['\u7684', '\u628A', '\u5572', '\u4F86', '\u6765', '\u771E']
const BANNED_LABEL = /Feldman|DAIE|ArtInsight|Duolingo|Grok|\bSEN\b/

const SPRING = '/content/learning-map-illustrations/f4-pd/met-437313-pissarro-tuileries-spring-morning.jpg'
const WINTER = '/content/learning-map-illustrations/f4-pd/met-437312-pissarro-tuileries-winter-afternoon.jpg'
const SOURCE = 'Metropolitan Museum of Art, New York, NY'

const COPY = {
  'zh-Hant': {
    question:
      '藝術評賞比較：評賞對象係 Camille Pissarro《The Garden of the Tuileries on a Spring Morning》同《The Garden of the Tuileries on a Winter Afternoon》。評賞焦點：同一座花園喺唔同時段同季節，光影／人流有咩唔同。各寫一句。',
    options: ['春天早晨一句', '冬天午後一句'],
    object:
      '你呢次評賞對象係 Camille Pissarro《The Garden of the Tuileries on a Spring Morning》春天早晨花園，同《The Garden of the Tuileries on a Winter Afternoon》冬天午後花園。評賞焦點係同一座花園喺唔同時段同季節，光影／人流有咩唔同。',
    part: '評賞對象：Camille Pissarro《The Garden of the Tuileries on a Spring Morning》同《The Garden of the Tuileries on a Winter Afternoon》。評賞焦點：同一座花園喺唔同時段同季節，光影／人流點樣被記錄。',
    introLeft:
      '畫面由高處望向杜樂麗花園：春天樹葉已綠，園徑同草坪向遠方伸展，天上有白雲。小行人散落園徑，水池同花壇排喺畫面中間。Camille Pissarro 喺春天早晨記錄呢座花園嘅光同人流。',
    introRight:
      '畫面由相近高處望向同一座杜樂麗花園：冬天樹木落咗葉，園徑上行人較密，天色偏灰而帶一層午後光。草坪同樹列仍然認得，但光同人流同春天早晨唔同。Camille Pissarro 喺冬天午後再記錄呢座花園。',
    explain: '練習結構 · 唔係真題',
    title: '每週視覺日記：點樣觀察同記錄',
    card3: '重點唔係畫得靚，而係持續觀察同反思——之後主題發展會用到呢啲材料。',
    card5: '視覺日記 · 慢慢記。一則四欄：日期、地點、一句觀察、你自己畫嘅速寫。版面畫在本子上，呢張卡用文字講欄位。',
  },
  'zh-Hans': {
    question:
      '艺术评赏比较：评赏对象是 Camille Pissarro《The Garden of the Tuileries on a Spring Morning》同《The Garden of the Tuileries on a Winter Afternoon》。评赏焦点：同一座花园在不同时段同季节，光影／人流有什么不同。各写一句。',
    options: ['春天早晨一句', '冬天午后一句'],
    object:
      '你这次评赏对象是 Camille Pissarro《The Garden of the Tuileries on a Spring Morning》春天早晨花园，同《The Garden of the Tuileries on a Winter Afternoon》冬天午后花园。评赏焦点是同一座花园在不同时段同季节，光影／人流有什么不同。',
    part: '评赏对象：Camille Pissarro《The Garden of the Tuileries on a Spring Morning》同《The Garden of the Tuileries on a Winter Afternoon》。评赏焦点：同一座花园在不同时段同季节，光影／人流怎样被记录。',
    introLeft:
      '画面由高处望向杜乐丽花园：春天树叶已绿，园径同草坪向远方伸展，天上有白云。小行人散落园径，水池同花坛排在画面中间。Camille Pissarro 在春天早晨记录这座花园里光同人流。',
    introRight:
      '画面由相近高处望向同一座杜乐丽花园：冬天树木已落叶，园径上行人较密，天色偏灰而带一层午后光。草坪同树列仍然认得，但光同人流同春天早晨不同。Camille Pissarro 在冬天午后再记录这座花园。',
    explain: '练习结构 · 不是真题',
    title: '每周视觉日记：怎样观察与记录',
  },
  en: {
    question:
      'Compare works: the objects are Camille Pissarro’s The Garden of the Tuileries on a Spring Morning and The Garden of the Tuileries on a Winter Afternoon. Focus: how light and people flow differ in the same garden at different times and seasons. One line each.',
    options: ['Spring morning', 'Winter afternoon'],
    object:
      'This time, the objects of appreciation are Camille Pissarro’s The Garden of the Tuileries on a Spring Morning and The Garden of the Tuileries on a Winter Afternoon. The focus is how light and people flow differ in the same garden at different times and seasons.',
    part: 'Object of appreciation: Camille Pissarro’s The Garden of the Tuileries on a Spring Morning and The Garden of the Tuileries on a Winter Afternoon. Focus of appreciation: how light and people flow in the same garden are recorded at different times and seasons.',
    introLeft:
      'Viewed from high up over the Tuileries Garden: spring trees already in leaf, paths and lawns stretching into the distance under a cloudy sky. Small figures are scattered along the path, with a pool and parterres in the middle. Camille Pissarro records this garden’s light and people flow on a spring morning.',
    introRight:
      'Viewed from a similar height over the same Tuileries Garden: winter trees have dropped their leaves, the path is more crowded, and the sky is greyer with a layer of afternoon light. Lawns and tree rows are still readable, but the light and people flow differ from the spring morning. Camille Pissarro records this garden again on a winter afternoon.',
    explain: 'Practice structure · not a real paper',
    title: 'Weekly Visual Diary: How to Observe and Record',
  },
} as const

const FILES = {
  'zh-Hant': 'src/content/f4-demo.json',
  'zh-Hans': 'src/content/f4-demo.zh-Hans.json',
  en: 'src/content/f4-demo.en.json',
} as const

const LOCALE_FILES = {
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
  en: 'src/i18n/en.json',
} as const

const HASHES: Record<string, [string, number]> = {
  'met-437313-pissarro-tuileries-spring-morning.jpg': [
    '14cb35d3ff83c89e0b404f137aaba073e1315aaaaacf6c5e4776739a6e495b30',
    3166048,
  ],
  'met-437312-pissarro-tuileries-winter-afternoon.jpg': [
    '84b6c4a0a65eb264c8f6ac805c447334c44cf9990b06845e740dfec0d0366906',
    7515754,
  ],
}

type Dual = {
  type?: string
  question?: string
  options?: string[]
  explain?: string
  image?: string
  plate?: VerifiedWork
  right?: VerifiedWork
}

function lessonOf(file: AppreciationPack, id: string) {
  for (const unit of file.units ?? []) {
    for (const lesson of unit.lessons ?? []) {
      if (lesson.id === id) return lesson
    }
  }
  return undefined
}

function dualOf(file: AppreciationPack, id: string): Dual {
  const lesson = lessonOf(file, id) as { quiz?: Dual[] } | undefined
  const dual = lesson?.quiz?.find((quiz) => quiz.type === 'dualRead')
  assert.ok(dual, id)
  return dual
}

describe('Form 4 unit 3 lesson 1 verified appreciation', () => {
  const f4 = pack('src/content/f4-demo.json')
  const f5 = pack('src/content/f5-demo.json')
  const works = verifiedAppreciationList(f4, f5)

  it('ships the attached Met bytes and does not treat the homemade frame as an original', () => {
    for (const [name, [digest, bytes]] of Object.entries(HASHES)) {
      const buf = readFileSync(join(root, 'public/content/learning-map-illustrations/f4-pd', name))
      assert.equal(buf.length, bytes, name)
      assert.equal(createHash('sha256').update(buf).digest('hex'), digest, name)
    }
    const player = read('src/components/game/LessonPlayer.tsx')
    const faces = read('src/components/game/ClassroomFaces.tsx')
    assert.match(player, /critiqueSentenceFor/)
    assert.match(faces, /data-critique-lesson/)
    assert.equal(/Feldman|DAIE|ArtInsight|Duolingo|Grok/.test(faces), false)
  })

  it('copies the lesson 1 plates and keeps the lesson shell', () => {
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const file = pack(FILES[locale])
      const lesson = lessonOf(file, 'F4-U3-L1') as {
        title?: string
        coverImage?: string
        coverCredit?: string
        artistIds?: string[]
        cards?: string[]
        quiz?: Dual[]
      }
      const expected = COPY[locale]
      assert.equal(lesson?.title, expected.title, locale)
      assert.equal(lesson?.coverImage, '/content/learning-map-illustrations/f4-covers/F4-U3-L1.png', locale)
      assert.equal(lesson?.coverCredit, locale === 'en' ? 'Original · VA-Nexus' : '自制 · VA-Nexus', locale)
      assert.equal(lesson?.artistIds, undefined, locale)
      const dual = dualOf(file, 'F4-U3-L1')
      assert.equal(dual.question, expected.question, locale)
      assert.deepEqual(dual.options, [...expected.options], locale)
      assert.equal(dual.explain, expected.explain, locale)
      assert.equal(dual.image, undefined, locale)
      assert.equal(dual.plate?.image, SPRING, locale)
      assert.equal(dual.right?.image, WINTER, locale)
      assert.equal(dual.plate?.title, 'The Garden of the Tuileries on a Spring Morning', locale)
      assert.equal(dual.right?.title, 'The Garden of the Tuileries on a Winter Afternoon', locale)
      assert.equal(dual.plate?.artist, 'Camille Pissarro', locale)
      assert.equal(dual.right?.artist, 'Camille Pissarro', locale)
      assert.equal(dual.plate?.year, '1899', locale)
      assert.equal(dual.right?.year, '1899', locale)
      assert.equal(dual.plate?.source, SOURCE, locale)
      assert.equal(dual.right?.source, SOURCE, locale)
      assert.equal(dual.plate?.intro, expected.introLeft, locale)
      assert.equal(dual.right?.intro, expected.introRight, locale)
      const bag = json(LOCALE_FILES[locale])
      assert.equal(bag['critique.object.f4u3l1'], expected.object, locale)
      assert.equal(bag['lesson.f4u3l1.part.appreciate'], expected.part, locale)
      if (locale !== 'en') {
        for (const value of [expected.question, expected.object, expected.part, expected.introLeft, expected.introRight, ...expected.options]) {
          for (const glyph of FORBIDDEN) assert.equal(value.includes(glyph), false, `${locale} ${glyph} ${value}`)
          assert.equal(BANNED_LABEL.test(value), false, value)
        }
      }
    }
    const hantLesson = lessonOf(f4, 'F4-U3-L1') as { title?: string; cards?: string[] }
    assert.equal(hantLesson?.title?.includes('\u9EDE'), true)
    assert.equal(hantLesson?.title?.includes('\u6A23'), true)
    assert.equal(hantLesson?.cards?.[2], COPY['zh-Hant'].card3)
    assert.equal(hantLesson?.cards?.[4], COPY['zh-Hant'].card5)
    assert.equal(hantLesson?.cards?.[4].includes('版面畫在本子上'), true)
    const hant = json('src/i18n/zh-Hant.json')
    assert.equal(
      hant['critique.object'],
      '你呢次評賞對象係《Paris Street; Rainy Day》雨中街道同《Moonlight, Strandgade 30》室內窗光。評賞焦點係邊張較適合做課題。',
    )
    assert.equal(hant['critique.title'], '評賞提示')
    assert.equal(hant['dir.feel'], '整體感受')
    assert.equal(hant['dir.surface'], '表象描述')
    assert.equal(hant['dir.form'], '形式分析')
    assert.equal(hant['dir.meaning'], '意義詮釋')
    assert.equal(hant['dir.value'], '價值判斷')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hant['qtype.practiceOnly'], '練習結構 · 唔係真題')
  })

  it('lists live verified works unchanged, then the two new plates, and cites only that list', () => {
    assert.deepEqual(
      works.map((work) => work.lessonId),
      [
        'F4-U3-L2',
        'F4-U3-L2',
        'F4-U3-L3',
        'F4-U3-L3',
        'F4-U3-L4',
        'F4-U3-L4',
        'F5-U3-L1',
        'F5-U3-L1',
        'F5-U3-L2',
        'F5-U3-L2',
        'F5-U3-L3',
        'F5-U3-L3',
        'F5-U3-L4',
        'F5-U3-L4',
        'F4-U3-L1',
        'F4-U3-L1',
      ],
    )
    const kept = ['F4-U3-L2', 'F4-U3-L3', 'F4-U3-L4', 'F5-U3-L1', 'F5-U3-L2', 'F5-U3-L3', 'F5-U3-L4']
    for (const id of kept) {
      const source = id.startsWith('F5') ? f5 : f4
      const dual = dualOf(source, id)
      const rows = works.filter((work) => work.lessonId === id)
      assert.equal(rows[0]?.title, dual.plate?.title, id)
      assert.equal(rows[0]?.source, dual.plate?.source, id)
      assert.equal(rows[0]?.intro, dual.plate?.intro, id)
      assert.equal(rows[1]?.title, dual.right?.title, id)
      assert.equal(rows[1]?.source, dual.right?.source, id)
      assert.equal(rows[1]?.intro, dual.right?.intro, id)
    }
    assert.equal(works.some((work) => work.image.includes('437310')), false)
    assert.equal(works.some((work) => work.title === 'The Boulevard Montmartre on a Winter Morning'), false)
    assert.equal(works.some((work) => /tate/i.test(work.source)), false)
    assert.equal(critiqueMayCite('The Garden of the Tuileries on a Spring Morning', works), true)
    assert.equal(critiqueMayCite('The Boulevard Montmartre on a Winter Morning', works), false)
    assert.equal(critiqueMayCite('An invented canvas', works), false)
    const hant = json('src/i18n/zh-Hant.json')
    const en = json('src/i18n/en.json')
    const text = (key: 'critique.object.f4u3l1' | 'critique.object') => (key === 'critique.object' ? hant[key] : hant[key])
    assert.equal(critiqueObjectKey('F4-U3-L1'), 'critique.object.f4u3l1')
    assert.equal(critiqueObjectKey('F4-U3-L2'), 'critique.object')
    assert.equal(critiqueObjectKey('F4-U3-L3'), null)
    assert.equal(critiqueObjectKey('F5-U3-L1'), null)
    assert.equal(objectFollowsLesson('F4-U3-L1', hant['critique.object.f4u3l1'], works), true)
    assert.equal(objectFollowsLesson('F4-U3-L2', hant['critique.object'], works), true)
    assert.equal(objectFollowsLesson('F4-U3-L1', hant['critique.object'], works), false)
    assert.equal(objectFollowsLesson('F4-U3-L2', hant['critique.object.f4u3l1'], works), false)
    assert.equal(critiqueSentenceFor('F4-U3-L1', text, works), hant['critique.object.f4u3l1'])
    assert.equal(critiqueSentenceFor('F4-U3-L2', text, works), hant['critique.object'])
    assert.equal(critiqueSentenceFor('F4-U3-L3', text, works), '')
    assert.equal(objectFollowsLesson('F4-U3-L1', en['critique.object.f4u3l1'], works), true)
    assert.equal(objectFollowsLesson('F4-U3-L2', en['critique.object'], works), true)
    assert.equal(hant['critique.object.f4u3l1'].includes('Paris Street; Rainy Day'), false)
    assert.equal(hant['critique.object'].includes('Tuileries'), false)
  })
})
