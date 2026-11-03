import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  sbaAiCallAllowed,
  sbaFeedbackMaterial,
  sbaFeedbackPayloadIsFormative,
  sbaFeedbackRequestBody,
} from './sbaAiFeedback.ts'

const contentDir = join(dirname(fileURLToPath(import.meta.url)), '../content')

const COPY_FILES = [
  ['zh-Hant', 'sba-ai-feedback-copy.json'],
  ['en', 'sba-ai-feedback-copy.en.json'],
  ['zh-Hans', 'sba-ai-feedback-copy.zh-Hans.json'],
] as const

const COPY_KEYS = [
  'buttonOpenFeedback',
  'ageGateTitle',
  'ageGateBody',
  'ageGateConfirm',
  'ageGateDeny',
  'loading',
  'resultTitle',
  'disclaimer',
  'emptyState',
  'errorGeneric',
  'tipUseOwnWords',
] as const

const SCORE_BAND = /(?:level\s*[0-9]|band\s*[0-9]|grade\s*[A-F]\b|\b[0-9]{1,3}\s*\/\s*[0-9]{1,3}\b|score\s*[:=])/i

function readCopy(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(contentDir, name), 'utf8')) as Record<string, unknown>
}

describe('SBA AI feedback copy', () => {
  it('uses the same PEANUTS keys and locks in en, zh-Hant, and zh-Hans', () => {
    const keySets: string[][] = []
    for (const [locale, file] of COPY_FILES) {
      const data = readCopy(file)
      const meta = data.meta as { locale: string; locks: Record<string, boolean> }
      assert.equal(meta.locale, locale)
      assert.deepEqual(meta.locks, {
        manual_trigger_only: true,
        age_gate_18_plus: true,
        formative_only: true,
        never_edit_image: true,
        never_official_or_sba_looking_scores: true,
        ai_marks: false,
      })
      const keys = Object.keys(data).filter((key) => key !== 'meta')
      assert.deepEqual(keys, [...COPY_KEYS])
      keySets.push(keys)
      for (const key of COPY_KEYS) {
        const value = data[key]
        assert.equal(typeof value, 'string')
        assert.equal((value as string).trim().length > 0, true)
        assert.equal(SCORE_BAND.test(value as string), false)
      }
    }
    assert.deepEqual(keySets[0], keySets[1])
    assert.deepEqual(keySets[1], keySets[2])
  })

  it('keeps the three locale strings exactly as delivered', () => {
    const zhHant = readCopy('sba-ai-feedback-copy.json')
    const en = readCopy('sba-ai-feedback-copy.en.json')
    const zhHans = readCopy('sba-ai-feedback-copy.zh-Hans.json')
    assert.equal(en.buttonOpenFeedback, 'Get learning feedback')
    assert.equal(zhHant.buttonOpenFeedback, '取得學習評語')
    assert.equal(zhHans.buttonOpenFeedback, '获取学习评语')
    assert.equal(
      en.disclaimer,
      'For self-review only — formative guidance, not an official SBA / HKEAA mark. AI does not award marks, edit your image, or give grades or scores.',
    )
    assert.equal(
      zhHant.disclaimer,
      '只供自我檢視，屬進展性引導，並非正式 SBA／考評局分數；AI 不會評分、不會改圖，亦不會給等級或分數。',
    )
    assert.equal(
      zhHans.disclaimer,
      '只供自我检视，属进展性引导，并非正式 SBA／考评局分数；AI 不会评分、不会改图，也不会给等级或分数。',
    )
    assert.equal(en.emptyState, 'Upload evidence first, then tap for feedback (it never runs automatically).')
    assert.equal(en.ageGateConfirm, 'I am 18 or older')
    assert.equal(en.ageGateDeny, 'Not now')
  })
})

describe('sbaFeedbackMaterial', () => {
  it('has nothing to comment on until a note or a photo exists', () => {
    assert.deepEqual(sbaFeedbackMaterial({ note: '  ', savedNotes: [null, ''], photoCount: 0 }), {
      hasMaterial: false,
      text: '',
      photoCount: 0,
    })
  })

  it('uses the student note and does not require a photo', () => {
    const material = sbaFeedbackMaterial({ note: '  my own words  ', savedNotes: [], photoCount: 0 })
    assert.equal(material.hasMaterial, true)
    assert.equal(material.text, 'my own words')
    assert.equal(material.photoCount, 0)
  })

  it('counts photos without putting files or urls into the text', () => {
    const material = sbaFeedbackMaterial({
      note: '',
      savedNotes: [null],
      photoCount: 2,
    })
    assert.equal(material.hasMaterial, true)
    assert.equal(material.text, '')
    assert.equal(material.photoCount, 2)
  })

  it('dedupes notes and caps the photo count', () => {
    const material = sbaFeedbackMaterial({
      note: 'same',
      savedNotes: ['same', 'second'],
      photoCount: 99,
    })
    assert.equal(material.text, 'same\n\nsecond')
    assert.equal(material.photoCount, 24)
  })
})

describe('sbaAiCallAllowed', () => {
  it('refuses upload, under-18, and empty evidence', () => {
    assert.equal(sbaAiCallAllowed({ manualConfirm: false, canUseAi: true, hasMaterial: true }), false)
    assert.equal(sbaAiCallAllowed({ manualConfirm: true, canUseAi: false, hasMaterial: true }), false)
    assert.equal(sbaAiCallAllowed({ manualConfirm: true, canUseAi: true, hasMaterial: false }), false)
  })

  it('allows a confirmed 18+ call when there is something to comment on', () => {
    assert.equal(sbaAiCallAllowed({ manualConfirm: true, canUseAi: true, hasMaterial: true }), true)
  })
})

describe('sbaFeedbackPayloadIsFormative', () => {
  it('accepts a comment only when ai_marks is false and no score field is present', () => {
    assert.equal(sbaFeedbackPayloadIsFormative({ feedback: 'Look again at the edges.', ai_marks: false }), true)
    assert.equal(sbaFeedbackPayloadIsFormative({ feedback: 'Look again.', ai_marks: true }), false)
    assert.equal(sbaFeedbackPayloadIsFormative({ feedback: 'Look again.' }), false)
    assert.equal(sbaFeedbackPayloadIsFormative({ feedback: '   ', ai_marks: false }), false)
    assert.equal(
      sbaFeedbackPayloadIsFormative({ feedback: 'Look again.', ai_marks: false, score: 4 }),
      false,
    )
    assert.equal(
      sbaFeedbackPayloadIsFormative({ feedback: 'Look again.', ai_marks: false, level: '5' }),
      false,
    )
  })
})

describe('sbaFeedbackRequestBody', () => {
  it('sends formative text only — no image, url, or birth year', () => {
    const body = sbaFeedbackRequestBody({
      locale: 'zh-Hant',
      text: 'I used my own words.',
      photoCount: 1,
      step: '第 1 步 · 主題探索',
    })
    assert.deepEqual(Object.keys(body).sort(), ['locale', 'mode', 'photoCount', 'step', 'text'])
    assert.equal(body.mode, 'sba')
    assert.equal(JSON.stringify(body).includes('data:image'), false)
    assert.equal('image' in body, false)
    assert.equal('url' in body, false)
    assert.equal('birth_year' in body, false)
    assert.equal('adultConfirmed' in body, false)
  })
})
