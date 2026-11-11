import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  BRING_CHOICES,
  bringSectionIntoStep,
  emptyFeldmanDraft,
  withFeldmanArtwork,
  withFeldmanStep,
} from './feldmanDraft.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('bring a Look closely section into a Feldman step', () => {
  it('uses the locked default steps and the allowed retargets', () => {
    assert.deepEqual(BRING_CHOICES.seen, ['describe'])
    assert.deepEqual(BRING_CHOICES.understood, ['analyse', 'interpret'])
    assert.deepEqual(BRING_CHOICES.evidence, ['judge', 'describe', 'analyse', 'interpret'])
  })

  it('writes into an empty step and waits before replacing text', () => {
    const seen = '框入面見到一粒淺色圓形。'
    const empty = bringSectionIntoStep(emptyFeldmanDraft(), 'describe', seen, false)
    assert.equal(empty.result, 'written')
    assert.equal(empty.draft.steps.describe, seen)
    assert.equal(empty.draft.steps.analyse, '')

    const held = bringSectionIntoStep(empty.draft, 'describe', '另一句。', false)
    assert.equal(held.result, 'needConfirm')
    assert.equal(held.draft.steps.describe, seen)

    const replaced = bringSectionIntoStep(held.draft, 'describe', '另一句。', true)
    assert.equal(replaced.result, 'written')
    assert.equal(replaced.draft.steps.describe, '另一句。')
  })

  it('does not write an empty section and does not treat spaces as existing text', () => {
    const blank = bringSectionIntoStep(emptyFeldmanDraft(), 'analyse', '   ', false)
    assert.equal(blank.result, 'empty')
    assert.equal(blank.draft.steps.analyse, '')

    const spaced = withFeldmanStep(emptyFeldmanDraft(), 'judge', '   ')
    const written = bringSectionIntoStep(spaced, 'judge', '圓形右下有較深色塊。', false)
    assert.equal(written.result, 'written')
    assert.equal(written.draft.steps.judge, '圓形右下有較深色塊。')
  })

  it('leaves the artwork name optional and does not call the Feldman tip', () => {
    const named = withFeldmanArtwork(emptyFeldmanDraft(), '')
    assert.equal(named.artwork, '')
    const source = readFileSync(join(root, 'src/lib/feldmanDraft.ts'), 'utf8')
    const hook = readFileSync(join(root, 'src/lib/useFeldmanDraft.ts'), 'utf8')
    assert.equal(source.includes('feldmanAiRequest'), false)
    assert.equal(source.includes('fetch('), false)
    assert.equal(hook.includes('feldmanAiRequest'), false)
    assert.equal(hook.includes('/api/feedback'), false)
    assert.equal(hook.includes('PRACTICE_BAND'), false)
  })
})
