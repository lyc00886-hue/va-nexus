import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { DEMO_ASSIGN_ID } from './assignList.ts'
import { DEMO_CLASS_ID } from './classList.ts'
import {
  HW_FILE_BYTES,
  HW_LEARNER_ID,
  HW_LIST_KEY,
  demoHomework,
  emptyHomework,
  fileFollowKind,
  homeworkCounts,
  mergeClassShellMarks,
  homeworkFileError,
  homeworkFileLabel,
  homeworkPlateMatch,
  homeworkRosterIds,
  homeworkRows,
  inSchoolMarkForStudent,
  rememberHomeworkFile,
  sanitizeHomework,
  sanitizeTeacherMarks,
  withHomeworkSubmission,
  withTeacherMark,
} from './homeworkSubmit.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
  'hw.staff.title': '學生上載功課系統',
  'hw.staff.navShort': '上載功課',
  'hw.staff.intro': '睇呢份功課邊位已交、邊位未交。已交嘅檔，呢個課室嘅老師可以打開嚟睇。',
  'hw.staff.count': '已交 2／3',
  'hw.staff.missingCount': '未交 1',
  'hw.staff.openFile': '打開已交檔',
  'hw.staff.backToList': '返回名單',
  'hw.staff.fileNote': '呢份係同學交嚟嘅功課檔，只供呢個課室嘅老師查看。',
  'hw.staff.notMarking': '呢度可以打開已交檔，可以查看同調整自動評分，亦唔會改寫已有校內評級體系。',
  'hw.staff.criteriaTitle': '評分準則（校內參考）',
  'hw.staff.criteriaBody': '跟已有課業說明、課堂活動紙同教育局指引方向：觀察同資料係咪具體；工作簿有冇寫低發展；作品同工作簿係咪一次過交齊，並且對得上呢次課業要求。呢次只係校內參考，唔係公開試級別。',
  'hw.staff.autoGradeLabel': '自動評分（校內參考）',
  'hw.staff.autoGradeValue': '成份檔已交。觀察仍然可以再寫清楚；工作簿大致齊。',
  'hw.staff.adjustLabel': '教師調整',
  'hw.staff.adjustHint': '調整後嘅教師評分先算校內用嘅結果。',
  'hw.staff.teacherGradeLabel': '教師評分',
  'hw.staff.teacherGradeValue': '工作簿齊，觀察要再寫清楚。呢次課業校內參考結果以呢句為準。',
  'hw.staff.saveGrade': '確認呢次評分',
  'hw.staff.genericFile': 'VA 功課作品及工作簿.pdf',
  'hw.staff.viewTitle': '已交功課檔',
  'hw.staff.pagesHint': '示意完整檔，唔只係封面。',
  'hw.staff.homeworkChip': '功課未交',
  'hw.staff.homeworkDoneChip': '功課已交',
  'hw.staff.compareTitle': '藝術評賞比較',
  'hw.staff.reviewPairIntro': '將已交作品同已核實對比作品並排睇，覆核學生評賞。',
  'hw.staff.submittedWork': '已交作品',
  'hw.staff.compareWork': '已核實對比作品',
  'hw.staff.pickCompare': '揀對比作品',
  'hw.staff.pickCompareHint': '只可以揀已核實 Public Domain 或 CC0，並且出處係 The Met、Art Institute of Chicago、Rijksmuseum、或 Wikimedia Commons 嘅作品。若呢課係評學生自己作品，先可以用校本學生作品。',
  'hw.staff.studentCritique': '學生評賞',
  'hw.staff.studentCritiqueValue': '春天早晨花園園徑同樹葉光都寫得清楚。冬天午後同一座花園，行人較密、天色偏灰。兩幅都由高處記錄環境，適合做觀察課題。',
  'hw.staff.autoCommentLabel': '自動評語',
  'hw.staff.autoCommentValue': '已交作品同評賞已交。春天同冬天兩幅花園觀察大致寫到，光同人流仍然可以再寫清楚。',
  'hw.staff.editComment': '改評語',
  'hw.staff.replaceComment': '換評語',
  'hw.staff.commentHint': '改或換之後，同一份報告路徑會見到新評語。自動評分、教師調整同確認評分仍然照舊。',
  'hw.staff.teacherCommentLabel': '教師評語',
  'hw.staff.teacherCommentValue': '評賞已寫到同一座花園喺春天早晨同冬天午後嘅分別。園徑、樹葉同行人都可以再寫清楚。',
  'hw.student.title': '要交嘅功課',
  'hw.student.systemName': '學生上載功課系統',
  'hw.student.intro': '以下係老師出畀呢個課室嘅功課。請一次過交齊作品同工作簿成份檔。',
  'hw.student.privateNote': '呢次係老師出嘅功課，唔會入私人作品集或 SBA 實驗室。',
  'hw.student.upload': '上載成份檔',
  'hw.student.submit': '交功課',
  'hw.student.uploadAndHandIn': '上載同交功課',
  'hw.student.handedQuiet': '已經交咗。呢個課室嘅老師可以打開嚟睇；而家等老師睇。',
  'hw.student.wholeFile': '請一次過交齊成份檔，唔好只交封面。',
  'hw.student.teacherCanOpen': '交咗之後，呢個課室嘅老師可以打開嚟睇。',
  'hw.student.empty': '而家未有要交嘅功課。',
  'hw.student.emptyHint': '老師發布功課之後，就會出現喺呢度。作品集同 SBA 實驗室仍然照舊。',
  'hw.student.due': '截止日期',
  'hw.student.mapEntry': '由學習地圖入嚟睇要交嘅功課。底欄唔另加分頁。',
  'hw.student.downloadL3': '下載研究活動紙',
  'hw.student.downloadL4': '下載發展同創作活動紙',
  'hw.student.downloadF5Paper': '下載本單元活動紙',
  'hw.student.downloadF5Instructions': '下載功課說明',
  'hw.staff.autoGradeValue.f4': '已跟呢份已交成份檔睇過。作品同工作簿已交；同社區有關嘅觀察仲可以再寫清楚。呢次只係校內參考。',
  'hw.staff.autoGradeValue.f5': '已跟呢份已交成份檔睇過。視覺日記頁同水墨試驗記錄已交；自我、傳統同社會嘅觀察仲可以再寫清楚。呢次只係校內參考。',
  'hw.staff.teacherGradeValue.f4': '已留低：作品同工作簿齊，同社區有關嘅觀察要再寫清楚。呢次課業校內參考結果以呢句為準。',
  'hw.staff.teacherGradeValue.f5': '已留低：視覺日記頁同水墨試驗記錄已交，自我、傳統同社會嘅觀察要再寫清楚。呢次課業校內參考結果以呢句為準。',
  'hw.staff.gradeSaved': '已留低呢次教師評分。呢個課室睇得到。',
  'hw.staff.reconfirmHint': '改咗之後，請再確認先至留低。',
  'hw.staff.gradeSavedChip': '評分已留低',
  'hw.staff.waitingConfirmChip': '等確認',
} as Record<string, string>

const CLASS_HANT = {
  'class.staff.title': '課堂管理',
  'class.staff.intro': '喺呢度睇你負責嘅課室，同每位同學而家嘅交功課狀況。呢度係工作列表，唔排名。',
  'class.staff.listTitle': '課室名單',
  'class.staff.demoClass': '中四示例班',
  'class.staff.demoClassNote': '以下係示例課室，唔係真實學校名單。',
  'class.staff.studentCount': '3 位示例同學',
  'class.staff.openClass': '打開課室',
  'class.staff.addClass': '加入課室',
  'class.staff.empty': '暫時未有課室。加入課室名稱之後，先可以出功課同睇名單。',
  'class.staff.overviewHint': '打開課室之後，會見到課室總覽，可以跟住出功課同睇交功課狀況。',
  'class.staff.keepOverview': '課室總覽仍然喺課堂管理入面，唔另外再開一個總覽。',
  'class.staff.deniedLead': '若未以教師或科主任身分進入，會見到以下提示。',
} as Record<string, string>

const ASSIGN_HANT = {
  'assign.staff.title': '出功課',
  'assign.staff.intro': '為呢個課室發布功課。可以寫名稱、截止日期、簡短說明，同埋附上已有活動紙。',
  'assign.staff.fieldTitle': '功課名稱',
  'assign.staff.fieldDue': '截止日期',
  'assign.staff.fieldInstructions': '簡短說明',
  'assign.staff.fieldAttach': '附上已有活動紙（可選）',
  'assign.staff.attachNone': '唔附活動紙',
  'assign.staff.attachPaper': '十一月：走進社區——研究 活動紙',
  'assign.staff.publish': '發布功課',
  'assign.staff.published': '已發布功課',
  'assign.staff.demoTitle': '十一月：走進社區觀察課業',
  'assign.staff.demoDue': '2026年11月28日',
  'assign.staff.demoInstructions': '請將作品同工作簿一次過交成份檔。可以一齊睇已附上嘅課堂活動紙。',
  'assign.staff.noGenerator': '呢度只發布功課畀呢個課室，唔會自動寫課堂計劃。',
  'assign.staff.openList': '睇已發布名單',
  'assign.staff.classLabel': '發布畀',
} as Record<string, string>

const API_FILES = [
  'crop-ask.test.ts',
  'crop-ask.ts',
  'feedback.high-demand.test.ts',
  'feedback.locale.test.ts',
  'feedback.sba.test.ts',
  'feedback.ts',
  'feedback.usage.test.ts',
  'formative-comment.test.ts',
  'formative-comment.ts',
  'socratic.test.ts',
  'socraticBank.ts',
]

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|RELAY|課游記|课游记|课游記|keyouji|raiders/

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

function countChar(value: string, char: string): number {
  return [...value].filter((item) => item === char).length
}

describe('homework submissions', () => {
  it('seeds two of three sample submissions for the sample class only', () => {
    const demo = demoHomework()
    assert.equal(HW_LIST_KEY, 'va-nexus:hw-submissions:v1')
    assert.equal(demo.submissions.length, 2)
    assert.deepEqual(
      demo.submissions.map((row) => row.studentId),
      ['demo-a', 'demo-b'],
    )
    assert.equal(demo.submissions.every((row) => row.classId === DEMO_CLASS_ID && row.assignmentId === DEMO_ASSIGN_ID && row.demo), true)
    const roster = homeworkRosterIds(DEMO_CLASS_ID, true)
    assert.deepEqual(roster, ['demo-a', 'demo-b', 'demo-c'])
    assert.equal(HW_LEARNER_ID, 'demo-c')
    const rows = homeworkRows(demo, DEMO_CLASS_ID, DEMO_ASSIGN_ID, roster)
    const counts = homeworkCounts(rows)
    assert.deepEqual(counts, { submitted: 2, missing: 1, total: 3 })
    assert.equal(homeworkPlateMatch(counts), true)
    assert.equal(rows[2].status, 'missing')
    assert.equal(homeworkFileLabel(demo.submissions[0], 'VA homework artwork and workbook.pdf'), 'VA homework artwork and workbook.pdf')
    assert.equal(homeworkRosterIds('class-other', false).length, 0)
    assert.equal(homeworkRows(demo, 'class-other', DEMO_ASSIGN_ID, homeworkRosterIds('class-other', false)).length, 0)
    assert.equal(emptyHomework().submissions.length, 0)
  })

  it('records one complete file for the missing classmate and leaves other classes alone', () => {
    const demo = demoHomework()
    const handed = withHomeworkSubmission(demo, {
      classId: DEMO_CLASS_ID,
      assignmentId: DEMO_ASSIGN_ID,
      studentId: HW_LEARNER_ID,
      fileName: '  packet.pdf  ',
    })
    assert.notEqual(handed, demo)
    assert.equal(demo.submissions.length, 2)
    const counts = homeworkCounts(homeworkRows(handed, DEMO_CLASS_ID, DEMO_ASSIGN_ID, homeworkRosterIds(DEMO_CLASS_ID, true)))
    assert.deepEqual(counts, { submitted: 3, missing: 0, total: 3 })
    assert.equal(homeworkPlateMatch(counts), false)
    assert.equal(handed.submissions.length, 3)
    assert.equal(handed.submissions[2].fileName, 'packet.pdf')
    assert.equal(handed.submissions[2].demo, false)
    const elsewhere = withHomeworkSubmission(demo, {
      classId: 'class-other',
      assignmentId: 'assign-other',
      studentId: 'pupil',
      fileName: 'other.pdf',
    })
    assert.equal(homeworkRows(elsewhere, DEMO_CLASS_ID, DEMO_ASSIGN_ID, homeworkRosterIds(DEMO_CLASS_ID, true)).filter((row) => row.status === 'submitted').length, 2)
    assert.equal(withHomeworkSubmission(demo, { classId: DEMO_CLASS_ID, assignmentId: DEMO_ASSIGN_ID, studentId: HW_LEARNER_ID, fileName: '   ' }), demo)
    assert.equal(homeworkFileError({ name: 'notes.txt', type: 'text/plain', size: 20 }), 'type')
    assert.equal(homeworkFileError({ name: 'big.pdf', type: 'application/pdf', size: HW_FILE_BYTES + 1 }), 'size')
    assert.equal(homeworkFileError({ name: 'empty.pdf', type: 'application/pdf', size: 0 }), 'size')
    assert.equal(homeworkFileError({ name: 'work.pdf', type: 'application/pdf', size: 120 }), null)
    assert.equal(homeworkFileError({ name: 'scan.png', type: 'image/png', size: 120 }), null)
    rememberHomeworkFile('hw-demo-c', new File(['page'], 'work.pdf', { type: 'application/pdf' }))
  })

  it('stores one confirmed teacher mark for the submitted nearby-insight file', () => {
    const demo = demoHomework()
    assert.deepEqual(sanitizeTeacherMarks(null), [])
    assert.deepEqual(sanitizeTeacherMarks({ version: 2, marks: [{ id: 'hw-demo-a', mark: 'kept' }] }), [])
    const saved = withTeacherMark([], ' hw-demo-a ', '  過程記錄齊。  ')
    assert.deepEqual(saved, [{ id: 'hw-demo-a', mark: '過程記錄齊。' }])
    assert.equal(withTeacherMark(saved, 'hw-demo-a', '   '), saved)
    assert.equal(inSchoolMarkForStudent(saved, demo.submissions, 'demo-a'), '過程記錄齊。')
    assert.equal(inSchoolMarkForStudent(saved, demo.submissions, 'demo-b'), null)
    assert.equal(inSchoolMarkForStudent([], demo.submissions, 'demo-c'), null)
    const long = '句'.repeat(300)
    const capped = withTeacherMark([], 'hw-demo-b', long)
    assert.equal([...capped[0].mark].length, 240)
    assert.equal(fileFollowKind(DEMO_ASSIGN_ID), 'f4')
    assert.equal(fileFollowKind('demo-f5-heritage'), 'f5')
    assert.equal(fileFollowKind('assign-other'), null)
    const merged = mergeClassShellMarks(
      [{ id: 'hw-demo-a', mark: 'local', classId: DEMO_CLASS_ID }],
      [
        { id: 'hw-demo-a', mark: 'remote', classId: DEMO_CLASS_ID },
        { id: 'hw-demo-b', mark: 'from-class', classId: DEMO_CLASS_ID },
      ],
      DEMO_CLASS_ID,
    )
    assert.deepEqual(merged, [
      { id: 'hw-demo-a', mark: 'local', classId: DEMO_CLASS_ID },
      { id: 'hw-demo-b', mark: 'from-class', classId: DEMO_CLASS_ID },
    ])
  })

  it('drops a bad save and keeps the two sample rows on the sample assignment', () => {
    assert.equal(sanitizeHomework(null).submissions.length, 0)
    assert.equal(sanitizeHomework({ version: 2, submissions: demoHomework().submissions }).submissions.length, 0)
    const messy = sanitizeHomework({
      submissions: [
        { id: 'elsewhere', classId: 'other', assignmentId: 'other', studentId: 'demo-a', fileName: 'nope.pdf', demo: true },
        { id: 'hw-demo-a', classId: DEMO_CLASS_ID, assignmentId: DEMO_ASSIGN_ID, studentId: 'demo-a', fileName: '', demo: true },
        { id: 'blank', classId: DEMO_CLASS_ID, assignmentId: DEMO_ASSIGN_ID, studentId: 'demo-c', fileName: '   ', demo: false },
        { id: 'kept', classId: ' kept-class ', assignmentId: ' kept-work ', studentId: ' pupil ', fileName: '  packet.pdf  ', demo: false },
      ],
    })
    assert.deepEqual(
      messy.submissions.map((row) => ({ id: row.id, classId: row.classId, studentId: row.studentId, fileName: row.fileName, demo: row.demo })),
      [
        { id: 'hw-demo-a', classId: DEMO_CLASS_ID, studentId: 'demo-a', fileName: '', demo: true },
        { id: 'hw-kept-class-kept-work-pupil', classId: 'kept-class', studentId: 'pupil', fileName: 'packet.pdf', demo: false },
      ],
    )
  })
})

describe('homework copy and wiring', () => {
  it('byte-matches the zh-Hant hw keys and leaves class and assignment copy in place', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    const en = messages('src/i18n/en.json')
    const keys = Object.keys(HANT)
    assert.equal(keys.length, 64)
    assert.deepEqual(Object.keys(hant).filter((key) => key.startsWith('hw.')), keys)
    assert.deepEqual(Object.keys(hans).filter((key) => key.startsWith('hw.')), keys)
    assert.deepEqual(Object.keys(en).filter((key) => key.startsWith('hw.')), keys)
    assert.deepEqual(Object.keys(overrides).filter((key) => key.startsWith('hw.')), keys)
    const order = Object.keys(hant)
    const at = order.indexOf('assign.staff.classLabel')
    assert.deepEqual(order.slice(at + 1, at + 1 + keys.length), keys)
    let de = 0
    let ba = 0
    let se = 0
    for (const key of keys) {
      assert.equal(hant[key], HANT[key], key)
      assert.equal(Buffer.from(hant[key], 'utf8').equals(Buffer.from(HANT[key], 'utf8')), true, key)
      assert.equal(hans[key], overrides[key], key)
      assert.equal(en[key].trim() !== '', true, key)
      de += countChar(hant[key], '\u7684')
      ba += countChar(hant[key], '\u628a')
      se += countChar(hant[key], '\u5572')
      assert.equal([...hant[key]].some((ch) => ch.codePointAt(0) === 0x754c), false, key)
      assert.equal([...hant[key]].some((ch) => ch.codePointAt(0) === 0x4f48), false, key)
      assert.equal(BANNED.test(hant[key]), false, key)
      assert.equal(BANNED.test(hans[key]), false, key)
      assert.equal(BANNED.test(en[key]), false, key)
      if (key !== 'hw.staff.pickCompareHint' && key !== 'hw.staff.teacherCommentValue') {
        assert.equal(/[嘅咗唔喺嚟睇畀]/.test(hans[key]), false, key)
      }
    }
    assert.deepEqual({ de, ba, se }, { de: 0, ba: 0, se: 0 })
    assert.equal([...hant['hw.staff.count']].some((ch) => ch.codePointAt(0) === 0xff0f), true)
    assert.equal(hant['hw.staff.count'].includes('/'), false)
    assert.equal([...hant['hw.student.intro']].filter((ch) => ch.codePointAt(0) === 0x7540).length, 1)
    assert.equal([...hant['hw.student.mapEntry'], ...hant['hw.staff.intro'], ...hant['hw.staff.fileNote'], ...hant['hw.student.teacherCanOpen']].filter((ch) => ch.codePointAt(0) === 0x569f).length, 4)
    assert.equal(hant['hw.student.uploadAndHandIn'], '上載同交功課')
    assert.equal(hans['hw.student.uploadAndHandIn'], '上载同交功课')
    assert.equal(en['hw.student.uploadAndHandIn'], 'Upload and hand in')
    assert.equal(hant['hw.student.handedQuiet'], '已經交咗。呢個課室嘅老師可以打開嚟睇；而家等老師睇。')
    assert.equal(hans['hw.student.handedQuiet'], '已经交了。这个课室老师可以打开看；现在等老师看。')
    assert.equal(en['hw.student.handedQuiet'], 'Already handed in. A teacher of this class can open it. Waiting for a teacher to look.')
    assert.equal([...hant['hw.student.handedQuiet']].filter((ch) => ch.codePointAt(0) === 0x5497).length, 1)
    assert.equal([...hant['hw.student.handedQuiet']].filter((ch) => ch.codePointAt(0) === 0x569f).length, 1)
    assert.equal([...hant['hw.student.handedQuiet']].filter((ch) => ch.codePointAt(0) === 0x5605).length, 1)
    assert.equal([...hant['hw.student.handedQuiet']].some((ch) => ch.codePointAt(0) === 0x54c7), false)
    assert.equal([...hant['hw.student.emptyHint']].filter((ch) => ch.codePointAt(0) === 0x5e03).length, 1)
    assert.equal(Object.keys(hant).filter((key) => key.startsWith('report.staff.')).length, 16)
    assert.equal(hant['inspect.report.disclaimer'], '呢份報告係校內參考，唔係公開試正式成績。')
    for (const [key, value] of Object.entries(CLASS_HANT)) assert.equal(hant[key], value, key)
    for (const [key, value] of Object.entries(ASSIGN_HANT)) assert.equal(hant[key], value, key)
    assert.equal(Object.keys(hant).filter((key) => key.startsWith('class.staff.')).length, 26)
    assert.equal(Object.keys(hant).filter((key) => key.startsWith('assign.staff.')).length, 20)
    assert.equal(hant['inspect.staff.overviewTitle'], '課室總覽')
    assert.equal(hant['tab.staff'], '評分參考')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(en['hw.staff.title'], 'Student homework upload system')
    assert.equal(en['hw.staff.navShort'], 'Uploaded homework')
    assert.equal(hans['hw.staff.title'], '学生上载功课系统')
  })

  it('stacks the list after published work and keeps the api file count at the cap rule', () => {
    const list = read('src/components/ClassroomManagement.tsx')
    const staff = read('src/components/HomeworkReview.tsx')
    const student = read('src/components/HomeworkStudent.tsx')
    const store = read('src/lib/homeworkSubmit.ts')
    const quest = read('src/components/game/MapQuest.tsx')
    const classic = read('src/components/game/LearningMap.tsx')
    const sidebar = read('src/components/Sidebar.tsx')
    const app = read('src/App.tsx')
    const overviewAt = list.indexOf('id="class-staff-overview"')
    const assignAt = list.indexOf('<AssignmentPublish')
    const hwAt = list.indexOf('<HomeworkReview')
    assert.ok(overviewAt >= 0 && assignAt > overviewAt && hwAt > assignAt)
    assert.match(list, /demoClass=\{openRow\.demo\}/)
    assert.equal(list.includes('type="file"'), false)
    assert.equal(list.includes('/api/'), false)
    assert.equal(app.includes('HomeworkReview'), false)
    assert.equal(app.includes('HomeworkStudent'), false)
    assert.match(quest, /<HomeworkMapEntry \/>/)
    assert.match(classic, /<HomeworkMapEntry \/>/)
    const tabs = sidebar.slice(sidebar.indexOf('export const TABS'), sidebar.indexOf('export const STAFF_TAB'))
    assert.equal(tabs.includes('hw.'), false)
    assert.equal(sidebar.includes('hw.student'), false)
    assert.equal(read('src/components/SbaQuest.tsx').includes('hw.student'), false)
    for (const key of Object.keys(HANT)) {
      if (key === 'hw.student.submit') continue
      const needle = `'${key}'`
      assert.equal(staff.includes(needle) || student.includes(needle), true, key)
    }
    assert.equal(student.includes("'hw.student.submit'"), false)
    const card = student.slice(student.indexOf('function HomeworkCard'))
    assert.equal(card.includes('hw.student.teacherCanOpen'), false)
    assert.match(card, /hw\.student\.uploadAndHandIn/)
    assert.match(card, /hw\.student\.handedQuiet/)
    assert.match(card, /hw\.student\.wholeFile/)
    assert.match(card, /joined && assignment\.id === DEMO_ASSIGN_ID/)
    assert.match(card, /assign\.staff\.attachPaper/)
    const labelAt = card.indexOf("t('assign.staff.attachPaper')")
    const downloadsAt = card.indexOf('<HomeworkDownloads assignmentId={assignment.id} />')
    assert.ok(labelAt >= 0 && downloadsAt > labelAt)
    assert.equal(
      /joined && assignment\.id === DEMO_ASSIGN_ID \?[\s\S]*attachPaper[\s\S]*\) : \(\s*<HomeworkDownloads/.test(card),
      false,
    )
    const downloads = student.slice(student.indexOf('function HomeworkDownloads'), student.indexOf('function HomeworkCard'))
    assert.match(downloads, /assignmentId === DEMO_ASSIGN_ID/)
    assert.match(downloads, /hw\.student\.downloadL3/)
    assert.match(downloads, /lessonId: 'F4-U3-L3'/)
    assert.match(downloads, /hw\.student\.downloadL4/)
    assert.match(downloads, /lessonId: 'F4-U3-L4'/)
    assert.match(downloads, /assignmentId === F5_DEMO_ASSIGN_ID/)
    assert.match(downloads, /hw\.student\.downloadF5Paper/)
    assert.match(downloads, /hw\.student\.downloadF5Instructions/)
    assert.match(staff, /data-soft-motion="off"/)
    assert.match(student, /data-soft-motion="off"/)
    assert.match(staff, /#FFF9E9/)
    assert.match(staff, /#0D9488/)
    assert.match(staff, /data-hw-pages="3"/)
    assert.match(staff, /hw\.staff\.notMarking/)
    assert.match(staff, /hw\.staff\.pagesHint/)
    assert.match(student, /assignmentsForClass/)
    assert.match(student, /DEMO_CLASS_ID/)
    assert.equal(student.includes('multiple'), false)
    assert.equal(store.includes('savePrivateEvidence'), false)
    assert.equal(store.includes('supabase'), false)
    assert.equal(staff.includes('/api/'), false)
    assert.equal(student.includes('/api/'), false)
    const found = readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).sort()
    const extra = found.filter((name) => !API_FILES.includes(name))
    assert.equal(found.length, 12)
    assert.deepEqual(extra, ['class-invite.ts'])
    for (const file of [
      'src/components/HomeworkReview.tsx',
      'src/components/HomeworkStudent.tsx',
      'src/lib/homeworkSubmit.ts',
      'src/components/ClassroomManagement.tsx',
    ]) {
      const source = read(file)
      assert.equal(source.includes('\u7684'), false, file)
      assert.equal(source.includes('\u628a'), false, file)
      assert.equal(source.includes('\u5572'), false, file)
      assert.equal(BANNED.test(source), false, file)
    }
  })
})
