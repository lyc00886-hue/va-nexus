import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  formativeAxisLabels,
  formativeCommentSystem,
  formativeUserPrompt,
  parseFormativeModelText,
} from './formativeAiComment.ts'
import { ARTWORK_AXIS_IDS, DUAL_CHARTS, RWB_AXIS_IDS } from './schoolScoreDual.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  applyModelComment,
  laterRadarView,
  laterRequiredAxesComplete,
  withUploadedFile,
} from './schoolScoreLater.ts'
import {
  LATER_AXIS_ATTEMPTS,
  acceptLaterFiles,
  getSchoolScoreLater,
  removeLaterFile,
  replaceLaterFile,
  requestLaterComment,
  resetSchoolScoreLaterForTests,
  setLaterAxisAttemptsForTests,
} from './useSchoolScoreLater.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const COMBINED = 'Jessie 作品及研究工作簿.pdf'
const ORDINARY = 'VA SBA123全.pdf'
const WORKBOOK = '研究工作簿.pdf'
const ARTWORK = '作品頁.png'
const COMMENT = '作品嘅樽口仍然平，研究工作簿入面嘅試驗同反思都見到。'
const COMMENT_NEXT = '缺口杯同蘋果已有前後層次，工作簿試驗頁見到媒介試驗，反思仍然短。'
const LEVELS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const

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

const PENDING = {
  en: {
    'score.later.radarPending':
      'Per-axis model reference for this artwork is not available yet, so this artwork radar is not drawn. This avoids painting the same score on every axis.',
    'score.later.radarPendingWorkbook':
      'Per-axis model reference for this research workbook is not available yet, so the research-workbook radar is not drawn. This avoids painting the same score on every axis.',
    'score.later.axisAdvicePending': 'A tailored improvement note for this axis and this work is not available yet.',
    'score.later.removeFile': 'Remove',
    'score.later.replaceFile': 'Replace',
  },
  'zh-Hant': {
    'score.later.radarPending': '未有按呢幅作品各軸分開計嘅模型參考，暫時唔畫呢幅作品雷達，避免每條軸都同一分數。',
    'score.later.radarPendingWorkbook':
      '未有按呢份研究工作簿各軸分開計嘅模型參考，暫時唔畫研究工作簿雷達，避免每條軸都同一分數。',
    'score.later.axisAdvicePending': '暫時未有跟呢條軸、跟呢份作品嘅改進建議。',
    'score.later.removeFile': '剷除',
    'score.later.replaceFile': '更換',
  },
  'zh-Hans': {
    'score.later.radarPending': '未有按这幅作品各轴分开计的模型参考，暂时不画这幅作品雷达，避免每条轴都同一分数。',
    'score.later.radarPendingWorkbook':
      '未有按这份研究工作簿各轴分开计的模型参考，暂时不画研究工作簿雷达，避免每条轴都同一分数。',
    'score.later.axisAdvicePending': '暂时未有跟这条轴、跟这份作品的改进建议。',
    'score.later.removeFile': '铲除',
    'score.later.replaceFile': '更换',
  },
} as const

type Sent = { url: string; init?: RequestInit; resolve: (response: Response) => void }
type PostedPage = { side?: string; sides?: string[] }

const pending: Sent[] = []
let apiCalls = 0
let restore: (() => void) | null = null

function page(name: string, size = 1200): File {
  return { name, size, type: 'application/pdf' } as File
}

function installNet() {
  const originalFetch = globalThis.fetch
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:later-axis-retry'
  URL.revokeObjectURL = () => {}
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith('blob:')) return new Response(Uint8Array.of(9, 8, 7, 6))
    apiCalls += 1
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
  for (let i = 0; i < 100; i += 1) {
    if (pending.length >= count) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`expected ${count} formative posts, saw ${pending.length}`)
}

function peek(): { url: string; raw: string; pages: PostedPage[] } {
  const next = pending[0]
  if (!next) throw new Error('no formative post is waiting')
  const raw = String(next.init?.body ?? '')
  const parsed = JSON.parse(raw) as { pages?: PostedPage[] }
  return { url: next.url, raw, pages: parsed.pages ?? [] }
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

function without(source: Record<string, number>, ...keys: string[]): Record<string, number> {
  const next = { ...source }
  for (const key of keys) delete next[key]
  return next
}

describe('later axis retry prompt and parse', () => {
  it('asks for every id of a named side and still reads a label, a nested object, or a list', () => {
    assert.ok(LATER_AXIS_ATTEMPTS >= 2)
    const labels = formativeAxisLabels('zh-Hant')
    const system = formativeCommentSystem(
      labels.map((axis) => axis.label),
      'zh-Hant',
    )
    assert.match(system, /Do not copy one overall band onto every axis/)
    assert.match(system, /do not fill a missing id from the overall score/)
    for (const id of [...ARTWORK_AXIS_IDS, ...RWB_AXIS_IDS]) assert.match(system, new RegExp(id))
    assert.equal(system.includes('5**'), false)

    const both = formativeUserPrompt(['artwork', 'research_workbook'])
    assert.match(both, /Sides to score: artwork, research_workbook/)
    for (const id of [...ARTWORK_AXIS_IDS, ...RWB_AXIS_IDS]) assert.match(both, new RegExp(`\\b${id}\\b`))
    const book = formativeUserPrompt(['research_workbook'])
    assert.match(book, /Sides to score: research_workbook/)
    assert.equal(book.includes('Sides to score: artwork'), false)
    assert.equal(book.includes('aw-1'), false)
    assert.match(book, /rwb-4/)

    const aw1 = labels.find((axis) => axis.id === 'aw-1')?.label ?? ''
    const labelled = parseFormativeModelText(
      JSON.stringify({
        comment: COMMENT,
        band: 'practice-secure',
        score: 4,
        axes: { [aw1]: 2, 'aw-2': 3 },
      }),
    )
    assert.equal(labelled?.axes['aw-1'], 2)
    assert.equal(labelled?.axes['aw-2'], 3)
    assert.equal(labelled?.axes['aw-6'], undefined)
    assert.notEqual(labelled?.axes['aw-6'], labelled?.score)

    const nested = parseFormativeModelText(
      JSON.stringify({
        comment: COMMENT,
        band: 'practice-secure',
        score: 4,
        axes: { artwork: { ...ART } },
      }),
    )
    assert.deepEqual(
      ARTWORK_AXIS_IDS.map((id) => nested?.axes[id]),
      [3.5, 4.5, 2, 5, 4, 2.5],
    )
    assert.equal(nested?.axes['rwb-1'], undefined)

    const listed = parseFormativeModelText(
      JSON.stringify({
        comment: COMMENT,
        band: 'practice-secure',
        score: 4,
        axes: [{ id: 'aw-3', value: 2 }, { axis: 'aw-4', score: 5 }],
        advice: [{ id: 'aw-3', text: ADVICE['aw-3'] }],
      }),
    )
    assert.equal(listed?.axes['aw-3'], 2)
    assert.equal(listed?.axes['aw-4'], 5)
    assert.equal(listed?.axes['aw-1'], undefined)
    assert.equal(listed?.advice['aw-3'], ADVICE['aw-3'])
    assert.notEqual(listed?.axes['aw-1'], 4)
  })

  it('treats a present side as complete only when every axis of that side was returned', () => {
    const combined = withUploadedFile(null, COMBINED, 1000, 'application/pdf')
    const partial = applyModelComment(combined, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 4,
      axes: without({ ...ART, ...RWB }, 'aw-6', 'rwb-4'),
    })
    assert.equal(laterRequiredAxesComplete(partial), false)
    assert.equal(partial.aiAxes['aw-6'], undefined)
    assert.equal(partial.aiAxes['rwb-4'], undefined)
    assert.notEqual(partial.aiAxes['aw-6'], partial.approxValue)
    assert.equal(laterRadarView(partial).artwork, null)
    assert.equal(laterRadarView(partial).workbook, null)
    const full = applyModelComment(combined, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, ...RWB },
      advice: { ...ADVICE },
    })
    assert.equal(laterRequiredAxesComplete(full), true)
    assert.deepEqual(laterRadarView(full).artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(laterRadarView(full).workbook, [2, 3, 4, 5])

    const ordinary = applyModelComment(withUploadedFile(null, ORDINARY, 1000, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, ...RWB },
    })
    assert.equal(laterRequiredAxesComplete(ordinary), true)
    assert.equal(ordinary.aiAxes['rwb-1'], undefined)
    assert.equal(laterRadarView(ordinary).workbook, null)
    assert.equal(laterRadarView(ordinary).workbookPending, false)

    const workbook = applyModelComment(withUploadedFile(null, 'my workbook.pdf', 1000, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...RWB },
    })
    assert.equal(laterRequiredAxesComplete(workbook), true)
    assert.equal(workbook.aiAxes['aw-1'], undefined)
    assert.equal(laterRadarView(workbook).artworkPending, false)
  })
})

describe('later axis automatic retry', { concurrency: false }, () => {
  beforeEach(() => {
    apiCalls = 0
    pending.splice(0, pending.length)
    resetSchoolScoreLaterForTests()
    installNet()
  })

  afterEach(() => {
    restore?.()
    resetSchoolScoreLaterForTests()
  })

  it('asks again after an incomplete combined file, then draws both radars and the artwork notes', async () => {
    assert.equal(SCHOOL_SCORE_LATER_KEY, 'va-nexus:school-score-later:v1')
    assert.equal(acceptLaterFiles([page(COMBINED)]), true)
    const started = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const first = peek()
    assert.equal(first.url, '/api/formative-comment')
    assert.equal(first.raw.includes('Jessie'), false)
    assert.equal(first.raw.includes('作品及研究工作簿'), false)
    assert.equal(first.pages.length, 1)
    assert.deepEqual(first.pages[0]?.sides, ['artwork', 'research_workbook'])
    reply(200, modelBody(without({ ...ART, ...RWB }, 'aw-6', 'rwb-4'), {}, 4))
    await waitFor(1)
    const mid = getSchoolScoreLater().draft
    assert.equal(mid?.aiStatus, 'model')
    assert.equal(mid?.aiComment, COMMENT)
    assert.equal(mid?.approxValue, 4)
    assert.equal(mid?.aiAxes['aw-6'], undefined)
    assert.equal(mid?.aiAxes['rwb-4'], undefined)
    assert.notEqual(mid?.aiAxes['aw-6'], mid?.approxValue)
    const waiting = laterRadarView(mid)
    assert.equal(waiting.artwork, null)
    assert.equal(waiting.workbook, null)
    assert.equal(waiting.artworkPending, true)
    assert.equal(waiting.workbookPending, true)
    const second = peek()
    assert.equal(second.url, '/api/formative-comment')
    assert.deepEqual(second.pages[0]?.sides, ['artwork', 'research_workbook'])
    reply(200, modelBody({ ...ART, ...RWB }, { ...ADVICE }, 3.5, COMMENT_NEXT))
    assert.equal(await started, 'model')
    assert.equal(apiCalls, 2)
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiComment, COMMENT_NEXT)
    assert.equal(draft?.approxBand, 'practice-secure')
    assert.equal(draft?.approxValue, 3.5)
    for (const value of [draft?.approxValue, ...Object.values(draft?.aiAxes ?? {})]) {
      assert.equal(LEVELS.includes(value as (typeof LEVELS)[number]), true)
    }
    const view = laterRadarView(draft)
    assert.deepEqual(view.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(view.workbook, [2, 3, 4, 5])
    assert.equal(view.artworkPending, false)
    assert.equal(view.workbookPending, false)
    for (const id of ARTWORK_AXIS_IDS) assert.equal(draft?.aiAdvice[id], ADVICE[id])
    assert.equal(draft?.aiAdvice['rwb-1'], undefined)
  })

  it('asks again for an already split artwork file and workbook file', async () => {
    assert.equal(acceptLaterFiles([page(ARTWORK, 100), page(WORKBOOK, 200)]), true)
    const started = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const first = peek()
    assert.equal(first.pages.length, 2)
    assert.equal(first.pages[0]?.side, 'artwork')
    assert.equal(first.pages[0]?.sides, undefined)
    assert.equal(first.pages[1]?.side, 'research_workbook')
    assert.equal(first.pages[1]?.sides, undefined)
    reply(200, modelBody(without({ ...ART, ...RWB }, 'aw-6', 'rwb-1'), { 'aw-1': ADVICE['aw-1'] }, 4))
    await waitFor(1)
    const mid = laterRadarView(getSchoolScoreLater().draft)
    assert.equal(mid.artwork, null)
    assert.equal(mid.workbook, null)
    assert.equal(mid.artworkPending, true)
    assert.equal(mid.workbookPending, true)
    assert.equal(getSchoolScoreLater().draft?.aiAxes['aw-6'], undefined)
    assert.notEqual(getSchoolScoreLater().draft?.aiAxes['aw-6'], 4)
    reply(200, modelBody({ 'aw-6': 2.5, 'rwb-1': 2 }, { ...ADVICE }, 3.5, COMMENT_NEXT))
    assert.equal(await started, 'model')
    assert.equal(apiCalls, 2)
    const draft = getSchoolScoreLater().draft
    const view = laterRadarView(draft)
    assert.deepEqual(view.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(view.workbook, [2, 3, 4, 5])
    assert.equal(draft?.aiComment, COMMENT_NEXT)
    assert.equal(draft?.aiAdvice['aw-1'], ADVICE['aw-1'])
    assert.equal(draft?.aiAdvice['aw-6'], ADVICE['aw-6'])
    for (const value of Object.values(draft?.aiAxes ?? {})) {
      assert.equal(LEVELS.includes(value as (typeof LEVELS)[number]), true)
    }
  })

  it('keeps the official pending result when a retry is still short, and stops when the call fails', async () => {
    setLaterAxisAttemptsForTests(2)
    assert.equal(acceptLaterFiles([page(COMBINED)]), true)
    const started = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    reply(200, modelBody(without({ ...ART }, 'aw-6'), {}, 4))
    await waitFor(1)
    reply(200, modelBody({ 'aw-1': 3.5, 'rwb-1': 2 }, {}, 4, COMMENT_NEXT))
    assert.equal(await started, 'model')
    assert.equal(apiCalls, 2)
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiStatus, 'model')
    assert.equal(draft?.aiComment, COMMENT_NEXT)
    assert.equal(draft?.aiAxes['aw-1'], 3.5)
    assert.equal(draft?.aiAxes['aw-6'], undefined)
    assert.equal(draft?.aiAxes['rwb-4'], undefined)
    assert.notEqual(draft?.aiAxes['aw-6'], draft?.approxValue)
    assert.notEqual(draft?.aiAxes['rwb-4'], draft?.approxValue)
    const view = laterRadarView(draft)
    assert.equal(view.artwork, null)
    assert.equal(view.workbook, null)
    assert.equal(view.artworkPending, true)
    assert.equal(view.workbookPending, true)

    resetSchoolScoreLaterForTests()
    pending.splice(0, pending.length)
    apiCalls = 0
    setLaterAxisAttemptsForTests(3)
    assert.equal(acceptLaterFiles([page(COMBINED, 220)]), true)
    const failed = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    reply(200, modelBody(without({ ...ART, ...RWB }, 'aw-6'), {}, 4))
    await waitFor(1)
    reply(502, { ok: false, reason: 'unavailable' })
    assert.equal(await failed, 'fallback')
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(pending.length, 0)
    assert.equal(apiCalls, 2)
    const missed = getSchoolScoreLater().draft
    assert.equal(missed?.aiStatus, 'fallback')
    assert.equal(missed?.aiComment, null)
    assert.deepEqual(missed?.aiAxes, {})
    assert.equal(laterRadarView(missed).artwork, null)
    assert.equal(laterRadarView(missed).workbook, null)
  })

  it('leaves an ordinary SBA on the artwork side and a workbook-only file off the artwork pending line', async () => {
    assert.equal(acceptLaterFiles([page(ORDINARY)]), true)
    const ordinary = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const ordinarySent = peek()
    assert.equal(ordinarySent.pages.length, 1)
    assert.equal(ordinarySent.pages[0]?.side, 'artwork')
    assert.equal(ordinarySent.pages[0]?.sides, undefined)
    reply(200, modelBody({ ...ART, ...RWB }, { ...ADVICE }))
    assert.equal(await ordinary, 'model')
    assert.equal(apiCalls, 1)
    const ordinaryView = laterRadarView(getSchoolScoreLater().draft)
    assert.deepEqual(ordinaryView.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.equal(ordinaryView.workbook, null)
    assert.equal(ordinaryView.workbookPending, false)
    assert.equal(getSchoolScoreLater().draft?.aiAxes['rwb-1'], undefined)

    resetSchoolScoreLaterForTests()
    pending.splice(0, pending.length)
    apiCalls = 0
    assert.equal(acceptLaterFiles([page('my workbook.pdf')]), true)
    const workbook = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    reply(200, modelBody(without({ ...RWB, ...ART }, 'rwb-4'), {}, 4))
    await waitFor(1)
    const mid = laterRadarView(getSchoolScoreLater().draft)
    assert.equal(mid.artwork, null)
    assert.equal(mid.artworkPending, false)
    assert.equal(mid.workbook, null)
    assert.equal(mid.workbookPending, true)
    assert.equal(getSchoolScoreLater().draft?.aiAxes['aw-1'], undefined)
    assert.equal(getSchoolScoreLater().draft?.aiAxes['rwb-4'], undefined)
    assert.notEqual(getSchoolScoreLater().draft?.aiAxes['rwb-4'], 4)
    reply(200, modelBody({ ...RWB }, {}, 3))
    assert.equal(await workbook, 'model')
    assert.equal(apiCalls, 2)
    const done = laterRadarView(getSchoolScoreLater().draft)
    assert.equal(done.artwork, null)
    assert.equal(done.artworkPending, false)
    assert.deepEqual(done.workbook, [2, 3, 4, 5])
    assert.equal(done.workbookPending, false)
    assert.equal(getSchoolScoreLater().draft?.aiAxes['aw-1'], undefined)
  })

  it('does not ask again when the first result already has every axis, including scores sent under criterion labels', async () => {
    const labels = formativeAxisLabels('zh-Hant')
    const byLabel = Object.fromEntries(labels.filter((axis) => axis.id.startsWith('aw-')).map((axis) => [axis.label, ART[axis.id]]))
    assert.equal(acceptLaterFiles([page(ORDINARY)]), true)
    const started = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    reply(200, modelBody(byLabel, { ...ADVICE }))
    assert.equal(await started, 'model')
    assert.equal(apiCalls, 1)
    const view = laterRadarView(getSchoolScoreLater().draft)
    assert.deepEqual(view.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.equal(view.artworkPending, false)
    assert.equal(view.workbookPending, false)
    assert.equal(getSchoolScoreLater().draft?.aiAdvice['aw-1'], ADVICE['aw-1'])
  })

  it('does not ask again only because an artwork note is missing', async () => {
    assert.equal(acceptLaterFiles([page(ARTWORK)]), true)
    const started = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    reply(200, modelBody({ ...ART }, {}))
    assert.equal(await started, 'model')
    assert.equal(apiCalls, 1)
    const draft = getSchoolScoreLater().draft
    assert.deepEqual(laterRadarView(draft).artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(draft?.aiAdvice, {})
  })

  it('still removes and replaces a file, and the following request starts by itself', async () => {
    assert.equal(acceptLaterFiles([page(ORDINARY, 100), page(COMBINED, 200)]), true)
    const first = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    assert.equal(removeLaterFile(ORDINARY), true)
    assert.deepEqual(getSchoolScoreLater().draft?.pages.map((item) => item.fileName), [COMBINED])
    const second = requestLaterComment('zh-Hant', false)
    await waitFor(2)
    reply(200, modelBody(without({ ...ART, ...RWB }, 'aw-6'), {}, 4))
    assert.equal(await first, 'idle')
    assert.equal(apiCalls, 2)
    const sent = peek()
    assert.equal(sent.pages.length, 1)
    assert.deepEqual(sent.pages[0]?.sides, ['artwork', 'research_workbook'])
    reply(200, modelBody(without({ ...ART, ...RWB }, 'rwb-4'), { ...ADVICE }, 4))
    await waitFor(1)
    reply(200, modelBody({ ...ART, ...RWB, 'rwb-4': 5 }, { ...ADVICE }, 3.5, COMMENT_NEXT))
    assert.equal(await second, 'model')
    assert.equal(getSchoolScoreLater().draft?.aiComment, COMMENT_NEXT)
    assert.ok(laterRadarView(getSchoolScoreLater().draft).artwork)
    assert.ok(laterRadarView(getSchoolScoreLater().draft).workbook)

    assert.equal(replaceLaterFile(COMBINED, page('my workbook.pdf', 300)), true)
    assert.equal(getSchoolScoreLater().draft?.aiComment, null)
    const replaced = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const workbookSent = peek()
    assert.equal(workbookSent.pages[0]?.side, 'research_workbook')
    assert.equal(workbookSent.pages[0]?.sides, undefined)
    reply(200, modelBody({ ...RWB, ...ART }, { ...ADVICE }, 3))
    assert.equal(await replaced, 'model')
    const after = laterRadarView(getSchoolScoreLater().draft)
    assert.equal(after.artwork, null)
    assert.equal(after.artworkPending, false)
    assert.deepEqual(after.workbook, [2, 3, 4, 5])
    assert.equal(getSchoolScoreLater().draft?.aiAxes['aw-1'], undefined)

    assert.equal(removeLaterFile('my workbook.pdf'), true)
    assert.equal(getSchoolScoreLater().draft, null)
    assert.equal(await requestLaterComment('zh-Hant', false), 'idle')
    assert.equal(pending.length, 0)
  })
})

describe('later axis retry surface', () => {
  it('keeps the existing pending, remove, and replace sentences and the student auto-request', () => {
    const files = {
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
      en: 'src/i18n/en.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = JSON.parse(readFileSync(join(root, files[locale]), 'utf8')) as Record<string, string>
      for (const [key, text] of Object.entries(PENDING[locale])) {
        assert.equal(bag[key], text, `${locale} ${key}`)
      }
    }
    const artwork = DUAL_CHARTS.find((chart) => chart.id === 'artwork')
    const workbook = DUAL_CHARTS.find((chart) => chart.id === 'research_workbook')
    assert.equal(artwork?.title, 'score.dual.chart.artwork')
    assert.equal(workbook?.title, 'score.dual.chart.rwb')
    assert.deepEqual(artwork?.axes, [...ARTWORK_AXIS_IDS])
    assert.deepEqual(workbook?.axes, [...RWB_AXIS_IDS])
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    assert.match(student, /if \(accepted\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /if \(getSchoolScoreLater\(\)\.draft\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /if \(replaced\) void requestLaterComment\(locale, false\)/)
    assert.equal(student.includes('score-later-request-ai'), false)
    assert.match(student, /radar\.artworkPending/)
    assert.match(student, /score\.later\.radarPendingWorkbook/)
    assert.match(student, /score\.later\.axisAdvicePending/)
    assert.match(student, /const showAdvice = chart\.id === 'artwork'/)
    assert.equal(student.includes('5**'), false)
    const hook = readFileSync(join(root, 'src/lib/useSchoolScoreLater.ts'), 'utf8')
    assert.match(hook, /postFormativeComment/)
    assert.equal(hook.includes('score.later.'), false)
  })
})
