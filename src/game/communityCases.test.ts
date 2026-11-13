import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  DEEPFOOD_PAGE_URL,
  FURTHER_CLASSROOM_VIDEOS,
  HILL_BROCHURE_URL,
  HILL_PAGE_URL,
  HILL_VIDEO_ID,
  OFFICIAL_VIDEO_IDS,
  OVERVIEW_VIDEO_ID,
  applyCommunityLessonCopy,
  classroomEmbedUrl,
  classroomWatchUrl,
} from './communityCases.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
  'lesson.f4u3l3.title': '十一月：認識社區藝術——研究',
  'lesson.f4u3l3.subtitle': '喺課堂認識咩係社區藝術，配過往案例參考。唔使出外做計劃。',
  'lesson.f4u3l3.card.theme.body': '社區藝術主題來自真實環境——人物、地方、習慣、物件。呢課喺課堂認識，唔叫你真係去做一個計劃。',
  'lesson.f4u3l3.card.observe.body': '課堂觀察可以用速寫同筆記。影人之前要問准，尊重私隱。唔使出外做計劃。',
  'lesson.f4u3l3.card.interview.body': '課堂練習可以做短訪問：短問題、留白、記錄關鍵句。只係課堂練習，唔係要你去實行一個社區計劃。',
  'lesson.f4u3l3.card.insight.body': '由課堂材料拎一個「洞察」：一件你以前冇留意、但同社區有關嘅細節。',
  'lesson.f4u3l3.card.practice.body': '呢課喺課堂認識社區藝術，視覺日記每週繼續。課堂唔用真實試卷。唔使出外做計劃。',
  'lesson.f4u3l4.title': '十一月：認識社區藝術——發展同創作',
  'lesson.f4u3l4.subtitle': '喺課堂睇過往案例，再用課堂練習將認識發展成創作。唔叫你真係實行一個社區藝術計劃。',
  'lesson.f4u3l4.card.make.body': '將課堂認識變成創作練習——繪畫、設計、雕塑或其他媒介都可以。唔叫你真係出外完成一件社區計劃。',
  'lesson.f4u3l4.card.three.body': '用三句講一件課堂練習作品：主題、做法、想觀眾感受到咩。唔當要出外實行一個社區計劃。',
  'lesson.f4u3l4.card.practice.body': '呢課喺課堂練習發展同創作方法，並反思學習經驗。課堂唔用公開試正式成績聲稱。',
  'case.hill.title': '邂逅！山 川 人',
  'case.hill.english': 'Hi! Hill public art project',
  'case.hill.org': '主辦 康樂及文化事務署',
  'case.hill.plan': '策劃 藝術推廣辦事處',
  'case.hill.partner': '在地藝術策劃伙伴 創不同協作',
  'case.hill.when': '11.3–12.8.2018',
  'case.hill.where': '前川龍貫文公立學校及荃灣川龍村',
  'case.hill.artist': '陳思光係參與藝術家之一，用村內陶土做陶瓷；唔係主辦或策劃。',
  'case.hill.source': '課堂參考用官方網頁同小冊子。未核實到官方可課堂播放嘅 YouTube。',
  'case.hill.frame': '呢個係過往案例參考，唔使出外做計劃。',
  'case.deepfood.collective': '深食',
  'case.deepfood.project': '喚味：𝑥',
  'case.deepfood.english': 'The Unexplored Flavour: 𝑥',
  'case.deepfood.invite': '油街實現邀請深食',
  'case.deepfood.venue': '場地 油街廚房',
  'case.deepfood.when': '1.6.2023–12.3.2024',
  'case.deepfood.frame': '呢個係課堂案例，只作課堂播放。',
  'video.classroomOnly': '只作課堂播放',
  'video.noDownload': '呢課唔提供下載、上載或轉載。',
  'video.overviewTitle': '【喚味：𝑥 | The Unexplored Flavour: 𝑥】',
  'video.channel': '油街實現 Oi! (Oil Street Art Space)',
  'video.more': '另外三條官方課堂連結：個體、時間、空間。',
} as const

const EN = {
  'lesson.f4u3l3.title': 'November: Getting to know community art — research',
  'lesson.f4u3l3.subtitle': 'In class, learn what community art is, with past cases for reference. You do not need to go out and run a project.',
  'lesson.f4u3l4.title': 'November: Getting to know community art — develop and make',
  'lesson.f4u3l4.subtitle': 'In class, look at past cases, then use a classroom exercise to turn that recognition into making. It does not ask you to actually carry out a community art project.',
  'case.hill.english': 'Hi! Hill public art project',
  'case.deepfood.collective': 'Deep Food',
  'case.deepfood.english': 'The Unexplored Flavour: 𝑥',
  'case.deepfood.invite': 'Oi! invited Deep Food',
  'case.deepfood.venue': 'Venue: Oi! Kitchen',
  'video.classroomOnly': 'For classroom playback only',
  'video.noDownload': 'This lesson does not offer download, upload, or republication.',
  'video.channel': '油街實現 Oi! (Oil Street Art Space)',
} as const

const HANS = {
  'lesson.f4u3l3.title': '十一月：认识社区艺术——研究',
  'lesson.f4u3l3.subtitle': '在课堂认识什么是社区艺术，并配以往案例参考。不必出外做计划。',
  'lesson.f4u3l4.title': '十一月：认识社区艺术——发展与创作',
  'lesson.f4u3l4.subtitle': '在课堂看以往案例，再用课堂练习把认识发展成创作。不要求你真正实行一个社区艺术计划。',
  'case.hill.where': '前川龙贯文公立学校及荃湾川龙村',
  'case.deepfood.project': '唤味：𝑥',
  'video.classroomOnly': '只作课堂播放',
  'video.noDownload': '这课不提供下载、上传或转载。',
} as const

const LESSON_KEYS = [
  'lesson.f4u3l3.title',
  'lesson.f4u3l3.subtitle',
  'lesson.f4u3l3.card.theme.body',
  'lesson.f4u3l3.card.observe.body',
  'lesson.f4u3l3.card.interview.body',
  'lesson.f4u3l3.card.insight.body',
  'lesson.f4u3l3.card.practice.body',
  'lesson.f4u3l4.title',
  'lesson.f4u3l4.subtitle',
  'lesson.f4u3l4.card.make.body',
  'lesson.f4u3l4.card.three.body',
  'lesson.f4u3l4.card.practice.body',
] as const

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|\bRELAY\b|SENCO|學習需要（SEN）|学习需要（SEN）|讀寫障礙|读写障碍|Dyslexia|ADHD|自閉症|自闭症/

type Card = { title?: string; body?: string; image?: string }
type Lesson = { id: string; title: string; subtitle?: string; cards: Card[] }

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

function lesson(file: string, id: string): Lesson {
  const pack = JSON.parse(read(file)) as { units: { lessons: Lesson[] }[] }
  const found = pack.units.flatMap((unit) => unit.lessons).find((item) => item.id === id)
  assert.ok(found, `${file} ${id}`)
  return found
}

describe('November community-art cases', () => {
  it('locks the zh-Hant Soft SCOUT strings, including the four corrected characters', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    for (const [key, value] of Object.entries(HANT)) {
      assert.equal(hant[key], value, key)
    }
    assert.equal(hant['lesson.f4u3l3.subtitle'].includes('\u54A9'), true)
    assert.equal(hant['lesson.f4u3l3.subtitle'].includes('\u54A5'), false)
    assert.equal(hant['lesson.f4u3l4.card.three.body'].includes('\u54A9'), true)
    assert.equal(hant['lesson.f4u3l4.card.three.body'].includes('\u54A5'), false)
    assert.equal(hant['case.hill.title'].codePointAt(0), 0x9082)
    assert.equal(hant['case.hill.title'].includes('\u902E'), false)
    assert.equal(hant['case.hill.where'].includes('\u8343\u7063'), true)
    assert.equal(hant['case.hill.where'].includes('\u834A'), false)
    for (const value of Object.values(HANT)) {
      for (const ch of value) {
        if (ch === '喺') assert.equal(ch.codePointAt(0), 0x55ba)
        if (ch === '唔') assert.equal(ch.codePointAt(0), 0x5514)
        if (ch === '嘅') assert.equal(ch.codePointAt(0), 0x5605)
      }
      assert.equal(value.includes('\u558E'), false)
      assert.equal(value.includes('\u5594'), false)
    }
    assert.equal(hant['case.deepfood.project'], '喚味：\u{1D465}')
    assert.equal(hant['case.deepfood.project'].includes('x'), false)
    assert.equal(hant['video.overviewTitle'].includes('\u{1D465}'), true)
    assert.equal(hant['case.hill.plan'], '策劃 藝術推廣辦事處')
  })

  it('gives en and zh-Hans the same keys, without worksheet keys or a diagnostic label', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    for (const key of Object.keys(HANT)) {
      assert.equal(typeof hans[key], 'string', `zh-Hans ${key}`)
      assert.equal(typeof en[key], 'string', `en ${key}`)
      assert.ok(hans[key].length > 0)
      assert.ok(en[key].length > 0)
    }
    for (const [key, value] of Object.entries(EN)) assert.equal(en[key], value, key)
    for (const [key, value] of Object.entries(HANS)) assert.equal(hans[key], value, key)
    assert.equal(en['case.hill.title'], hant['case.hill.title'])
    assert.equal(en['case.deepfood.english'].endsWith('\u{1D465}'), true)
    assert.equal(en['case.deepfood.english'].includes('Flavour: x'), false)
    assert.equal(hans['case.deepfood.english'], 'The Unexplored Flavour: \u{1D465}')
    for (const bag of [hant, hans, en]) {
      assert.equal(Object.keys(bag).some((key) => key.startsWith('worksheet.')), false)
      for (const key of Object.keys(HANT)) {
        assert.equal(BANNED.test(bag[key]), false, key)
        assert.equal(bag[key].includes('學生例子'), false, key)
        assert.equal(/student example/i.test(bag[key]), false, key)
      }
    }
  })

  it('keeps classroom recognition from sending students out to run a project', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const en = messages('src/i18n/en.json')
    for (const key of LESSON_KEYS) {
      const value = hant[key]
      if (value.includes('出外') || value.includes('實行') || value.includes('去做一個計劃')) {
        assert.equal(value.includes('唔'), true, value)
      }
      assert.equal(/請你出外|必須出外|要你去社區做/.test(value), false, value)
    }
    for (const key of Object.keys(EN)) {
      const value = en[key]
      if (/go out|carry out/i.test(value)) assert.match(value, /do not|does not/i, value)
    }
    assert.match(hant['lesson.f4u3l3.subtitle'], /唔使出外做計劃/)
    assert.match(hant['lesson.f4u3l4.subtitle'], /唔叫你真係實行一個社區藝術計劃/)
    assert.match(hant['case.hill.frame'], /過往案例參考/)
    assert.match(hant['case.deepfood.frame'], /課堂案例/)
    assert.equal(hant['case.hill.artist'].includes('唔係主辦或策劃'), true)
  })

  it('wires both lessons to the locale strings and leaves the other card titles', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const text = (key: string) => hant[key] ?? key
    const l3 = lesson('src/content/f4-demo.json', 'F4-U3-L3')
    const l4 = lesson('src/content/f4-demo.json', 'F4-U3-L4')
    assert.equal(l3.title, hant['lesson.f4u3l3.title'])
    assert.equal(l3.subtitle, hant['lesson.f4u3l3.subtitle'])
    assert.equal(l4.title, hant['lesson.f4u3l4.title'])
    assert.equal(l4.subtitle, hant['lesson.f4u3l4.subtitle'])
    assert.deepEqual(
      l3.cards.map((card) => card.title),
      ['主題喺社區', '觀察要問准', '短訪問', '拎一個洞察', '課堂練習'],
    )
    assert.deepEqual(
      l4.cards.map((card) => card.title),
      ['研究變創作', '過程要留痕', '學方法唔抄圖', '三句講作品', '課堂練習'],
    )
    assert.equal(l4.cards[1]?.body, '概念發展留痕：文字／圖像草圖、物料試驗、改動原因（研究工作簿用）。')
    assert.equal(l4.cards[2]?.body, '參考風格時：學方法，唔抄圖像；只用合法／自制參考。')
    assert.equal(l3.cards[0]?.image, '/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L3-c0.png')
    assert.equal(l3.cards[2]?.image, undefined)
    assert.equal(l4.cards[0]?.image, '/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c0.png')
    assert.equal(l4.cards[3]?.image, undefined)

    const wired = applyCommunityLessonCopy(
      {
        id: 'F4-U3-L4',
        title: 'old',
        subtitle: 'old',
        cards: l4.cards.map((card) => ({
          title: card.title ?? '',
          body: card.body ?? '',
          easy: ['old'],
          image: card.image,
        })),
      },
      text,
    )
    assert.equal(wired.title, hant['lesson.f4u3l4.title'])
    assert.equal(wired.cards[0]?.body, hant['lesson.f4u3l4.card.make.body'])
    assert.equal(wired.cards[1]?.body, l4.cards[1]?.body)
    assert.equal(wired.cards[1]?.title, '過程要留痕')
    assert.equal(wired.cards[2]?.body, l4.cards[2]?.body)
    assert.equal(wired.cards[3]?.body, hant['lesson.f4u3l4.card.three.body'])
    assert.equal(wired.cards[3]?.image, undefined)
    assert.deepEqual(wired.cards[0]?.easy.join(''), wired.cards[0]?.body.replace(/[，。；：]/g, ''))

    const builder = read('src/game/f4Demo.ts')
    const player = read('src/components/game/LessonPlayer.tsx')
    assert.match(builder, /applyCommunityLessonCopy/)
    assert.match(player, /CommunityLessonIntro lessonId=\{lesson\.id\} subtitle=\{lesson\.subtitle\}/)
  })

  it('uses the two official cases and only the verified YouTube ids', () => {
    assert.equal(HILL_PAGE_URL, 'https://www.apo.hk/tc/web/apo/hi_hill.html')
    assert.equal(HILL_BROCHURE_URL, 'https://www.apo.hk/documents/27096998/30098408/180326_hihill_brochure_web.pdf')
    assert.equal(DEEPFOOD_PAGE_URL, 'https://www.apo.hk/tc/web/apo/oi_the_unexplored_flavour_x.html')
    assert.equal(HILL_VIDEO_ID, null)
    assert.equal(OVERVIEW_VIDEO_ID, 'hR9X0Ce2r9o')
    assert.deepEqual(
      FURTHER_CLASSROOM_VIDEOS.map((video) => video.id),
      ['ne_jKi_E1m8', 'bNRkL39iQQc', 'THsKZTXt-sk'],
    )
    assert.deepEqual(OFFICIAL_VIDEO_IDS, ['hR9X0Ce2r9o', 'ne_jKi_E1m8', 'bNRkL39iQQc', 'THsKZTXt-sk'])
    assert.equal(classroomEmbedUrl(OVERVIEW_VIDEO_ID), 'https://www.youtube.com/embed/hR9X0Ce2r9o')
    assert.equal(classroomWatchUrl('ne_jKi_E1m8'), 'https://www.youtube.com/watch?v=ne_jKi_E1m8')

    const cases = read('src/game/communityCases.ts')
    const view = read('src/components/game/CommunityCases.tsx')
    const hill = view.slice(view.indexOf('function HillCase'), view.indexOf('function DeepFoodCase'))
    assert.equal(hill.includes('iframe'), false)
    assert.equal(hill.includes('youtube'), false)
    assert.match(hill, /HILL_PAGE_URL/)
    assert.match(hill, /HILL_BROCHURE_URL/)
    assert.equal(cases.includes(HILL_PAGE_URL), true)
    assert.equal(cases.includes(HILL_BROCHURE_URL), true)
    assert.match(view, /src=\{classroomEmbedUrl\(OVERVIEW_VIDEO_ID\)\}/)
    assert.match(cases, /https:\/\/www\.youtube\.com\/embed\/\$\{id\}/)
    assert.equal(view.includes('youtube.com/embed/'), false)
    for (const id of ['hR9X0Ce2r9o', 'ne_jKi_E1m8', 'bNRkL39iQQc', 'THsKZTXt-sk']) {
      assert.equal(cases.includes(id), true, id)
    }
    assert.match(view, /video\.classroomOnly/)
    assert.match(view, /video\.noDownload/)
    assert.equal(view.includes('download='), false)
    assert.equal(/save-offline|repost|rehost/i.test(view), false)
    assert.equal(view.includes('worksheet.'), false)
    assert.equal(FURTHER_CLASSROOM_VIDEOS[0]?.title.includes('\u{1D465}'), true)
    assert.equal(FURTHER_CLASSROOM_VIDEOS[1]?.title.includes('Time'), true)
    assert.equal(FURTHER_CLASSROOM_VIDEOS[2]?.title.includes('Space'), true)
  })

  it('leaves LessonCardArt and the api TypeScript count unchanged', () => {
    const art = read('src/components/game/LessonCardArt.tsx')
    assert.match(art, /key=\{image\}/)
    assert.equal(art.includes('loading='), false)
    assert.match(art, /if \(!image \|\| failed\) return null/)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)
    const player = read('src/components/game/LessonPlayer.tsx')
    const stage = player.slice(player.indexOf('function CardsStage'), player.indexOf('function QuizStage'))
    assert.match(stage, /LessonCardArt image=\{card\.image\} credit=\{card\.imageCredit\}/)
    assert.equal(stage.includes('loading='), false)
  })
})
