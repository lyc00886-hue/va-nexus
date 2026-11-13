import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  WORKSHEET_LOCALE_KEYS,
  WORKSHEET_QUESTION_KEYS,
  WORKSHEET_SAMPLE_LABEL,
  worksheetCaseLines,
  worksheetDownloadHtml,
  worksheetDownloadName,
  worksheetLessonOf,
  worksheetQuestions,
  worksheetShowsSample,
} from './lessonWorksheet.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

const HANT = {
  'worksheet.title': '課堂活動紙',
  'worksheet.preview': '預覽',
  'worksheet.print': '列印',
  'worksheet.download': '下載',
  'worksheet.printHint': '預覽無問題之後，先列印或下載。',
  'worksheet.l3.title': '十一月：認識社區藝術——研究 · 課堂活動紙',
  'worksheet.l4.title': '十一月：認識社區藝術——發展同創作 · 課堂活動紙',
  'worksheet.intro': '呢張係課堂活動紙，跟住呢課嘅題同過往案例。唔係功課，亦唔使出外做計劃。',
  'worksheet.sampleNote': '以下係示例，唔係真實同學或真實學校。',
  'worksheet.noSchool': '呢張活動紙唔顯示校名、校徽或教師姓名。',
  'worksheet.section.case': '過往案例參考',
  'worksheet.section.questions': '跟課本題',
  'worksheet.l3.q1': '社區研究時影人之前應該？',
  'worksheet.l3.q2': '訪問之後點用資料？',
  'worksheet.l3.q3': '視覺研究常用＿＿、速寫同筆記。',
  'worksheet.l3.q4': '寫一個洞察。提示：先寫你喺課室材料見到嘅細節，再寫佢點樣同社區有關。',
  'worksheet.l4.q1': '概念發展「留痕」係為咗？',
  'worksheet.l4.q2': '交作品時三句講解應包括？',
  'worksheet.l4.q3': '用三句講一件課室作品。提示：主題一句、做法一句、想觀眾感受到咩一句。',
} as const

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|\bRELAY\b|SENCO|學習需要（SEN）|学习需要（SEN）|讀寫障礙|读写障碍|Dyslexia|ADHD|自閉症|自闭症|診斷|诊断/

describe('November activity papers', () => {
  it('locks the 12 official worksheet keys and the question lines', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    assert.deepEqual(WORKSHEET_LOCALE_KEYS, [
      'worksheet.title',
      'worksheet.preview',
      'worksheet.print',
      'worksheet.download',
      'worksheet.printHint',
      'worksheet.l3.title',
      'worksheet.l4.title',
      'worksheet.intro',
      'worksheet.sampleNote',
      'worksheet.noSchool',
      'worksheet.section.case',
      'worksheet.section.questions',
    ])
    for (const key of Object.keys(HANT)) {
      assert.equal(hant[key], HANT[key as keyof typeof HANT], key)
      assert.equal(typeof en[key], 'string', key)
      assert.equal(typeof hans[key], 'string', key)
      assert.ok(en[key].length > 0, key)
      assert.ok(hans[key].length > 0, key)
      assert.equal(overrides[key], hans[key], key)
      assert.equal(BANNED.test(hant[key]), false, key)
      assert.equal(BANNED.test(en[key]), false, key)
      assert.equal(BANNED.test(hans[key]), false, key)
    }
    assert.equal(hant['worksheet.sampleNote'].includes('\u771F'), true)
    assert.equal(hant['worksheet.sampleNote'].includes('\u771E'), false)
    assert.equal(hant['worksheet.l3.q3'].includes('\uFF3F\uFF3F'), true)
    assert.equal(hant['worksheet.l3.q3'].includes('__'), false)
    assert.equal(hant['worksheet.l3.q4'].includes('\u8AB2\u5BA4'), true)
    assert.equal(hant['worksheet.l3.q4'].includes('課堂'), false)
    assert.equal(hant['worksheet.l3.q4'].includes('\u55BA'), true)
    assert.equal(hant['worksheet.l3.q4'].includes('\u5605'), true)
    assert.equal(hant['worksheet.l4.q1'].includes('\u5497'), true)
    assert.equal(hant['worksheet.l4.q3'].includes('\u8AB2\u5BA4'), true)
    assert.equal(hant['worksheet.l4.q3'].includes('課堂'), false)
    assert.equal(hant['worksheet.l4.q3'].includes('\u54A9'), true)
    assert.equal(en['worksheet.l3.q3'].includes('\uFF3F\uFF3F'), true)
    assert.equal(hans['worksheet.l3.q3'].includes('\uFF3F\uFF3F'), true)
    assert.equal(hans['worksheet.sampleNote'].includes('\u771E'), false)
    assert.equal(WORKSHEET_SAMPLE_LABEL, '示例同學甲')
    assert.equal(hant['worksheet.intro'].includes('唔係功課'), true)
    assert.equal(en['worksheet.intro'].includes('not homework'), true)
  })

  it('follows L3 questions with case A and L4 questions with case B', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const text = (key: string) => hant[key] ?? key
    assert.equal(worksheetLessonOf('F4-U3-L3'), 'F4-U3-L3')
    assert.equal(worksheetLessonOf('F4-U3-L4'), 'F4-U3-L4')
    assert.equal(worksheetLessonOf('F4-U2-L3'), null)
    assert.equal(worksheetLessonOf('F4-U3-L1'), null)

    assert.deepEqual(worksheetQuestions('F4-U3-L3', text), [
      HANT['worksheet.l3.q1'],
      HANT['worksheet.l3.q2'],
      HANT['worksheet.l3.q3'],
      HANT['worksheet.l3.q4'],
    ])
    assert.deepEqual(worksheetQuestions('F4-U3-L4', text), [
      HANT['worksheet.l4.q1'],
      HANT['worksheet.l4.q2'],
      HANT['worksheet.l4.q3'],
    ])
    assert.deepEqual([...WORKSHEET_QUESTION_KEYS['F4-U3-L3']], [
      'worksheet.l3.q1',
      'worksheet.l3.q2',
      'worksheet.l3.q3',
      'worksheet.l3.q4',
    ])

    assert.deepEqual(worksheetCaseLines('F4-U3-L3', 'teacher', text), [
      '邂逅！山 川 人',
      'Hi! Hill public art project',
      '主辦 康樂及文化事務署 · 策劃 藝術推廣辦事處',
      '陳思光係參與藝術家之一，用村內陶土做陶瓷；唔係主辦或策劃。',
      '課堂參考用官方網頁同小冊子。未核實到官方可課堂播放嘅 YouTube。',
      '呢個係過往案例參考，用嚟做有對象、有焦點嘅評賞。',
    ])
    assert.deepEqual(worksheetCaseLines('F4-U3-L3', 'student', text), [
      '邂逅！山 川 人 · Hi! Hill public art project',
      '呢個係過往案例參考，用嚟做有對象、有焦點嘅評賞。',
    ])
    assert.deepEqual(worksheetCaseLines('F4-U3-L4', 'teacher', text), [
      '深食「喚味：\u{1D465}」',
      'The Unexplored Flavour: \u{1D465}',
      '油街實現邀請深食 · 場地 油街廚房 · 1.6.2023–12.3.2024',
      '只作課堂播放',
      '呢課唔提供下載、上載或轉載。',
    ])
    assert.deepEqual(worksheetCaseLines('F4-U3-L4', 'student', text), [
      '深食「喚味：\u{1D465}」 · The Unexplored Flavour: \u{1D465}',
      '呢個係課堂案例，只作課堂播放。',
    ])

    const teacherL3 = worksheetCaseLines('F4-U3-L3', 'teacher', text).join('\n')
    const studentL3 = worksheetCaseLines('F4-U3-L3', 'student', text).join('\n')
    const teacherL4 = worksheetCaseLines('F4-U3-L4', 'teacher', text).join('\n')
    const studentL4 = worksheetCaseLines('F4-U3-L4', 'student', text).join('\n')
    assert.equal(teacherL3.includes('深食'), false)
    assert.equal(studentL3.includes('陳思光'), false)
    assert.equal(studentL3.includes('前川龍'), false)
    assert.equal(teacherL3.includes('前川龍'), false)
    assert.equal(teacherL4.includes('邂逅'), false)
    assert.equal(studentL4.includes('Flavour: x'), false)
    assert.equal(studentL4.includes('\u{1D465}'), true)
    assert.equal(teacherL4.includes('\u{1D465}'), true)
    assert.equal(hant['case.hill.title'], '邂逅！山 川 人')
    assert.equal(hant['case.deepfood.project'], '喚味：\u{1D465}')
    assert.equal(teacherL3.includes('評賞對象'), false)
    assert.equal(studentL3.includes('視覺元素同組織原理'), false)
    assert.equal(teacherL4.includes('評賞對象'), false)
  })

  it('keeps the sample label on the L3 teacher preview only', () => {
    assert.equal(worksheetShowsSample('F4-U3-L3', 'teacher', 'preview'), true)
    assert.equal(worksheetShowsSample('F4-U3-L3', 'teacher', 'print'), false)
    assert.equal(worksheetShowsSample('F4-U3-L3', 'teacher', 'download'), false)
    assert.equal(worksheetShowsSample('F4-U3-L3', 'student', 'preview'), false)
    assert.equal(worksheetShowsSample('F4-U3-L4', 'teacher', 'preview'), false)
    assert.equal(worksheetShowsSample('F4-U3-L4', 'student', 'preview'), false)
    const hant = messages('src/i18n/zh-Hant.json')
    const text = (key: string) => hant[key] ?? key
    const file = worksheetDownloadHtml({
      lang: 'zh-Hant-HK',
      title: hant['worksheet.l3.title'],
      intro: hant['worksheet.intro'],
      noSchool: hant['worksheet.noSchool'],
      caseHeading: hant['worksheet.section.case'],
      caseLines: worksheetCaseLines('F4-U3-L3', 'teacher', text),
      questionsHeading: hant['worksheet.section.questions'],
      questions: worksheetQuestions('F4-U3-L3', text),
    })
    assert.equal(file.includes(WORKSHEET_SAMPLE_LABEL), false)
    assert.equal(file.includes('示例同學甲'), false)
    assert.equal(file.includes('邂逅！山 川 人'), true)
    assert.equal(file.includes(HANT['worksheet.l3.q1']), true)
    assert.equal(file.includes('#FFF9E9'), true)
    assert.equal(file.includes('#0D9488'), true)
    assert.equal(worksheetDownloadName('F4-U3-L4'), 'classroom-activity-F4-U3-L4.html')
    const l4 = worksheetDownloadHtml({
      lang: 'zh-Hant-HK',
      title: hant['worksheet.l4.title'],
      intro: hant['worksheet.intro'],
      noSchool: hant['worksheet.noSchool'],
      caseHeading: hant['worksheet.section.case'],
      caseLines: worksheetCaseLines('F4-U3-L4', 'teacher', text),
      questionsHeading: hant['worksheet.section.questions'],
      questions: worksheetQuestions('F4-U3-L4', text),
    })
    assert.equal(l4.includes('\u{1D465}'), true)
    assert.equal(l4.includes('只作課堂播放'), true)
    assert.equal(l4.includes(WORKSHEET_SAMPLE_LABEL), false)
  })

  it('gives teachers preview, print, and download, and keeps personal data off the student paper', () => {
    const view = read('src/components/game/LessonWorksheet.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    assert.match(view, /audience === 'teacher'/)
    assert.match(view, /data-worksheet-action="preview"|data-worksheet-action=\{item\.id\}/)
    assert.match(view, /id: 'preview'/)
    assert.match(view, /id: 'print'/)
    assert.match(view, /id: 'download'/)
    assert.match(view, /window\.print\(\)/)
    assert.match(view, /worksheetDownloadHtml/)
    assert.match(view, /worksheetShowsSample/)
    assert.match(view, /WORKSHEET_SAMPLE_LABEL/)
    assert.match(view, /data-worksheet-audience=\{audience\}/)
    assert.match(view, /data-worksheet-sample/)
    assert.equal(view.includes('<img'), false)
    assert.equal(/點名|出席|roll-?call|attendance|一鍵|generateLesson|homework assignment/i.test(view), false)
    assert.match(player, /<LessonWorksheet lessonId=\{lesson\.id\} \/>/)
    assert.match(player, /CommunityLessonIntro lessonId=\{lesson\.id\} subtitle=\{lesson\.subtitle\}/)
    const cases = read('src/components/game/CommunityCases.tsx')
    assert.equal(cases.includes('worksheet.'), false)
    assert.match(cases, /classroomEmbedUrl\(OVERVIEW_VIDEO_ID\)/)
    assert.match(cases, /data-case="hill"/)
    assert.match(cases, /data-case="deepfood"/)
  })

  it('leaves LessonCardArt, display settings, playback, SoftMotion, and the api count alone', () => {
    const art = read('src/components/game/LessonCardArt.tsx')
    assert.match(art, /key=\{image\}/)
    assert.equal(art.includes('loading='), false)
    assert.match(art, /if \(!image \|\| failed\) return null/)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)

    const header = read('src/components/Header.tsx')
    const trigger = header.slice(header.indexOf('data-sen-trigger'), header.indexOf('<QuestGearButton'))
    assert.match(trigger, /data-testid="map1-display-settings-label"/)
    assert.equal(trigger.includes('遊戲設定'), false)
    assert.match(header, /QuestGearButton/)
    const hant = messages('src/i18n/zh-Hant.json')
    assert.equal(hant['header.senModes'], '顯示設定')
    assert.equal(hant['ach.gameSettings'], '遊戲設定')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.match(read('src/game/softMotion.ts'), /SOUND_MOTION_DEFAULT = false/)
    assert.equal(read('src/components/game/LessonWorksheet.tsx').includes('softMotion'), false)
    assert.equal(read('src/game/lessonWorksheet.ts').includes('youtube.com'), false)
    assert.match(read('src/game/communityCases.ts'), /OVERVIEW_VIDEO_ID = 'hR9X0Ce2r9o'/)
    assert.equal(read('src/game/communityCases.ts').includes('HILL_VIDEO_ID = null'), true)
  })
})
