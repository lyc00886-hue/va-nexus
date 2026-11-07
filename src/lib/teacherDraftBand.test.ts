import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  bandForPortfolio,
  checkTeacherDraftBandCopy,
  CRITERIA_IDS,
  emptyTeacherDraftStore,
  pickTeacherDraftBandCopy,
  PRACTICE_BAND_IDS,
  sanitizeTeacherDraftStore,
  TEACHER_DRAFT_BAND_KEY,
  TEACHER_TIP_IDS,
  withClearedBand,
  withSavedBand,
} from './teacherDraftBand.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const contentDir = join(root, 'src/content')

const COPY_FILES = [
  ['zh-Hant', 'teacher-draft-band.json'],
  ['en', 'teacher-draft-band.en.json'],
  ['zh-Hans', 'teacher-draft-band.zh-Hans.json'],
] as const

const STUDENT_FILES = [
  'src/components/SbaQuest.tsx',
  'src/components/SbaAiFeedback.tsx',
  'src/components/SbaSeriesOutline.tsx',
  'src/components/SbaArtworkSlotSwitcher.tsx',
  'src/components/AbilityChart.tsx',
  'src/components/LearningProgressRef.tsx',
  'src/components/SchoolScoreDualStudent.tsx',
  'src/components/SchoolScoreDualFigure.tsx',
  'src/components/FeldmanWriter.tsx',
  'src/components/game/LearningMap.tsx',
  'src/components/game/MapFold.tsx',
  'src/lib/selfAssessment.ts',
  'src/lib/abilityChart.ts',
  'src/lib/sbaAiFeedback.ts',
  'src/lib/progressSync.ts',
  'api/feedback.ts',
]

const STUDENT_LEAK = [
  'practice-emerging',
  'practice-developing',
  'practice-secure',
  'practice-strong',
  'teacher-draft-band',
  'bandPicker',
  'TeacherDraftBand',
  'teacherTips',
]

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(contentDir, name), 'utf8'))
}

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      if (key === 'locale') continue
      const child = (value as Record<string, unknown>)[key]
      out[key] = typeof child === 'string' ? 'string' : shape(child)
    }
    return out
  }
  return typeof value
}

describe('teacher draft band copy', () => {
  it('loads three locales with the same shape and locked ids', () => {
    const shapes: unknown[] = []
    for (const [locale, file] of COPY_FILES) {
      const raw = readJson(file)
      const checked = checkTeacherDraftBandCopy(raw)
      assert.equal(checked.ok, true, checked.ok ? '' : checked.reason)
      if (!checked.ok) continue
      assert.equal(checked.copy.meta.locale, locale)
      assert.equal(checked.copy.meta.audience, 'teacher-only')
      assert.deepEqual(
        checked.copy.bandPicker.bands.map((band) => band.id),
        [...PRACTICE_BAND_IDS],
      )
      assert.deepEqual(
        checked.copy.criteria.rows.map((row) => row.id),
        [...CRITERIA_IDS],
      )
      assert.deepEqual(
        checked.copy.teacherTips.map((tip) => tip.id),
        [...TEACHER_TIP_IDS],
      )
      shapes.push(shape(raw))
    }
    assert.deepEqual(shapes[1], shapes[0])
    assert.deepEqual(shapes[2], shapes[0])
  })

  it('falls back to zh-Hant when a locale pack is missing', () => {
    assert.equal(pickTeacherDraftBandCopy({ 'zh-Hant': 'hant', en: 'en' }, 'en'), 'en')
    assert.equal(pickTeacherDraftBandCopy({ 'zh-Hant': 'hant' }, 'en'), 'hant')
    assert.equal(pickTeacherDraftBandCopy({ 'zh-Hant': 'hant' }, 'zh-Hans'), 'hant')
    assert.equal(pickTeacherDraftBandCopy({ 'zh-Hant': 'hant', 'zh-Hans': 'hans' }, 'zh-Hans'), 'hans')
  })

  it('refuses a pack that drops the disclaimer or labels an official grade', () => {
    const raw = readJson('teacher-draft-band.json') as { disclaimer: string; bandPicker: { bands: { label: string }[] } }
    const missing = { ...raw, disclaimer: '' }
    assert.equal(checkTeacherDraftBandCopy(missing).ok, false)
    const official = structuredClone(raw)
    official.bandPicker.bands[3].label = '官方 5**'
    const refused = checkTeacherDraftBandCopy(official)
    assert.equal(refused.ok, false)
    if (!refused.ok) assert.equal(refused.reason, 'bands')
  })
})

describe('teacher draft store', () => {
  it('keeps practice bands off the student self-assessment key', () => {
    const selfSource = readFileSync(join(root, 'src/lib/selfAssessment.ts'), 'utf8')
    const selfKey = selfSource.match(/SELF_ASSESSMENT_KEY = '([^']+)'/)?.[1]
    assert.ok(selfKey)
    assert.notEqual(TEACHER_DRAFT_BAND_KEY, selfKey)
    const saved = withSavedBand(emptyTeacherDraftStore(), '  4A  ', 'practice-strong')
    assert.equal(saved.portfolios['4A'], 'practice-strong')
    assert.equal(bandForPortfolio(saved, '4A'), 'practice-strong')
    assert.equal(JSON.stringify(saved).includes('self-'), false)
    assert.equal(withSavedBand(saved, '4A', 'not-a-band' as 'practice-strong').portfolios['4A'], 'practice-strong')
  })

  it('drops numeric marks and self-assessment ids', () => {
    const clean = sanitizeTeacherDraftStore({
      version: 1,
      activePortfolio: ' 4A ',
      portfolios: {
        '4A': 'practice-secure',
        'self-aw': '4',
        'self-rwb-1': 'practice-emerging',
        other: '5',
        '5**': 'practice-strong',
      },
    })
    assert.equal(clean.activePortfolio, ' 4A ')
    assert.deepEqual(clean.portfolios, { '4A': 'practice-secure', '5**': 'practice-strong' })
    assert.deepEqual(sanitizeTeacherDraftStore({ version: 2, portfolios: { A: 'practice-emerging' } }), emptyTeacherDraftStore())
  })

  it('clears one portfolio without touching another', () => {
    const both = withSavedBand(
      withSavedBand(emptyTeacherDraftStore(), 'A', 'practice-emerging'),
      'B',
      'practice-developing',
    )
    const cleared = withClearedBand(both, 'A')
    assert.equal(cleared.portfolios.A, undefined)
    assert.equal(cleared.portfolios.B, 'practice-developing')
    assert.equal(both.portfolios.A, 'practice-emerging')
  })
})

describe('student pilot path', () => {
  it('does not mount draft bands on student SBA, map, or AI files', () => {
    for (const file of STUDENT_FILES) {
      const source = readFileSync(join(root, file), 'utf8')
      for (const token of STUDENT_LEAK) {
        assert.equal(source.includes(token), false, `${file} contains ${token}`)
      }
    }
    const quest = readFileSync(join(root, 'src/components/SbaQuest.tsx'), 'utf8')
    const chart = readFileSync(join(root, 'src/components/AbilityChart.tsx'), 'utf8')
    const progress = readFileSync(join(root, 'src/components/LearningProgressRef.tsx'), 'utf8')
    assert.doesNotMatch(quest, /SelfLevelSelect|setSelfSelect/)
    assert.doesNotMatch(chart, /SelfLevelSelect|setSelfSelect/)
    assert.match(chart, /LearningProgressRef/)
    assert.match(progress, /score-student/)
    assert.doesNotMatch(progress, /<select|setSelfSelect/)
  })

  it('gates the staff page in App and keeps the student tabs and footer', () => {
    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
    const sidebar = readFileSync(join(root, 'src/components/Sidebar.tsx'), 'utf8')
    const content = readFileSync(join(root, 'src/i18n/content.ts'), 'utf8')
    assert.match(app, /activeTab === 'staff' && showStaffNav/)
    assert.match(app, /CommitmentFooter/)
    assert.match(app, /SbaQuest/)
    assert.match(app, /LearningMap/)
    const portfolio = app.split("activeTab === 'portfolio'")[1]?.split("activeTab === 'library'")[0] ?? ''
    assert.match(portfolio, /SbaQuest/)
    assert.doesNotMatch(portfolio, /TeacherDraftBand|practice-emerging|bandPicker/)
    const tabsBlock = sidebar.slice(sidebar.indexOf('export const TABS'), sidebar.indexOf('export const STAFF_TAB'))
    assert.doesNotMatch(tabsBlock, /staff/)
    assert.match(content, /teacher-draft-band/)
  })
})
