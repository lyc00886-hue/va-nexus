import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import {
  handleFormativeComment,
  setFormativeGeneratorForTests,
  setFormativeRateLimitForTests,
  type FormativeGenerator,
} from './formative-comment.ts'

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
    assert.deepEqual(await ok.json(), { ok: true, comment: COMMENT, band: 'practice-secure', axes: {} })
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
      'aw-3': 1.25,
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
})
