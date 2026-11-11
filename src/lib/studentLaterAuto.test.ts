import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ARTWORK_AXIS_IDS, RWB_AXIS_IDS } from './schoolScoreDual.ts'
import { SCHOOL_SCORE_LATER_KEY, aiReferenceAxes, studentVisibleBand } from './schoolScoreLater.ts'
import { getDualRadarStore } from './useSchoolScoreDual.ts'
import { acceptLaterFiles, getSchoolScoreLater, requestLaterComment } from './useSchoolScoreLater.ts'
import { getTeacherDraftStore } from './useTeacherDraftStore.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const COMMENT = '主題或意念的探索及發展接近穩固，反思及學習進程仍可再寫清楚。'
const COMMENT_NEXT = '樽同缺口杯有前後層次，工作簿試驗頁見到媒介試驗，反思仍然短。'

const AXES = {
  'aw-1': 2.5,
  'aw-2': 3.5,
  'aw-3': 1.25,
  'aw-4': 4.5,
  'aw-5': 3.5,
  'aw-6': 2.5,
  'rwb-1': 3.5,
  'rwb-2': 2.5,
  'rwb-3': 4.5,
  'rwb-4': 1.25,
} as const

type Sent = {
  url: string
  init?: RequestInit
  resolve: (response: Response) => void
}

const pending: Sent[] = []
let apiCalls = 0
let restore: (() => void) | null = null

function page(name: string, size: number, type: string): File {
  return { name, size, type } as File
}

function installNet() {
  const originalFetch = globalThis.fetch
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:later-page'
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
  for (let i = 0; i < 50; i += 1) {
    if (pending.length >= count) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`expected ${count} formative posts, saw ${pending.length}`)
}

function reply(status: number, body: unknown): Sent {
  const next = pending.shift()
  if (!next) throw new Error('no formative post is waiting')
  next.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  return next
}

function modelBody(comment: string, band: string, axes: Record<string, number> | null) {
  return { ok: true, comment, band, axes: axes ?? {} }
}

describe('student later auto request', { concurrency: false }, () => {
  beforeEach(() => {
    apiCalls = 0
    pending.splice(0, pending.length)
    installNet()
  })

  afterEach(() => {
    restore?.()
  })

  it('does not post when the student shell has no accepted file', async () => {
    assert.equal(SCHOOL_SCORE_LATER_KEY, 'va-nexus:school-score-later:v1')
    assert.equal(await requestLaterComment('zh-Hant', false), 'idle')
    assert.equal(apiCalls, 0)
    assert.equal(acceptLaterFiles([page('notes.txt', 20, 'text/plain')]), false)
    assert.equal(await requestLaterComment('zh-Hant', false), 'idle')
    assert.equal(apiCalls, 0)
  })

  it('posts /api/formative-comment with no staff session and stores the per-axis result', async () => {
    const dualBefore = JSON.stringify(getDualRadarStore())
    const teacherBefore = JSON.stringify(getTeacherDraftStore())
    assert.equal(
      acceptLaterFiles([
        page('作品頁 1.png', 1000, 'image/png'),
        page('工作簿頁 1.pdf', 12000, 'application/pdf'),
      ]),
      true,
    )
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const sent = reply(200, modelBody(COMMENT, 'practice-secure', { ...AXES }))
    assert.equal(sent.url, '/api/formative-comment')
    const headers = (sent.init?.headers ?? {}) as Record<string, string>
    assert.equal(headers.Authorization, undefined)
    const payload = JSON.parse(String(sent.init?.body)) as { locale: string; pages?: unknown[] }
    assert.equal(payload.locale, 'zh-Hant')
    assert.equal(payload.pages?.length, 2)
    assert.equal(JSON.stringify(payload).includes('作品頁'), false)
    assert.equal(JSON.stringify(payload).includes('12000'), false)
    assert.equal(await pendingResult, 'model')
    assert.equal(apiCalls, 1)

    const draft = getSchoolScoreLater().draft
    assert.ok(draft)
    assert.equal(draft.aiStatus, 'model')
    assert.equal(draft.aiComment, COMMENT)
    assert.equal(draft.approxBand, 'practice-secure')
    assert.equal(studentVisibleBand(draft), 'practice-secure')
    assert.equal(draft.committedBand, null)
    assert.equal(draft.adjustBand, null)
    assert.deepEqual(aiReferenceAxes(draft, ARTWORK_AXIS_IDS), [2.5, 3.5, 1.25, 4.5, 3.5, 2.5])
    assert.deepEqual(aiReferenceAxes(draft, RWB_AXIS_IDS), [3.5, 2.5, 4.5, 1.25])
    assert.equal(new Set(aiReferenceAxes(draft, ARTWORK_AXIS_IDS)).size > 1, true)
    assert.equal(JSON.stringify(getDualRadarStore()), dualBefore)
    assert.equal(JSON.stringify(getTeacherDraftStore()), teacherBefore)
  })

  it('does not post a second time while the same draft is already in flight', async () => {
    assert.equal(acceptLaterFiles([page('作品頁 2.png', 2200, 'image/png')]), true)
    const first = requestLaterComment('zh-Hant', false)
    const second = requestLaterComment('zh-Hant', false)
    assert.equal(await second, 'idle')
    await waitFor(1)
    reply(200, modelBody(COMMENT, 'practice-secure', { ...AXES }))
    assert.equal(await first, 'model')
    assert.equal(apiCalls, 1)
    assert.equal(pending.length, 0)
  })

  it('starts again for a new upload and ignores a stale in-flight result', async () => {
    assert.equal(acceptLaterFiles([page('作品頁 A.png', 100, 'image/png')]), true)
    const first = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    assert.equal(acceptLaterFiles([page('工作簿頁 B.pdf', 200, 'application/pdf')]), true)
    const second = requestLaterComment('zh-Hant', false)
    await waitFor(2)
    reply(200, modelBody(COMMENT, 'practice-strong', { ...AXES }))
    assert.equal(await first, 'idle')
    const mid = getSchoolScoreLater().draft
    assert.equal(mid?.fileName, '工作簿頁 B.pdf')
    assert.equal(mid?.aiStatus, 'idle')
    assert.equal(mid?.approxBand, null)
    assert.equal(aiReferenceAxes(mid!, RWB_AXIS_IDS), null)
    reply(200, modelBody(COMMENT_NEXT, 'practice-developing', { ...AXES }))
    assert.equal(await second, 'model')
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiComment, COMMENT_NEXT)
    assert.equal(draft?.approxBand, 'practice-developing')
    assert.equal(studentVisibleBand(draft!), 'practice-developing')
    assert.deepEqual(aiReferenceAxes(draft!, RWB_AXIS_IDS), [3.5, 2.5, 4.5, 1.25])
    assert.notEqual(draft?.approxBand, 'practice-strong')
    assert.equal(apiCalls, 2)
  })

  it('keeps the visible band and radars unset when the model call fails', async () => {
    assert.equal(acceptLaterFiles([page('作品頁 3.png', 3300, 'image/png')]), true)
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    reply(429, { ok: false, reason: 'unavailable' })
    assert.equal(await pendingResult, 'fallback')
    const draft = getSchoolScoreLater().draft
    assert.ok(draft)
    assert.equal(draft.aiStatus, 'fallback')
    assert.equal(draft.aiComment, null)
    assert.equal(draft.approxBand, null)
    assert.deepEqual(draft.aiAxes, {})
    assert.equal(studentVisibleBand(draft), null)
    assert.equal(aiReferenceAxes(draft, ARTWORK_AXIS_IDS), null)
    assert.equal(aiReferenceAxes(draft, RWB_AXIS_IDS), null)
  })

  it('does not paint one overall band across every axis', async () => {
    assert.equal(acceptLaterFiles([page('作品頁 4.png', 4400, 'image/png'), page('工作簿頁 4.pdf', 4500, 'application/pdf')]), true)
    const pendingResult = requestLaterComment('en', false)
    await waitFor(1)
    reply(200, modelBody(COMMENT, 'practice-secure', null))
    assert.equal(await pendingResult, 'model')
    const draft = getSchoolScoreLater().draft
    assert.equal(studentVisibleBand(draft!), 'practice-secure')
    assert.equal(draft?.aiComment, COMMENT)
    assert.equal(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS), null)
    assert.equal(aiReferenceAxes(draft!, RWB_AXIS_IDS), null)
  })

  it('still posts when the staff button calls the same function', async () => {
    assert.equal(acceptLaterFiles([page('作品頁 5.png', 5500, 'image/png')]), true)
    const pendingResult = requestLaterComment('zh-Hant', true)
    await waitFor(1)
    const sent = reply(200, modelBody(COMMENT, 'practice-secure', { ...AXES }))
    assert.equal(sent.url, '/api/formative-comment')
    assert.equal(((sent.init?.headers ?? {}) as Record<string, string>).Authorization, undefined)
    assert.equal(await pendingResult, 'model')
    assert.equal(getSchoolScoreLater().draft?.aiStatus, 'model')
  })

  it('wires the auto-request on the shared student shell and leaves the staff button in place', () => {
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    const staff = readFileSync(join(root, 'src/components/SchoolScoreLaterStaff.tsx'), 'utf8')
    const progress = readFileSync(join(root, 'src/components/LearningProgressRef.tsx'), 'utf8')
    const chart = readFileSync(join(root, 'src/components/AbilityChart.tsx'), 'utf8')
    const quest = readFileSync(join(root, 'src/components/SbaQuest.tsx'), 'utf8')
    assert.match(chart, /<LearningProgressRef/)
    assert.match(quest, /<AbilityChart/)
    assert.match(progress, /compact \? null : <SchoolScoreLaterStudent/)
    assert.doesNotMatch(student, /useMapOneShell|ux=map1|ux=classic/)
    assert.match(student, /if \(accepted\) void requestLaterComment\(locale, false\)/)
    assert.equal(student.includes('score-later-request-ai'), false)
    assert.equal(student.includes('requestAi'), false)
    assert.match(staff, /data-testid="score-later-request-ai"/)
    assert.match(staff, /requestLaterComment\(locale, true\)/)
    assert.match(staff, /if \(!role\) return null/)
  })
})
