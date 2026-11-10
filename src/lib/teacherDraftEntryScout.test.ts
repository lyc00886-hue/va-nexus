import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { TEACHER_DRAFT_BAND_KEY } from './teacherDraftBand.ts'
import { TEACHER_DRAFT_ENTRY_SHA256 } from './teacherDraftEntryScout.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const PLATE_DIR = 'public/content/learning-map-illustrations/soft-scout/teacher-draft-entry-thin-2611'

const COPY_FILES = [
  ['zh-Hant', 'src/content/teacher-draft-band.json'],
  ['en', 'src/content/teacher-draft-band.en.json'],
  ['zh-Hans', 'src/content/teacher-draft-band.zh-Hans.json'],
] as const

/** Device-only name, and this page does not list or show student uploads. */
const ENTRY_COPY = {
  'zh-Hant': {
    pageIntro: ['這部裝置', '不列出', '不顯示學生上載的相片或筆記'],
    noStudent: ['只存在這部裝置', '輸入後才可填練習 band'],
    noStudentAbsent: ['選取', '尚未選'],
  },
  en: {
    pageIntro: ['this device', 'does not list or show student-uploaded photos or notes'],
    noStudent: ['this device only', 'Type one before setting a practice band'],
    noStudentAbsent: ['Choose one', 'No student'],
  },
  'zh-Hans': {
    pageIntro: ['这部装置', '不列出', '不显示学生上传的相片或笔记'],
    noStudent: ['只存在这部装置', '输入后才可填练习 band'],
    noStudentAbsent: ['选取', '尚未选'],
  },
} as const

const SOFT_NEVER =
  /hearts|真題|真题|HKEAA 真題|SEN|3★|奪星|夺星|競技場|竞技场|校名|\bSoft\b|AI marking|AI 評分|AI 评分/

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function sliceFunction(source: string, name: string): string {
  const match = new RegExp(`function ${name}\\b`).exec(source)
  assert.ok(match, name)
  const start = match.index
  const rest = source.slice(start + 1)
  const nextFn = rest.search(/\nfunction |\nexport default function /)
  return nextFn >= 0 ? source.slice(start, start + 1 + nextFn) : source.slice(start)
}

describe('teacher draft entry scout plates', () => {
  it('keeps the Soft SCOUT sha256 bytes for 01, 02, and the strip', () => {
    const names = Object.keys(TEACHER_DRAFT_ENTRY_SHA256)
    assert.deepEqual(names, [
      '01-entry-map-staff-vs-student.png',
      '02-replace-self-not-side-effect.png',
      'preview-strip.png',
    ])
    for (const [name, hex] of Object.entries(TEACHER_DRAFT_ENTRY_SHA256)) {
      const bytes = readFileSync(join(root, PLATE_DIR, name))
      const hash = createHash('sha256').update(bytes).digest('hex')
      assert.equal(hash, hex, name)
      assert.equal(hash.slice(0, 12), hex.slice(0, 12), name)
    }
    assert.equal(TEACHER_DRAFT_ENTRY_SHA256['01-entry-map-staff-vs-student.png'].slice(0, 12), 'd072a7be6282')
    assert.equal(TEACHER_DRAFT_ENTRY_SHA256['02-replace-self-not-side-effect.png'].slice(0, 12), 'ad9279a8ccda')
    assert.equal(TEACHER_DRAFT_ENTRY_SHA256['preview-strip.png'].slice(0, 12), '62e11c3b1100')
  })
})

describe('staff teacher-draft entry', () => {
  it('gates the page on a staff role and shows the draft band after the school-score blocks', () => {
    const source = read('src/components/TeacherDraftBand.tsx')
    const page = sliceFunction(source, 'TeacherDraftBandPage')
    const gate = sliceFunction(source, 'TeacherDraftBand')
    const denied = sliceFunction(source, 'StaffDenied')

    assert.match(denied, /data-testid="teacher-draft-denied"/)
    assert.match(denied, /staff\.denied/)
    assert.match(gate, /const role = useStaffRole\(\)/)
    assert.match(gate, /if \(!role\) return <StaffDenied \/>/)
    assert.equal(page.includes('SchoolScoreStaff'), false)
    assert.equal(page.includes('type="file"'), false)
    assert.equal(page.includes('<img'), false)
    assert.equal(page.includes('<select'), false)
    assert.equal(page.includes('datalist'), false)
    assert.equal(/sba-local-notes|photoCount|file_path|SbaQuest|store\.portfolios/.test(page), false)

    const staff = gate.indexOf('<SchoolScoreStaff />')
    const dual = gate.indexOf('<SchoolScoreDualStaff />')
    const later = gate.indexOf('<SchoolScoreLaterStaff />')
    const draft = gate.indexOf('<TeacherDraftBandPage')
    assert.ok(staff >= 0 && dual > staff && later > dual && draft > later)

    assert.match(page, /data-testid="teacher-draft-band"/)
    assert.match(page, /data-testid="teacher-draft-portfolio"/)
    assert.match(page, /staff\.portfolioPlaceholder/)
    assert.match(page, /autoComplete="off"/)
    assert.equal(TEACHER_DRAFT_BAND_KEY, 'va-nexus:teacher-draft-band:v1')
  })

  it('keeps the staff tab off the student chrome and the prod preview gate closed', () => {
    const app = read('src/App.tsx')
    const sidebar = read('src/components/Sidebar.tsx')
    const hook = read('src/lib/useStaffRole.ts')
    const role = read('src/lib/staffRole.ts')
    const tabs = sidebar.slice(sidebar.indexOf('export const TABS'), sidebar.indexOf('export const STAFF_TAB'))

    assert.match(app, /const showStaffNav = staffRole != null/)
    assert.match(app, /showStaffNav \? \[STAFF_TAB\]/)
    assert.match(app, /activeTab === 'staff' && showStaffNav/)
    const portfolio = app.split("activeTab === 'portfolio'")[1]?.split("activeTab === 'library'")[0] ?? ''
    assert.match(portfolio, /SbaQuest/)
    assert.equal(/TeacherDraftBand|teacher-draft-portfolio|type="file"/.test(portfolio), false)
    assert.equal(/['"]staff['"]/.test(tabs), false)
    assert.match(sidebar, /nav-staff-desktop/)
    assert.match(sidebar, /nav-staff-mobile/)
    assert.match(sidebar, /id: 'staff'/)

    assert.match(hook, /return import\.meta\.env\.DEV/)
    assert.match(hook, /user\?\.app_metadata/)
    assert.match(hook, /VITE_STAFF_EMAILS/)
    assert.match(hook, /STAFF_PREVIEW_KEY/)
    assert.equal(hook.includes('user_metadata'), false)
    assert.equal(hook.includes('user?.user_metadata'), false)
    assert.match(role, /STAFF_PREVIEW_KEY = 'va-nexus:staff-preview'/)
    assert.equal(role.includes('user_metadata'), true)
    assert.match(role, /user_metadata` is ignored/)
    const roleKeys = role.slice(role.indexOf('const ROLE_KEYS'), role.indexOf('export function parseStaffEmailAllowlist'))
    assert.equal(roleKeys.includes('user_metadata'), false)
  })

  it('says the typed name stays on this device and this page shows no student photos', () => {
    const hant = JSON.parse(read('src/i18n/zh-Hant.json')) as Record<string, string>
    const en = JSON.parse(read('src/i18n/en.json')) as Record<string, string>
    assert.equal(hant['staff.portfolioPlaceholder'], '輸入校內名稱（只存在這部裝置）')
    assert.equal(en['staff.portfolioPlaceholder'], 'School-internal name (this device only)')
    assert.match(hant['sba.banner.private'], /私人空間/)
    assert.match(hant['sba.banner.private'], /只有你登入後先睇到/)

    for (const [locale, file] of COPY_FILES) {
      const copy = JSON.parse(read(file)) as {
        pageIntro: string
        empty: { noStudent: string }
      }
      const expect = ENTRY_COPY[locale]
      for (const phrase of expect.pageIntro) assert.match(copy.pageIntro, new RegExp(phrase), `${locale} pageIntro`)
      for (const phrase of expect.noStudent) assert.match(copy.empty.noStudent, new RegExp(phrase), `${locale} noStudent`)
      for (const phrase of expect.noStudentAbsent) {
        assert.equal(copy.empty.noStudent.includes(phrase), false, `${locale} noStudent still says ${phrase}`)
      }
      assert.equal(SOFT_NEVER.test(copy.pageIntro), false, `${locale} pageIntro`)
      assert.equal(SOFT_NEVER.test(copy.empty.noStudent), false, `${locale} noStudent`)
    }
  })
})
