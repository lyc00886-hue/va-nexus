import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  CLASS_LIST_KEY,
  DEMO_CLASS_ID,
  demoClassList,
  emptyClassList,
  sanitizeClassList,
  withAddedClass,
} from './classList.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
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
} as const

const EN = {
  'class.staff.title': 'Classroom management',
  'class.staff.listTitle': 'Class list',
  'class.staff.demoClass': 'Form 4 sample class',
  'class.staff.demoClassNote': 'This is a sample class, not a real school roster.',
  'class.staff.studentCount': '3 sample students',
  'class.staff.openClass': 'Open class',
  'class.staff.addClass': 'Add a class',
} as const

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|RELAY|raiders|學生面|学生面|教師面|教师面|Soft Coord|Soft QA|Soft SCOUT|\bSoft\b|FOMO|奪星|夺星|競技場|竞技场|5\*\*|U–5\*\*/

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

function countChar(value: string, char: string): number {
  return [...value].filter((item) => item === char).length
}

describe('class list store', () => {
  it('keeps a sample class by default and an honest empty list', () => {
    const demo = demoClassList()
    assert.equal(CLASS_LIST_KEY, 'va-nexus:class-list:v1')
    assert.equal(demo.classes.length, 1)
    assert.equal(demo.classes[0].id, DEMO_CLASS_ID)
    assert.equal(demo.classes[0].demo, true)
    assert.equal(demo.classes[0].name, '')
    assert.equal(emptyClassList().classes.length, 0)

    const added = withAddedClass(demo, '  午後示例  ')
    assert.equal(added.classes.length, 2)
    assert.equal(added.classes[0].demo, true)
    assert.equal(added.classes[1].name, '午後示例')
    assert.equal(added.classes[1].demo, false)
    assert.equal(withAddedClass(added, '午後示例'), added)
    assert.equal(withAddedClass(added, '   '), added)

    assert.equal(sanitizeClassList({ version: 1, classes: [] }).classes.length, 0)
    assert.equal(sanitizeClassList({ version: 2, classes: demo.classes }).classes.length, 0)
    const messy = sanitizeClassList({
      version: 1,
      classes: [
        { id: 'demo-f4', name: 'ignored', demo: true },
        { id: 'demo-f4', name: 'again', demo: true },
        { id: 'blank', name: '   ', demo: false },
        { id: 'kept', name: '  午班  ', demo: false },
      ],
    })
    assert.deepEqual(
      messy.classes.map((row) => ({ id: row.id, name: row.name, demo: row.demo })),
      [
        { id: 'demo-f4', name: '', demo: true },
        { id: 'kept', name: '午班', demo: false },
      ],
    )
  })
})

describe('classroom management copy and wiring', () => {
  it('adds only the locked class.staff keys and leaves the overview strings in place', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    const keys = Object.keys(HANT)
    assert.deepEqual(
      Object.keys(hant).filter((key) => key.startsWith('class.staff.')),
      keys,
    )
    assert.deepEqual(
      Object.keys(hans).filter((key) => key.startsWith('class.staff.')),
      keys,
    )
    assert.deepEqual(
      Object.keys(en).filter((key) => key.startsWith('class.staff.')),
      keys,
    )
    let de = 0
    let ba = 0
    let se = 0
    for (const key of keys) {
      assert.equal(hant[key], HANT[key as keyof typeof HANT], key)
      de += countChar(hant[key], '\u7684')
      ba += countChar(hant[key], '\u628A')
      se += countChar(hant[key], '\u5572')
      assert.equal(BANNED.test(hant[key]), false, key)
      assert.equal(BANNED.test(en[key]), false, `en ${key}`)
      assert.equal(BANNED.test(hans[key]), false, `hans ${key}`)
    }
    assert.deepEqual({ de, ba, se }, { de: 0, ba: 0, se: 0 })
    for (const [key, value] of Object.entries(EN)) assert.equal(en[key], value, key)
    assert.equal(hant['inspect.staff.overviewTitle'], '課室總覽')
    assert.equal(hant['inspect.staff.demoNote'], '以下係示例名單，唔係真實同學。')
    assert.equal(hant['inspect.demo.a'], '示例同學甲')
    assert.equal(hant['inspect.demo.b'], '示例同學乙')
    assert.equal(hant['inspect.demo.c'], '示例同學丙')
    assert.equal(hant['inspect.status.missing'], '未交')
    assert.equal(hant['inspect.status.behind'], '進度未跟上')
    assert.equal(hant['inspect.status.attention'], '需要關注')
    assert.equal(hant['inspect.status.steady'], '進度平穩')
    assert.equal(hant['tab.staff'], '評分參考')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(Object.keys(hant).some((key) => key.startsWith('report.')), false)
    assert.equal(hans['class.staff.demoClassNote'].includes('示例课室'), true)
    assert.equal(/[嘅咗唔喺嚟]/.test(hans['class.staff.intro']), false)
  })

  it('stacks the existing overview inside classroom management on the staff page', () => {
    const page = read('src/components/TeacherDraftBand.tsx')
    const list = read('src/components/ClassroomManagement.tsx')
    const overview = read('src/components/InspectClassOverview.tsx')
    const sidebar = read('src/components/Sidebar.tsx')
    const app = read('src/App.tsx')
    const denied = page.indexOf('if (!role) return <StaffDenied />')
    const wrapped = page.indexOf('<ClassroomManagement')
    const existing = page.indexOf('<InspectClassOverview')
    const report = page.indexOf('<InspectReport')
    const staff = page.indexOf('<SchoolScoreStaff />')
    assert.ok(denied >= 0 && wrapped > denied && existing > wrapped && report > existing && staff > report)
    assert.match(page, /class\.staff\.deniedLead/)
    assert.match(page, /staff\.denied/)
    assert.match(overview, /inspect\.staff\.overviewTitle/)
    assert.match(overview, /inspect\.staff\.demoNote/)
    assert.equal(list.includes('inspect.staff.overviewTitle'), false)
    assert.equal(list.includes('課室總覽'), false)
    assert.match(list, /class\.staff\.title/)
    assert.match(list, /class\.staff\.listTitle/)
    assert.match(list, /class\.staff\.demoClass/)
    assert.match(list, /class\.staff\.openClass/)
    assert.match(list, /class\.staff\.addClass/)
    assert.match(list, /class\.staff\.empty/)
    assert.match(list, /open \?/)
    assert.match(list, /\{overview\}/)
    assert.match(list, /#FFF9E9/)
    assert.match(list, /#0D9488/)
    assert.match(list, /data-soft-motion="off"/)
    assert.equal(list.includes('type="file"'), false)
    assert.equal(list.includes('/api/'), false)
    assert.equal(app.includes('ClassroomManagement'), false)
    const tabs = sidebar.slice(sidebar.indexOf('export const TABS'), sidebar.indexOf('export const STAFF_TAB'))
    assert.equal(/['"]staff['"]/.test(tabs), false)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)
    for (const file of ['src/components/ClassroomManagement.tsx', 'src/lib/classList.ts', 'src/components/TeacherDraftBand.tsx']) {
      const source = read(file)
      assert.equal(source.includes('\u7684'), false, file)
      assert.equal(source.includes('\u628A'), false, file)
      assert.equal(source.includes('\u5572'), false, file)
      assert.equal(BANNED.test(source), false, file)
    }
  })
})
