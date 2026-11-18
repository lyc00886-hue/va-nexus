import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  appreciationScope,
  comparisonChipKeys,
  easyPromptLines,
  sentenceChipKeys,
} from './lessonPresentation.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
    "present.standard": "標準呈現",
    "present.easy": "易讀呈現",
    "present.choose": "揀呈現方式",
    "kw.ink": "水墨層次",
    "kw.brush": "筆觸濃淡",
    "kw.theme": "作品集主題",
    "kw.rain": "雨中街道",
    "kw.window": "室內窗光",
    "kw.env": "由環境搵主題",
    "dir.feel": "整體感受",
    "dir.surface": "表象描述",
    "dir.form": "形式分析",
    "dir.meaning": "意義詮釋",
    "dir.value": "價值判斷",
    "chip.feel": "雨中街路口好開闊",
    "chip.surface": "一邊行人同傘，一邊窗格光",
    "chip.form": "一邊街角樓宇，一邊空置室內",
    "chip.meaning": "兩位都由環境搵主題",
    "chip.value": "課題可以揀街道或窗光",
    "builder.assembled": "雨中街道見行人同傘，室內窗光見窗格光。兩位都由環境搵主題，課題可以揀街道或窗光。",
    "builder.title": "撳字粒組句",
    "builder.lead": "易讀呈現可以用撳字粒組句寫評賞。標準呈現仍然用普通書寫欄。",
    "builder.read": "組好嘅句子可以跟朗讀設定讀出。",
    "builder.hint": "評賞方向可以跟整體感受、表象描述、形式分析、意義詮釋、價值判斷，按學與教需要靈活調動。",
    "builder.voice": "可選語音輸入可以同組句一齊用，唔強迫。",
    "write.title": "評賞書寫",
    "image.examples": "下列只係例子，唔等於已核實授權，亦唔等於只核藝術家去世超過 70 年就可以跳過出處核實。",
    "image.tate": "Tate 唔係核准出處。",
    "image.noStandIn": "自制圖、招牌特寫同街景圖唔可以當藝術評賞比較嘅評賞對象，亦唔好用嚟頂未授權藝術家原作。",
} as const

const HANS = {
    "present.standard": "标准呈现",
    "present.easy": "易读呈现",
    "present.choose": "拣呈现方式",
    "kw.ink": "水墨层次",
    "kw.brush": "笔触浓淡",
    "kw.theme": "作品集主题",
    "kw.rain": "雨中街道",
    "kw.window": "室內窗光",
    "kw.env": "由环境找主题",
    "dir.feel": "整体感受",
    "dir.surface": "表象描述",
    "dir.form": "形式分析",
    "dir.meaning": "意义诠释",
    "dir.value": "价值判断",
    "chip.feel": "雨中街路口好开阔",
    "chip.surface": "一边行人同伞，一边窗格光",
    "chip.form": "一边街角楼宇，一边空置室內",
    "chip.meaning": "两位都由环境找主题",
    "chip.value": "课题可以拣街道或窗光",
    "builder.assembled": "雨中街道见行人同伞，室內窗光见窗格光。两位都由环境找主题，课题可以拣街道或窗光。",
    "builder.title": "撳字粒组句",
    "builder.lead": "易读呈现可以用撳字粒组句写评赏。标准呈现仍然用普通书写栏。",
    "builder.read": "组好嘅句子可以跟朗读设定读出。",
    "builder.hint": "评赏方向可以跟整体感受、表象描述、形式分析、意义诠释、价值判断，按学与教需要灵活调动。",
    "builder.voice": "可选语音输入可以同组句一齐用，不必强迫。",
    "write.title": "评赏书写",
    "image.examples": "下列只是例子，不等于已核实授权，亦不等于只核艺术家去世超过 70 年就可以跳过出处核实。",
    "image.tate": "Tate 不是核准出处。",
    "image.noStandIn": "自制图、招牌特写同街景图不可以当艺术评赏比较嘅评赏对象，亦不可用嚟顶未授权艺术家原作。",
} as const

const EN = {
    "present.standard": "Standard presentation",
    "present.easy": "Easy-read presentation",
    "present.choose": "Choose a presentation",
    "kw.ink": "Ink layers",
    "kw.brush": "Brush dark and light",
    "kw.theme": "Portfolio theme",
    "kw.rain": "Rainy street",
    "kw.window": "Interior window-light",
    "kw.env": "Theme from the environment",
    "dir.feel": "Overall impression",
    "dir.surface": "Surface description",
    "dir.form": "Formal analysis",
    "dir.meaning": "Interpretation of meaning",
    "dir.value": "Value judgement",
    "chip.feel": "The rainy street feels open",
    "chip.surface": "Walkers and umbrellas, window-grid light",
    "chip.form": "Street corner and empty interior",
    "chip.meaning": "Both artists find a theme from the environment",
    "chip.value": "The topic may take the street or the window-light",
    "builder.assembled": "The rainy street shows walkers and umbrellas; the interior window-light shows a window-grid of light. Both artists find a theme from the environment, so the topic may take the street or the window-light.",
    "builder.title": "Tap chips to build a sentence",
    "builder.lead": "Easy-read presentation may use a tap-to-build sentence helper to write an appreciation. Standard presentation still uses ordinary writing fields.",
    "builder.read": "The assembled sentence can be read with the existing read-aloud setting.",
    "builder.hint": "You may follow overall impression, surface description, formal analysis, interpretation of meaning, and value judgement, and move among them as teaching and learning need.",
    "builder.voice": "Optional voice input may sit with the builder; it is not forced.",
    "write.title": "Appreciation writing",
    "image.examples": "The following names are examples only; they are not a licence, and artist-deceased-over-70-years is not enough if a source is not verified.",
    "image.tate": "Tate is not an approved source.",
    "image.noStandIn": "Homemade images, shop-sign close-ups, and street views must not be the object of Compare works, and must not stand in for an unauthorized artist original.",
} as const

const BANNED = /[\u7684\u628A\u5572\u4F86\u6765\u771E\u6415\u63C5\u6417]/

describe('easier-reading presentation copy', () => {
  it('keeps the official supplement strings byte-identical', () => {
    const files = {
      'zh-Hant': ['src/i18n/zh-Hant.json', HANT],
      'zh-Hans': ['src/i18n/zh-Hans.json', HANS],
      en: ['src/i18n/en.json', EN],
    } as const
    for (const [locale, [file, expected]] of Object.entries(files)) {
      const bag = JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, string>
      for (const [key, value] of Object.entries(expected)) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
    }
    const hant = JSON.parse(readFileSync(join(root, 'src/i18n/zh-Hant.json'), 'utf8')) as Record<string, string>
    for (const value of Object.values(HANT)) assert.equal(BANNED.test(value), false, value)
    for (const value of Object.values(HANS)) assert.equal(BANNED.test(value), false, value)
    assert.equal(hant['kw.env'].includes('\u6435'), true)
    assert.equal(hant['builder.assembled'].includes('\u6435'), true)
    assert.equal(hant['chip.meaning'].includes('\u6435'), true)
    assert.equal(hant['kw.window'].includes('\u5167'), true)
    assert.equal(hant['present.choose'].includes('\u63C0'), true)
    assert.equal(hant['builder.title'].includes('\u64B3'), true)
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hant['qtype.practiceOnly'], '練習結構 · 唔係真題')
    assert.equal(hant['lp.exit'], '離開課堂')
    assert.equal(hant['lp.check'], '檢查答案')
    assert.equal(hant['tts.read'], '朗讀')
    assert.equal(hant['settings.reading'], '閱讀設定')
    assert.equal(hant['hw.student.upload'], '上載成份檔')
    assert.equal(hant['hw.student.submit'], '交功課')
    assert.equal(hant['art.attr.pd'], 'Public Domain／CC0')
  })

  it('builds F4 and F5 chips from the verified works only', () => {
    assert.equal(appreciationScope('F4-U3-L1'), true)
    assert.equal(appreciationScope('F4-U3-L2'), true)
    assert.equal(appreciationScope('F4-U3-L4'), true)
    assert.equal(appreciationScope('F5-U3-L4'), true)
    assert.equal(appreciationScope('F4-U2-L1'), false)
    assert.deepEqual(comparisonChipKeys('F4-U3-L2'), ['kw.rain', 'kw.window', 'kw.env'])
    assert.deepEqual(comparisonChipKeys('F5-U3-L4'), ['kw.ink', 'kw.brush', 'kw.theme'])
    assert.deepEqual(comparisonChipKeys('F5-U3-L1'), ['kw.ink', 'kw.brush', 'kw.theme'])
    assert.deepEqual(comparisonChipKeys('F4-U3-L1'), [])
    assert.deepEqual(sentenceChipKeys('F4-U3-L2'), ['chip.feel', 'chip.surface', 'chip.form', 'chip.meaning', 'chip.value'])
    assert.deepEqual(sentenceChipKeys('F5-U3-L4'), ['kw.ink', 'kw.brush', 'kw.theme'])
    assert.deepEqual(sentenceChipKeys('F6-U1-L1'), [])
    const lines = easyPromptLines('藝術評賞比較：左邊一句。各寫一句。')
    assert.deepEqual(lines, ['藝術評賞比較：左邊一句。', '各寫一句。'])
  })

  it('wires the lesson shell without a teacher override or a merged homework button', () => {
    const player = readFileSync(join(root, 'src/components/game/LessonPlayer.tsx'), 'utf8')
    const faces = readFileSync(join(root, 'src/components/game/ClassroomFaces.tsx'), 'utf8')
    const builder = readFileSync(join(root, 'src/components/game/SentenceBuilder.tsx'), 'utf8')
    const board = readFileSync(join(root, 'src/components/game/ThinPractice.tsx'), 'utf8')
    const homework = readFileSync(join(root, 'src/components/HomeworkStudent.tsx'), 'utf8')
    assert.match(player, /data-reading-settings/)
    assert.match(player, /present\.standard|PresentationBar/)
    assert.match(player, /readingMode/)
    assert.match(board, /SentenceBuilder/)
    assert.match(board, /StandardWritingNote/)
    assert.match(board, /comparisonChipKeys/)
    assert.match(board, /flex-\[3\]/)
    assert.match(board, /flex-\[5\]/)
    assert.match(faces, /image\.noStandIn/)
    assert.match(builder, /builder\.title/)
    assert.match(builder, /builder\.voice/)
    assert.match(builder, /DIRECTION_KEYS/)
    assert.equal(/Feldman|DAIE|ArtInsight|Duolingo|SENCritique|雙圖對讀/.test(builder + faces), false)
    assert.match(homework, /hw\.student\.upload/)
    assert.match(homework, /hw\.student\.submit/)
    assert.equal(homework.includes('hw.submit.unsent'), false)
    assert.equal(homework.includes('hw.submit.sent'), false)
  })
})
