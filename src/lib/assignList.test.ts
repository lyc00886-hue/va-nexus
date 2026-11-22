import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  ASSIGN_LIST_KEY,
  DEMO_ASSIGN_ID,
  F5_DEMO_ASSIGN_ID,
  assignmentsForClass,
  demoAssignList,
  emptyAssignList,
  sanitizeAssignList,
  visibleAssignment,
  withPublishedAssignment,
} from './assignList.ts'
import { DEMO_CLASS_ID } from './classList.ts'
import { PORTFOLIO_LABEL_MAX } from './teacherDraftBand.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
  "assign.staff.title": "出功課",
  "assign.staff.intro": "為呢個課室發布功課。可以寫名稱、截止日期、簡短說明，同埋附上已有活動紙。",
  "assign.staff.fieldTitle": "功課名稱",
  "assign.staff.fieldDue": "截止日期",
  "assign.staff.fieldInstructions": "簡短說明",
  "assign.staff.fieldAttach": "附上已有活動紙（可選）",
  "assign.staff.attachNone": "唔附活動紙",
  "assign.staff.attachPaper": "十一月：走進社區——研究 活動紙",
  "assign.staff.publish": "發布功課",
  "assign.staff.published": "已發布功課",
  "assign.staff.demoTitle": "十一月：走進社區觀察課業",
  "assign.staff.demoDue": "2026年11月28日",
  "assign.staff.demoInstructions": "請將作品同工作簿一次過交成份檔。可以一齊睇已附上嘅課堂活動紙。",
  "assign.staff.noGenerator": "呢度只發布功課畀呢個課室，唔會自動寫課堂計劃。",
  "assign.staff.openList": "睇已發布名單",
  "assign.staff.classLabel": "發布畀"
} as Record<string, string>

const HANS = {
  "assign.staff.title": "出功课",
  "assign.staff.intro": "为这个课室发布功课。可以写名称、截止日期、简短说明，以及附上已有活动纸。",
  "assign.staff.fieldTitle": "功课名称",
  "assign.staff.fieldDue": "截止日期",
  "assign.staff.fieldInstructions": "简短说明",
  "assign.staff.fieldAttach": "附上已有活动纸（可选）",
  "assign.staff.attachNone": "不附活动纸",
  "assign.staff.attachPaper": "十一月：走进社区——研究 活动纸",
  "assign.staff.publish": "发布功课",
  "assign.staff.published": "已发布功课",
  "assign.staff.demoTitle": "十一月：走进社区观察课业",
  "assign.staff.demoDue": "2026年11月28日",
  "assign.staff.demoInstructions": "请将作品和工作簿一次过交成份档。可以一起看已附上的课堂活动纸。",
  "assign.staff.noGenerator": "这里只发布功课给这个课室，不会自动写课堂计划。",
  "assign.staff.openList": "查看已发布名单",
  "assign.staff.classLabel": "发布给"
} as Record<string, string>

const EN = {
  "assign.staff.title": "Set work",
  "assign.staff.intro": "Set work for this class. You can write a name, a due date, and a short note, and attach an activity paper that is already available.",
  "assign.staff.fieldTitle": "Work name",
  "assign.staff.fieldDue": "Due date",
  "assign.staff.fieldInstructions": "Short note",
  "assign.staff.fieldAttach": "Attach an existing activity paper (optional)",
  "assign.staff.attachNone": "No activity paper",
  "assign.staff.attachPaper": "November: community — research activity paper",
  "assign.staff.publish": "Publish work",
  "assign.staff.published": "Published work",
  "assign.staff.demoTitle": "November: community observation assignment",
  "assign.staff.demoDue": "28 November 2026",
  "assign.staff.demoInstructions": "Submit the artwork and the workbook together as one file. You can look at the attached classroom activity paper as well.",
  "assign.staff.noGenerator": "This only publishes work for this class. It does not write a lesson plan automatically.",
  "assign.staff.openList": "View the published list",
  "assign.staff.classLabel": "Published for"
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
  'class-invite.ts',
  'socratic.test.ts',
  'socraticBank.ts',
]

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|RELAY|課游記|课游记|课游記|keyouji|診斷|诊断|\bSEN\b/

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

function countChar(value: string, char: string): number {
  return [...value].filter((item) => item === char).length
}

describe('assignment publish store', () => {
  it('keeps one sample assignment and publishes a trimmed row for one class', () => {
    const demo = demoAssignList()
    assert.equal(ASSIGN_LIST_KEY, 'va-nexus:assign-list:v1')
    assert.equal(demo.assignments.length, 2)
    assert.equal(demo.assignments[0].id, DEMO_ASSIGN_ID)
    assert.equal(demo.assignments[1].id, F5_DEMO_ASSIGN_ID)
    assert.equal(demo.assignments[0].classId, DEMO_CLASS_ID)
    assert.equal(demo.assignments[1].classId, DEMO_CLASS_ID)
    assert.equal(demo.assignments[0].demo, true)
    assert.equal(demo.assignments[1].demo, true)
    assert.equal(demo.assignments[0].attach, 'paper')
    assert.equal(demo.assignments[1].attach, 'paper')
    assert.equal(demo.assignments[0].title, '')
    assert.equal(demo.assignments[1].title, '')
    assert.equal(demo.assignments[0].due, '')
    assert.equal(demo.assignments[1].due, '')
    assert.equal(demo.assignments[0].instructions, '')
    assert.equal(demo.assignments[1].instructions, '')
    assert.equal(emptyAssignList().assignments.length, 0)
    assert.deepEqual(visibleAssignment(demo.assignments[0], { title: 'T', due: 'D', instructions: 'I' }), {
      title: 'T',
      due: 'D',
      instructions: 'I',
      attach: 'paper',
    })
    assert.deepEqual(
      visibleAssignment(
        demo.assignments[1],
        { title: 'T', due: 'D', instructions: 'I' },
        { title: 'F', due: 'FD', instructions: 'FI' },
      ),
      { title: 'F', due: 'FD', instructions: 'FI', attach: 'paper' },
    )

    const next = withPublishedAssignment(
      demo,
      {
        classId: '  class-afternoon  ',
        title: '  午後功課  ',
        due: '  2026年12月1日  ',
        instructions: '  交成份檔  ',
        attach: 'none',
      },
      'assign-fixed',
    )
    assert.notEqual(next, demo)
    assert.equal(demo.assignments.length, 2)
    assert.equal(next.assignments.length, 3)
    const added = assignmentsForClass(next, 'class-afternoon')
    assert.equal(added.length, 1)
    assert.equal(assignmentsForClass(next, DEMO_CLASS_ID).length, 2)
    assert.equal(assignmentsForClass(next, 'other').length, 0)
    assert.deepEqual(
      { ...added[0], id: 'assign-fixed' },
      {
        id: 'assign-fixed',
        classId: 'class-afternoon',
        title: '午後功課',
        due: '2026年12月1日',
        instructions: '交成份檔',
        attach: 'none',
        demo: false,
      },
    )
    assert.deepEqual(visibleAssignment(added[0], { title: 'T', due: 'D', instructions: 'I' }), {
      title: '午後功課',
      due: '2026年12月1日',
      instructions: '交成份檔',
      attach: 'none',
    })

    const paper = withPublishedAssignment(
      next,
      { classId: DEMO_CLASS_ID, title: '再一份', due: '2026年12月2日', instructions: '', attach: 'paper' },
      'assign-paper',
    )
    assert.equal(paper.assignments.length, 4)
    assert.equal(assignmentsForClass(paper, DEMO_CLASS_ID).length, 3)
    assert.equal(paper.assignments[3].attach, 'paper')
    assert.equal(paper.assignments[3].instructions, '')

    assert.equal(withPublishedAssignment(demo, { classId: 'c', title: '   ', due: '日期', instructions: '', attach: 'paper' }), demo)
    assert.equal(withPublishedAssignment(demo, { classId: 'c', title: '名稱', due: '   ', instructions: '', attach: 'paper' }), demo)
    assert.equal(withPublishedAssignment(demo, { classId: '   ', title: '名稱', due: '日期', instructions: '', attach: 'paper' }), demo)
    assert.equal(
      withPublishedAssignment(demo, { classId: 'c', title: '名稱', due: '日期', instructions: '', attach: 'file' as 'paper' }),
      demo,
    )
    assert.equal(
      withPublishedAssignment(demo, { classId: 'c', title: '名稱', due: '日期', instructions: '', attach: 'paper' }, '   '),
      demo,
    )
    assert.equal(
      withPublishedAssignment(demo, { classId: 'c', title: '名稱', due: '日期', instructions: '', attach: 'paper' }, DEMO_ASSIGN_ID),
      demo,
    )
    assert.equal(
      withPublishedAssignment(demo, { classId: 'c', title: '名稱', due: '日期', instructions: '', attach: 'paper' }, F5_DEMO_ASSIGN_ID),
      demo,
    )

    const long = withPublishedAssignment(
      emptyAssignList(),
      { classId: 'c', title: '課'.repeat(PORTFOLIO_LABEL_MAX + 20), due: '日期', instructions: '註'.repeat(10), attach: 'none' },
      'assign-long',
    )
    assert.equal(long.assignments[0].title.length, PORTFOLIO_LABEL_MAX)
  })

  it('drops a bad save and keeps a single sample row on the sample class', () => {
    assert.equal(sanitizeAssignList(null).assignments.length, 0)
    assert.equal(sanitizeAssignList({ version: 2, assignments: demoAssignList().assignments }).assignments.length, 0)
    const messy = sanitizeAssignList({
      assignments: [
        { id: 'demo-november', classId: 'elsewhere', title: 'ignored', due: 'ignored', instructions: 'ignored', attach: 'none', demo: true },
        { id: 'demo-november', classId: DEMO_CLASS_ID, title: 'again', due: 'again', instructions: '', attach: 'paper', demo: true },
        { id: 'demo-f5-heritage', classId: 'elsewhere', title: 'ignored', due: 'ignored', instructions: 'ignored', attach: 'paper', demo: true },
        { id: 'demo-f5-heritage', classId: DEMO_CLASS_ID, title: 'again', due: 'again', instructions: '', attach: 'none', demo: true },
        { id: 'other-demo', classId: DEMO_CLASS_ID, title: 'nope', due: 'nope', instructions: '', attach: 'paper', demo: true },
        { id: 'blank', classId: 'c', title: '   ', due: '日期', instructions: '', attach: 'paper', demo: false },
        { id: 'no-due', classId: 'c', title: '名稱', due: '   ', instructions: '', attach: 'paper', demo: false },
        { id: 'bad-attach', classId: 'c', title: '名稱', due: '日期', instructions: '', attach: 'file', demo: false },
        { id: 'kept', classId: '  kept-class  ', title: '  午班功課  ', due: '  2026年12月3日  ', instructions: '  說明  ', attach: 'paper', demo: false },
      ],
    })
    assert.deepEqual(
      messy.assignments.map((row) => ({
        id: row.id,
        classId: row.classId,
        title: row.title,
        due: row.due,
        instructions: row.instructions,
        attach: row.attach,
        demo: row.demo,
      })),
      [
        {
          id: 'demo-november',
          classId: DEMO_CLASS_ID,
          title: '',
          due: '',
          instructions: '',
          attach: 'none',
          demo: true,
        },
        {
          id: 'demo-f5-heritage',
          classId: DEMO_CLASS_ID,
          title: '',
          due: '',
          instructions: '',
          attach: 'paper',
          demo: true,
        },
        {
          id: 'kept',
          classId: 'kept-class',
          title: '午班功課',
          due: '2026年12月3日',
          instructions: '說明',
          attach: 'paper',
          demo: false,
        },
      ],
    )
  })
})

describe('assignment copy and wiring', () => {
  it('adds only the 16 assign.staff keys and leaves the class overview strings in place', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    const en = messages('src/i18n/en.json')
    const keys = Object.keys(HANT)
    assert.equal(keys.length, 16)
    const f5Keys = [
      'assign.staff.f5demoTitle',
      'assign.staff.f5demoDue',
      'assign.staff.f5demoInstructions',
      'assign.staff.f5demoAttach',
    ]
    assert.deepEqual(Object.keys(hant).filter((key) => key.startsWith('assign.')), [...keys, ...f5Keys])
    assert.deepEqual(Object.keys(hans).filter((key) => key.startsWith('assign.')), [...keys, ...f5Keys])
    assert.deepEqual(Object.keys(en).filter((key) => key.startsWith('assign.')), [...keys, ...f5Keys])
    assert.deepEqual(Object.keys(overrides).filter((key) => key.startsWith('assign.')), [...keys, ...f5Keys])
    assert.equal(hant['assign.staff.f5demoTitle'], '自我、傳統同社會：課室功課')
    assert.equal(hans['assign.staff.f5demoTitle'], '自我、传统与社会：课室功课')
    assert.equal(en['assign.staff.f5demoTitle'], 'Self, heritage and society: classwork to hand in')
    assert.equal(overrides['assign.staff.f5demoTitle'], hans['assign.staff.f5demoTitle'])
    assert.equal(hant['assign.staff.f5demoDue'], '2026年11月24日')
    assert.equal(en['assign.staff.f5demoDue'], '24 November 2026')
    assert.equal(hant['assign.staff.f5demoInstructions'], '請一次過交齊視覺日記頁同水墨試驗記錄成份檔。交咗之後，呢個課室嘅老師可以打開嚟睇。呢度會有校內參考自動評分。')
    assert.equal(hans['assign.staff.f5demoInstructions'], '请一次交齐视觉日记页和水墨试验记录成份档。交了之后，这个课室老师可以打开查看。这里会有校内参考自动评分。')
    assert.equal(en['assign.staff.f5demoInstructions'], 'Hand in your visual journal pages and ink-trial notes together as one complete file. After you hand it in, a teacher of this class can open it. There will be an in-school reference automatic mark.')
    assert.equal(hant['assign.staff.f5demoAttach'], '自我、傳統同社會 活動紙')
    assert.equal(hans['assign.staff.f5demoAttach'], '自我、传统与社会 活动纸')
    assert.equal(en['assign.staff.f5demoAttach'], 'Self, heritage and society activity paper')
    for (const key of f5Keys) assert.equal(overrides[key], hans[key], key)
    const hantOrder = Object.keys(hant)
    const at = hantOrder.indexOf('class.staff.deniedLead')
    assert.deepEqual(hantOrder.slice(at + 1, at + 1 + keys.length), keys)
    assert.deepEqual(Object.keys(hans).slice(Object.keys(hans).indexOf('class.staff.deniedLead') + 1, Object.keys(hans).indexOf('class.staff.deniedLead') + 1 + keys.length), keys)
    assert.deepEqual(Object.keys(en).slice(Object.keys(en).indexOf('class.staff.deniedLead') + 1, Object.keys(en).indexOf('class.staff.deniedLead') + 1 + keys.length), keys)

    let de = 0
    let ba = 0
    let se = 0
    let lai = 0
    for (const key of keys) {
      assert.equal(hant[key], HANT[key], key)
      assert.equal(hans[key], HANS[key], key)
      assert.equal(overrides[key], HANS[key], key)
      assert.equal(en[key], EN[key], key)
      assert.equal(Buffer.from(hant[key], 'utf8').equals(Buffer.from(HANT[key], 'utf8')), true, key)
      de += countChar(hant[key], '\u7684')
      ba += countChar(hant[key], '\u628a')
      se += countChar(hant[key], '\u5572')
      lai += countChar(hant[key], '\u569f')
      assert.equal([...hant[key]].some((ch) => ch.codePointAt(0) === 0x754c), false, key)
      assert.equal(BANNED.test(hant[key]), false, key)
      assert.equal(BANNED.test(hans[key]), false, key)
      assert.equal(BANNED.test(en[key]), false, key)
      assert.equal(/[嘅咗唔喺嚟睇畀]/.test(hans[key]), false, key)
    }
    assert.deepEqual({ de, ba, se, lai }, { de: 0, ba: 0, se: 0, lai: 0 })
    assert.equal([...hant['assign.staff.noGenerator'], ...hant['assign.staff.classLabel']].filter((ch) => ch.codePointAt(0) === 0x7540).length, 2)
    assert.equal([...hant['assign.staff.demoInstructions']].filter((ch) => ch.codePointAt(0) === 0x5605).length, 1)
    assert.equal(hant['tab.staff'], '評分參考')
    assert.equal(hant['inspect.staff.overviewTitle'], '課室總覽')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(Object.keys(hant).filter((key) => key.startsWith('class.staff.')).length, 26)
    assert.equal(Object.keys(hant).filter((key) => key.startsWith('report.staff.')).length, 14)
  })

  it('stacks compose and the published list inside the opened class, with no new api file', () => {
    const page = read('src/components/TeacherDraftBand.tsx')
    const list = read('src/components/ClassroomManagement.tsx')
    const form = read('src/components/AssignmentPublish.tsx')
    const store = read('src/lib/assignList.ts')
    const app = read('src/App.tsx')
    const sidebar = read('src/components/Sidebar.tsx')
    const overviewAt = list.indexOf('{overview}')
    const assignAt = list.indexOf('<AssignmentPublish')
    const openAt = list.indexOf('open ?')
    assert.ok(openAt >= 0 && overviewAt > openAt && assignAt > overviewAt)
    assert.match(list, /demoClass=\{openRow\.demo\}/)
    assert.match(page, /<ClassroomManagement/)
    assert.match(page, /<InspectClassOverview/)
    assert.equal(page.includes('AssignmentPublish'), false)
    assert.equal(app.includes('AssignmentPublish'), false)
    assert.match(app, /const showStaffNav = staffRole != null/)
    assert.match(app, /activeTab === 'staff' && showStaffNav/)
    const tabs = sidebar.slice(sidebar.indexOf('export const TABS'), sidebar.indexOf('export const STAFF_TAB'))
    assert.equal(/['"]staff['"]/.test(tabs), false)
    for (const key of Object.keys(HANT)) assert.equal(form.includes(`'${key}'`), true, key)
    for (const key of ['assign.staff.f5demoTitle', 'assign.staff.f5demoDue', 'assign.staff.f5demoInstructions', 'assign.staff.f5demoAttach']) {
      assert.equal(form.includes(`'${key}'`), true, key)
    }
    assert.match(form, /assign\.staff\.noGenerator/)
    assert.match(form, /data-soft-motion="off"/)
    assert.match(form, /#FFF9E9/)
    assert.match(form, /#0D9488/)
    assert.match(form, /assign-attach-\$\{id\}/)
    assert.match(form, /'paper', 'none'/)
    assert.match(form, /data-testid="assign-publish"/)
    assert.match(form, /data-testid="assign-open-list"/)
    assert.match(form, /data-testid="assign-published-list"/)
    assert.equal(form.includes('type="file"'), false)
    assert.equal(form.includes('/api/'), false)
    assert.equal(form.includes('hw.staff'), false)
    assert.equal(form.includes('report.staff'), false)
    assert.equal(list.includes('type="file"'), false)
    assert.equal(list.includes('/api/'), false)
    assert.equal(store.includes('/api/'), false)
    assert.deepEqual(
      readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).sort(),
      [...API_FILES].sort(),
    )
    for (const file of ['src/components/AssignmentPublish.tsx', 'src/components/ClassroomManagement.tsx', 'src/lib/assignList.ts']) {
      const source = read(file)
      assert.equal(source.includes('\u7684'), false, file)
      assert.equal(source.includes('\u628a'), false, file)
      assert.equal(source.includes('\u5572'), false, file)
      assert.equal(BANNED.test(source), false, file)
      assert.equal(source.includes('示例同學'), false, file)
      assert.equal(source.includes('學生上載'), false, file)
    }
  })
})
