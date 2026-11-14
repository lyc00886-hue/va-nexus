import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { demoHomework } from './homeworkSubmit.ts'
import { REPORT_DISCLAIMER, collectedReportValue, studentHomeworkCollected } from './inspectReport.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
  'report.staff.title': '學生個人報告',
  'report.staff.intro': '預覽一位同學嘅校內報告。呢份報告由原本嘅學習進度報告延續，唔另外再出第二份報告。',
  'report.staff.homework': '功課交收',
  'report.staff.homeworkValue': '近身洞察功課：已交',
  'report.staff.note': '老師短註',
  'report.staff.noteValue': '今轉已交近身洞察功課。課堂表現平穩。',
  'report.staff.noteHint': '短註只供校內參考，唔會寫公開試級別，亦唔會加額外標籤。',
  'report.staff.bandKeep': '校內評級仍然用老師確認過嘅練習帶，呢次唔另定新級。',
} as const

const HANS = {
  'report.staff.title': '学生个人报告',
  'report.staff.intro': '预览一位同学的校内报告。这份报告由原来的学习进度报告延续，不另外再出第二份报告。',
  'report.staff.homework': '功课交收',
  'report.staff.homeworkValue': '近身洞察功课：已交',
  'report.staff.note': '老师短注',
  'report.staff.noteValue': '这次已交近身洞察功课。课堂表现平稳。',
  'report.staff.noteHint': '短注只供校内参考，不会写公开试级别，也不会加额外标签。',
  'report.staff.bandKeep': '校内评级仍然用老师确认过的练习带，这次不另定新级。',
} as const

const EN = {
  'report.staff.title': 'Student personal report',
  'report.staff.intro':
    'Preview one student\'s in-school report. This report continues the original learning-progress report and does not issue a second report.',
  'report.staff.homework': 'Homework collection',
  'report.staff.homeworkValue': 'Nearby insight homework: submitted',
  'report.staff.note': 'Teacher short note',
  'report.staff.noteValue': 'Nearby insight homework was submitted this round. Classroom performance is steady.',
  'report.staff.noteHint':
    'The short note is for in-school reference only. It does not write a public-exam level, and it does not add an extra label.',
  'report.staff.bandKeep': 'The in-school rating still uses the practice band the teacher confirmed. No new level is set this time.',
} as const

const REPORT_FIELDS = [
  'inspect.report.disclaimer',
  'inspect.report.student',
  'inspect.report.grade',
  'inspect.report.units',
  'inspect.report.practice',
  'inspect.report.artwork',
  'inspect.report.research',
  'inspect.report.band',
  'inspect.report.none',
  'inspect.report.unsetBand',
  'inspect.report.date',
  'inspect.report.printHint',
] as const

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
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|RELAY|SEN|診斷|诊断/

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

describe('student personal report', () => {
  it('byte-matches the 8 report.staff keys and keeps the learning-progress fields', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    const en = messages('src/i18n/en.json')
    const keys = Object.keys(HANT)
    assert.equal(keys.length, 8)
    assert.deepEqual(Object.keys(hant).filter((key) => key.startsWith('report.')), keys)
    assert.deepEqual(Object.keys(hans).filter((key) => key.startsWith('report.')), keys)
    assert.deepEqual(Object.keys(en).filter((key) => key.startsWith('report.')), keys)
    const order = Object.keys(hant)
    const at = order.indexOf('hw.student.mapEntry')
    assert.deepEqual(order.slice(at + 1, at + 1 + keys.length), keys)
    let de = 0
    let ba = 0
    let se = 0
    for (const key of keys) {
      assert.equal(hant[key], HANT[key], key)
      assert.equal(Buffer.from(hant[key], 'utf8').equals(Buffer.from(HANT[key], 'utf8')), true, key)
      assert.equal(hans[key], HANS[key], key)
      assert.equal(en[key], EN[key], key)
      assert.equal(BANNED.test(hant[key]), false, key)
      assert.equal(BANNED.test(hans[key]), false, key)
      assert.equal(BANNED.test(en[key]), false, key)
      assert.equal(/[嘅咗唔喺嚟睇畀]/.test(hans[key]), false, key)
      de += [...hant[key]].filter((ch) => ch.codePointAt(0) === 0x7684).length
      ba += [...hant[key]].filter((ch) => ch.codePointAt(0) === 0x628a).length
      se += [...hant[key]].filter((ch) => ch.codePointAt(0) === 0x5572).length
      assert.equal([...hant[key]].some((ch) => ch.codePointAt(0) === 0x4f48), false, key)
    }
    assert.deepEqual({ de, ba, se }, { de: 0, ba: 0, se: 0 })
    assert.equal(overrides['report.staff.intro'], HANS['report.staff.intro'])
    assert.equal(overrides['report.staff.noteValue'], HANS['report.staff.noteValue'])
    assert.equal(overrides['report.staff.noteHint'], HANS['report.staff.noteHint'])
    assert.equal(overrides['report.staff.bandKeep'], HANS['report.staff.bandKeep'])
    assert.equal(hant['inspect.report.disclaimer'], REPORT_DISCLAIMER['zh-Hant'])
    assert.equal(hant['inspect.report.disclaimer'], '呢份報告係校內參考，唔係公開試正式成績。')
    for (const key of REPORT_FIELDS) assert.equal(typeof hant[key], 'string', key)
    assert.equal(hant['inspect.report.mcScore'], '選擇題：{correct}／{total} 題答對')
    assert.equal(hant['inspect.report.written'], '長題同過程練習：{done}／{total} 題已交')
    assert.equal(hant['score.v1.band.developing'], '發展中')
    assert.equal(hant['inspect.demo.b'], '示例同學乙')
    assert.equal(hant['inspect.demo.a'], '示例同學甲')
    assert.equal(hant['inspect.demo.c'], '示例同學丙')
    assert.equal(hant['class.staff.demoClass'], '中四示例班')
    assert.equal(hant['map.grade.f4'], '中四')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hant['inspect.staff.reportTitle'], '學習進度報告')
  })

  it('reads homework collection into the same report and does not add an api file', () => {
    const demo = demoHomework()
    assert.equal(studentHomeworkCollected(demo.submissions, 'demo-b'), true)
    assert.equal(studentHomeworkCollected(demo.submissions, 'demo-a'), true)
    assert.equal(studentHomeworkCollected(demo.submissions, 'demo-c'), false)
    assert.equal(studentHomeworkCollected(demo.submissions, '  '), false)
    assert.equal(
      collectedReportValue(true, HANT['report.staff.homeworkValue'], '未有紀錄'),
      '近身洞察功課：已交',
    )
    assert.equal(collectedReportValue(false, HANT['report.staff.noteValue'], '未有紀錄'), '未有紀錄')

    const page = read('src/components/InspectReport.tsx')
    const report = read('src/lib/inspectReport.ts')
    const staff = read('src/components/TeacherDraftBand.tsx')
    assert.equal(staff.split('<InspectReport').length - 1, 1)
    assert.match(page, /report\.staff\.title/)
    assert.match(page, /report\.staff\.intro/)
    assert.match(page, /report\.staff\.homework/)
    assert.match(page, /report\.staff\.homeworkValue/)
    assert.match(page, /report\.staff\.note/)
    assert.match(page, /report\.staff\.noteValue/)
    assert.match(page, /report\.staff\.noteHint/)
    assert.match(page, /report\.staff\.bandKeep/)
    assert.match(page, /inspect\.report\.disclaimer/)
    assert.match(page, /inspect\.staff\.closePreview/)
    assert.match(page, /inspect\.staff\.exportOne/)
    assert.match(page, /inspect\.staff\.exportClass/)
    assert.match(page, /data-testid="inspect-export-one"/)
    assert.match(page, /data-testid="inspect-export-class"/)
    assert.match(page, /inspect\.report\.printHint/)
    assert.match(page, /learningProgressFilename/)
    assert.match(page, /studentHomeworkCollected/)
    assert.match(page, /data-soft-motion="off"/)
    assert.match(page, /#FFF9E9/)
    assert.match(page, /#0D9488/)
    assert.equal(page.includes('practice-developing'), false)
    assert.equal(/approxBand|publicExam|預測|诊断|診斷/.test(page + report), false)
    assert.equal(report.includes('class-homework'), false)
    for (const file of [
      'src/components/ClassroomManagement.tsx',
      'src/components/AssignmentPublish.tsx',
      'src/components/HomeworkReview.tsx',
      'src/components/HomeworkStudent.tsx',
      'src/App.tsx',
      'src/components/Sidebar.tsx',
      'src/lib/homeworkSubmit.ts',
    ]) {
      assert.equal(read(file).includes('report.staff'), false, file)
    }
    assert.equal(read('src/App.tsx').includes('max-w-5xl'), true)
    const found = readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).sort()
    assert.deepEqual(found, [...API_FILES].sort())
    assert.equal(found.length, 11)
    assert.equal(found.includes('class-homework.ts'), false)
    for (const file of ['src/components/InspectReport.tsx', 'src/lib/inspectReport.ts']) {
      const source = read(file)
      assert.equal(source.includes('\u7684'), false, file)
      assert.equal(source.includes('\u628a'), false, file)
      assert.equal(source.includes('\u5572'), false, file)
      assert.equal(BANNED.test(source), false, file)
    }
  })
})
