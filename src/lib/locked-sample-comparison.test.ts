import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { formativeCommentSystem, formativeAxisLabels } from './formativeAiComment.ts'
import { formativeModelParts } from '../../api/formative-comment.ts'
import {
  LOCKED_LOW_A_SHA256,
  LOCKED_SAMPLES,
  applyLockedSampleHit,
  comparisonImagesReady,
  lockedComparisonPrompt,
  partsIncludeComparisonImages,
  readLockedComparisonFromDisk,
  textLabelsWithoutImagesFail,
  type LockedComparisonImage,
} from './locked-sample-comparison.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const SKIPPED = [
  'c4ae82aa4fd7033d83e9cbf6c7e2835827df5e49fbf12fe9128fe26bab97e9cc',
  'd85a4de94ac96f8c4bc01dae92e904501b1d434025f981e002bd41be00bb246d',
  'd78cb89ab1c8c3318d89589770bc54f1cf62114954e7025c75b314054a340304',
  '058d3fcf46e38c9ce3f2527320296f781d0249c4f4c5f56eded794d1285fa7e8',
]

function walk(dir: string, into: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, into)
    else into.push(path)
  }
  return into
}

describe('locked comparison excerpts', () => {
  it('rejects a prompt that only names labels or hashes', () => {
    const prompt = lockedComparisonPrompt()
    const empty: LockedComparisonImage[] = LOCKED_SAMPLES.map((sample) => ({
      label: sample.label,
      sampleSha256: sample.sampleSha256,
      bandHint: sample.bandHint,
      role: sample.role,
      mime: 'image/png',
      base64: '',
    }))
    assert.match(prompt, /待改進示例 A/)
    assert.match(prompt, new RegExp(LOCKED_LOW_A_SHA256))
    assert.equal(textLabelsWithoutImagesFail(prompt, empty), true)
    assert.equal(comparisonImagesReady(empty), false)
    const textOnly = formativeModelParts(prompt, [{ side: 'artwork', sides: ['artwork'], mime: 'image/png', base64: PNG }], empty)
    assert.equal(partsIncludeComparisonImages(textOnly, empty), false)
    const namedInText = [{ text: `${prompt}\n${PNG}` }]
    assert.equal(partsIncludeComparisonImages(namedInText, empty), false)
    for (const hash of SKIPPED) assert.equal(prompt.includes(hash), false)
    assert.equal(prompt.includes('5**'), false)
    assert.equal(prompt.includes('評分校準'), false)
    assert.equal(prompt.includes('公開試結果'), false)
    assert.equal(prompt.includes('公開試預測'), false)
  })

  it('sends high excerpts and 待改進示例 A, and keeps the other excerpts server-only', () => {
    const loaded = readLockedComparisonFromDisk()
    assert.equal(loaded.ok, true)
    if (!loaded.ok) return
    assert.equal(comparisonImagesReady(loaded.images), true)
    assert.equal(loaded.images.filter((image) => image.base64.length > 0).length, 8)
    const rubric = loaded.images.find((image) => image.label === '工作簿分頁結構參考')
    assert.equal(rubric?.base64, '')
    assert.match(loaded.prompt, /工作簿分頁結構參考/)
    const parts = formativeModelParts(loaded.prompt, [{ side: 'artwork', sides: ['artwork'], mime: 'image/png', base64: PNG }], loaded.images)
    assert.equal(partsIncludeComparisonImages(parts, loaded.images), true)
    const inline = parts.flatMap((part) => (part.inlineData?.data ? [part.inlineData.data] : []))
    assert.equal(inline.length, 9)
    assert.equal(inline.filter((data) => data === PNG).length, 1)
    const names = readdirSync(join(root, 'api/locked-sample-excerpts'))
    const excerptNames = LOCKED_SAMPLES.flatMap((sample) => (sample.excerptSha256 ? [`${sample.excerptSha256}.png`] : []))
    assert.deepEqual(names.slice().sort(), excerptNames.slice().sort())
    for (const sample of LOCKED_SAMPLES) {
      if (!sample.excerptSha256 || sample.excerptBytes == null) continue
      const path = join(root, 'api/locked-sample-excerpts', `${sample.excerptSha256}.png`)
      const bytes = readFileSync(path)
      assert.equal(bytes.length, sample.excerptBytes)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), sample.excerptSha256)
    }
    const apiSources = walk(join(root, 'api')).filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    assert.ok(apiSources.length <= 12, apiSources.join('\n'))
    assert.equal(apiSources.some((file) => file.includes('locked-sample-comparison')), false)
    const pub = walk(join(root, 'public'))
    const banned = [...excerptNames.map((name) => name.slice(0, -4)), ...SKIPPED]
    for (const hash of banned) assert.equal(pub.some((file) => file.includes(hash)), false, hash)
    assert.equal(statSync(join(root, 'api/locked-sample-excerpts')).isDirectory(), true)
    const system = formativeCommentSystem(formativeAxisLabels('zh-Hant').map((axis) => axis.label), 'zh-Hant')
    assert.match(system, /text, then images, then visual elements/)
    assert.match(system, /Artist reference is not score authority/)
    assert.match(system, /cover teacher mark/)
    assert.equal(system.includes('5**'), false)
    assert.equal(system.includes('評分校準'), false)
  })

  it('follows a locked band hint and does not cap a high-sample 5', () => {
    const low = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 4.5, 'aw-2': 5 } },
      [LOCKED_LOW_A_SHA256],
    )
    assert.equal(low.band, 'practice-developing')
    assert.equal(low.score, 2.5)
    assert.equal(low.axes['aw-1'], 2.5)
    assert.equal(low.axes['aw-2'], 2.5)
    assert.notEqual(low.score, 4.5)

    const highSha = LOCKED_SAMPLES.find((sample) => sample.role === 'high')?.sampleSha256 ?? ''
    const topped = applyLockedSampleHit(
      { band: 'practice-developing' as const, score: 5, axes: { 'aw-1': 5 } },
      [highSha],
    )
    assert.equal(topped.band, 'practice-strong')
    assert.equal(topped.score, 5)
    assert.equal(topped.axes['aw-1'], 5)
    assert.notEqual(topped.score, 4.5)
    const honest = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 4.5 } },
      [highSha],
    )
    assert.equal(honest.score, 4.5)

    const range = LOCKED_SAMPLES.find((sample) => sample.bandHint === '起步／發展中')
    const capped = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 5 } },
      [range?.sampleSha256 ?? ''],
    )
    assert.equal(capped.score, 2.5)
    assert.notEqual(capped.band, 'practice-strong')
    assert.equal(capped.axes['aw-1'], 2.5)
  })
})
