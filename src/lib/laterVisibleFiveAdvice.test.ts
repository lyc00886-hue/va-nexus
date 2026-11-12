import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  FORMATIVE_COMMENT_PATH,
  formativeAxisLabels,
  formativeCommentSystem,
  formativeUserPrompt,
  parseFormativeModelText,
} from './formativeAiComment.ts'
import { ARTWORK_AXIS_IDS, RWB_AXIS_IDS, formativeForBand } from './schoolScoreDual.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  aiReferenceAxes,
  aiReferenceFormative,
  applyModelComment,
  formatLaterVisible,
  laterPageSide,
  laterPageSides,
  laterRadarView,
  sanitizeLaterStore,
  withUploadedFile,
} from './schoolScoreLater.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const COMMENT = '樽同缺口杯有前後層次，左窗光令空間再企穩啲。'
const ART = { 'aw-1': 3.5, 'aw-2': 4.5, 'aw-3': 2, 'aw-4': 5, 'aw-5': 4, 'aw-6': 2.5 } as const
const RWB = { 'rwb-1': 2, 'rwb-2': 3, 'rwb-3': 4, 'rwb-4': 5 } as const
const AW = {
  'aw-1': '樽口轉折仍然太圓，可以再收窄一點。',
  'aw-2': '左窗光同蘋果受光方向可以再集中。',
  'aw-3': '日常物同主題嘅連結仍然短，可以再寫一句。',
  'aw-4': '側影已有新角度，缺口可以再推深。',
  'aw-5': '杯同蘋果訊息清楚，受光可以再統一。',
  'aw-6': '呢一件同上一件變化仍然有限，可以再拉開。',
} as const
const WB = {
  'rwb-1': '呢份工作簿可以再寫低一次失敗試驗點解放棄。',
  'rwb-2': '評賞段落要連返自己樽嘅缺口，而家仲係分開。',
  'rwb-3': '媒介試驗只得一種鉛筆，可以再試淡彩同刻線。',
  'rwb-4': '反思只係一句完成，可以按每頁寫低改過咩。',
} as const

const PALE_WORK = {
  en: 'A tailored improvement note for this axis and this work is not available yet.',
  'zh-Hant': '暫時未有跟呢條軸、跟呢份作品嘅改進建議。',
  'zh-Hans': '暂时未有跟这条轴、跟这份作品的改进建议。',
} as const

const PALE_BOOK = {
  en: 'A tailored improvement note for this axis and this research workbook is not available yet.',
  'zh-Hant': '暫時未有跟呢條軸、跟呢份研究工作簿嘅改進建議。',
  'zh-Hans': '暂时未有跟这条轴、跟这份研究工作簿的改进建议。',
} as const

function messages(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, string>
}

describe('unofficial visible 5', () => {
  it('shows 5／5 for an explicit 5 and does not cap it at the 良好 band value', () => {
    assert.equal(formativeForBand('practice-strong'), 4.5)
    assert.equal(formativeForBand('practice-emerging'), 1.25)
    assert.equal(formativeForBand('practice-developing'), 2.5)
    assert.equal(formativeForBand('practice-secure'), 3.5)
    const draft = withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf')
    const model = applyModelComment(draft, {
      comment: COMMENT,
      band: 'practice-strong',
      score: 5,
      axes: { ...ART },
      advice: { ...AW },
    })
    assert.equal(model.approxBand, 'practice-strong')
    assert.equal(model.approxValue, 5)
    assert.equal(model.omitTopBandScore, false)
    assert.equal(aiReferenceFormative(model), 5)
    assert.notEqual(aiReferenceFormative(model), 4.5)
    assert.equal(formatLaterVisible(aiReferenceFormative(model) ?? 0), '5／5')
    const parsed = parseFormativeModelText(
      JSON.stringify({ comment: COMMENT, band: 'practice-strong', score: 5, axes: { 'aw-1': 5 } }),
    )
    assert.equal(parsed?.band, 'practice-strong')
    assert.equal(parsed?.score, 5)
    const slash = parseFormativeModelText(
      JSON.stringify({ comment: COMMENT, band: 'practice-strong', score: '5／5', axes: { 'aw-1': 5 } }),
    )
    assert.equal(slash?.score, 5)
    const fromBand = parseFormativeModelText(JSON.stringify({ comment: COMMENT, band: 5, axes: { 'aw-1': 5 } }))
    assert.equal(fromBand?.band, 'practice-strong')
    assert.equal(fromBand?.score, 5)
    const honest = applyModelComment(draft, { comment: COMMENT, band: 'practice-strong', score: 4.5, axes: { ...ART } })
    assert.equal(honest.approxValue, 4.5)
    assert.equal(formatLaterVisible(honest.approxValue ?? 0), '4.5／5')
    assert.equal(honest.omitTopBandScore, false)
  })

  it('does not invent 4.5 when a new top-band result omits score, and leaves an older stored 4.5 visible', () => {
    const draft = withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf')
    const held = applyModelComment(draft, { comment: COMMENT, band: 'practice-strong', axes: { ...ART } })
    assert.equal(held.aiStatus, 'model')
    assert.equal(held.approxValue, null)
    assert.equal(held.omitTopBandScore, true)
    assert.equal(aiReferenceFormative(held), null)
    assert.notEqual(aiReferenceFormative(held), 4.5)
    const named = parseFormativeModelText(JSON.stringify({ comment: COMMENT, band: '良好' }))
    assert.equal(named?.band, 'practice-strong')
    assert.equal(named?.score, null)
    const secure = applyModelComment(draft, { comment: COMMENT, band: 'practice-secure' })
    assert.equal(aiReferenceFormative(secure), 3.5)
    assert.equal(secure.omitTopBandScore, false)
    const legacy = sanitizeLaterStore({
      version: 1,
      draft: {
        fileName: 'VA SBA123全.pdf',
        fileSize: 1200,
        mime: 'application/pdf',
        approxBand: 'practice-strong',
        aiStatus: 'model',
        aiComment: COMMENT,
        pages: [{ fileName: 'VA SBA123全.pdf', fileSize: 1200, mime: 'application/pdf', side: 'artwork' }],
      },
    })
    assert.equal(legacy.draft?.approxValue, null)
    assert.equal(legacy.draft?.omitTopBandScore, false)
    assert.equal(aiReferenceFormative(legacy.draft!), 4.5)
    const round = sanitizeLaterStore({ version: 1, draft: held })
    assert.equal(round.draft?.omitTopBandScore, true)
    assert.equal(round.draft?.approxValue, null)
    assert.equal(aiReferenceFormative(round.draft!), null)
  })
})

describe('workbook and artwork axis advice', () => {
  it('keeps a tailored workbook note only when a workbook side is present', () => {
    assert.equal(laterPageSide('VA SBA123全.pdf'), 'artwork')
    assert.deepEqual(laterPageSides('VA SBA123全.pdf'), ['artwork'])
    assert.equal(laterPageSide('Sba full marks _09_18_2025.pdf'), 'artwork')
    assert.equal(laterPageSide('研究工作簿.pdf'), 'research_workbook')
    assert.deepEqual(laterPageSides('my workbook.pdf'), ['research_workbook'])
    assert.deepEqual(laterPageSides('作品及研究工作簿.pdf'), ['artwork', 'research_workbook'])

    const combined = applyModelComment(withUploadedFile(null, '作品及研究工作簿.pdf', 1200, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, ...RWB },
      advice: { ...AW, ...WB },
    })
    const both = laterRadarView(combined)
    assert.deepEqual(both.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(both.workbook, [2, 3, 4, 5])
    for (const id of ARTWORK_AXIS_IDS) assert.equal(combined.aiAdvice[id], AW[id])
    for (const id of RWB_AXIS_IDS) assert.equal(combined.aiAdvice[id], WB[id])
    assert.notEqual(combined.aiAdvice['aw-1'], combined.aiAdvice['rwb-1'])
    assert.notEqual(combined.aiAdvice['rwb-1'], combined.aiAdvice['rwb-2'])

    const ordinary = applyModelComment(withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, ...RWB },
      advice: { ...AW, ...WB },
    })
    const ordinaryView = laterRadarView(ordinary)
    assert.ok(ordinaryView.artwork)
    assert.equal(ordinaryView.workbook, null)
    assert.equal(ordinaryView.workbookPending, false)
    assert.equal(ordinaryView.artworkPending, false)
    assert.equal(ordinary.aiAdvice['aw-1'], AW['aw-1'])
    assert.equal(ordinary.aiAdvice['rwb-1'], undefined)
    assert.equal(ordinary.aiAdvice['rwb-4'], undefined)

    const workbook = applyModelComment(withUploadedFile(null, '研究工作簿.pdf', 800, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3,
      axes: { ...RWB, ...ART },
      advice: { ...AW, ...WB },
    })
    const bookView = laterRadarView(workbook)
    assert.equal(bookView.artwork, null)
    assert.equal(bookView.artworkPending, false)
    assert.deepEqual(bookView.workbook, [2, 3, 4, 5])
    assert.equal(workbook.aiAdvice['aw-1'], undefined)
    assert.equal(workbook.aiAdvice['rwb-1'], WB['rwb-1'])
    const missing = applyModelComment(withUploadedFile(null, 'my workbook.pdf', 800, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3,
      axes: { ...RWB },
      advice: { 'rwb-1': WB['rwb-1'] },
    })
    assert.equal(missing.aiAdvice['rwb-1'], WB['rwb-1'])
    assert.equal(missing.aiAdvice['rwb-2'], undefined)
    assert.equal(missing.aiAdvice['aw-1'], undefined)
    const shared = '同一句唔可以套去第二條軸上面。'
    const repeated = applyModelComment(withUploadedFile(null, '研究工作簿.pdf', 800, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3,
      axes: { ...RWB },
      advice: { 'rwb-1': shared, 'rwb-2': shared, 'rwb-3': WB['rwb-3'] },
    })
    assert.equal(repeated.aiAdvice['rwb-1'], undefined)
    assert.equal(repeated.aiAdvice['rwb-2'], undefined)
    assert.equal(repeated.aiAdvice['rwb-3'], WB['rwb-3'])
    const echoed = applyModelComment(withUploadedFile(null, '研究工作簿.pdf', 800, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3,
      axes: { ...RWB },
      advice: { 'rwb-1': PALE_BOOK['zh-Hant'], 'aw-1': PALE_WORK['zh-Hant'] },
    })
    assert.equal(echoed.aiAdvice['rwb-1'], undefined)
    assert.equal(echoed.aiAdvice['aw-1'], undefined)
  })

  it('does not draw a radar or copy the overall score onto a missing axis', () => {
    const draft = withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf')
    const partial = applyModelComment(draft, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 4,
      axes: { 'aw-1': 3, 'aw-2': 4, 'aw-3': 2, 'aw-4': 5, 'aw-5': 4 },
    })
    assert.equal(partial.aiAxes['aw-6'], undefined)
    assert.notEqual(partial.aiAxes['aw-6'], partial.approxValue)
    assert.equal(laterRadarView(partial).artwork, null)
    assert.equal(laterRadarView(partial).artworkPending, true)
    assert.equal(aiReferenceAxes(partial, ARTWORK_AXIS_IDS), null)
    assert.equal(aiReferenceAxes(partial, RWB_AXIS_IDS), null)
  })

  it('asks for a real 5 and for workbook how-to-improve notes only on that side', () => {
    const labels = formativeAxisLabels('zh-Hant').map((axis) => axis.label)
    const system = formativeCommentSystem(labels, 'zh-Hant')
    assert.match(system, /return score as the number 5/)
    assert.match(system, /Do not rewrite, snap, or cap that 5 to 4\.5/)
    assert.match(system, /how to improve this research workbook/)
    assert.match(system, /how to improve this work on that axis/)
    assert.equal(system.includes('5**'), false)
    const book = formativeUserPrompt(['research_workbook'])
    assert.match(book, /Sides to score: research_workbook/)
    assert.match(book, /how to improve this research workbook/)
    assert.equal(book.includes('aw-1'), false)
    assert.equal(book.includes('Sides to score: artwork'), false)
    const art = formativeUserPrompt(['artwork'])
    assert.match(art, /how to improve this work on that axis/)
    assert.equal(art.includes('rwb-1'), false)
  })
})

describe('later advice locale and student surface', () => {
  it('adds only the workbook pale sentence and keeps the existing artwork sentence', () => {
    const files = {
      en: 'src/i18n/en.json',
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = messages(files[locale])
      assert.equal(bag['score.later.axisAdvicePending'], PALE_WORK[locale], locale)
      assert.equal(bag['score.later.axisAdvicePendingWorkbook'], PALE_BOOK[locale], locale)
    }
    const hant = messages('src/i18n/zh-Hant.json')['score.later.axisAdvicePendingWorkbook']
    const mark = [...hant].find((char) => char === '嘅')
    assert.equal(mark?.codePointAt(0), 0x5605)
    assert.equal(hant.includes('\u5699'), false)
    assert.equal(hant.includes('喇'), false)
    assert.equal(hant.includes('咉'), false)
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    assert.equal(overrides['score.later.axisAdvicePendingWorkbook'], PALE_BOOK['zh-Hans'])
    assert.equal(overrides['score.later.axisAdvicePending'], PALE_WORK['zh-Hans'])
    assert.equal(hant, '暫時未有跟呢條軸、跟呢份研究工作簿嘅改進建議。')
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    assert.match(student, /score\.later\.axisAdvicePendingWorkbook/)
    assert.match(student, /score\.later\.axisAdvicePending/)
    assert.match(student, /chart\.id === 'research_workbook' \? 'score\.later\.axisAdvicePendingWorkbook'/)
    assert.match(student, /const showAdvice = chart\.id === 'artwork' \|\| chart\.id === 'research_workbook'/)
    assert.match(student, /if \(accepted\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /if \(getSchoolScoreLater\(\)\.draft\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /if \(replaced\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /score\.later\.removeFile/)
    assert.match(student, /score\.later\.replaceFile/)
    assert.equal(student.includes('score-later-request-ai'), false)
    assert.equal(student.includes('<textarea'), false)
    assert.equal(student.includes('5**'), false)
    assert.equal(SCHOOL_SCORE_LATER_KEY, 'va-nexus:school-score-later:v1')
    assert.equal(FORMATIVE_COMMENT_PATH, '/api/formative-comment')
    assert.equal(ARTWORK_AXIS_IDS.length, 6)
    assert.equal(RWB_AXIS_IDS.length, 4)
  })
})
