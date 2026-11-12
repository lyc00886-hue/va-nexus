import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ARTWORK_AXIS_IDS, DUAL_AXIS_IDS, RWB_AXIS_IDS } from './schoolScoreDual.ts'
import { formativePageSideNote } from './formativeAiComment.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  applyModelComment,
  formatLaterVisible,
  laterPageSide,
  laterPageSides,
  laterRadarView,
  withUploadedFile,
} from './schoolScoreLater.ts'
import {
  acceptLaterFiles,
  getSchoolScoreLater,
  removeLaterFile,
  replaceLaterFile,
  requestLaterComment,
  resetSchoolScoreLaterForTests,
} from './useSchoolScoreLater.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const COMBINED = 'Jessie 作品及研究工作簿.pdf'
const ORDINARY = 'VA SBA123全.pdf'
const WORKBOOK = '研究工作簿.pdf'
const COMMENT = '作品嘅樽口仍然平，研究工作簿入面嘅試驗同反思都見到。'
const LEVELS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const
const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n')

const ART = {
  'aw-1': 3.5,
  'aw-2': 4.5,
  'aw-3': 2,
  'aw-4': 5,
  'aw-5': 4,
  'aw-6': 2.5,
} as const

const RWB = {
  'rwb-1': 2,
  'rwb-2': 3,
  'rwb-3': 4,
  'rwb-4': 5,
} as const

const ADVICE = {
  'aw-1': '鉛筆同淡彩已出反光，但樽口同杯緣轉折仍然平。',
  'aw-2': '缺口杯同蘋果已有前後層次，左窗光可以再清楚。',
  'aw-3': '主題已清楚係日常物，但情境連結仍然短。',
  'aw-4': '側影同缺口已帶出新角度，可以再推深。',
  'aw-5': '日常器物意象已清楚，杯同蘋果受光方向可以再集中。',
  'aw-6': '系列入面呢一件同上一件變化仍然有限。',
} as const

type Sent = { url: string; init?: RequestInit; resolve: (response: Response) => void }
type PostedPage = { side?: string; sides?: string[]; mime?: string; imageBase64?: string }

const pending: Sent[] = []
let restore: (() => void) | null = null

function page(name: string, size = PDF.byteLength): File {
  return { name, size, type: 'application/pdf' } as File
}

function installNet() {
  const originalFetch = globalThis.fetch
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:later-combined'
  URL.revokeObjectURL = () => {}
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith('blob:')) return new Response(PDF)
    return await new Promise<Response>((resolve) => {
      pending.push({ url, init, resolve })
    })
  }
  restore = () => {
    globalThis.fetch = originalFetch
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    pending.splice(0, pending.length)
    restore = null
  }
}

async function waitFor(count: number) {
  for (let i = 0; i < 50; i += 1) {
    if (pending.length >= count) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`expected ${count} formative posts, saw ${pending.length}`)
}

function postedBody(): { url: string; headers: Record<string, string>; raw: string; pages: PostedPage[] } {
  const next = pending[0]
  if (!next) throw new Error('no formative post is waiting')
  const raw = String(next.init?.body ?? '')
  const parsed = JSON.parse(raw) as { pages?: PostedPage[] }
  return {
    url: next.url,
    headers: (next.init?.headers ?? {}) as Record<string, string>,
    raw,
    pages: parsed.pages ?? [],
  }
}

function reply(status: number, body: unknown): void {
  const next = pending.shift()
  if (!next) throw new Error('no formative post is waiting')
  next.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function modelBody(
  axes: Record<string, number>,
  advice: Record<string, string> = {},
  score = 3.5,
  comment = COMMENT,
) {
  return { ok: true, comment, band: 'practice-secure', axes, score, advice }
}

describe('combined later filename', () => {
  it('classifies the full name, and keeps ordinary and workbook-only names on one side', () => {
    assert.deepEqual(laterPageSides('Jessie 作品及研究工作簿'), ['artwork', 'research_workbook'])
    assert.deepEqual(laterPageSides(COMBINED), ['artwork', 'research_workbook'])
    assert.deepEqual(laterPageSides('ARTWORK workbook.PNG'), ['artwork', 'research_workbook'])
    assert.deepEqual(laterPageSides('評賞研究-workbook.pdf'), ['artwork', 'research_workbook'])
    assert.deepEqual(laterPageSides('藝術作品及工作簿.jpg'), ['artwork', 'research_workbook'])
    assert.equal(laterPageSide(COMBINED), 'artwork')
    assert.equal(formativePageSideNote(['artwork', 'research_workbook']), 'Page side: artwork, research_workbook')

    const truncated = 'Jessie 作品及研究工…'
    assert.deepEqual(laterPageSides(truncated), ['artwork'])
    assert.notDeepEqual(laterPageSides(truncated), laterPageSides(COMBINED))

    assert.deepEqual(laterPageSides(ORDINARY), ['artwork'])
    assert.deepEqual(laterPageSides('Sba full marks _09_18_2025.pdf'), ['artwork'])
    assert.deepEqual(laterPageSides('Jessie_revised_1.pdf'), ['artwork'])
    assert.deepEqual(laterPageSides('作品頁 1.jpg'), ['artwork'])
    assert.equal(laterPageSide(ORDINARY), 'artwork')

    assert.deepEqual(laterPageSides(WORKBOOK), ['research_workbook'])
    assert.deepEqual(laterPageSides('my workbook.pdf'), ['research_workbook'])
    assert.deepEqual(laterPageSides('Workbook.PDF'), ['research_workbook'])
    assert.equal(laterPageSide(WORKBOOK), 'research_workbook')
    assert.equal(formativePageSideNote(['research_workbook']), 'Page side: research_workbook')
    assert.equal(formativePageSideNote(['research_workbook']).includes('artwork'), false)

    assert.deepEqual(laterPageSides('course artwork.pdf'), [])
    assert.deepEqual(laterPageSides('練習卷作品.pdf'), [])
    assert.deepEqual(laterPageSides('course artwork workbook.pdf'), [])
    assert.equal(laterPageSide('course artwork.pdf'), null)

    const combined = withUploadedFile(null, COMBINED, 1000, 'application/pdf')
    assert.equal(combined.pages.length, 1)
    assert.equal(combined.pages[0]?.side, 'artwork')
    assert.deepEqual(Object.keys(combined.formalAxes), [...DUAL_AXIS_IDS])
    const ordinary = withUploadedFile(null, ORDINARY, 1000, 'application/pdf')
    assert.deepEqual(Object.keys(ordinary.formalAxes), [...ARTWORK_AXIS_IDS])
    const workbook = withUploadedFile(null, WORKBOOK, 1000, 'application/pdf')
    assert.deepEqual(Object.keys(workbook.formalAxes), [...RWB_AXIS_IDS])
    assert.equal(SCHOOL_SCORE_LATER_KEY, 'va-nexus:school-score-later:v1')
  })

  it('draws each radar from its own axes and does not invent a missing axis', () => {
    const combined = withUploadedFile(null, COMBINED, 1200, 'application/pdf')
    const both = applyModelComment(combined, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, ...RWB },
      advice: { ...ADVICE, 'rwb-1': '研究工作簿呢句唔應該變成作品每軸建議。' },
    })
    const drawn = laterRadarView(both)
    assert.deepEqual(drawn.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(drawn.workbook, [2, 3, 4, 5])
    assert.equal(drawn.artworkPending, false)
    assert.equal(drawn.workbookPending, false)
    assert.equal(both.aiComment, COMMENT)
    assert.equal(both.approxValue, 3.5)
    assert.equal(formatLaterVisible(both.approxValue ?? 0), '3.5／5')
    assert.equal(both.aiAdvice['aw-1'], ADVICE['aw-1'])
    assert.notEqual(both.aiAdvice['aw-1'], both.aiAdvice['aw-6'])
    assert.equal(both.aiAdvice['aw-6'], ADVICE['aw-6'])
    assert.equal(both.aiAdvice['rwb-1'], undefined)
    for (const value of Object.values(both.aiAxes)) assert.equal(LEVELS.includes(value as (typeof LEVELS)[number]), true)

    const artworkFirst = applyModelComment(combined, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 4,
      axes: { ...ART, 'rwb-1': 3, 'rwb-2': 4 },
    })
    assert.equal(artworkFirst.aiAxes['rwb-3'], undefined)
    assert.notEqual(artworkFirst.aiAxes['rwb-3'], 4)
    const artworkReady = laterRadarView(artworkFirst)
    assert.deepEqual(artworkReady.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.equal(artworkReady.workbook, null)
    assert.equal(artworkReady.artworkPending, false)
    assert.equal(artworkReady.workbookPending, true)

    const workbookFirst = applyModelComment(combined, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 4,
      axes: { ...RWB, 'aw-1': 3, 'aw-2': 4, 'aw-3': 2, 'aw-4': 5, 'aw-5': 4 },
    })
    assert.equal(workbookFirst.aiAxes['aw-6'], undefined)
    assert.notEqual(workbookFirst.aiAxes['aw-6'], 4)
    const workbookReady = laterRadarView(workbookFirst)
    assert.equal(workbookReady.artwork, null)
    assert.deepEqual(workbookReady.workbook, [2, 3, 4, 5])
    assert.equal(workbookReady.artworkPending, true)
    assert.equal(workbookReady.workbookPending, false)

    const invented = applyModelComment(combined, { comment: COMMENT, band: 'practice-secure', score: 4 })
    assert.deepEqual(invented.aiAxes, {})
    assert.equal(laterRadarView(invented).artwork, null)
    assert.equal(laterRadarView(invented).workbook, null)
    assert.notDeepEqual(laterRadarView(invented).artwork, [4, 4, 4, 4, 4, 4])
    assert.notDeepEqual(laterRadarView(invented).workbook, [4, 4, 4, 4])

    const ordinary = applyModelComment(withUploadedFile(null, ORDINARY, 1200, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, ...RWB },
    })
    assert.equal(ordinary.aiAxes['rwb-1'], undefined)
    const ordinaryView = laterRadarView(ordinary)
    assert.deepEqual(ordinaryView.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.equal(ordinaryView.workbook, null)
    assert.equal(ordinaryView.workbookPending, false)

    const workbook = applyModelComment(withUploadedFile(null, 'my workbook.pdf', 800, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3,
      axes: { ...ART, 'rwb-1': 2, 'rwb-2': 3 },
    })
    assert.equal(workbook.aiAxes['aw-1'], undefined)
    assert.equal(workbook.aiAxes['rwb-4'], undefined)
    const workbookView = laterRadarView(workbook)
    assert.equal(workbookView.artwork, null)
    assert.equal(workbookView.artworkPending, false)
    assert.equal(workbookView.workbook, null)
    assert.equal(workbookView.workbookPending, true)
    const workbookDone = laterRadarView(
      applyModelComment(withUploadedFile(null, WORKBOOK, 800, 'application/pdf'), {
        comment: COMMENT,
        band: 'practice-secure',
        score: 3,
        axes: { ...ART, ...RWB },
      }),
    )
    assert.equal(workbookDone.artwork, null)
    assert.equal(workbookDone.artworkPending, false)
    assert.deepEqual(workbookDone.workbook, [2, 3, 4, 5])
    assert.equal(workbookDone.workbookPending, false)
  })
})

describe('combined later file request', { concurrency: false }, () => {
  beforeEach(() => {
    pending.splice(0, pending.length)
    resetSchoolScoreLaterForTests()
    installNet()
  })

  afterEach(() => {
    restore?.()
    resetSchoolScoreLaterForTests()
  })

  it('sends one combined file for both scans and still shows the comment', async () => {
    assert.equal(acceptLaterFiles([page(COMBINED)]), true)
    const stored = getSchoolScoreLater().draft
    assert.equal(stored?.fileName, COMBINED)
    assert.equal(stored?.pages.length, 1)
    assert.deepEqual(laterPageSides(stored?.fileName ?? ''), ['artwork', 'research_workbook'])
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const sent = postedBody()
    assert.equal(sent.url, '/api/formative-comment')
    assert.equal(sent.headers.Authorization, undefined)
    assert.equal(sent.raw.includes('Jessie'), false)
    assert.equal(sent.raw.includes('作品及研究工作簿'), false)
    assert.equal(sent.pages.length, 1)
    assert.equal(sent.pages[0]?.side, 'artwork')
    assert.deepEqual(sent.pages[0]?.sides, ['artwork', 'research_workbook'])
    reply(200, modelBody({ ...ART, ...RWB }, { ...ADVICE }))
    assert.equal(await pendingResult, 'model')
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiComment, COMMENT)
    assert.equal(draft?.approxBand, 'practice-secure')
    assert.equal(draft?.approxValue, 3.5)
    assert.equal(draft?.aiAdvice['aw-1'], ADVICE['aw-1'])
    assert.equal(draft?.aiAdvice['rwb-1'], undefined)
    const view = laterRadarView(draft)
    assert.deepEqual(view.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(view.workbook, [2, 3, 4, 5])
    assert.equal(view.artworkPending, false)
    assert.equal(view.workbookPending, false)
  })

  it('keeps a combined file as one of four pages', async () => {
    assert.equal(
      acceptLaterFiles([
        page(COMBINED, 100),
        page(ORDINARY, 200),
        page('Sba full marks.pdf', 300),
        page(WORKBOOK, 400),
      ]),
      true,
    )
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const sent = postedBody()
    assert.equal(sent.pages.length, 4)
    const combinedPages = sent.pages.filter((item) => item.sides?.length === 2)
    assert.equal(combinedPages.length, 1)
    assert.deepEqual(combinedPages[0]?.sides, ['artwork', 'research_workbook'])
    assert.equal(sent.pages.filter((item) => item.side === 'artwork' && item.sides == null).length, 2)
    assert.equal(sent.pages.filter((item) => item.side === 'research_workbook' && item.sides == null).length, 1)
    reply(200, modelBody({ ...ART, ...RWB }))
    assert.equal(await pendingResult, 'model')
  })

  it('sends an ordinary name as artwork and a workbook-only name without the artwork pending side', async () => {
    assert.equal(acceptLaterFiles([page(ORDINARY)]), true)
    const ordinaryRequest = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const ordinarySent = postedBody()
    assert.equal(ordinarySent.pages.length, 1)
    assert.equal(ordinarySent.pages[0]?.side, 'artwork')
    assert.equal(ordinarySent.pages[0]?.sides, undefined)
    reply(200, modelBody({ ...ART, ...RWB }))
    assert.equal(await ordinaryRequest, 'model')
    assert.equal(laterRadarView(getSchoolScoreLater().draft).workbook, null)
    assert.equal(laterRadarView(getSchoolScoreLater().draft).workbookPending, false)

    resetSchoolScoreLaterForTests()
    pending.splice(0, pending.length)
    assert.equal(acceptLaterFiles([page('my workbook.pdf')]), true)
    const workbookRequest = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const workbookSent = postedBody()
    assert.equal(workbookSent.pages.length, 1)
    assert.equal(workbookSent.pages[0]?.side, 'research_workbook')
    assert.equal(workbookSent.pages[0]?.sides, undefined)
    assert.equal(JSON.stringify(workbookSent.pages[0]?.sides ?? []).includes('artwork'), false)
    reply(200, modelBody({ ...ART, ...RWB }, { ...ADVICE }))
    assert.equal(await workbookRequest, 'model')
    const view = laterRadarView(getSchoolScoreLater().draft)
    assert.equal(view.artwork, null)
    assert.equal(view.artworkPending, false)
    assert.deepEqual(view.workbook, [2, 3, 4, 5])
    assert.equal(getSchoolScoreLater().draft?.aiAxes['aw-1'], undefined)
  })

  it('removes and replaces a file, then requests again from the names that remain', async () => {
    assert.equal(acceptLaterFiles([page(ORDINARY, 100), page(COMBINED, 200)]), true)
    const first = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    assert.equal(removeLaterFile(ORDINARY), true)
    assert.deepEqual(getSchoolScoreLater().draft?.pages.map((item) => item.fileName), [COMBINED])
    assert.equal(getSchoolScoreLater().draft?.aiComment, null)
    const second = requestLaterComment('zh-Hant', false)
    await waitFor(2)
    reply(200, modelBody({ ...ART }))
    assert.equal(await first, 'idle')
    const sent = postedBody()
    assert.equal(sent.pages.length, 1)
    assert.deepEqual(sent.pages[0]?.sides, ['artwork', 'research_workbook'])
    reply(200, modelBody({ ...ART, ...RWB }, { ...ADVICE }))
    assert.equal(await second, 'model')
    assert.equal(getSchoolScoreLater().draft?.aiComment, COMMENT)
    assert.ok(laterRadarView(getSchoolScoreLater().draft).artwork)
    assert.ok(laterRadarView(getSchoolScoreLater().draft).workbook)

    assert.equal(replaceLaterFile(COMBINED, page(WORKBOOK, 300)), true)
    assert.equal(getSchoolScoreLater().draft?.fileName, WORKBOOK)
    assert.equal(getSchoolScoreLater().draft?.aiComment, null)
    const replaced = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const workbookSent = postedBody()
    assert.equal(workbookSent.pages[0]?.side, 'research_workbook')
    assert.equal(workbookSent.pages[0]?.sides, undefined)
    reply(200, modelBody({ ...RWB, ...ART }))
    assert.equal(await replaced, 'model')
    const after = laterRadarView(getSchoolScoreLater().draft)
    assert.equal(after.artwork, null)
    assert.equal(after.artworkPending, false)
    assert.deepEqual(after.workbook, [2, 3, 4, 5])

    assert.equal(replaceLaterFile(WORKBOOK, page('作品頁 新.png', 400)), true)
    const artworkAgain = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const artworkSent = postedBody()
    assert.equal(artworkSent.pages[0]?.side, 'artwork')
    assert.equal(artworkSent.pages[0]?.sides, undefined)
    reply(200, modelBody({ ...ART, 'aw-1': 1 }, { ...ADVICE }))
    assert.equal(await artworkAgain, 'model')
    assert.equal(getSchoolScoreLater().draft?.aiAxes['aw-1'], 1)
    assert.equal(removeLaterFile('作品頁 新.png'), true)
    assert.equal(getSchoolScoreLater().draft, null)
    assert.equal(await requestLaterComment('zh-Hant', false), 'idle')
  })
})

describe('combined later file surface', () => {
  it('keeps the student card on the existing comment, radar, and advice strings', () => {
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    assert.match(student, /if \(accepted\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /if \(getSchoolScoreLater\(\)\.draft\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /if \(replaced\) void requestLaterComment\(locale, false\)/)
    assert.equal(student.includes('score-later-request-ai'), false)
    assert.match(student, /const showAdvice = chart\.id === 'artwork'/)
    assert.match(student, /score\.later\.axisAdvicePending/)
    assert.match(student, /score\.later\.radarPendingWorkbook/)
    assert.match(student, /radar\.artworkPending/)
    assert.equal(student.includes('5**'), false)
    assert.equal(student.includes('score-later-ai-advice-rwb'), false)
    const staff = readFileSync(join(root, 'src/components/SchoolScoreLaterStaff.tsx'), 'utf8')
    assert.match(staff, /score-later-request-ai/)
  })
})
