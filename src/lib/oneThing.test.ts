import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function slice(source: string, start: string, end: string): string {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.ok(from >= 0 && to > from, start)
  return source.slice(from, to)
}

describe('lesson one-thing residual', () => {
  it('keeps a quiet lesson title and one primary rest action', () => {
    const player = read('src/components/game/LessonPlayer.tsx')
    const rest = slice(player, 'function RestStage', 'function ResultStage')
    assert.match(rest, /Pause/)
    assert.equal(rest.includes('Heart'), false)
    assert.match(rest, /t\('lp\.rest\.continue'\)/)
    assert.match(rest, /t\('lp\.rest\.review'\)/)
    assert.ok(rest.indexOf('lp.rest.continue') < rest.indexOf('lp.rest.review'))
    assert.match(rest, /bg-blue-600/)
    const review = rest.slice(rest.indexOf('lp.rest.review') - 180, rest.indexOf('lp.rest.review'))
    assert.equal(review.includes('bg-blue-600'), false)
    assert.match(player, /DemoBadge quiet/)
    assert.match(player, /text-xs leading-snug text-slate-500/)
    assert.match(player, /lesson\.title/)
  })

  it('demotes chunk-card subtitle and the percent bar beside the primary CTA', () => {
    const lesson = read('src/components/game/MapOneLesson.tsx')
    assert.match(lesson, /data-map-cta="primary"/)
    assert.match(lesson, /text-xs font-normal text-slate-400/)
    assert.match(lesson, /sr-only/)
    assert.match(lesson, /role="progressbar"/)
    assert.equal(lesson.includes('Heart'), false)
    const card = slice(lesson, 'function MapOneCard', 'function chunkText')
    assert.equal(card.includes('h-1.5'), false)
    assert.match(card, /t\('map\.chunk\.cta'\)/)
  })
})
