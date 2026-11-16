import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildLessonSteps, officialFilmIdsIn, splitOfficialFilmText } from './lessonSteps.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('one-card lesson steps', () => {
  it('interleaves at most two cards then one question', () => {
    const steps = buildLessonSteps({ cardCount: 5, questionCount: 7, media: true })
    assert.deepEqual(
      steps.map((step) => step.kind),
      ['media', 'card', 'card', 'question', 'card', 'card', 'question', 'card', 'question', 'question', 'question', 'question', 'question'],
    )
    assert.equal(steps.length, 13)
    assert.deepEqual(
      steps.filter((step) => step.kind === 'card').map((step) => (step.kind === 'card' ? step.cardIndex : -1)),
      [0, 1, 2, 3, 4],
    )
    assert.deepEqual(
      steps.filter((step) => step.kind === 'question').map((step) => (step.kind === 'question' ? step.questionIndex : -1)),
      [0, 1, 2, 3, 4, 5, 6],
    )
  })

  it('gives leftover cards and leftover questions their own steps', () => {
    assert.deepEqual(
      buildLessonSteps({ cardCount: 4, questionCount: 1, media: false }).map((step) => step.kind),
      ['card', 'card', 'question', 'card', 'card'],
    )
    assert.deepEqual(
      buildLessonSteps({ cardCount: 1, questionCount: 3, media: false }).map((step) => step.kind),
      ['card', 'question', 'question', 'question'],
    )
    assert.deepEqual(
      buildLessonSteps({ cardCount: 2, questionCount: 0, media: false }).map((step) => step.kind),
      ['card', 'card'],
    )
  })

  it('adds an optional rest only after the 13-step reference', () => {
    const longer = buildLessonSteps({ cardCount: 8, questionCount: 7, media: false })
    assert.equal(longer.some((step) => step.kind === 'rest'), true)
    assert.equal(longer.filter((step) => step.kind === 'rest').length, 1)
    const reference = buildLessonSteps({ cardCount: 5, questionCount: 7, media: true })
    assert.equal(reference.some((step) => step.kind === 'rest'), false)
  })

  it('turns an official classroom film link into an embed id and leaves other text', () => {
    const text = '看 https://www.youtube.com/watch?v=J-VketvKEX4 完'
    assert.deepEqual(officialFilmIdsIn(text), ['J-VketvKEX4'])
    assert.deepEqual(splitOfficialFilmText(text), [
      { kind: 'text', text: '看 ' },
      { kind: 'film', id: 'J-VketvKEX4' },
      { kind: 'text', text: ' 完' },
    ])
    assert.deepEqual(officialFilmIdsIn('https://www.youtube.com/watch?v=not-official'), [])
    assert.deepEqual(splitOfficialFilmText('沒有片'), [{ kind: 'text', text: '沒有片' }])
  })

  it('adds only the three new step strings', () => {
    const hant = JSON.parse(readFileSync(join(root, 'src/i18n/zh-Hant.json'), 'utf8')) as Record<string, string>
    const en = JSON.parse(readFileSync(join(root, 'src/i18n/en.json'), 'utf8')) as Record<string, string>
    const hans = JSON.parse(readFileSync(join(root, 'src/i18n/zh-Hans.json'), 'utf8')) as Record<string, string>
    assert.equal(hant['lp.step'], '第 {x} 步／共 {y} 步')
    assert.equal(en['lp.step'], 'Step {x} of {y}')
    assert.equal(hans['lp.step'], '第 {x} 步／共 {y} 步')
    assert.equal(hant['lp.showDetails'], '顯示詳情')
    assert.equal(en['lp.showDetails'], 'Show details')
    assert.equal(hans['lp.showDetails'], '显示详情')
    assert.equal(hant['lp.hideDetails'], '收起詳情')
    assert.equal(en['lp.hideDetails'], 'Hide details')
    assert.equal(hans['lp.hideDetails'], '收起详情')
    for (const value of [hant['lp.step'], hant['lp.showDetails'], hant['lp.hideDetails']]) {
      assert.equal(/[\u7684\u628A\u5572\u4F86\u6765]/.test(value), false, value)
    }
    assert.equal(hant['lp.correct'], '答啱！')
    assert.equal(hant['lp.correct'].includes('\u5571'), true)
    assert.equal(hant['lp.wrong'], '未啱，呢題稍後會再出現')
  })
})