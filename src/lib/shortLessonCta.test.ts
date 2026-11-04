import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { shortLessonFooterCta } from './shortLessonCta.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('short lesson one filled primary', () => {
  it('keeps the card footer filled when practice is closed or the lesson is linear', () => {
    assert.equal(
      shortLessonFooterCta({ folds: true, practiceOpen: false, phase: 'cards', lastCard: false }),
      'primary',
    )
    assert.equal(
      shortLessonFooterCta({ folds: true, practiceOpen: false, phase: 'cards', lastCard: true }),
      'primary',
    )
    assert.equal(
      shortLessonFooterCta({ folds: false, practiceOpen: true, phase: 'cards', lastCard: true }),
      'primary',
    )
  })

  it('demotes 下一張 while practice is open, and hides the last-card footer', () => {
    assert.equal(
      shortLessonFooterCta({ folds: true, practiceOpen: true, phase: 'cards', lastCard: false }),
      'quiet',
    )
    assert.equal(
      shortLessonFooterCta({ folds: true, practiceOpen: true, phase: 'quiz', lastCard: false }),
      'quiet',
    )
    for (const phase of ['cards', 'quiz', 'rest', 'result'] as const) {
      assert.equal(
        shortLessonFooterCta({ folds: true, practiceOpen: true, phase, lastCard: true }),
        'hidden',
      )
    }
  })

  it('wires the footer tone and leaves rest continue as the only filled rest action', () => {
    const player = readFileSync(join(root, 'src/components/game/LessonPlayer.tsx'), 'utf8')
    assert.match(player, /shortLessonFooterCta\(/)
    assert.match(player, /nextTone === 'hidden'/)
    assert.match(player, /nextTone === 'quiet'/)
    const rest = player.slice(player.indexOf('function RestStage'), player.indexOf('function ResultStage'))
    assert.match(rest, /bg-blue-600/)
    assert.ok(rest.indexOf('lp.rest.continue') < rest.indexOf('lp.rest.review'))
    const review = rest.slice(rest.indexOf('lp.rest.review') - 180, rest.indexOf('lp.rest.review'))
    assert.equal(review.includes('bg-blue-600'), false)
  })
})