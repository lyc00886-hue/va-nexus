import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import {
  handleFormativeComment,
  setFormativeGeneratorForTests,
  setFormativeRateLimitForTests,
  type FormativeGenerator,
} from './formative-comment.ts'
import { LOCKED_LOW_A_SHA256, LOCKED_SAMPLES, setLockedComparisonForTests } from './locked-sample-comparison.ts'

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const COMMENT = '主題或意念的探索及發展接近穩固，反思及學習進程仍可再寫清楚。'

function request(body: unknown, method = 'POST', headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/formative-comment', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  })
}

describe('formative comment route', { concurrency: false }, () => {
  const previousKey = process.env.GEMINI_API_KEY

  afterEach(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
    setFormativeRateLimitForTests(null)
    setFormativeGeneratorForTests(null)
    setLockedComparisonForTests(null)
  })

  it('stays unavailable when no model key is configured', async () => {
    delete process.env.GEMINI_API_KEY
    let generated = false
    setFormativeGeneratorForTests(async () => {
      generated = true
      return null
    })
    const res = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { ok: false, reason: 'unavailable' })
    assert.equal(generated, false)
  })

  it('runs the informal comment with no staff session, including a same-origin browser call', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let generated = 0
    setFormativeGeneratorForTests(async () => {
      generated += 1
      return JSON.stringify({
        comment: COMMENT,
        band: 'practice-secure',
        axes: { 'aw-1': 2.5, 'aw-2': 3.5, 'aw-3': 1.25, 'aw-4': 4.5, 'aw-5': 3.5, 'aw-6': 2.5 },
      })
    })
    const open = await handleFormativeComment(
      request(
        { mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' },
        'POST',
        { Origin: 'https://example.test' },
      ),
    )
    assert.equal(open.status, 200)
    assert.equal(generated, 1)
    const body = await open.json()
    assert.equal(body.ok, true)
    assert.equal(body.comment, COMMENT)
    assert.equal(body.band, 'practice-secure')
    assert.equal(body.axes['aw-1'], 2.5)
    assert.equal(open.headers.get('www-authenticate'), null)

    const staffToken = await handleFormativeComment(
      request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }, 'POST', {
        Origin: 'https://example.test',
        Authorization: 'Bearer staff-token',
      }),
    )
    assert.equal(staffToken.status, 200)
    assert.equal(generated, 2)

    const referer = await handleFormativeComment(
      request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }, 'POST', {
        Referer: 'https://example.test/portfolio',
      }),
    )
    assert.equal(referer.status, 200)
    assert.equal(generated, 3)
  })

  it('refuses a cross-origin browser call before generating', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let generated = false
    setFormativeGeneratorForTests(async () => {
      generated = true
      return JSON.stringify({ comment: COMMENT, band: 'practice-secure' })
    })
    const res = await handleFormativeComment(
      request({ mime: 'image/png', imageBase64: PNG }, 'POST', { Origin: 'https://evil.example' }),
    )
    assert.equal(res.status, 403)
    assert.equal(generated, false)
    assert.deepEqual(await res.json(), { ok: false, reason: 'unavailable' })
    const referer = await handleFormativeComment(
      request({ mime: 'image/png', imageBase64: PNG }, 'POST', { Referer: 'https://evil.example/phish' }),
    )
    assert.equal(referer.status, 403)
    assert.equal(generated, false)
  })

  it('allows one normal request and then a modest cap', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    setFormativeRateLimitForTests(1)
    let generated = 0
    setFormativeGeneratorForTests(async () => {
      generated += 1
      return JSON.stringify({ comment: COMMENT, band: 'practice-secure' })
    })
    const first = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG }))
    assert.equal(first.status, 200)
    assert.equal(generated, 1)
    const second = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG }))
    assert.equal(second.status, 429)
    assert.equal(generated, 1)
    assert.deepEqual(await second.json(), { ok: false, reason: 'unavailable' })
  })

  it('returns a short comment and practice band, and drops official wording', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const seen: { system: string; user: string }[] = []
    const generate: FormativeGenerator = async (input) => {
      seen.push({ system: input.system, user: input.user })
      return JSON.stringify({ comment: COMMENT, band: '穩固' })
    }
    setFormativeGeneratorForTests(generate)
    const ok = await handleFormativeComment(
      request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }),
    )
    assert.equal(ok.status, 200)
    assert.deepEqual(await ok.json(), {
      ok: true,
      comment: COMMENT,
      band: 'practice-secure',
      axes: {},
      score: 3.5,
      advice: {},
    })
    assert.match(seen[0].system, /主題或意念的探索及發展/)
    assert.match(seen[0].system, /反思及學習進程/)
    assert.match(seen[0].system, /school-score v1/)
    assert.match(seen[0].system, /Do not copy one overall band onto every axis/)
    assert.equal(seen[0].system.includes('主題清晰度'), false)
    assert.equal(seen[0].system.includes('洞察藝術'), false)
    assert.equal(seen[0].system.includes('5**'), false)
    assert.match(seen[0].user, /Do not award an official mark/)
    assert.match(seen[0].user, /Do not use the file name or file size/)

    setFormativeGeneratorForTests(async () =>
      JSON.stringify({
        comment: COMMENT,
        band: 'practice-secure',
        axes: { 'aw-1': 2.5, 'aw-2': 3.5, 'aw-3': 1.2, 'aw-4': 4.5, 'aw-5': 3.5, 'aw-6': 2.5 },
      }),
    )
    const perAxis = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(perAxis.status, 200)
    assert.deepEqual((await perAxis.json()).axes, {
      'aw-1': 2.5,
      'aw-2': 3.5,
      'aw-3': 1,
      'aw-4': 4.5,
      'aw-5': 3.5,
      'aw-6': 2.5,
    })

    setFormativeGeneratorForTests(async () => JSON.stringify({ comment: '這頁可達 5** 公開試結果。', band: 'practice-strong' }))
    const blocked = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG }))
    assert.equal(blocked.status, 502)
    assert.deepEqual(await blocked.json(), { ok: false, reason: 'unavailable' })
  })

  it('does not keep a staff allowlist on this informal route', () => {
    const source = readFileSync(new URL('./formative-comment.ts', import.meta.url), 'utf8')
    assert.equal(source.includes('staffRole'), false)
    assert.equal(source.includes('defaultStaffAllowed'), false)
    assert.equal(source.includes('saveTeacherDraft'), false)
    assert.equal(source.includes('saveDualAxis'), false)
    assert.match(source, /sameOriginAllowed/)
    assert.match(source, /formativeRateLimited/)
  })

  it('recognises a PDF or image when the file name is not page', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const seen: string[] = []
    setFormativeGeneratorForTests(async (input) => {
      seen.push(input.mime)
      return JSON.stringify({ comment: COMMENT, band: 'practice-secure' })
    })
    const pdf = Buffer.from('%PDF-1.4\n').toString('base64')
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64')
    const emptyMime = await handleFormativeComment(
      request({ locale: 'zh-Hant', pages: [{ side: 'artwork', mime: '', imageBase64: pdf }] }),
    )
    assert.equal(emptyMime.status, 200)
    assert.equal(seen[0], 'application/pdf')
    const octet = await handleFormativeComment(
      request({
        locale: 'zh-Hant',
        pages: [{ side: 'artwork', mime: 'application/octet-stream', imageBase64: jpeg }],
      }),
    )
    assert.equal(octet.status, 200)
    assert.equal(seen[1], 'image/jpeg')
    const named = await handleFormativeComment(
      request({
        locale: 'zh-Hant',
        pages: [
          {
            side: 'artwork',
            mime: 'application/octet-stream',
            fileName: 'IMG_5288.jpeg',
            imageBase64: Buffer.from('not-a-jpeg-but-named').toString('base64'),
          },
        ],
      }),
    )
    assert.equal(named.status, 200)
    assert.equal(seen[2], 'image/jpeg')
    const before = seen.length
    const hardcoded = await handleFormativeComment(
      request({
        locale: 'zh-Hant',
        pages: [
          {
            side: 'artwork',
            mime: 'application/octet-stream',
            fileName: 'page',
            imageBase64: Buffer.from('not-a-jpeg').toString('base64'),
          },
        ],
      }),
    )
    assert.equal(hardcoded.status, 400)
    assert.equal(seen.length, before)
  })

  it('scores both sides of one combined page and leaves a workbook-only page on that side', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const seen: { user: string; count: number; sides: string[][] }[] = []
    setFormativeGeneratorForTests(async (input) => {
      seen.push({
        user: input.user,
        count: input.pages?.length ?? 0,
        sides: (input.pages ?? []).map((page) => page.sides),
      })
      return JSON.stringify({
        comment: COMMENT,
        band: 'practice-secure',
        score: 3.5,
        axes: {
          'aw-1': 3,
          'aw-2': 3.5,
          'aw-3': 2,
          'aw-4': 4,
          'aw-5': 2.5,
          'aw-6': 4.5,
          'rwb-1': 2,
          'rwb-2': 3,
          'rwb-3': 4,
          'rwb-4': 5,
        },
        advice: {
          'aw-1': '樽口轉折可以再清楚啲。',
          'rwb-1': '研究工作簿可以再寫低失敗試驗點解停咗。',
        },
      })
    })
    const combined = await handleFormativeComment(
      request({
        locale: 'zh-Hant',
        pages: [
          {
            side: 'artwork',
            sides: ['artwork', 'research_workbook'],
            mime: 'image/png',
            imageBase64: PNG,
          },
        ],
      }),
    )
    assert.equal(combined.status, 200)
    assert.equal(seen[0]?.count, 1)
    assert.deepEqual(seen[0]?.sides, [['artwork', 'research_workbook']])
    assert.match(seen[0]?.user ?? '', /Sides to score: artwork, research_workbook/)
    const body = (await combined.json()) as { comment?: string; axes?: Record<string, number>; advice?: Record<string, string> }
    assert.equal(body.comment, COMMENT)
    assert.equal(body.axes?.['aw-6'], 4.5)
    assert.equal(body.axes?.['rwb-1'], 2)
    assert.equal(body.advice?.['aw-1']?.includes('樽口'), true)
    assert.equal(body.advice?.['rwb-1']?.includes('失敗試驗'), true)
    assert.notEqual(body.advice?.['rwb-1'], body.advice?.['aw-1'])

    const workbook = await handleFormativeComment(
      request({
        locale: 'zh-Hant',
        pages: [{ side: 'research_workbook', mime: 'image/png', imageBase64: PNG }],
      }),
    )
    assert.equal(workbook.status, 200)
    assert.equal(seen[1]?.count, 1)
    assert.deepEqual(seen[1]?.sides, [['research_workbook']])
    assert.match(seen[1]?.user ?? '', /Sides to score: research_workbook/)
    assert.equal((seen[1]?.user ?? '').includes('Sides to score: artwork'), false)
  })

  it('reads an axis number that arrived under the school criterion label', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    setFormativeGeneratorForTests(async () =>
      JSON.stringify({
        comment: COMMENT,
        band: 'practice-secure',
        score: 4,
        axes: { '媒介、技巧及技法╱寫作技巧': 2.5 },
      }),
    )
    const res = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(res.status, 200)
    const body = (await res.json()) as { axes?: Record<string, number>; score?: number }
    assert.equal(body.axes?.['aw-1'], 2.5)
    assert.equal(body.axes?.['aw-2'], undefined)
    assert.notEqual(body.axes?.['aw-2'], body.score)
  })

  it('keeps an unofficial 5 and does not replace a missing top score with 4.5', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    setFormativeGeneratorForTests(async () =>
      JSON.stringify({
        comment: COMMENT,
        band: 'practice-strong',
        score: 5,
        axes: { 'aw-1': 5 },
        advice: { 'aw-1': '樽口轉折可以再推深一點，而家仍然太圓。' },
      }),
    )
    const topped = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(topped.status, 200)
    const topBody = (await topped.json()) as { band?: string; score?: number | null }
    assert.equal(topBody.band, 'practice-strong')
    assert.equal(topBody.score, 5)
    assert.notEqual(topBody.score, 4.5)

    setFormativeGeneratorForTests(async () => JSON.stringify({ comment: COMMENT, band: 5, axes: { 'aw-1': 5 } }))
    const fromBand = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(fromBand.status, 200)
    const bandBody = (await fromBand.json()) as { band?: string; score?: number | null }
    assert.equal(bandBody.band, 'practice-strong')
    assert.equal(bandBody.score, 5)

    setFormativeGeneratorForTests(async () => JSON.stringify({ comment: COMMENT, band: '良好' }))
    const omitted = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(omitted.status, 200)
    const omittedBody = (await omitted.json()) as { band?: string; score?: number | null }
    assert.equal(omittedBody.band, 'practice-strong')
    assert.equal(omittedBody.score, null)
    assert.notEqual(omittedBody.score, 4.5)

    setFormativeGeneratorForTests(async () =>
      JSON.stringify({ comment: COMMENT, band: 'practice-strong', score: 4.5 }),
    )
    const honest = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(honest.status, 200)
    assert.equal(((await honest.json()) as { score?: number }).score, 4.5)
  })

  it('does not invent a comment when the page is missing', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let generated = false
    setFormativeGeneratorForTests(async () => {
      generated = true
      return JSON.stringify({ comment: COMMENT, band: 'practice-secure' })
    })
    const res = await handleFormativeComment(request({ mime: 'image/png', locale: 'zh-Hant' }))
    assert.equal(res.status, 400)
    assert.equal(generated, false)
    const get = await handleFormativeComment(request({}, 'GET'))
    assert.equal(get.status, 405)
  })

  it('follows 發展中 for 待改進示例 A and does not show 4.5 or 良好', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let sawLowA = false
    let sawHigh = false
    setFormativeGeneratorForTests(async (input) => {
      sawLowA = (input.comparisons ?? []).some(
        (item) => item.sampleSha256 === LOCKED_LOW_A_SHA256 && item.base64.length > 0,
      )
      sawHigh = (input.comparisons ?? []).some((item) => item.role === 'high' && item.base64.length > 0)
      const inline = new Set((input.parts ?? []).flatMap((part) => (part.inlineData?.data ? [part.inlineData.data] : [])))
      assert.equal(
        (input.comparisons ?? [])
          .filter((item) => item.role === 'high' || item.sampleSha256 === LOCKED_LOW_A_SHA256)
          .every((item) => inline.has(item.base64)),
        true,
      )
      return JSON.stringify({
        comment: COMMENT,
        band: '良好',
        score: 4.5,
        axes: { 'aw-1': 4.5, 'aw-2': 5, 'aw-4': 4 },
      })
    })
    const res = await handleFormativeComment(
      request({
        mime: 'image/png',
        imageBase64: PNG,
        locale: 'zh-Hant',
        fileName: 'upload.pdf',
        fileSha256: LOCKED_LOW_A_SHA256,
      }),
    )
    assert.equal(res.status, 200)
    assert.equal(sawLowA, true)
    assert.equal(sawHigh, true)
    const body = (await res.json()) as { band?: string; score?: number; axes?: Record<string, number> }
    assert.equal(body.band, 'practice-developing')
    assert.equal(body.score, 2.5)
    assert.notEqual(body.score, 4.5)
    assert.notEqual(body.band, 'practice-strong')
    assert.equal(body.axes?.['aw-1'], 2.5)
    assert.equal(body.axes?.['aw-2'], 2.5)
    assert.equal(body.axes?.['aw-4'], 2.5)
    assert.equal(JSON.stringify(body).includes('4.5'), false)
  })

  it('keeps an unofficial 5 on a locked high sample and still allows an honest 4.5', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const high = LOCKED_SAMPLES.find((sample) => sample.role === 'high')
    assert.ok(high)
    setFormativeGeneratorForTests(async () =>
      JSON.stringify({
        comment: COMMENT,
        band: 'practice-strong',
        score: 5,
        axes: { 'aw-1': 5, 'aw-2': 4.5 },
      }),
    )
    const topped = await handleFormativeComment(
      request({
        mime: 'image/png',
        imageBase64: PNG,
        locale: 'zh-Hant',
        fileSha256: high.sampleSha256,
      }),
    )
    assert.equal(topped.status, 200)
    const topBody = (await topped.json()) as { band?: string; score?: number; axes?: Record<string, number> }
    assert.equal(topBody.band, 'practice-strong')
    assert.equal(topBody.score, 5)
    assert.notEqual(topBody.score, 4.5)
    assert.equal(topBody.axes?.['aw-1'], 5)
    assert.equal(topBody.axes?.['aw-2'], 4.5)

    setFormativeGeneratorForTests(async () =>
      JSON.stringify({ comment: COMMENT, band: 'practice-strong', score: 4.5, axes: { 'aw-1': 4.5 } }),
    )
    const honest = await handleFormativeComment(
      request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant', fileSha256: high.sampleSha256 }),
    )
    assert.equal(honest.status, 200)
    assert.equal(((await honest.json()) as { score?: number }).score, 4.5)
  })

  it('does not guess from the file name when comparison excerpts cannot be sent', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const source = readFileSync(new URL('./formative-comment.ts', import.meta.url), 'utf8')
    assert.equal(source.includes('approximateBandId'), false)
    assert.match(source, /pages\.length >= 4/)
    let generated = false
    setFormativeGeneratorForTests(async () => {
      generated = true
      return JSON.stringify({ comment: COMMENT, band: '良好', score: 4.5 })
    })
    setLockedComparisonForTests('missing')
    const missing = await handleFormativeComment(
      request({
        mime: 'image/png',
        imageBase64: PNG,
        locale: 'zh-Hant',
        fileName: 'upload.pdf',
        fileSha256: LOCKED_LOW_A_SHA256,
      }),
    )
    assert.equal(missing.status, 502)
    assert.equal(generated, false)
    assert.deepEqual(await missing.json(), { ok: false, reason: 'unavailable' })

    setLockedComparisonForTests('text-only')
    const textOnly = await handleFormativeComment(
      request({
        mime: 'image/png',
        imageBase64: PNG,
        locale: 'zh-Hant',
        fileName: 'upload.pdf',
        fileSha256: LOCKED_LOW_A_SHA256,
      }),
    )
    assert.equal(textOnly.status, 502)
    assert.equal(generated, false)
    const body = await textOnly.json()
    assert.deepEqual(body, { ok: false, reason: 'unavailable' })
    assert.equal(JSON.stringify(body).includes('upload.pdf'), false)
    assert.equal('score' in (body as object), false)
  })

  it('keeps the student page cap at four while comparison excerpts are extra', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let studentPages = 0
    let excerptImages = 0
    let inlineImages = 0
    setFormativeGeneratorForTests(async (input) => {
      studentPages = input.pages?.length ?? 0
      excerptImages = (input.comparisons ?? []).filter((item) => item.base64.length > 0).length
      inlineImages = (input.parts ?? []).filter((part) => part.inlineData?.data).length
      return JSON.stringify({ comment: COMMENT, band: 'practice-secure', score: 3.5 })
    })
    const pages = Array.from({ length: 5 }, () => ({ side: 'artwork', mime: 'image/png', imageBase64: PNG }))
    const res = await handleFormativeComment(request({ locale: 'zh-Hant', pages }))
    assert.equal(res.status, 200)
    assert.equal(studentPages, 4)
    assert.equal(excerptImages, 8)
    assert.equal(inlineImages, 12)
  })
})
