import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import handler, {
  AI_CALLS_PER_HOUR,
  feedbackContentHash,
  feedbackErrorText,
  feldmanSystemPrompt,
  formativeLockLine,
  normalizeFeedbackText,
  planSbaFormative,
  setFeedbackUsageStoreForTests,
  takeCachedOrLimited,
  type FeedbackUsageIdentity,
  type FeedbackUsageStore,
} from './feedback.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const DSE_EN = {
  describe: 'Literal Description',
  analyze: 'Formal Analysis',
  interpret: 'Interpretation',
  judge: 'Value Judgment',
} as const

const DSE_ZH = {
  describe: { 'zh-Hant': '字面描述', 'zh-Hans': '字面描述', en: '字面描述' },
  analyze: { 'zh-Hant': '形式分析', 'zh-Hans': '形式分析', en: '形式分析' },
  interpret: { 'zh-Hant': '詮釋', 'zh-Hans': '诠释', en: '詮釋' },
  judge: { 'zh-Hant': '價值判斷', 'zh-Hans': '价值判断', en: '價值判斷' },
} as const

function futureJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: 'user-1' })).toString(
    'base64url',
  )
  return `${header}.${payload}.sig`
}

function identity(over: Partial<FeedbackUsageIdentity> = {}): FeedbackUsageIdentity {
  return {
    userId: 'user-1',
    mode: 'feldman',
    stage: 'describe',
    locale: 'en',
    contentHash: 'a'.repeat(64),
    ...over,
  }
}

describe('DSE Feldman wording', () => {
  test('system prompts name the public criticism moves and keep the formative lock', () => {
    for (const stage of ['describe', 'analyze', 'interpret', 'judge'] as const) {
      for (const locale of ['en', 'zh-Hant', 'zh-Hans'] as const) {
        const system = feldmanSystemPrompt(stage, locale)
        assert.equal(system.includes(DSE_EN[stage]), true, `${stage} ${locale}`)
        assert.equal(system.includes(DSE_ZH[stage][locale]), true, `${stage} ${locale}`)
        assert.equal(system.includes(formativeLockLine()), true)
        assert.match(system, /Do not award official scores, HKEAA grades, SBA marks/)
        assert.match(system, /Do not edit, fix, redraw, crop, or rewrite any image/)
        assert.match(system, /Never ask for or mention age or birth year/)
        assert.equal(system.includes('birth_year'), false)
        assert.equal(/candidate script|DAR|mark scheme/.test(system) && /quote/.test(system), true)
        assert.equal(/\b(?:level|band|grade)\s*[0-9A-F]\b/i.test(system), false)
      }
    }
  })

  test('Feldman stage labels use the Literal / Formal / Value names', () => {
    const files = {
      'feldman.json': { describe: '字面描述', analyse: '形式分析', interpret: '詮釋', judge: '價值判斷' },
      'feldman.en.json': { describe: '字面描述', analyse: '形式分析', interpret: '詮釋', judge: '價值判斷' },
      'feldman.zh-Hans.json': { describe: '字面描述', analyse: '形式分析', interpret: '诠释', judge: '价值判断' },
    } as const
    const en = {
      describe: 'Literal Description',
      analyse: 'Formal Analysis',
      interpret: 'Interpretation',
      judge: 'Value Judgment',
    }
    for (const [file, zh] of Object.entries(files)) {
      const pack = JSON.parse(readFileSync(join(root, 'src/content', file), 'utf8')) as {
        stages: Array<{ id: string; zh: string; en: string }>
      }
      for (const stage of pack.stages) {
        assert.equal(stage.zh, zh[stage.id as keyof typeof zh], `${file} ${stage.id}`)
        assert.equal(stage.en, en[stage.id as keyof typeof en], `${file} ${stage.id}`)
      }
    }
  })
})

describe('feedback cache hash', () => {
  test('whitespace collapses, and step metadata changes the hash', () => {
    const a = feedbackContentHash({ text: '  Red   line\nnear the edge.  ', artwork: 'Landscape' })
    const b = feedbackContentHash({ text: 'Red line near the edge.', artwork: 'Landscape' })
    assert.equal(a, b)
    assert.equal(normalizeFeedbackText('  Red   line\nnear the edge.  '), 'Red line near the edge.')
    assert.equal(a.includes('Red line'), false)
    assert.notEqual(a, feedbackContentHash({ text: 'Red line near the edge.', artwork: 'Portrait' }))
    assert.notEqual(
      feedbackContentHash({ text: 'note', step: 'Research', photoCount: 1 }),
      feedbackContentHash({ text: 'note', step: 'Research', photoCount: 2 }),
    )
    assert.equal(/^[a-f0-9]{64}$/.test(a), true)
  })
})

describe('rate limit and cache', () => {
  test('the limit trips on the next call after N successes and does not call Gemini', async () => {
    const rows: Array<{ userId: string; at: number; hash: string }> = []
    let now = 1_700_000_000_000
    const store: FeedbackUsageStore = {
      async recentSuccessCount(userId, sinceMs) {
        return rows.filter((row) => row.userId === userId && row.at >= sinceMs).length
      },
      async freshFeedback() {
        return null
      },
      async recordSuccess(id) {
        rows.push({ userId: id.userId, at: now, hash: id.contentHash })
      },
    }
    let geminiCalls = 0
    for (let i = 0; i < AI_CALLS_PER_HOUR; i++) {
      const out = await takeCachedOrLimited({
        identity: identity({ contentHash: i.toString(16).padStart(64, '0') }),
        nowMs: now,
        store,
        generate: async () => {
          geminiCalls += 1
          return { ok: true, feedback: `tip ${i}` }
        },
      })
      assert.equal(out.ok, true, `call ${i}`)
      now += 1_000
    }
    const blocked = await takeCachedOrLimited({
      identity: identity({ contentHash: 'f'.repeat(64) }),
      nowMs: now,
      store,
      generate: async () => {
        geminiCalls += 1
        return { ok: true, feedback: 'should not run' }
      },
    })
    assert.deepEqual(blocked, { ok: false, reason: 'rate_limited' })
    assert.equal(geminiCalls, AI_CALLS_PER_HOUR)
    assert.equal(rows.length, AI_CALLS_PER_HOUR)
  })

  test('a fresh cache hit skips Gemini even when the hour is already full', async () => {
    let generated = 0
    const out = await takeCachedOrLimited({
      identity: identity(),
      nowMs: 1_700_000_000_000,
      store: {
        async recentSuccessCount() {
          throw new Error('count should not run on a hit')
        },
        async freshFeedback() {
          return 'Look again at the lines you already named.'
        },
        async recordSuccess() {
          throw new Error('a hit is not a new AI call')
        },
      },
      generate: async () => {
        generated += 1
        return { ok: true, feedback: 'new' }
      },
    })
    assert.deepEqual(out, {
      ok: true,
      feedback: 'Look again at the lines you already named.',
      cache: 'hit',
    })
    assert.equal(generated, 0)
  })

  test('SBA mode still rejects image payloads', () => {
    assert.deepEqual(planSbaFormative({ mode: 'sba', text: 'hello', image: 'abc' }, 'en'), {
      ok: false,
      reason: 'image',
    })
    assert.deepEqual(planSbaFormative({ mode: 'sba', text: 'look data:image/png;base64,aaaa' }, 'zh-Hant'), {
      ok: false,
      reason: 'image',
    })
  })
})

describe('feedback handler usage', { concurrency: 1 }, () => {
  const prev: Record<string, string | undefined> = {}

  function saveEnv() {
    for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'GEMINI_API_KEY']) {
      prev[key] = process.env[key]
    }
    process.env.SUPABASE_URL = 'https://supabase.test'
    delete process.env.VITE_SUPABASE_URL
    process.env.SUPABASE_ANON_KEY = 'anon-test'
    delete process.env.VITE_SUPABASE_ANON_KEY
    process.env.GEMINI_API_KEY = 'test-key-not-real'
  }

  function restoreEnv() {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    setFeedbackUsageStoreForTests(null)
  }

  function authedFetch(seen: string[]) {
    return async (input: RequestInfo | URL) => {
      const url = String(input)
      seen.push(url)
      if (url.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: 'user-1', aud: 'authenticated' }), { status: 200 })
      }
      if (url.includes('/rest/v1/user_progress')) {
        return new Response(JSON.stringify({ can_use_ai: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({ error: { message: 'gemini should not be called' } }), { status: 500 })
      }
      return new Response(JSON.stringify({ error: 'unexpected ' + url }), { status: 500 })
    }
  }

  function request(body: unknown, locale = 'en'): Request {
    return new Request('https://example.test/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${futureJwt()}`,
        'X-VA-Locale': locale,
      },
      body: JSON.stringify(body),
    })
  }

  test('a cache hit returns the stored comment and does not call Gemini', async () => {
    saveEnv()
    const seen: string[] = []
    const original = globalThis.fetch
    globalThis.fetch = authedFetch(seen) as typeof fetch
    setFeedbackUsageStoreForTests(() => ({
      async recentSuccessCount() {
        throw new Error('count should not run on a hit')
      },
      async freshFeedback(id) {
        assert.equal(id.mode, 'feldman')
        assert.equal(id.stage, 'describe')
        assert.equal(id.locale, 'en')
        assert.equal(id.userId, 'user-1')
        return 'Look again at the lines you already named.'
      },
      async recordSuccess() {
        throw new Error('a hit is not stored again')
      },
    }))
    try {
      const res = await handler.fetch(
        request({ stage: 'describe', text: 'A red line sits near the edge.', locale: 'en' }),
      )
      const body = (await res.json()) as { feedback?: string; code?: string }
      assert.equal(res.status, 200)
      assert.equal(body.feedback, 'Look again at the lines you already named.')
      assert.equal(seen.some((url) => url.includes('generativelanguage.googleapis.com')), false)
    } finally {
      globalThis.fetch = original
      restoreEnv()
    }
  })

  test('the handler returns 429 in the request locale when the hour is full', async () => {
    saveEnv()
    const seen: string[] = []
    const original = globalThis.fetch
    globalThis.fetch = authedFetch(seen) as typeof fetch
    setFeedbackUsageStoreForTests(() => ({
      async recentSuccessCount() {
        return AI_CALLS_PER_HOUR
      },
      async freshFeedback() {
        return null
      },
      async recordSuccess() {
        throw new Error('rate limit must not store')
      },
    }))
    try {
      const res = await handler.fetch(
        request({ stage: 'judge', text: 'The work holds together because the empty space is wide.', locale: 'zh-Hant' }, 'zh-Hant'),
      )
      const body = (await res.json()) as { error?: string; code?: string }
      assert.equal(res.status, 429)
      assert.equal(body.code, 'rate_limited')
      assert.equal(body.error, feedbackErrorText('zh-Hant', 'rate_limited'))
      assert.equal(res.headers.get('retry-after'), '3600')
      assert.equal(seen.some((url) => url.includes('generativelanguage.googleapis.com')), false)
    } finally {
      globalThis.fetch = original
      restoreEnv()
    }
  })

  test('English read-aloud prefers en-GB', () => {
    const speech = readFileSync(join(root, 'src/lib/useSpeech.ts'), 'utf8')
    const i18n = readFileSync(join(root, 'src/i18n/index.tsx'), 'utf8')
    assert.match(i18n, /en: 'en-GB'/)
    assert.match(speech, /en: \['en-GB', 'en-HK', 'en-US', 'en'\]/)
  })
})
