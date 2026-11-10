import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  formativeStaffAllowed,
  handleFormativeComment,
  setFormativeGeneratorForTests,
  setFormativeStaffCheckForTests,
  type FormativeGenerator,
} from './formative-comment.ts'

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const COMMENT = '主題或意念的探索及發展接近穩固，反思及學習進程仍可再寫清楚。'

function request(body: unknown, method = 'POST'): Request {
  return new Request('https://example.test/api/formative-comment', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  })
}

describe('formative comment route', { concurrency: false }, () => {
  const previousKey = process.env.GEMINI_API_KEY

  afterEach(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
    setFormativeStaffCheckForTests(null)
    setFormativeGeneratorForTests(null)
  })

  it('stays unavailable when no model key is configured', async () => {
    delete process.env.GEMINI_API_KEY
    let staffCalled = false
    let generated = false
    setFormativeStaffCheckForTests(async () => {
      staffCalled = true
      return true
    })
    setFormativeGeneratorForTests(async () => {
      generated = true
      return null
    })
    const res = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }))
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { ok: false, reason: 'unavailable' })
    assert.equal(staffCalled, false)
    assert.equal(generated, false)
  })

  it('does not generate for a caller who is not staff', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let generated = false
    setFormativeStaffCheckForTests(async () => false)
    setFormativeGeneratorForTests(async () => {
      generated = true
      return JSON.stringify({ comment: COMMENT, band: 'practice-secure' })
    })
    const res = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG }))
    assert.equal(res.status, 403)
    assert.equal(generated, false)
    assert.equal(formativeStaffAllowed({ role: 'student' }, 'student@example.com'), false)
    assert.equal(formativeStaffAllowed({ role: 'teacher' }, null), true)
    assert.equal(formativeStaffAllowed(null, null), false)
  })

  it('returns a short comment and practice band for staff, and drops official wording', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const seen: { system: string; user: string }[] = []
    const generate: FormativeGenerator = async (input) => {
      seen.push({ system: input.system, user: input.user })
      return JSON.stringify({ comment: COMMENT, band: '穩固' })
    }
    setFormativeStaffCheckForTests(async () => true)
    setFormativeGeneratorForTests(generate)
    const ok = await handleFormativeComment(
      request({ mime: 'image/png', imageBase64: PNG, locale: 'zh-Hant' }),
    )
    assert.equal(ok.status, 200)
    assert.deepEqual(await ok.json(), { ok: true, comment: COMMENT, band: 'practice-secure' })
    assert.match(seen[0].system, /主題或意念的探索及發展/)
    assert.match(seen[0].system, /反思及學習進程/)
    assert.equal(seen[0].system.includes('主題清晰度'), false)
    assert.equal(seen[0].system.includes('洞察藝術'), false)
    assert.match(seen[0].user, /Do not award an official mark/)

    setFormativeGeneratorForTests(async () => JSON.stringify({ comment: '這頁可達 5** 公開試結果。', band: 'practice-strong' }))
    const blocked = await handleFormativeComment(request({ mime: 'image/png', imageBase64: PNG }))
    assert.equal(blocked.status, 502)
    assert.deepEqual(await blocked.json(), { ok: false, reason: 'unavailable' })
  })

  it('does not invent a comment when the page is missing', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let generated = false
    setFormativeStaffCheckForTests(async () => true)
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
