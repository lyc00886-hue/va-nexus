import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { TRIAL_LOCALE_KEYS, showsShortTrial } from './shortTrial.ts'
import {
  FORM4_NEW_KEYS,
  WORKSHEET_HIDDEN_KEYS,
  WORKSHEET_LOCALE_KEYS,
  WORKSHEET_QUESTION_KEYS,
  WORKSHEET_SAMPLE_LABEL,
  WORKSHEET_UNUSED_QUESTION_KEY,
  worksheetCaseLines,
  worksheetDownloadFor,
  worksheetDownloadHtml,
  worksheetDownloadName,
  worksheetLessonOf,
  worksheetPaperBackground,
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
  'worksheet.l3.title': '社區藝術：連接回憶與環境——研究 · 課堂活動紙',
  'worksheet.l4.title': '社區藝術：連接回憶與環境——發展同創作 · 課堂活動紙',
  'worksheet.intro': '呢張係課堂活動紙，跟住呢課嘅三題：案例評賞、觀察、工作簿或三句講解。',
  'worksheet.sampleNote': '以下係示例，唔係真實同學或真實學校。',
  'worksheet.noSchool': '呢張活動紙唔顯示校名、校徽或教師姓名。',
  'worksheet.section.case': '過往案例參考',
  'worksheet.section.questions': '三題課業',
  'worksheet.l3.q1': '評賞陳思光用村內陶土做嘅陶瓷（川龍泥土陶杯／村內陶土作品）。寫陶土同村落、地方同人嘅關係。唔使只抄主辦、策劃或日期。',
  'worksheet.l3.q2': '由課室、食堂、校門、返學路或記憶揀一件同社區有關嘅細節，寫你嘅觀察：你見到咩？點解同社區有關？',
  'worksheet.l3.q3': '用三句講你點樣由呢件同社區有關嘅細節，連去「邂逅！山 川 人」嘅評賞焦點。',
  'worksheet.l3.q4': '寫你嘅觀察。提示：先寫你喺課室材料見到嘅細節，再寫佢點樣同社區有關。',
  'worksheet.l4.q1': '評賞深食「喚味：\u{1D465}」。寫食物、地方、人，同「喚味」邀請點樣呈現。只作課堂播放，唔下載、上載或轉載。',
  'worksheet.l4.q2': '由課室、食堂、校門、返學路或記憶揀一件同社區有關嘅細節，寫佢點樣可以變成試驗物料嘅主題。',
  'worksheet.l4.q3': '用三句講你點樣試驗物料：主題、做法、想觀眾感受到咩。之後按簡短準則寫一句自評，或請同學寫一句。',
  'trial.title': '試驗物料',
  'trial.when': '以 11 月 26 日課堂現場為主，十至十五分鐘。',
  'trial.do': '用紙、筆、黏土或其他課堂物料試一次。產品只支援試驗物料同三句講解。',
  'trial.trace.label': '工作簿',
  'trial.trace.hint': '寫你試咗咩物料、改過咩、點解咁改。',
  'trial.talk.label': '三句講解',
  'trial.disclaimer': '應用科技唔可以取代真實環境嘅藝術學習。呢度只係試驗物料同三句講解。',
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
    assert.equal(hant['worksheet.intro'].includes('工作簿'), true)
    assert.equal(hant['worksheet.intro'].includes('唔係功課'), false)
    assert.equal(en['worksheet.intro'].includes('research workbook'), true)
    assert.equal(en['worksheet.intro'].includes('not homework'), false)
    assert.equal(hant['worksheet.l3.title'], '社區藝術：連接回憶與環境——研究 · 課堂活動紙')
    assert.equal(hant['worksheet.l4.title'], '社區藝術：連接回憶與環境——發展同創作 · 課堂活動紙')
    assert.equal(en['worksheet.l3.title'], 'Community Art: Connecting Memory and Environment — Research · classroom activity paper')
    assert.equal(en['worksheet.l4.title'], 'Community Art: Connecting Memory and Environment — Develop and make · classroom activity paper')
    assert.equal(hans['worksheet.l3.title'], '社区艺术：连接回忆与环境——研究 · 课堂活动纸')
    assert.equal(hans['worksheet.l4.title'], '社区艺术：连接回忆与环境——发展与创作 · 课堂活动纸')
    assert.equal(FORM4_NEW_KEYS.length, 40)
    for (const key of FORM4_NEW_KEYS) {
      assert.equal(/[\u7684\u628A\u5572\u754C]/.test(hant[key]), false, key)
      assert.equal(en[key].length > 0, true, key)
      assert.equal(hans[key], overrides[key], key)
      assert.equal(BANNED.test(hant[key]), false, key)
      assert.equal(BANNED.test(en[key]), false, key)
      assert.equal(BANNED.test(hans[key]), false, key)
    }
  })

  it('follows L3 questions with case A and L4 questions with case B', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const text = (key: string) => hant[key] ?? key
    assert.equal(worksheetLessonOf('F4-U3-L3'), 'F4-U3-L3')
    assert.equal(worksheetLessonOf('F4-U3-L4'), 'F4-U3-L4')
    assert.equal(worksheetLessonOf('F4-U2-L3'), null)
    assert.equal(worksheetLessonOf('F4-U3-L1'), null)

    assert.deepEqual(worksheetQuestions('F4-U3-L3', text), [
      hant['worksheet.l3.prompt'],
      hant['worksheet.l3.case1.q'],
      hant['worksheet.l3.case2.q'],
      hant['worksheet.l3.compare'],
      hant['worksheet.l3.notice'],
    ])
    assert.equal(worksheetQuestions('F4-U3-L3', text).includes(hant[WORKSHEET_UNUSED_QUESTION_KEY]), false)
    assert.equal(worksheetQuestions('F4-U3-L3', text).includes(hant['worksheet.l3.q1']), false)
    assert.deepEqual([...WORKSHEET_QUESTION_KEYS['F4-U3-L4']], [
      'worksheet.l4.sketch',
      'worksheet.l4.reflect',
      'worksheet.l4.diary',
      'worksheet.l4.compare',
      'worksheet.l4.further',
    ])
    assert.equal(WORKSHEET_QUESTION_KEYS['F4-U3-L3'].includes(WORKSHEET_UNUSED_QUESTION_KEY), false)
    for (const key of WORKSHEET_HIDDEN_KEYS) {
      assert.equal(worksheetQuestions('F4-U3-L3', text).includes(hant[key]), false, key)
      assert.equal(worksheetQuestions('F4-U3-L4', text).includes(hant[key]), false, key)
    }

    const teacherL3 = worksheetCaseLines('F4-U3-L3', 'teacher', text)
    const studentL3 = worksheetCaseLines('F4-U3-L3', 'student', text)
    assert.deepEqual(studentL3, teacherL3)
    const l3Case = teacherL3.join('\n')
    assert.equal(l3Case.includes('邂逅！山 川 人'), true)
    assert.equal(l3Case.includes('《新新相續》'), true)
    assert.equal(l3Case.includes('「川龍杯」'), true)
    assert.equal(l3Case.includes('深食在祖堯'), true)
    assert.equal(l3Case.includes('《漁嚐夢遊》'), true)
    assert.equal(l3Case.includes('100 Spices, 100 Lives of Cho Yiu'), true)
    assert.equal(l3Case.includes('Art of Dumplings'), true)
    assert.equal(l3Case.includes('Community Interactive Theater'), true)
    assert.equal(l3Case.includes('Recipe Publication (2024)'), true)
    assert.equal(l3Case.includes('喚味'), false)
    assert.equal(l3Case.includes('油街實現'), false)
    assert.equal(l3Case.includes('油街廚房'), false)
    assert.equal(l3Case.includes('1.6.2023–12.3.2024'), false)
    assert.deepEqual(worksheetCaseLines('F4-U3-L4', 'teacher', text), [])
    assert.deepEqual(worksheetCaseLines('F4-U3-L4', 'student', text), [])
    assert.equal(hant['case.hill.title'], '邂逅！山 川 人')
    assert.equal(hant['case.deepfood.project'], '喚味：\u{1D465}')
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
    assert.equal(worksheetPaperBackground('F4-U3-L3'), '#FFFFFF')
    assert.equal(worksheetPaperBackground('F4-U3-L4'), '#FFFFFF')
    const file = worksheetDownloadFor('F4-U3-L3', 'zh-Hant-HK', text).html
    assert.equal(file.includes(WORKSHEET_SAMPLE_LABEL), false)
    assert.equal(file.includes('示例同學甲'), false)
    assert.equal(file.includes('邂逅！山 川 人'), true)
    assert.equal(file.includes('《新新相續》'), true)
    assert.equal(file.includes('「川龍杯」'), true)
    assert.equal(file.includes('深食在祖堯'), true)
    assert.equal(file.includes('《漁嚐夢遊》'), true)
    assert.equal(file.includes(hant['worksheet.l3.intro']), true)
    assert.equal(file.includes(hant['worksheet.intro']), false)
    assert.equal(file.includes(HANT['worksheet.l3.q1']), false)
    assert.equal(file.includes(hant[WORKSHEET_UNUSED_QUESTION_KEY]), false)
    assert.equal(file.includes('worksheet.l3.q4'), false)
    assert.equal(file.includes('喚味'), false)
    assert.equal(file.includes('油街實現'), false)
    assert.equal(file.includes('油街廚房'), false)
    assert.equal(file.includes('1.6.2023–12.3.2024'), false)
    assert.equal(file.includes('<img'), false)
    assert.equal(file.includes('background: #FFFFFF'), true)
    assert.equal(file.includes('#FFF9E9'), false)
    assert.equal(file.includes('#0D9488'), true)
    const downloaded = worksheetDownloadFor('F4-U3-L3', 'zh-Hant-HK', text)
    assert.equal(downloaded.name, 'classroom-activity-F4-U3-L3.html')
    assert.equal(downloaded.html.includes('background: #FFFFFF'), true)
    assert.equal(downloaded.html.includes('#FFF9E9'), false)
    assert.equal(worksheetDownloadName('F4-U3-L4'), 'classroom-activity-F4-U3-L4.html')
    const l4 = worksheetDownloadFor('F4-U3-L4', 'zh-Hant-HK', text).html
    assert.equal(l4.includes(hant['worksheet.l4.intro']), true)
    assert.equal(l4.includes(hant['worksheet.l4.sketch']), true)
    assert.equal(l4.includes('成功標準'), true)
    assert.equal(l4.includes('在地性、參與、意圖、地方感'), true)
    assert.equal(l4.includes('150 至 200'), true)
    assert.equal(l4.includes('視覺日記'), true)
    assert.equal(l4.includes('SBA'), true)
    assert.equal(l4.includes(hant['worksheet.intro']), false)
    assert.equal(l4.includes(HANT['worksheet.l4.q1']), false)
    assert.equal(l4.includes('\u{1D465}'), false)
    assert.equal(l4.includes('喚味'), false)
    assert.equal(l4.includes('油街實現'), false)
    assert.equal(l4.includes('油街廚房'), false)
    assert.equal(l4.includes('1.6.2023–12.3.2024'), false)
    assert.equal(l4.includes('《新新相續》'), false)
    assert.equal(l4.includes('<img'), false)
    assert.equal(l4.includes(WORKSHEET_SAMPLE_LABEL), false)
    assert.equal(l4.includes('background: #FFFFFF'), true)
    assert.equal(l4.includes('#FFF9E9'), false)
    const l4Download = worksheetDownloadFor('F4-U3-L4', 'zh-Hant-HK', text)
    assert.equal(l4Download.name, 'classroom-activity-F4-U3-L4.html')
    assert.equal(l4Download.html.includes('background: #FFFFFF'), true)
    assert.equal(l4Download.html.includes('#FFF9E9'), false)
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
    assert.match(view, /worksheetDownloadFor/)
    assert.match(view, /heritage \? 'bg-\[#FFF9E9\]' : 'bg-\[#FFFFFF\]'/)
    assert.match(view, /border-2 border-\[#0D9488\] bg-\[#FFFFFF\]/)
    const printCss = read('src/index.css').slice(read('src/index.css').indexOf('@media print'))
    assert.match(printCss, /\[data-worksheet-paper\] \{\s*background: #fff9e9 !important;/)
    assert.match(printCss, /\[data-lesson-worksheet='F4-U3-L3'\] \[data-worksheet-paper\]/)
    assert.match(printCss, /\[data-lesson-worksheet='F4-U3-L4'\] \[data-worksheet-paper\]/)
    assert.match(printCss, /\[data-lesson-worksheet='F4-U3-L3'\] \[data-worksheet-case\]/)
    assert.match(printCss, /\[data-lesson-worksheet='F4-U3-L4'\] \[data-worksheet-case\]/)
    assert.match(printCss, /background: #FFFFFF !important;/)
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
    assert.equal(view.includes('worksheet.l3.q1'), false)
    assert.equal(view.includes("t('worksheet.intro')"), false)
    assert.equal(view.includes('worksheetForm4Sections'), true)
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
    assert.equal(hant['visual.trial'], '試驗物料可以試物料同質感，再用對比、強調或重複去組織你見到、同社區有關嘅細節。')
  })

  it('gives the Form 5 heritage lessons one unit paper without the November case', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const text = (key: string) => hant[key] ?? key
    for (const id of ['F5-U3-L1', 'F5-U3-L2', 'F5-U3-L3', 'F5-U3-L4']) {
      assert.equal(worksheetLessonOf(id), id)
      assert.equal(worksheetShowsSample(id as 'F5-U3-L1', 'teacher', 'preview'), false)
    }
    assert.equal(worksheetLessonOf('F4-U3-L1'), null)
    assert.deepEqual(worksheetQuestions('F5-U3-L2', text), [
      hant['worksheet.f5.q1'],
      hant['worksheet.f5.q2'],
      hant['worksheet.f5.q3'],
      hant['worksheet.f5.q4'],
    ])
    assert.deepEqual(worksheetCaseLines('F5-U3-L4', 'teacher', text), [])
    const file = worksheetDownloadHtml({
      lang: 'zh-Hant-HK',
      title: hant['worksheet.f5.title'],
      intro: hant['worksheet.f5.intro'],
      noSchool: hant['worksheet.noSchool'],
      caseHeading: hant['worksheet.section.case'],
      caseLines: [],
      questionsHeading: hant['worksheet.f5.section.tasks'],
      questions: worksheetQuestions('F5-U3-L1', text),
      background: worksheetPaperBackground('F5-U3-L1'),
    })
    assert.equal(worksheetPaperBackground('F5-U3-L1'), '#FFF9E9')
    assert.equal(worksheetPaperBackground('F5-U3-L4'), '#FFF9E9')
    assert.equal(file.includes('唔係功課'), true)
    assert.equal(file.includes(hant['worksheet.noSchool']), true)
    assert.equal(file.includes('視覺日記'), true)
    assert.equal(file.includes('方法比較'), true)
    assert.equal(file.includes('邂逅'), false)
    assert.equal(file.includes('深食'), false)
    assert.equal(file.includes('background: #FFF9E9'), true)
    assert.equal(file.includes('#FFFFFF'), false)
    assert.equal(file.includes('#0D9488'), true)
    const downloaded = worksheetDownloadFor('F5-U3-L1', 'zh-Hant-HK', text)
    assert.equal(downloaded.html.includes('background: #FFF9E9'), true)
    assert.equal(downloaded.html.includes('#FFFFFF'), false)
    assert.equal(worksheetDownloadName('F5-U3-L3'), 'classroom-activity-F5-U3-HERITAGE.html')
    assert.equal(/[\u7684\u628A\u5572\u4F86\u6765\u771E]/.test(hant['worksheet.f5.q1']), false)
    assert.equal(hant['worksheet.f5.q1'].codePointAt(hant['worksheet.f5.q1'].indexOf('揀')), 0x63c0)
  })

  it('leaves LessonCardArt, display settings, playback, SoftMotion, and the api count alone', () => {
    const art = read('src/components/game/LessonCardArt.tsx')
    assert.match(art, /key=\{image\}/)
    assert.equal(art.includes('loading='), false)
    assert.match(art, /if \(!image \|\| failed\) return null/)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 12)

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
    assert.equal(read('src/game/communityCases.ts').includes("HILL_VIDEO_ID = 'J-VketvKEX4'"), true)
    assert.equal(read('src/game/communityCases.ts').includes('HILL_VIDEO_ID = null'), false)
  })
})
