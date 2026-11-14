import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { TRIAL_LOCALE_KEYS, showsShortTrial } from './shortTrial.ts'
import {
  WORKSHEET_LOCALE_KEYS,
  WORKSHEET_QUESTION_KEYS,
  WORKSHEET_SAMPLE_LABEL,
  WORKSHEET_UNUSED_QUESTION_KEY,
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
  'worksheet.intro': '呢張係課堂活動紙，跟住呢課嘅三題課業：案例評賞、近身洞察、過程留痕或三句講解。唔係功課。',
  'worksheet.sampleNote': '以下係示例，唔係真實同學或真實學校。',
  'worksheet.noSchool': '呢張活動紙唔顯示校名、校徽或教師姓名。',
  'worksheet.section.case': '過往案例參考',
  'worksheet.section.questions': '三題課業',
  'worksheet.l3.q1': '評賞陳思光用村內陶土做嘅陶瓷（川龍泥土陶杯／村內陶土作品）。寫陶土同村落、地方同人嘅關係。唔使只抄主辦、策劃或日期。',
  'worksheet.l3.q2': '由課室、食堂、校門、返學路或記憶揀一件近身細節，寫一個洞察：你見到咩？點解同社區有關？',
  'worksheet.l3.q3': '用三句講你點樣由呢件近身細節，連去「邂逅！山 川 人」嘅評賞焦點。',
  'worksheet.l3.q4': '寫一個洞察。提示：先寫你喺課室材料見到嘅細節，再寫佢點樣同社區有關。',
  'worksheet.l4.q1': '評賞深食「喚味：\u{1D465}」。寫食物、地方、人，同「喚味」邀請點樣呈現。只作課堂播放，唔下載、上載或轉載。',
  'worksheet.l4.q2': '由課室、食堂、校門、返學路或記憶揀一件近身細節，寫佢點樣可以變成課堂短試驗嘅主題。',
  'worksheet.l4.q3': '用三句講呢次短試驗：主題、做法、想觀眾感受到咩。之後按簡短準則寫一句自評，或請同學寫一句。',
  'trial.title': '課堂短試驗',
  'trial.when': '以 11 月 26 日課堂現場為主，十至十五分鐘。',
  'trial.do': '用紙、筆、黏土或其他課堂物料試一次。產品只支援短試驗同講解留痕。',
  'trial.trace.label': '過程留痕',
  'trial.trace.hint': '寫你試咗咩物料、改過咩、點解咁改。',
  'trial.talk.label': '三句講解留痕',
  'trial.disclaimer': '科技唔可以取代物料試驗。呢度只係短試驗同講解留痕。',
  'trial.noUpload': '唔上載作品，亦唔自動評分。',
} as const

const THIN_HANT_KEYS = [
  'worksheet.intro',
  'worksheet.section.questions',
  'worksheet.l3.q1',
  'worksheet.l3.q2',
  'worksheet.l3.q3',
  'worksheet.l4.q1',
  'worksheet.l4.q2',
  'worksheet.l4.q3',
  ...TRIAL_LOCALE_KEYS,
] as const

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
    assert.equal(hant['worksheet.l3.q4'].includes('\u8AB2\u5BA4'), true)
    assert.equal(hant['worksheet.l3.q4'].includes('課堂'), false)
    assert.equal(hant['worksheet.l3.q4'].includes('\u55BA'), true)
    assert.equal(hant['worksheet.l3.q4'].includes('\u5605'), true)
    assert.equal(hant['worksheet.l4.q1'].includes('\u{1D465}'), true)
    assert.equal(hant['worksheet.l4.q1'].includes('x'), false)
    assert.equal(hant['worksheet.l4.q1'].includes('X'), false)
    assert.equal(en['worksheet.l4.q1'].includes('\u{1D465}'), true)
    assert.equal(hans['worksheet.l4.q1'].includes('\u{1D465}'), true)
    assert.equal(hant['worksheet.l3.q3'].codePointAt(hant['worksheet.l3.q3'].indexOf('邂')), 0x9082)
    assert.equal([...hant['worksheet.l3.q3']].some((ch) => ch.codePointAt(0) === 0x9005), true)
    assert.equal(hant['worksheet.l3.q2'].codePointAt(hant['worksheet.l3.q2'].indexOf('揀')), 0x63c0)
    assert.equal(hant['worksheet.l4.q2'].codePointAt(hant['worksheet.l4.q2'].indexOf('揀')), 0x63c0)
    assert.equal(hant['worksheet.l3.q2'].includes('\u8AB2\u5BA4'), true)
    assert.equal(hant['worksheet.l4.q2'].includes('\u8AB2\u5BA4'), true)
    assert.equal(hant['worksheet.l3.q2'].codePointAt(hant['worksheet.l3.q2'].indexOf('咩')), 0x54a9)
    assert.equal(hant['worksheet.l4.q3'].codePointAt(hant['worksheet.l4.q3'].indexOf('咩')), 0x54a9)
    assert.equal(hant['trial.trace.hint'].codePointAt(hant['trial.trace.hint'].indexOf('咗')), 0x5497)
    assert.equal(hant['trial.trace.hint'].codePointAt(hant['trial.trace.hint'].indexOf('咩')), 0x54a9)
    for (const key of THIN_HANT_KEYS) {
      assert.equal(/[\u7684\u628A\u5572]/.test(hant[key]), false, key)
    }
    assert.deepEqual(
      Object.keys(hant).filter((key) => key.startsWith('trial.')),
      [...TRIAL_LOCALE_KEYS],
    )
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
    ])
    assert.equal(worksheetQuestions('F4-U3-L3', text).includes(hant[WORKSHEET_UNUSED_QUESTION_KEY]), false)
    assert.equal(worksheetQuestions('F4-U3-L3', text).length, 3)
    assert.deepEqual(worksheetQuestions('F4-U3-L4', text), [
      HANT['worksheet.l4.q1'],
      HANT['worksheet.l4.q2'],
      HANT['worksheet.l4.q3'],
    ])
    assert.deepEqual([...WORKSHEET_QUESTION_KEYS['F4-U3-L3']], [
      'worksheet.l3.q1',
      'worksheet.l3.q2',
      'worksheet.l3.q3',
    ])
    assert.equal(WORKSHEET_QUESTION_KEYS['F4-U3-L3'].includes(WORKSHEET_UNUSED_QUESTION_KEY), false)

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
    assert.equal(file.includes(hant[WORKSHEET_UNUSED_QUESTION_KEY]), false)
    assert.equal(file.includes('worksheet.l3.q4'), false)
    assert.equal(file.split('<li>').length - 1, 3)
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
    assert.equal(view.includes('worksheet.l3.q4'), false)
    assert.equal(view.includes('<input'), false)
    assert.equal(/type="radio"|type="checkbox"|<select/.test(view), false)
  })

  it('shows three tasks on the papers and short-trial traces beside the L4 making criteria', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const view = read('src/components/game/LessonWorksheet.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    const trial = read('src/components/game/LessonShortTrial.tsx')
    assert.equal(view.includes('worksheet.l3.q4'), false)
    assert.equal(view.includes(hant['worksheet.l3.q4']), false)
    assert.match(view, /worksheetQuestions/)
    assert.match(player, /<LessonCardCriteria lessonId=\{lesson\.id\} index=\{index\} \/>\s*<LessonShortTrial lessonId=\{lesson\.id\} index=\{index\} \/>/)
    assert.match(player, /<LessonCardCriteria lessonId=\{lessonId\} index=\{cardIdx\} \/>\s*<LessonShortTrial lessonId=\{lessonId\} index=\{cardIdx\} \/>/)
    for (const key of TRIAL_LOCALE_KEYS) assert.match(trial, new RegExp(key.replaceAll('.', '\\.')))
    assert.match(trial, /data-short-trial/)
    assert.match(trial, /data-trial-trace/)
    assert.match(trial, /data-trial-talk/)
    assert.match(trial, /data-trial-disclaimer/)
    assert.match(trial, /data-trial-no-upload/)
    assert.match(trial, /#FFF9E9/)
    assert.match(trial, /#0D9488/)
    assert.equal(trial.includes('type="file"'), false)
    assert.equal(trial.includes('fetch('), false)
    assert.equal(trial.includes('/api/'), false)
    assert.match(trial, /trial\.noUpload/)
    assert.equal(/\bscore\b|autoGrade|setScore/.test(trial), false)
    assert.equal(showsShortTrial('F4-U3-L4', 0), true)
    assert.equal(showsShortTrial('F4-U3-L4', 3), false)
    assert.equal(showsShortTrial('F4-U3-L3', 0), false)
    assert.equal(showsShortTrial('F4-U3-L3', 3), false)
    const criteria = read('src/components/game/CommunityCases.tsx')
    const criteriaFn = criteria.slice(criteria.indexOf('function LessonCardCriteria'))
    assert.equal(criteriaFn.includes('trial.'), false)
    assert.equal(hant['visual.trial'], '短試驗可以試物料同質感，再用對比、強調或重複去組織你見到嘅近身細節。')
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
