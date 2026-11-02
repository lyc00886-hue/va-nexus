import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { geminiFeedback, geminiModels, isGeminiHighDemand, isGeminiQuota } from './feedback.ts'

describe('gemini fallback', { concurrency: 1 }, () => {

function withModel(value: string | undefined, run: () => void) {
  const prev = process.env.GEMINI_MODEL
  if (value === undefined) delete process.env.GEMINI_MODEL
  else process.env.GEMINI_MODEL = value
  try {
    run()
  } finally {
    if (prev === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = prev
  }
}

test('GEMINI_MODEL is tried first, then 3.8, flash-latest, and 2.5-flash-lite', () => {
  withModel('gemini-2.0-flash', () => {
    assert.deepEqual(geminiModels(), [
      'gemini-2.0-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
    ])
  })
})

test('missing GEMINI_MODEL still tries the stable flash chain once each', () => {
  withModel(undefined, () => {
    assert.deepEqual(geminiModels(), [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
    ])
  })
})

test('an API key in GEMINI_MODEL is ignored', () => {
  withModel('AIzaSyNotAModel', () => {
    assert.equal(geminiModels()[0], 'gemini-3.8-flash')
    assert.equal(geminiModels().includes('gemini-2.5-flash-lite'), true)
  })
})

test('high demand tries later flash models, then a success is returned', async () => {
  const calls: string[] = []
  const logs: string[] = []
  const originalFetch = globalThis.fetch
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '))
  }
  globalThis.fetch = async (input) => {
    const url = String(input)
    calls.push(url)
    const model = url.split('/models/')[1]?.split(':')[0] ?? ''
    if (model === 'gemini-2.5-flash-lite') {
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Nice observation.' }] } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({
        error: {
          code: 503,
          status: 'UNAVAILABLE',
          message: 'This model is currently experiencing high demand.',
        },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }
  try {
    delete process.env.GEMINI_MODEL
    const result = await geminiFeedback('test-key-not-for-logs', 'system', 'private student sentence')
    assert.deepEqual(result, { ok: true, feedback: 'Nice observation.' })
    assert.deepEqual(
      calls.map((url) => url.split('/models/')[1]?.split(':')[0]),
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'],
    )
    const blob = `${calls.join('\n')}\n${logs.join('\n')}`
    assert.equal(blob.includes('test-key-not-for-logs'), false)
    assert.equal(blob.includes('private student sentence'), false)
  } finally {
    globalThis.fetch = originalFetch
    console.error = originalError
  }
})

test('when every flash model is in high demand, the result is the paused quota flag', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response(
      JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE', message: 'overloaded' } }),
      { status: 503 },
    )
  }
  try {
    delete process.env.GEMINI_MODEL
    const result = await geminiFeedback('k', 'system', 'text')
    assert.deepEqual(result, { ok: false, quota: true })
    assert.equal(calls, 3)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('account quota stops the chain on the first model', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } }), {
      status: 429,
    })
  }
  try {
    delete process.env.GEMINI_MODEL
    const result = await geminiFeedback('k', 'system', 'text')
    assert.deepEqual(result, { ok: false, quota: true })
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('503 and UNAVAILABLE high-demand are busy, not an account-wide quota stop', () => {
  const highDemand = {
    error: {
      code: 503,
      status: 'UNAVAILABLE',
      message: 'This model is currently experiencing high demand. Please try again later.',
    },
  }
  assert.equal(isGeminiHighDemand(503, highDemand), true)
  assert.equal(isGeminiQuota(503, highDemand), false)
  assert.equal(isGeminiHighDemand(500, { error: { status: 'UNAVAILABLE', message: 'overloaded' } }), true)
  assert.equal(isGeminiQuota(429, highDemand), true)
  assert.equal(isGeminiQuota(200, { error: { status: 'RESOURCE_EXHAUSTED', message: '' } }), true)
  assert.equal(isGeminiHighDemand(400, { error: { status: 'INVALID_ARGUMENT', message: 'bad' } }), false)
})
})
