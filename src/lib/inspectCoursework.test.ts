import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  bankIdForGrade,
  emptyInspectPracticeStore,
  parseInspectBank,
  summarizePractice,
  withDraftText,
  withSubmittedMcq,
  withSubmittedText,
  type InspectBank,
  type InspectGrade,
} from './inspectPractice.ts'
import {
  demoInspectClass,
  inspectDisplayName,
  sanitizeInspectClass,
  sortWorkList,
  statusForStudent,
  withAddedStudent,
  withAttention,
} from './inspectClass.ts'
import {
  REPORT_DISCLAIMER,
  confirmedPracticeBand,
  inspectExportDate,
  joinRecord,
  learningProgressFilename,
  renderInspectReportHtml,
  studyForName,
} from './inspectReport.ts'
import { emptyTeacherDraftStore, withSavedBand } from './teacherDraftBand.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const F4_UNITS = [
  'F4-U1-ORIENT',
  'F4-U2-DRAW-DESIGN',
  'F4-U3-COMMUNITY',
  'F4-U4-SELF-RESEARCH',
  'F4-U5-ART-HIST',
  'F4-U6-THEME-SEEDS',
  'F4-U7-EXAM-STRUCT',
]
const F5_UNITS = [
  'F5-U1-ORIENT',
  'F5-U2-AESTHETIC',
  'F5-U3-HERITAGE',
  'F5-U4-SYMBOL',
  'F5-U5-ROLE',
  'F5-U6-CONTEMP',
  'F5-U7-PORTFOLIO',
]
const F6_UNITS = ['F6-U1-ORIENT', 'F6-U2-MINGQING', 'F6-U3-DAILY', 'F6-U4-LITERATI', 'F6-U5-ROLE', 'F6-U6-PORTFOLIO']
const AXES = ['theme', 'research', 'media', 'process', 'reflect', 'visual']

const BANNED = /HKEAA|真題|真题|公開試卷|公开试卷|S\.4|S\.5|S\.6|學生面|学生面|教師面|教师面|Soft Coord|Soft QA|Soft SCOUT|\bSoft\b|hearts|競技場|竞技场|ArtInSight|洞察藝術|洞察艺术/

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

function bank(name: string): InspectBank {
  const parsed = parseInspectBank(JSON.parse(read(`src/content/${name}`)))
  if (!parsed) throw new Error(name)
  return parsed
}

describe('in-school practice bank', () => {
  it('keeps 15, 15, and 14 items, one multiple choice per unit, and the six axes', () => {
    const files = [
      ['inspect-f4.json', 'f4', 15, F4_UNITS],
      ['inspect-f5.json', 'f5', 15, F5_UNITS],
      ['inspect-f6.json', 'f6', 14, F6_UNITS],
    ] as const
    let total = 0
    for (const [file, grade, count, units] of files) {
      for (const suffix of ['', '.zh-Hans', '.en']) {
        const named = bank(`inspect-${grade}${suffix}.json`)
        assert.equal(named.grade, grade)
        assert.equal(named.items.length, count, `${file}${suffix}`)
        assert.equal(named.version, 1)
        assert.equal(bankIdForGrade(grade), `inspect-${grade}`)
        const mcq = named.items.filter((item) => item.type === 'mcq')
        const longs = named.items.filter((item) => item.type === 'long')
        const process = named.items.filter((item) => item.type === 'sba-process')
        assert.deepEqual(mcq.map((item) => item.unitId), [...units])
        assert.equal(longs.length, 2)
        assert.deepEqual(process.map((item) => item.axis), AXES)
        assert.equal(mcq.length + longs.length + process.length, count)
        if (suffix === '') total += count
      }
    }
    assert.equal(total, 44)
  })

  it('shuffles multiple choice so the correct option is not always A, and keeps the index in sync', () => {
    const locales = ['inspect-f4.json', 'inspect-f4.zh-Hans.json', 'inspect-f4.en.json']
    const answers = new Set<number>()
    for (const file of locales) {
      const parsed = bank(file)
      for (const item of parsed.items) {
        if (item.type !== 'mcq') continue
        assert.ok(item.answer != null && item.answer >= 1 && item.answer <= 3, item.id)
        answers.add(item.answer)
        assert.equal(item.options?.length, 4)
      }
    }
    assert.ok(answers.size >= 2)
    const hant = bank('inspect-f4.json')
    const hans = bank('inspect-f4.zh-Hans.json')
    const en = bank('inspect-f4.en.json')
    for (const item of hant.items.filter((row) => row.type === 'mcq')) {
      const zh = hans.items.find((row) => row.id === item.id)
      const english = en.items.find((row) => row.id === item.id)
      assert.equal(zh?.answer, item.answer)
      assert.equal(english?.answer, item.answer)
    }
    const first = hant.items.find((item) => item.id === 'INS-F4-U1-MC')
    assert.ok(first?.options?.[first.answer ?? 0].includes('研究工作簿'))
    assert.equal(first?.options?.[0].includes('研究工作簿'), false)
    const english = en.items.find((item) => item.id === 'INS-F4-U1-MC')
    assert.ok(english?.options?.[english.answer ?? 0].toLowerCase().includes('research workbook'))
    const simplified = hans.items.find((item) => item.id === 'INS-F4-U1-MC')
    assert.ok(simplified?.options?.[simplified.answer ?? 0].includes('研究工作簿'))
  })

  it('marks a submitted multiple choice locally and only counts a written answer after submit', () => {
    const parsed = bank('inspect-f4.json')
    const mcq = parsed.items.find((item) => item.id === 'INS-F4-U1-MC')
    assert.ok(mcq)
    const correct = withSubmittedMcq(emptyInspectPracticeStore(), '示例同學甲', mcq.id, mcq.answer ?? 0)
    const wrong = withSubmittedMcq(emptyInspectPracticeStore(), '示例同學甲', mcq.id, ((mcq.answer ?? 0) + 1) % 4)
    const empty = emptyInspectPracticeStore()
    const draft = withDraftText(empty, '示例同學甲', 'INS-F4-LQ-APPREC', '三段觀察')
    const sent = withSubmittedText(draft, '示例同學甲', 'INS-F4-LQ-APPREC', '三段觀察')
    const blank = withSubmittedText(empty, '示例同學甲', 'INS-F4-LQ-THEME', '   ')
    const right = summarizePractice(parsed, correct.byName['示例同學甲'])
    const missed = summarizePractice(parsed, wrong.byName['示例同學甲'])
    const written = summarizePractice(parsed, sent.byName['示例同學甲'])
    const held = summarizePractice(parsed, draft.byName['示例同學甲'])
    assert.equal(right.mcCorrect, 1)
    assert.equal(right.mcTotal, 7)
    assert.equal(right.submitted, 1)
    assert.equal(missed.mcCorrect, 0)
    assert.equal(missed.submitted, 1)
    assert.equal(written.writtenDone, 1)
    assert.equal(written.writtenTotal, 8)
    assert.equal(held.writtenDone, 0)
    assert.equal(blank, empty)
  })

  it('keeps lesson quizzes and the painting and design papers free of this bank', () => {
    for (const file of [
      'src/content/f4-demo.json',
      'src/content/f5-demo.json',
      'src/content/f6-demo.json',
      'src/content/paint-set3.json',
      'src/content/design-set3.json',
    ]) {
      assert.equal(read(file).includes('INS-F4-'), false, file)
      assert.equal(read(file).includes('inspect-f4'), false, file)
    }
  })
})

describe('class status', () => {
  it('flags missing, behind, and attention without turning the list into a ranking', () => {
    const base = {
      grade: 'f4' as InspectGrade,
      manualAttention: false,
      completedUnitCount: null,
      othersCompletedUnits: false,
      hasArtwork: false,
      hasResearch: false,
      hasConfirmedBand: false,
    }
    const none = statusForStudent({ ...base, submitted: 0, total: 15 })
    assert.equal(none.missing, true)
    assert.equal(none.behind, true)
    assert.equal(none.attention, true)
    assert.equal(none.steady, false)

    const ten = statusForStudent({ ...base, submitted: 10, total: 15, hasConfirmedBand: true })
    assert.equal(ten.missing, true)
    assert.equal(ten.behind, false)
    assert.equal(ten.attention, false)

    const half = statusForStudent({ ...base, submitted: 7, total: 15, hasConfirmedBand: true })
    assert.equal(half.behind, true)
    assert.equal(half.attention, true)

    const formSix = statusForStudent({ ...base, grade: 'f6', submitted: 7, total: 14, hasConfirmedBand: true })
    assert.equal(formSix.behind, false)
    assert.equal(statusForStudent({ ...base, grade: 'f6', submitted: 6, total: 14, hasConfirmedBand: true }).behind, true)

    const done = statusForStudent({
      ...base,
      submitted: 15,
      total: 15,
      hasConfirmedBand: true,
    })
    assert.deepEqual(done, { missing: false, behind: false, attention: false, steady: true })

    const noBand = statusForStudent({ ...base, submitted: 15, total: 15 })
    assert.equal(noBand.attention, true)
    assert.equal(noBand.steady, false)

    const artworkOnly = statusForStudent({ ...base, submitted: 15, total: 15, hasArtwork: true })
    assert.equal(artworkOnly.attention, false)

    const manual = statusForStudent({ ...base, submitted: 15, total: 15, hasConfirmedBand: true, manualAttention: true })
    assert.equal(manual.attention, true)
    assert.equal(manual.missing, false)

    const noGrade = statusForStudent({ ...base, grade: null, submitted: 0, total: 0 })
    assert.equal(noGrade.missing, false)
    assert.equal(noGrade.attention, true)

    const lagging = statusForStudent({
      ...base,
      submitted: 15,
      total: 15,
      hasConfirmedBand: true,
      completedUnitCount: 0,
      othersCompletedUnits: true,
    })
    assert.equal(lagging.behind, true)
    assert.equal(lagging.attention, false)

    const rows = [
      { id: 'steady', status: done },
      { id: 'behind', status: lagging },
      { id: 'missing', status: ten },
      { id: 'attention', status: none },
    ]
    assert.deepEqual(
      sortWorkList(rows).map((row) => row.id),
      ['attention', 'missing', 'behind', 'steady'],
    )
    const overview = read('src/components/InspectClassOverview.tsx')
    assert.equal(/第\s*\d+\s*名|trophy|hearts|streak|🔥|★/.test(overview), false)
  })

  it('stores example names separately from a teacher-typed name and keeps an empty list honest', () => {
    const demos = demoInspectClass()
    const names = { a: '示例同學甲', b: '示例同學乙', c: '示例同學丙' }
    assert.equal(inspectDisplayName(demos.students[0], names), '示例同學甲')
    assert.equal(demos.students[0].demoId, 'a')
    const added = withAddedStudent(demos, '  課室同學  ', 'f5')
    assert.equal(added.students.at(-1)?.name, '課室同學')
    assert.equal(added.students.at(-1)?.grade, 'f5')
    assert.equal(withAddedStudent(added, '課室同學', 'f4'), added)
    const marked = withAttention(added, 'demo-a', true)
    assert.equal(marked.students[0].manualAttention, true)
    assert.equal(sanitizeInspectClass({ version: 1, students: [] }).students.length, 0)
    assert.equal(sanitizeInspectClass({ version: 2, students: demos.students }).students.length, 0)
  })
})

describe('learning progress report', () => {
  it('locks the disclaimer, the filename, and the teacher-confirmed band', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    assert.equal(hant['inspect.report.disclaimer'], REPORT_DISCLAIMER['zh-Hant'])
    assert.equal(hans['inspect.report.disclaimer'], REPORT_DISCLAIMER['zh-Hans'])
    assert.equal(en['inspect.report.disclaimer'], REPORT_DISCLAIMER.en)
    assert.equal(hant['inspect.report.printHint'], '預覽無問題之後，先列印或下載。')
    assert.equal(hans['inspect.report.printHint'], '预览没有问题之后，再打印或下载。')
    assert.equal(hans['inspect.report.printHint'].includes('列印'), false)
    assert.equal(hant['tab.staff'], '評分參考')
    assert.equal(hant['practice.paperPaint'], '畫畫卷（視覺形式表達）')
    assert.equal(hant['map.grade.f4'], '中四')
    assert.equal(en['map.grade.f4'], 'Form 4')
    assert.equal(hant['inspect.demo.a'], '示例同學甲')
    assert.equal(en['inspect.demo.a'], 'Sample student A')

    const morning = new Date('2026-11-10T16:30:00Z')
    assert.equal(inspectExportDate(morning), '2026-11-11')
    assert.equal(learningProgressFilename(morning), 'learning-progress-20261111')
    assert.equal(/school|校名|學院/.test(learningProgressFilename(morning)), false)

    const saved = withSavedBand(emptyTeacherDraftStore(), '示例同學甲', 'practice-developing')
    assert.equal(confirmedPracticeBand(saved, '示例同學甲'), 'practice-developing')
    assert.equal(confirmedPracticeBand(saved, '示例同學乙'), null)
    const reportLib = read('src/lib/inspectReport.ts')
    assert.equal(/approxBand|studentVisibleBand|SCHOOL_SCORE_LATER|5\*\*/.test(reportLib), false)

    const active = studyForName(true, {
      completedUnitTitles: ['視藝入門'],
      artworkLines: ['作品 1'],
      researchLines: [],
    })
    assert.equal(active.completedUnitCount, 1)
    assert.equal(active.hasArtwork, true)
    assert.equal(active.hasResearch, false)
    const other = studyForName(false, { completedUnitTitles: ['視藝入門'], artworkLines: ['作品 1'], researchLines: [] })
    assert.equal(other.completedUnitCount, null)
    assert.equal(other.hasArtwork, false)
    assert.equal(joinRecord(['  ', '作品 1', '作品 1']), '作品 1')

    const html = renderInspectReportHtml({
      lang: 'zh-Hant-HK',
      title: hant['inspect.staff.reportTitle'],
      disclaimer: hant['inspect.report.disclaimer'],
      filename: learningProgressFilename(morning),
      sections: [
        {
          name: '示例同學甲',
          rows: [
            { label: hant['inspect.report.band'], value: hant['score.v1.band.developing'] },
            { label: hant['inspect.report.practice'], value: '選擇題：1／7 題答對\n長題同過程練習：0／8 題已交' },
          ],
        },
        { name: '   ', rows: [] },
      ],
    })
    assert.match(html, /呢份報告係校內參考，唔係公開試正式成績。/)
    assert.match(html, /發展中/)
    assert.match(html, /<br>/)
    assert.equal(html.includes('mailto:'), false)
    assert.equal(/5\*\*|HKEAA|<img|校徽/.test(html), false)
    assert.equal(html.includes('<h2>'), true)
    assert.equal(html.includes('<h2>   </h2>'), false)
  })
})

describe('both maps and the staff gate', () => {
  it('sends the quest map and the classic map to the same practice loader', () => {
    const quest = read('src/components/game/MapQuest.tsx')
    const classic = read('src/components/game/LearningMap.tsx')
    const entry = read('src/components/InspectMapEntry.tsx')
    const practice = read('src/components/InspectPractice.tsx')
    const papers = read('src/components/PracticePapers.tsx')
    assert.match(quest, /InspectMapEntry/)
    assert.match(classic, /InspectMapEntry/)
    assert.match(entry, /requestOpenInspect/)
    assert.match(practice, /contentJson<unknown>\(`inspect-\$\{grade\}`\)/)
    assert.match(papers, /<InspectPractice/)
    assert.match(papers, /group === 'papers' \? \([\s\S]*data-practice-banner/)
    assert.equal(quest.includes('inspect-f4.json'), false)
    assert.equal(classic.includes('inspect-f4.json'), false)
    assert.equal(practice.includes('InspectClassOverview'), false)
    assert.equal(/S\.4|S\.5|S\.6/.test(entry + practice), false)
  })

  it('keeps the new blocks on the staff page and leaves the existing score blocks in place', () => {
    const page = read('src/components/TeacherDraftBand.tsx')
    const staff = page.indexOf('<SchoolScoreStaff />')
    const dual = page.indexOf('<SchoolScoreDualStaff />')
    const later = page.indexOf('<SchoolScoreLaterStaff />')
    const draft = page.indexOf('<TeacherDraftBandPage')
    const overview = page.indexOf('<InspectClassOverview')
    const report = page.indexOf('<InspectReport')
    const denied = page.indexOf('if (!role) return <StaffDenied />')
    assert.ok(denied >= 0 && overview > denied && report > overview)
    assert.ok(staff > report && dual > staff && later > dual && draft > later)
    const app = read('src/App.tsx')
    assert.match(app, /activeTab === 'staff' && showStaffNav/)
    assert.equal(app.includes('InspectClassOverview'), false)
    assert.equal(messages('src/i18n/zh-Hant.json')['inspect.staff.backToPreview'], '返回預覽')
    assert.equal(messages('src/i18n/en.json')['inspect.staff.backToPreview'], 'Back to preview')
    for (const file of [
      'src/components/InspectPractice.tsx',
      'src/components/InspectClassOverview.tsx',
      'src/components/InspectReport.tsx',
      'src/components/InspectMapEntry.tsx',
    ]) {
      assert.equal(BANNED.test(read(file)), false, file)
    }
    for (const file of ['src/content/inspect-f4.json', 'src/content/inspect-f5.json', 'src/content/inspect-f6.json']) {
      assert.equal(BANNED.test(read(file)), false, file)
      assert.match(read(file), /校內練習/)
    }
  })
})
