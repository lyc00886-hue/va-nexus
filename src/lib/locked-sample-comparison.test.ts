import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { encode } from 'jpeg-js'
import { formativeModelParts } from '../../api/formative-comment.ts'
import { formativeAxisLabels, formativeCommentSystem, postFormativeComment } from './formativeAiComment.ts'
import { dhashDistance, pageDhashesOfUpload } from './pageDhash.ts'
import {
  DEVELOPING_PAGE_DISTANCE_MAX,
  LOCKED_GOOD_A_BYTES,
  LOCKED_GOOD_A_LABEL,
  LOCKED_GOOD_A_PAGES,
  LOCKED_GOOD_A_SHA256,
  LOCKED_HONEST_FIVE_A_BYTES,
  LOCKED_HONEST_FIVE_A_LABEL,
  LOCKED_HONEST_FIVE_A_PAGES,
  LOCKED_HONEST_FIVE_A_SHA256,
  LOCKED_LOW_A_REEXPORT_LABEL,
  LOCKED_LOW_A_REEXPORT_SHA256,
  LOCKED_LOW_A_SHA256,
  LOCKED_SAMPLES,
  LOCKED_SECURE_A_BYTES,
  LOCKED_SECURE_A_LABEL,
  LOCKED_SECURE_A_PAGES,
  LOCKED_SECURE_A_SHA256,
  applyLockedSampleHit,
  comparisonImagesReady,
  developingAnchors,
  lockedComparisonPrompt,
  partsIncludeComparisonImages,
  readLockedComparisonFromDisk,
  receivedPageDhashes,
  rgbaFromPng,
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
    assert.match(prompt, new RegExp(LOCKED_LOW_A_REEXPORT_LABEL))
    assert.match(prompt, new RegExp(LOCKED_LOW_A_REEXPORT_SHA256))
    assert.equal(prompt.includes('downgrade'), false)
    assert.equal(prompt.includes('Level two'), false)
    assert.equal(prompt.includes('5*'), false)
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
    assert.equal(apiSources.length, 11, apiSources.join('\n'))
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

  it('keeps the 23-page re-export and a later lookalike page on 發展中 without using a file name', () => {
    const hitSource = readFileSync(join(root, 'src/lib/locked-sample-comparison.ts'), 'utf8')
    const fingerSource = readFileSync(join(root, 'src/lib/pageDhash.ts'), 'utf8')
    assert.equal(hitSource.includes('fileName'), false)
    assert.equal(hitSource.includes('downgrade'), false)
    assert.equal(hitSource.includes('Level two'), false)
    assert.equal(fingerSource.includes('fileName'), false)
    assert.equal(fingerSource.includes('downgrade'), false)
    const reexport = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 4.5, 'aw-2': 5 } },
      [LOCKED_LOW_A_REEXPORT_SHA256],
    )
    assert.equal(reexport.band, 'practice-developing')
    assert.equal(reexport.score, 2.5)
    assert.notEqual(reexport.score, 4.5)
    assert.equal(reexport.axes['aw-1'], 2.5)
    assert.equal(reexport.axes['aw-2'], 2.5)

    const anchors = developingAnchors()
    const lowA = anchors.find((anchor) => anchor.sampleSha256 === LOCKED_LOW_A_SHA256)
    const lowB = LOCKED_SAMPLES.find((sample) => sample.bandHint === '起步／發展中')
    const lowC = LOCKED_SAMPLES.find((sample) => sample.bandHint === '發展中／穩固')
    assert.ok(lowA)
    assert.ok(anchors.some((anchor) => anchor.sampleSha256 === lowB?.sampleSha256))
    assert.ok(anchors.some((anchor) => anchor.sampleSha256 === lowC?.sampleSha256))
    assert.equal(anchors.some((anchor) => LOCKED_SAMPLES.some((sample) => sample.role === 'high' && sample.sampleSha256 === anchor.sampleSha256)), false)

    const excerpt = readFileSync(join(root, 'api/locked-sample-excerpts', 'cc2fbd587bcab2592568ce1239d1446d6b7e42857e0a768f8c144e8da286c4d4.png'))
    const image = rgbaFromPng(excerpt)
    assert.ok(image)
    const jpeg = encode({ data: image.data, width: image.width, height: image.height }, 40)
    const lookalike = receivedPageDhashes(new Uint8Array(jpeg.data))
    assert.equal(lookalike.length, 1)
    assert.ok((dhashDistance(lookalike[0], lowA.dhash) ?? 99) <= DEVELOPING_PAGE_DISTANCE_MAX)
    const later = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 4.5 } },
      ['ab'.repeat(32)],
      lookalike,
    )
    assert.equal(later.band, 'practice-developing')
    assert.equal(later.score, 2.5)
    assert.notEqual(later.score, 4.5)

    const high = LOCKED_SAMPLES.find((sample) => sample.role === 'high' && sample.excerptSha256)
    assert.ok(high?.excerptSha256)
    const highBytes = readFileSync(join(root, 'api/locked-sample-excerpts', `${high.excerptSha256}.png`))
    const highHash = receivedPageDhashes(highBytes)
    assert.equal(highHash.length, 1)
    assert.ok((dhashDistance(highHash[0], lowA.dhash) ?? 0) > DEVELOPING_PAGE_DISTANCE_MAX)
    const ordinary = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 4.5 } },
      ['cd'.repeat(32)],
      highHash,
    )
    assert.equal(ordinary.score, 4.5)
    assert.equal(ordinary.band, 'practice-strong')
    const topped = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 5, axes: { 'aw-1': 5 } },
      [high.sampleSha256],
      highHash,
    )
    assert.equal(topped.score, 5)
    assert.notEqual(topped.score, 4.5)
    assert.notEqual(topped.score, 2.5)

    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    for (const banned of ['5**', '5*', '公開試結果', '公開試預測', 'Level two']) {
      assert.equal(student.includes(banned), false, banned)
    }
    for (const file of ['src/i18n/zh-Hant.json', 'src/i18n/zh-Hans.json', 'src/i18n/en.json']) {
      const text = readFileSync(join(root, file), 'utf8')
      assert.equal(text.includes(LOCKED_LOW_A_REEXPORT_LABEL), false, file)
      assert.equal(text.includes(LOCKED_LOW_A_REEXPORT_SHA256), false, file)
    }
  })

  it('fingerprints a re-exported page from the original file before the posted subset', async () => {
    const excerpt = readFileSync(join(root, 'api/locked-sample-excerpts', 'cc2fbd587bcab2592568ce1239d1446d6b7e42857e0a768f8c144e8da286c4d4.png'))
    const image = rgbaFromPng(excerpt)
    assert.ok(image)
    const jpeg = new Uint8Array(encode({ data: image.data, width: image.width, height: image.height }, 40).data)
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    const embedded = await doc.embedJpg(jpeg)
    for (let index = 0; index < 5; index += 1) {
      const page = doc.addPage([embedded.width, embedded.height])
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
    }
    const pdf = new Uint8Array(await doc.save())
    const direct = await pageDhashesOfUpload(pdf)
    const anchor = developingAnchors().find((item) => item.sampleSha256 === LOCKED_LOW_A_SHA256)
    assert.ok(anchor)
    assert.ok(direct.some((hash) => (dhashDistance(hash, anchor.dhash) ?? 99) <= DEVELOPING_PAGE_DISTANCE_MAX))
    let raw = ''
    const sent = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'reexport.pdf',
      mime: 'application/pdf',
      bytes: pdf,
      pages: [{ side: 'artwork', mime: 'application/pdf', bytes: pdf, fileName: 'reexport.pdf' }],
      fetchImpl: async (_input, init) => {
        raw = String(init?.body ?? '')
        return new Response(JSON.stringify({ ok: false }), { status: 503 })
      },
    })
    assert.equal(sent.ok, false)
    const body = JSON.parse(raw) as { pageDhashes?: string[]; pages?: unknown[] }
    assert.equal(body.pages?.length, 1)
    assert.ok(body.pageDhashes?.some((hash) => (dhashDistance(hash, anchor.dhash) ?? 99) <= DEVELOPING_PAGE_DISTANCE_MAX))
    assert.equal(raw.includes('reexport.pdf'), false)
  })

  it('locks the three whole-file samples by sha256 and does not invent excerpts', () => {
    const highA = LOCKED_SAMPLES.find(
      (sample) => sample.sampleSha256 === '1818161a67b4673a6df8cb0d0582cdf25ff1690cadb145eceb278ac20eab5532',
    )
    assert.equal(highA?.label.startsWith('高分示例 A'), true)
    assert.equal(LOCKED_SECURE_A_BYTES, 24340156)
    assert.equal(LOCKED_SECURE_A_PAGES, 24)
    assert.equal(LOCKED_GOOD_A_BYTES, 14521923)
    assert.equal(LOCKED_GOOD_A_PAGES, 27)
    assert.equal(LOCKED_HONEST_FIVE_A_BYTES, 24976115)
    assert.equal(LOCKED_HONEST_FIVE_A_PAGES, 71)
    for (const hash of [LOCKED_SECURE_A_SHA256, LOCKED_GOOD_A_SHA256, LOCKED_HONEST_FIVE_A_SHA256]) {
      assert.equal(LOCKED_SAMPLES.some((sample) => sample.sampleSha256 === hash), false)
      assert.equal(existsSync(join(root, 'api/locked-sample-excerpts', `${hash}.png`)), false)
    }
    assert.equal(existsSync(join(root, 'SAMPLES.md')), false)
    const prompt = lockedComparisonPrompt()
    assert.match(prompt, new RegExp(LOCKED_SECURE_A_LABEL))
    assert.match(prompt, new RegExp(LOCKED_GOOD_A_LABEL))
    assert.match(prompt, new RegExp(LOCKED_HONEST_FIVE_A_LABEL))
    assert.match(prompt, /Do not inflate/)
    assert.match(prompt, /not the same as depth/)
    const honestAt = prompt.indexOf(LOCKED_HONEST_FIVE_A_LABEL)
    assert.equal(prompt.slice(honestAt, honestAt + 500).includes('高分示例 A'), false)
    const secure = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 5 } },
      [LOCKED_SECURE_A_SHA256],
    )
    assert.equal(secure.band, 'practice-secure')
    assert.equal(secure.score, 3.5)
    assert.equal(secure.axes['aw-1'], 3.5)
    assert.notEqual(secure.band, 'practice-strong')
    for (const score of [4, 4.5, 5] as const) {
      const good = applyLockedSampleHit(
        { band: 'practice-developing' as const, score, axes: { 'aw-1': score } },
        [LOCKED_GOOD_A_SHA256],
      )
      assert.equal(good.band, 'practice-strong')
      assert.equal(good.score, score)
      assert.equal(good.axes['aw-1'], score)
    }
    const honest = applyLockedSampleHit(
      { band: 'practice-strong' as const, score: 4.5, axes: { 'aw-1': 4.5 } },
      [LOCKED_HONEST_FIVE_A_SHA256],
    )
    assert.equal(honest.band, 'practice-strong')
    assert.equal(honest.score, 5)
    assert.notEqual(honest.score, 4.5)
    const named = applyLockedSampleHit(
      { band: 'practice-secure' as const, score: 3.5, axes: { 'aw-1': 3.5 } },
      ['ab'.repeat(32)],
    )
    assert.equal(named.score, 3.5)
    assert.equal(named.band, 'practice-secure')
    for (const file of ['src/i18n/zh-Hant.json', 'src/i18n/zh-Hans.json', 'src/i18n/en.json']) {
      const text = readFileSync(join(root, file), 'utf8')
      assert.equal(text.includes(LOCKED_SECURE_A_LABEL), false, file)
      assert.equal(text.includes(LOCKED_GOOD_A_LABEL), false, file)
      assert.equal(text.includes(LOCKED_HONEST_FIVE_A_LABEL), false, file)
      assert.equal(text.includes(LOCKED_HONEST_FIVE_A_SHA256), false, file)
    }
  })
})
