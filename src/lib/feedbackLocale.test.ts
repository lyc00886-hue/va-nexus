import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { feedbackFailureText, feedbackLocaleHeaders } from './feedbackLocale.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('feedback locale headers', () => {
  it('sends the active UI locale on both feedback callers', () => {
    assert.deepEqual(feedbackLocaleHeaders('en'), { 'X-VA-Locale': 'en', 'Accept-Language': 'en' })
    assert.deepEqual(feedbackLocaleHeaders('zh-Hans'), {
      'X-VA-Locale': 'zh-Hans',
      'Accept-Language': 'zh-Hans',
    })
    assert.deepEqual(feedbackLocaleHeaders('zh-Hant'), {
      'X-VA-Locale': 'zh-Hant',
      'Accept-Language': 'zh-Hant',
    })
    assert.equal(feedbackLocaleHeaders('fr')['X-VA-Locale'], 'zh-Hant')

    const feldman = readFileSync(join(root, 'src/lib/feldmanAiRequest.ts'), 'utf8')
    const sba = readFileSync(join(root, 'src/components/SbaAiFeedback.tsx'), 'utf8')
    assert.match(feldman, /feedbackLocaleHeaders\(input\.locale\)/)
    assert.match(feldman, /fetch\('\/api\/feedback'/)
    assert.match(sba, /feedbackLocaleHeaders\(locale\)/)
    assert.equal(feldman.includes('err.message'), false)
  })

  it('shows a coded server error and hides an uncoded English gateway body', () => {
    const fallback = 'AI 學習建議暫時未能提供（504）。'
    assert.equal(
      feedbackFailureText({ code: 'auth_required', error: 'Sign in with Google to use AI feedback.' }, fallback),
      'Sign in with Google to use AI feedback.',
    )
    assert.equal(
      feedbackFailureText({ code: 'gemini_upstream', error: 'Gemini 暫時未能回應，請稍後再試' }, fallback),
      'Gemini 暫時未能回應，請稍後再試',
    )
    const hidden = feedbackFailureText(
      { error: 'A server error has occurred FUNCTION_INVOCATION_TIMEOUT' },
      fallback,
    )
    assert.equal(hidden, fallback)
    assert.equal(
      feedbackFailureText({ code: 'not_ours', error: 'High demand in English' }, fallback).includes('English'),
      false,
    )
  })
})
