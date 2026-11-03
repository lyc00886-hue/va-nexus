import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  feldmanSystemPrompt,
  formativeLockLine,
  planSbaFormative,
  sbaFeedbackResponse,
  sbaFormativeSystem,
} from './feedback.ts'

const SCORE_BAND = /(?:level\s*[0-9]|band\s*[0-9]|grade\s*[A-F]\b|\b[0-9]{1,3}\s*\/\s*[0-9]{1,3}\b|score\s*[:=])/i

describe('SBA formative framing', () => {
  test('system prompt stays formative and does not invent a score band', () => {
    for (const locale of ['en', 'zh-Hant', 'zh-Hans'] as const) {
      const system = sbaFormativeSystem(locale)
      assert.match(system, /Formative guidance and comments only/)
      assert.match(system, /ai_marks is false/)
      assert.match(system, /Do not edit, fix, redraw, crop, or rewrite any image/)
      assert.match(system, /You cannot see images/)
      assert.equal(system.includes(formativeLockLine()), true)
      assert.equal(SCORE_BAND.test(system), false)
    }
  })

  test('Feldman prompts use the same no-marks, no-image-edit lock', () => {
    for (const stage of ['describe', 'analyze', 'interpret', 'judge'] as const) {
      const system = feldmanSystemPrompt(stage, 'en')
      assert.equal(system.includes(formativeLockLine()), true)
      assert.equal(SCORE_BAND.test(system), false)
    }
  })

  test('a note is sent as the student wrote it, without a stage or an image', () => {
    const plan = planSbaFormative(
      { mode: 'sba', text: 'I chose this theme because of my street.', photoCount: 1, stage: 'judge', artwork: 'ignored' },
      'en',
    )
    assert.equal(plan.ok, true)
    if (!plan.ok) return
    assert.equal(plan.ai_marks, false)
    assert.match(plan.user, /I chose this theme because of my street\./)
    assert.match(plan.user, /image files are not included and must not be described or edited/)
    assert.equal(plan.user.includes('judge'), false)
    assert.equal(plan.user.includes('ignored'), false)
    assert.equal(SCORE_BAND.test(plan.system), false)
  })

  test('photo count alone is allowed and does not describe the image', () => {
    const plan = planSbaFormative({ mode: 'sba', text: '   ', photoCount: 2 }, 'zh-Hant')
    assert.equal(plan.ok, true)
    if (!plan.ok) return
    assert.match(plan.user, /\(no written note\)/)
    assert.match(plan.user, /must not be described or edited\): 2/)
    assert.equal(plan.ai_marks, false)
  })

  test('empty evidence, image payloads, and data urls are refused', () => {
    assert.deepEqual(planSbaFormative({ mode: 'sba', text: '  ', photoCount: 0 }, 'en'), { ok: false, reason: 'empty' })
    assert.deepEqual(planSbaFormative({ mode: 'sba', text: 'hello', image: 'abc' }, 'en'), { ok: false, reason: 'image' })
    assert.deepEqual(planSbaFormative({ mode: 'sba', text: 'hello', photos: ['a'] }, 'en'), { ok: false, reason: 'image' })
    assert.deepEqual(
      planSbaFormative({ mode: 'sba', text: 'look data:image/png;base64,aaaa' }, 'en'),
      { ok: false, reason: 'image' },
    )
    assert.deepEqual(planSbaFormative({ mode: 'feldman', text: 'hello' }, 'en'), { ok: false, reason: 'bad' })
  })

  test('the success payload cannot award marks', () => {
    assert.deepEqual(sbaFeedbackResponse('Try a closer crop in your next note.'), {
      feedback: 'Try a closer crop in your next note.',
      ai_marks: false,
    })
  })
})
