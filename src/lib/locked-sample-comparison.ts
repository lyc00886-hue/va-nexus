/**
 * Server-only locked comparison excerpts for the later score.
 * The formative route imports this module. The excerpt PNGs stay beside that
 * route and are included with the function. They are not student uploads and
 * are not placed on a public URL.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { FormativeAxes } from './formativeAiComment.ts'
import type { PracticeBandId } from './teacherDraftBand.ts'

export const LOCKED_LOW_A_SHA256 = '823bc0569f8a34bcaad92b1b8b2c40a9619f0a66121f9b5e2d5632a3319ce2b3'

export type LockedSampleRole = 'high' | 'low' | 'rubric'

export type LockedSample = {
  label: string
  sampleSha256: string
  bandHint: string
  role: LockedSampleRole
  /** sha256 of the process-visual excerpt PNG. Null when no excerpt page exists. */
  excerptSha256: string | null
  excerptBytes: number | null
}

/** The locked set of nine. Identified only by label, sample sha256, and band hint. */
export const LOCKED_SAMPLES: readonly LockedSample[] = [
  {
    label: '高分示例 A（主題／腦圖清晰）',
    sampleSha256: '1818161a67b4673a6df8cb0d0582cdf25ff1690cadb145eceb278ac20eab5532',
    bandHint: '良好',
    role: 'high',
    excerptSha256: 'c32741156586c641b8b835ee3c38e5489d98fafce38aac3cfcf0f16298ff78b2',
    excerptBytes: 564895,
  },
  {
    label: '高分示例 B（議題深度／多層結構）',
    sampleSha256: '9550b37cf3784bdc2629ed0802227723176391f751ad1d07a4fd8b4ab8bbee96',
    bandHint: '良好',
    role: 'high',
    excerptSha256: '1f3014c65a08fbf417657458f88c15bf2d620e751376009e023bd2d8e122d356',
    excerptBytes: 743343,
  },
  {
    label: '高分示例 C（主題探索＋藝術家對讀）',
    sampleSha256: 'a9f74a441954c6ef4a182a0539feda9831fa58647225c4c0dcb96ffa529843da',
    bandHint: '良好',
    role: 'high',
    excerptSha256: '72e2abce9e7d9bd5c8fa7f3f69648999f81a47d1773adddc98d982c88f83a778',
    excerptBytes: 1013683,
  },
  {
    label: '高分示例 D（評分紙＋作品集對照）',
    sampleSha256: 'd1792803f9c2bd79d6c2e76dad3de0f484e2c36c516cee9c05c3f2998153da42',
    bandHint: '良好',
    role: 'high',
    excerptSha256: 'dbb052e04c34d3ac5ebf40a0c724ef0cf3d015597cc501e096a1fe319df7fea0',
    excerptBytes: 767891,
  },
  {
    label: '高分示例 E',
    sampleSha256: '2896900cd1a95de8b2ae5f484118e2554a29451bd8b57c6b8f922e577f243b8b',
    bandHint: '良好',
    role: 'high',
    excerptSha256: '0fdf5312f89cd0259691f7912b145f33affa34b7f6a38b5e2857993b018f9adc',
    excerptBytes: 1184387,
  },
  {
    label: '待改進示例 A（過程紀錄對照）',
    sampleSha256: LOCKED_LOW_A_SHA256,
    bandHint: '發展中',
    role: 'low',
    excerptSha256: 'cc2fbd587bcab2592568ce1239d1446d6b7e42857e0a768f8c144e8da286c4d4',
    excerptBytes: 441588,
  },
  {
    label: '待改進示例 B（校內批次對照）',
    sampleSha256: 'fb7c4274bb2522f9619f5366284af88e998829c96c071f096e51f7072f4bce78',
    bandHint: '起步／發展中',
    role: 'low',
    excerptSha256: '112ec9e8934d05050636f9b2c2f603a9e0d63a538d0bf28beb913064a909775b',
    excerptBytes: 506367,
  },
  {
    label: '待改進示例 C（工作簿中段對照）',
    sampleSha256: 'bf55e06bfc6edbae2946ee750d0d7b6fefd1d1ecf6343963bc592a38c2f6e17d',
    bandHint: '發展中／穩固',
    role: 'low',
    excerptSha256: '0f6a0a60d6244ee694b106c008cefb09d266eab0f0f452c88408a1c92af2c8e3',
    excerptBytes: 876884,
  },
  {
    label: '工作簿分頁結構參考',
    sampleSha256: 'd40514e70b7d968ed8ada34f794c27d72388728f0e8e018e9acef026f9bf887e',
    bandHint: 'n/a',
    role: 'rubric',
    excerptSha256: null,
    excerptBytes: null,
  },
]

export type LockedComparisonImage = {
  label: string
  sampleSha256: string
  bandHint: string
  role: LockedSampleRole
  mime: 'image/png'
  base64: string
}

export type LoadedComparison = {
  ok: true
  prompt: string
  images: LockedComparisonImage[]
}

/** Labels and hashes in this text do not count as comparison materials. */
export function lockedComparisonPrompt(): string {
  const lines = [
    'Locked comparison excerpts are attached with this request. They are reference images, not the student upload, and they do not count toward the student page limit.',
    'A label, a sample sha256, or a band hint written in text is not a comparison unless that excerpt image is attached.',
    'Do not guess a score from a file name or a file size.',
    'Score the visible visual elements and the making path in this order: text, then images, then visual elements, then combine with artist reference, then the artwork.',
    'A weak or missing path must not receive a high unofficial score only because the finished work looks complete, because an artist is cited, or because a cover teacher mark is high.',
    'Artist reference is not score authority. A cover teacher mark is not authority for this unofficial result.',
    'Band hint 發展中 is about 2.5 and is not 良好. Band hint 良好 may be an honest 4.5 or an unofficial 5. Do not cap an unofficial 5 at 4.5.',
  ]
  for (const sample of LOCKED_SAMPLES) {
    lines.push(
      [
        `Label: ${sample.label}`,
        `Sample sha256: ${sample.sampleSha256}`,
        `Band hint: ${sample.bandHint}`,
        sample.excerptSha256 ? 'Excerpt image attached.' : 'No excerpt image. Label and sample sha256 only.',
      ].join('\n'),
    )
  }
  return lines.join('\n')
}

/**
 * True only when excerpt images for every high sample and for 待改進示例 A are present.
 * Prompt text that merely names those labels or hashes is not enough.
 */
export function comparisonImagesReady(images: readonly LockedComparisonImage[]): boolean {
  const ready = (sample: LockedSample) =>
    images.some(
      (image) =>
        image.sampleSha256 === sample.sampleSha256 &&
        image.role === sample.role &&
        image.mime === 'image/png' &&
        image.base64.length > 0,
    )
  const highs = LOCKED_SAMPLES.filter((sample) => sample.role === 'high')
  if (!highs.every(ready)) return false
  const lowA = LOCKED_SAMPLES.find((sample) => sample.sampleSha256 === LOCKED_LOW_A_SHA256)
  return lowA != null && ready(lowA)
}

/** A prompt that names labels or hashes, with no excerpt images, is not a comparison. */
export function textLabelsWithoutImagesFail(prompt: string, images: readonly LockedComparisonImage[]): boolean {
  const mentions = /高分示例|待改進示例|[0-9a-f]{64}/.test(prompt)
  return mentions && !comparisonImagesReady(images)
}

export function partsIncludeComparisonImages(
  parts: readonly { inlineData?: { data?: string } }[],
  images: readonly LockedComparisonImage[],
): boolean {
  if (!comparisonImagesReady(images)) return false
  const inline = new Set<string>()
  for (const part of parts) {
    const data = part.inlineData?.data
    if (typeof data === 'string' && data.length > 0) inline.add(data)
  }
  for (const image of images) {
    const required = image.role === 'high' || image.sampleSha256 === LOCKED_LOW_A_SHA256
    if (!required) continue
    if (!inline.has(image.base64)) return false
  }
  return true
}

function clampAxes(axes: FormativeAxes, ceiling: number): FormativeAxes {
  const next: FormativeAxes = {}
  for (const [key, value] of Object.entries(axes)) {
    if (typeof value !== 'number') continue
    next[key as keyof FormativeAxes] = value > ceiling ? ceiling : value
  }
  return next
}

function strictness(sample: LockedSample): number {
  if (sample.sampleSha256 === LOCKED_LOW_A_SHA256 || sample.bandHint === '發展中') return 0
  if (sample.bandHint === '起步／發展中') return 1
  if (sample.bandHint === '發展中／穩固') return 2
  if (sample.bandHint === '良好') return 3
  return 4
}

/** The locked sample this request must follow. A rubric-only match does not set a score. */
export function strictestLockedHit(hashes: readonly string[]): LockedSample | null {
  const wanted = new Set(hashes)
  const hits = LOCKED_SAMPLES.filter((sample) => sample.role !== 'rubric' && wanted.has(sample.sampleSha256))
  if (hits.length === 0) return null
  return hits.reduce((best, hit) => (strictness(hit) < strictness(best) ? hit : best))
}

/**
 * A sha256 hit follows that sample's band hint.
 * 待改進示例 A is 發展中, about 2.5, and is not 4.5 or 良好.
 * A high sample stays on 良好 and keeps an explicit unofficial 5.
 */
export function applyLockedSampleHit<T extends { band: PracticeBandId; score: number | null; axes: FormativeAxes }>(
  result: T,
  hashes: readonly string[],
): T {
  const hit = strictestLockedHit(hashes)
  if (!hit) return result
  if (hit.sampleSha256 === LOCKED_LOW_A_SHA256 || hit.bandHint === '發展中') {
    return {
      ...result,
      band: 'practice-developing',
      score: 2.5,
      axes: clampAxes(result.axes, 2.5),
    }
  }
  if (hit.bandHint === '起步／發展中') {
    const score = result.score == null || result.score > 2.5 ? 2.5 : result.score
    const band: PracticeBandId = score <= 1.5 ? 'practice-emerging' : 'practice-developing'
    return { ...result, band, score, axes: clampAxes(result.axes, 2.5) }
  }
  if (hit.bandHint === '發展中／穩固') {
    let score = result.score
    if (score == null || score > 3.5) score = 3.5
    else if (score < 2.5) score = 2.5
    const band: PracticeBandId = score >= 3.5 ? 'practice-secure' : 'practice-developing'
    return { ...result, band, score, axes: clampAxes(result.axes, 3.5) }
  }
  if (hit.bandHint === '良好') {
    const score = result.score === 5 ? 5 : result.score == null ? null : result.score < 4.5 ? 4.5 : result.score
    return { ...result, band: 'practice-strong', score }
  }
  return result
}

function excerptUrl(excerptSha256: string): URL | null {
  switch (excerptSha256) {
    case 'c32741156586c641b8b835ee3c38e5489d98fafce38aac3cfcf0f16298ff78b2':
      return new URL('../../api/locked-sample-excerpts/c32741156586c641b8b835ee3c38e5489d98fafce38aac3cfcf0f16298ff78b2.png', import.meta.url)
    case '1f3014c65a08fbf417657458f88c15bf2d620e751376009e023bd2d8e122d356':
      return new URL('../../api/locked-sample-excerpts/1f3014c65a08fbf417657458f88c15bf2d620e751376009e023bd2d8e122d356.png', import.meta.url)
    case '72e2abce9e7d9bd5c8fa7f3f69648999f81a47d1773adddc98d982c88f83a778':
      return new URL('../../api/locked-sample-excerpts/72e2abce9e7d9bd5c8fa7f3f69648999f81a47d1773adddc98d982c88f83a778.png', import.meta.url)
    case 'dbb052e04c34d3ac5ebf40a0c724ef0cf3d015597cc501e096a1fe319df7fea0':
      return new URL('../../api/locked-sample-excerpts/dbb052e04c34d3ac5ebf40a0c724ef0cf3d015597cc501e096a1fe319df7fea0.png', import.meta.url)
    case '0fdf5312f89cd0259691f7912b145f33affa34b7f6a38b5e2857993b018f9adc':
      return new URL('../../api/locked-sample-excerpts/0fdf5312f89cd0259691f7912b145f33affa34b7f6a38b5e2857993b018f9adc.png', import.meta.url)
    case 'cc2fbd587bcab2592568ce1239d1446d6b7e42857e0a768f8c144e8da286c4d4':
      return new URL('../../api/locked-sample-excerpts/cc2fbd587bcab2592568ce1239d1446d6b7e42857e0a768f8c144e8da286c4d4.png', import.meta.url)
    case '112ec9e8934d05050636f9b2c2f603a9e0d63a538d0bf28beb913064a909775b':
      return new URL('../../api/locked-sample-excerpts/112ec9e8934d05050636f9b2c2f603a9e0d63a538d0bf28beb913064a909775b.png', import.meta.url)
    case '0f6a0a60d6244ee694b106c008cefb09d266eab0f0f452c88408a1c92af2c8e3':
      return new URL('../../api/locked-sample-excerpts/0f6a0a60d6244ee694b106c008cefb09d266eab0f0f452c88408a1c92af2c8e3.png', import.meta.url)
    default:
      return null
  }
}

function readExcerpt(sample: LockedSample): Buffer | null {
  if (!sample.excerptSha256 || sample.excerptBytes == null) return null
  const fromModule = excerptUrl(sample.excerptSha256)
  const fromFunction = pathToFileURL(join(process.cwd(), 'api/locked-sample-excerpts', `${sample.excerptSha256}.png`))
  const targets = fromModule ? [fromModule, fromFunction] : [fromFunction]
  for (const target of targets) {
    try {
      const bytes = readFileSync(target)
      if (bytes.length !== sample.excerptBytes) continue
      if (createHash('sha256').update(bytes).digest('hex') !== sample.excerptSha256) continue
      return bytes
    } catch {
      continue
    }
  }
  return null
}

function imageFromSample(sample: LockedSample, bytes: Buffer | null): LockedComparisonImage {
  return {
    label: sample.label,
    sampleSha256: sample.sampleSha256,
    bandHint: sample.bandHint,
    role: sample.role,
    mime: 'image/png',
    base64: bytes ? bytes.toString('base64') : '',
  }
}

let diskCache: LoadedComparison | null = null

/** Read the excerpt PNGs. High samples and 待改進示例 A are required. Other excerpts are included when they verify. */
export function readLockedComparisonFromDisk(): LoadedComparison | { ok: false } {
  if (diskCache) return diskCache
  const images: LockedComparisonImage[] = []
  for (const sample of LOCKED_SAMPLES) {
    if (!sample.excerptSha256) {
      images.push(imageFromSample(sample, null))
      continue
    }
    const bytes = readExcerpt(sample)
    if (!bytes) {
      if (sample.role === 'high' || sample.sampleSha256 === LOCKED_LOW_A_SHA256) return { ok: false }
      continue
    }
    images.push(imageFromSample(sample, bytes))
  }
  if (!comparisonImagesReady(images)) return { ok: false }
  const loaded: LoadedComparison = { ok: true, prompt: lockedComparisonPrompt(), images }
  diskCache = loaded
  return loaded
}

function textOnlyComparison(): LoadedComparison {
  return {
    ok: true,
    prompt: lockedComparisonPrompt(),
    images: LOCKED_SAMPLES.map((sample) => imageFromSample(sample, null)),
  }
}

let testMode: 'disk' | 'missing' | 'text-only' = 'disk'

/** Tests only. `null` restores disk excerpts. */
export function setLockedComparisonForTests(mode: 'disk' | 'missing' | 'text-only' | null): void {
  testMode = mode ?? 'disk'
}

export function loadLockedComparison(): LoadedComparison | { ok: false } {
  if (testMode === 'missing') return { ok: false }
  if (testMode === 'text-only') return textOnlyComparison()
  return readLockedComparisonFromDisk()
}
