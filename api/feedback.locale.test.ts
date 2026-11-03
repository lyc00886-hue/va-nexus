import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import handler, {
  FEEDBACK_ERROR_CODES,
  feedbackErrorText,
  localeFromHeader,
  localeOf,
  matchLocale,
  readJsonBody,
  type FeedbackErrorCode,
} from './feedback.ts'

const LOCALES = ['zh-Hant', 'zh-Hans', 'en'] as const

function futureJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: 'user-1' })).toString(
    'base64url',
  )
  return `${header}.${payload}.sig`
}

function request(locale: string | null, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers)
  if (locale) headers.set('X-VA-Locale', locale)
  return new Request('https://example.test/api/feedback', { ...init, headers })
}

describe('feedback error locale', { concurrency: 1 }, () => {
  test('every student error has short copy in zh-Hant, zh-Hans, and en', () => {
    for (const code of FEEDBACK_ERROR_CODES) {
      const seen = new Set<string>()
      for (const locale of LOCALES) {
        const text = feedbackErrorText(locale, code)
        assert.equal(text.length > 0, true, `${locale} ${code}`)
        assert.equal(text.includes('TODO'), false, text)
        seen.add(text)
      }
      if (code !== 'method') assert.equal(seen.size, 3, code)
    }
  })

  test('body locale wins, and a missing body locale uses the UI header', () => {
    assert.equal(localeOf('en', 'zh-Hant'), 'en')
    assert.equal(localeOf('zh-Hans', 'en'), 'zh-Hans')
    assert.equal(localeOf('zh-HK', 'en'), 'zh-Hant')
    assert.equal(localeOf(undefined, 'en'), 'en')
    assert.equal(localeOf('nope', 'zh-Hans'), 'zh-Hans')
    assert.equal(matchLocale(''), null)
  })

  test('X-VA-Locale wins over Accept-Language', () => {
    const req = new Request('https://example.test/api/feedback', {
      headers: { 'X-VA-Locale': 'zh-Hans', 'Accept-Language': 'en-HK,en;q=0.9' },
    })
    assert.equal(localeFromHeader(req), 'zh-Hans')
    assert.equal(localeFromHeader(new Request('https://example.test/api/feedback')), 'zh-Hant')
    assert.equal(
      localeFromHeader(new Request('https://example.test/api/feedback', { headers: { 'Accept-Language': 'en-GB' } })),
      'en',
    )
  })

  test('401 and 405 follow the UI locale header', async () => {
    const cases: Array<[string | null, FeedbackErrorCode, number, string]> = [
      ['en', 'auth_required', 401, 'POST'],
      ['zh-Hans', 'auth_required', 401, 'POST'],
      ['zh-Hant', 'auth_required', 401, 'POST'],
      [null, 'auth_required', 401, 'POST'],
      ['en', 'method', 405, 'GET'],
      ['zh-Hans', 'method', 405, 'GET'],
    ]
    for (const [locale, code, status, method] of cases) {
      const res = await handler.fetch(request(locale, { method }))
      assert.equal(res.status, status)
      const body = (await res.json()) as { error?: string; code?: string }
      const expected = locale === 'zh-Hans' ? 'zh-Hans' : locale === 'en' ? 'en' : 'zh-Hant'
      assert.equal(body.code, code)
      assert.equal(body.error, feedbackErrorText(expected, code))
    }
  })

  test('the client allowlist matches the server codes', () => {
    const client = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/lib/feedbackLocale.ts'), 'utf8')
    for (const code of FEEDBACK_ERROR_CODES) {
      assert.equal(client.includes(`'${code}'`), true, code)
    }
  })

  test('bad JSON uses the UI locale instead of a fixed language', async () => {
    const parsed = await readJsonBody(
      request('en', { method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' } }),
      'en',
    )
    assert.equal(parsed.ok, false)
    if (parsed.ok) return
    const body = (await parsed.response.json()) as { error?: string; code?: string }
    assert.equal(parsed.response.status, 400)
    assert.equal(body.code, 'json')
    assert.equal(body.error, feedbackErrorText('en', 'json'))
  })

  test('a signed-in request uses body locale for validation, else the UI header', async () => {
    const prevUrl = process.env.SUPABASE_URL
    const prevViteUrl = process.env.VITE_SUPABASE_URL
    const prevAnon = process.env.SUPABASE_ANON_KEY
    const prevViteAnon = process.env.VITE_SUPABASE_ANON_KEY
    const originalFetch = globalThis.fetch
    process.env.SUPABASE_URL = 'https://supabase.test'
    delete process.env.VITE_SUPABASE_URL
    process.env.SUPABASE_ANON_KEY = 'anon-test'
    delete process.env.VITE_SUPABASE_ANON_KEY
    globalThis.fetch = async (input) => {
      const url = String(input)
      if (url.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: 'user-1', aud: 'authenticated' }), { status: 200 })
      }
      if (url.includes('/rest/v1/user_progress')) {
        return new Response(JSON.stringify({ can_use_ai: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'unexpected ' + url }), { status: 500 })
    }
    try {
      const stage = await handler.fetch(
        request('zh-Hant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${futureJwt()}` },
          body: JSON.stringify({ locale: 'en', stage: 'nope', text: 'hello' }),
        }),
      )
      const stageBody = (await stage.json()) as { error?: string; code?: string }
      assert.equal(stage.status, 400)
      assert.equal(stageBody.code, 'stage')
      assert.equal(stageBody.error, feedbackErrorText('en', 'stage'))

      const empty = await handler.fetch(
        request('zh-Hans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${futureJwt()}` },
          body: JSON.stringify({ stage: 'describe', text: '   ' }),
        }),
      )
      const emptyBody = (await empty.json()) as { error?: string; code?: string }
      assert.equal(empty.status, 400)
      assert.equal(emptyBody.code, 'empty')
      assert.equal(emptyBody.error, feedbackErrorText('zh-Hans', 'empty'))
    } finally {
      globalThis.fetch = originalFetch
      if (prevUrl === undefined) delete process.env.SUPABASE_URL
      else process.env.SUPABASE_URL = prevUrl
      if (prevViteUrl === undefined) delete process.env.VITE_SUPABASE_URL
      else process.env.VITE_SUPABASE_URL = prevViteUrl
      if (prevAnon === undefined) delete process.env.SUPABASE_ANON_KEY
      else process.env.SUPABASE_ANON_KEY = prevAnon
      if (prevViteAnon === undefined) delete process.env.VITE_SUPABASE_ANON_KEY
      else process.env.VITE_SUPABASE_ANON_KEY = prevViteAnon
    }
  })

  test('missing Supabase config is the localized auth-down line, not English-only', async () => {
    const prevUrl = process.env.SUPABASE_URL
    const prevViteUrl = process.env.VITE_SUPABASE_URL
    const prevAnon = process.env.SUPABASE_ANON_KEY
    const prevViteAnon = process.env.VITE_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_URL
    delete process.env.VITE_SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.VITE_SUPABASE_ANON_KEY
    try {
      const res = await handler.fetch(
        request('en', {
          method: 'POST',
          headers: { Authorization: `Bearer ${futureJwt()}` },
        }),
      )
      const body = (await res.json()) as { error?: string; code?: string }
      assert.equal(res.status, 503)
      assert.equal(body.code, 'auth_down')
      assert.equal(body.error, feedbackErrorText('en', 'auth_down'))
      assert.equal((body.error ?? '').includes('Supabase'), false)
    } finally {
      if (prevUrl === undefined) delete process.env.SUPABASE_URL
      else process.env.SUPABASE_URL = prevUrl
      if (prevViteUrl === undefined) delete process.env.VITE_SUPABASE_URL
      else process.env.VITE_SUPABASE_URL = prevViteUrl
      if (prevAnon === undefined) delete process.env.SUPABASE_ANON_KEY
      else process.env.SUPABASE_ANON_KEY = prevAnon
      if (prevViteAnon === undefined) delete process.env.VITE_SUPABASE_ANON_KEY
      else process.env.VITE_SUPABASE_ANON_KEY = prevViteAnon
    }
  })
})
