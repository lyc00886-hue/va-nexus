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
import { inflateSync } from 'node:zlib'
import type { FormativeAxes } from './formativeAiComment.ts'
import { dhashDistance, dhashFromJpegBytes, dhashFromRgba, embeddedJpegDhashes } from './pageDhash.ts'
import type { PracticeBandId } from './teacherDraftBand.ts'

export const LOCKED_LOW_A_SHA256 = '823bc0569f8a34bcaad92b1b8b2c40a9619f0a66121f9b5e2d5632a3319ce2b3'

/**
 * Whole-file sha256 of the 23-page cover-removed re-export of 待改進示例 A.
 * Extra hit only. It is not one of the nine catalog rows.
 */
export const LOCKED_LOW_A_REEXPORT_SHA256 = '4dd7ccb4978b91576392e169a292439a8fd2e161a324da1a5c08defd1976359d'

export const LOCKED_LOW_A_REEXPORT_LABEL = '待改進示例 A 再匯出本'

/** Whole-file sha256 of 穩固示例 A. Extra hit only. It is not one of the nine catalog rows. */
export const LOCKED_SECURE_A_SHA256 = '1fb31841230b6f4ef7c45bc2bb56bd4ebba90bc0b2dee3882d6af326eabe4ebc'
export const LOCKED_SECURE_A_LABEL = '穩固示例 A'
export const LOCKED_SECURE_A_BYTES = 24340156
export const LOCKED_SECURE_A_PAGES = 24

/** Whole-file sha256 of 良好示例 A. Extra hit only. It is not one of the nine catalog rows. */
export const LOCKED_GOOD_A_SHA256 = 'a6459598b866c0cef47a00821de0fc2b99ef8050ba6b04e748d0c1d87bfdca60'
export const LOCKED_GOOD_A_LABEL = '良好示例 A'
export const LOCKED_GOOD_A_BYTES = 14521923
export const LOCKED_GOOD_A_PAGES = 27

/**
 * Whole-file sha256 of 誠實五分示例 A. Extra hit only. It is not one of the nine catalog rows.
 * The 28-page file 1818161a… keeps the label 高分示例 A. This 71-page file does not.
 */
export const LOCKED_HONEST_FIVE_A_SHA256 = '2d1feb52a619e42708f3c81aa044e766687df6e2db1690e7ad26e7388558bad9'
export const LOCKED_HONEST_FIVE_A_LABEL = '誠實五分示例 A'
export const LOCKED_HONEST_FIVE_A_BYTES = 24976115
export const LOCKED_HONEST_FIVE_A_PAGES = 71

/**
 * Same-page distance after a JPEG re-save or a modest rescale stays at or below this.
 * Other locked excerpt pages sit well above it. This is not a match across every upload.
 */
export const DEVELOPING_PAGE_DISTANCE_MAX = 12

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

/** Same band as 待改進示例 A. Not part of the nine-row catalog and not a separate excerpt. */
const LOCKED_LOW_A_REEXPORT: LockedSample = {
  label: LOCKED_LOW_A_REEXPORT_LABEL,
  sampleSha256: LOCKED_LOW_A_REEXPORT_SHA256,
  bandHint: '發展中',
  role: 'low',
  excerptSha256: null,
  excerptBytes: null,
}

/** Whole-file hits. No excerpt page is stored for these three, so no page fingerprint is invented. */
const LOCKED_SECURE_A: LockedSample = {
  label: LOCKED_SECURE_A_LABEL,
  sampleSha256: LOCKED_SECURE_A_SHA256,
  bandHint: '穩固',
  role: 'low',
  excerptSha256: null,
  excerptBytes: null,
}

const LOCKED_GOOD_A: LockedSample = {
  label: LOCKED_GOOD_A_LABEL,
  sampleSha256: LOCKED_GOOD_A_SHA256,
  bandHint: '良好',
  role: 'high',
  excerptSha256: null,
  excerptBytes: null,
}

const LOCKED_HONEST_FIVE_A: LockedSample = {
  label: LOCKED_HONEST_FIVE_A_LABEL,
  sampleSha256: LOCKED_HONEST_FIVE_A_SHA256,
  bandHint: '良好',
  role: 'high',
  excerptSha256: null,
  excerptBytes: null,
}

function hitCatalog(): readonly LockedSample[] {
  return [...LOCKED_SAMPLES, LOCKED_LOW_A_REEXPORT, LOCKED_SECURE_A, LOCKED_GOOD_A, LOCKED_HONEST_FIVE_A]
}

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
    'Compare the student pages with the locked samples. Do not inflate a score. A complete file is not the same as depth.',
    'A re-export, rescan, or cover-removed copy of a locked developing sample follows that sample\'s band hint even when the whole-file sha256 differs.',
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
  lines.push(
    [
      `Label: ${LOCKED_LOW_A_REEXPORT_LABEL}`,
      `Sample sha256: ${LOCKED_LOW_A_REEXPORT_SHA256}`,
      'Band hint: 發展中',
      'Same locked work as 待改進示例 A after a re-export, a rescan, or removal of the cover scoresheet. The excerpt image for 待改進示例 A is the comparison image.',
      'Follow that band hint, about 2.5. Do not score this locked work as 4.5 or 良好. A different whole-file sha256 of this same work does not make it an ordinary non-hit.',
    ].join('\n'),
  )
  lines.push(
    [
      `Label: ${LOCKED_SECURE_A_LABEL}`,
      `Sample sha256: ${LOCKED_SECURE_A_SHA256}`,
      'Band hint: 穩固',
      'Whole-file sha256 hit only. No excerpt image is attached for this sample.',
      `About 3.5. Not 良好. Identification only: ${LOCKED_SECURE_A_BYTES} bytes, ${LOCKED_SECURE_A_PAGES} pages.`,
    ].join('\n'),
    [
      `Label: ${LOCKED_GOOD_A_LABEL}`,
      `Sample sha256: ${LOCKED_GOOD_A_SHA256}`,
      'Band hint: 良好',
      'Whole-file sha256 hit only. No excerpt image is attached for this sample.',
      'Visible unofficial score may be 4, 4.5, or an honest 5. Do not cap that score at 4.5 because the band value is about 4.5.',
      `Identification only: ${LOCKED_GOOD_A_BYTES} bytes, ${LOCKED_GOOD_A_PAGES} pages.`,
    ].join('\n'),
    [
      `Label: ${LOCKED_HONEST_FIVE_A_LABEL}`,
      `Sample sha256: ${LOCKED_HONEST_FIVE_A_SHA256}`,
      'Band hint: 良好',
      'Whole-file sha256 hit only. No excerpt image is attached for this sample.',
      'The visible unofficial result is an honest 5. The practice band may stay 良好. Do not cap that 5 at 4.5.',
      'This follows the locked file content. A file name is not this hit.',
      `Identification only: ${LOCKED_HONEST_FIVE_A_BYTES} bytes, ${LOCKED_HONEST_FIVE_A_PAGES} pages.`,
    ].join('\n'),
  )
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
  if (sample.bandHint === '穩固' || sample.sampleSha256 === LOCKED_SECURE_A_SHA256) return 3
  if (sample.bandHint === '良好') return 4
  return 5
}

/** The locked sample this request must follow. A rubric-only match does not set a score. */
export function strictestLockedHit(hashes: readonly string[]): LockedSample | null {
  const wanted = new Set(hashes)
  const hits = hitCatalog().filter((sample) => sample.role !== 'rubric' && wanted.has(sample.sampleSha256))
  if (hits.length === 0) return null
  return hits.reduce((best, hit) => (strictness(hit) < strictness(best) ? hit : best))
}

export type DevelopingPageAnchor = {
  sampleSha256: string
  dhash: string
}

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset)
}

/** 8-bit non-interlaced PNG to RGBA. Returns null for any other file. */
export function rgbaFromPng(bytes: Uint8Array): { width: number; height: number; data: Uint8Array } | null {
  if (
    bytes.length < 8 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null
  }
  try {
    let pos = 8
    let width = 0
    let height = 0
    let bitDepth = 0
    let colorType = -1
    let interlace = 0
    const idat: Uint8Array[] = []
    let palette: Uint8Array | null = null
    while (pos + 8 <= bytes.length) {
      const length = readU32(bytes, pos)
      const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7])
      const start = pos + 8
      const end = start + length
      if (end + 4 > bytes.length) return null
      const data = bytes.subarray(start, end)
      if (type === 'IHDR') {
        width = readU32(data, 0)
        height = readU32(data, 4)
        bitDepth = data[8]
        colorType = data[9]
        interlace = data[12]
      } else if (type === 'PLTE') palette = data
      else if (type === 'IDAT') idat.push(data)
      else if (type === 'IEND') break
      pos = end + 4
    }
    if (interlace !== 0 || bitDepth !== 8 || width < 1 || height < 1 || idat.length === 0) return null
    const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0
    if (channels === 0 || (colorType === 3 && !palette)) return null
    const raw = inflateSync(Buffer.concat(idat))
    const stride = width * channels
    if (raw.length < height * (stride + 1)) return null
    const out = new Uint8Array(width * height * 4)
    let src = 0
    let prev = new Uint8Array(stride)
    const paeth = (left: number, up: number, upLeft: number) => {
      const estimate = left + up - upLeft
      const leftDistance = Math.abs(estimate - left)
      const upDistance = Math.abs(estimate - up)
      const diagonal = Math.abs(estimate - upLeft)
      if (leftDistance <= upDistance && leftDistance <= diagonal) return left
      if (upDistance <= diagonal) return up
      return upLeft
    }
    for (let y = 0; y < height; y += 1) {
      const filter = raw[src]
      src += 1
      const row = new Uint8Array(stride)
      for (let i = 0; i < stride; i += 1) {
        const left = i >= channels ? row[i - channels] : 0
        const up = prev[i]
        const upLeft = i >= channels ? prev[i - channels] : 0
        const value = raw[src]
        src += 1
        let next = value
        if (filter === 1) next = (value + left) & 255
        else if (filter === 2) next = (value + up) & 255
        else if (filter === 3) next = (value + ((left + up) >> 1)) & 255
        else if (filter === 4) next = (value + paeth(left, up, upLeft)) & 255
        else if (filter !== 0) return null
        row[i] = next
      }
      prev = row
      for (let x = 0; x < width; x += 1) {
        const dest = (y * width + x) * 4
        if (colorType === 2) {
          const source = x * 3
          out[dest] = row[source]
          out[dest + 1] = row[source + 1]
          out[dest + 2] = row[source + 2]
          out[dest + 3] = 255
        } else if (colorType === 6) {
          const source = x * 4
          out[dest] = row[source]
          out[dest + 1] = row[source + 1]
          out[dest + 2] = row[source + 2]
          out[dest + 3] = row[source + 3]
        } else if (colorType === 0) {
          out[dest] = row[x]
          out[dest + 1] = row[x]
          out[dest + 2] = row[x]
          out[dest + 3] = 255
        } else if (colorType === 4) {
          out[dest] = row[x * 2]
          out[dest + 1] = row[x * 2]
          out[dest + 2] = row[x * 2]
          out[dest + 3] = row[x * 2 + 1]
        } else if (palette) {
          const source = row[x] * 3
          out[dest] = palette[source]
          out[dest + 1] = palette[source + 1]
          out[dest + 2] = palette[source + 2]
          out[dest + 3] = 255
        }
      }
    }
    return { width, height, data: out }
  } catch {
    return null
  }
}

let anchorCache: DevelopingPageAnchor[] | null = null

/** Pixel fingerprints of the locked developing excerpts. High samples are not anchors. */
export function developingAnchors(): readonly DevelopingPageAnchor[] {
  if (anchorCache) return anchorCache
  const anchors: DevelopingPageAnchor[] = []
  for (const sample of LOCKED_SAMPLES) {
    if (sample.role !== 'low' || !sample.bandHint.includes('發展中')) continue
    const bytes = readExcerpt(sample)
    if (!bytes) continue
    const image = rgbaFromPng(bytes)
    if (!image) continue
    const dhash = dhashFromRgba(image.data, image.width, image.height)
    if (!dhash) continue
    anchors.push({ sampleSha256: sample.sampleSha256, dhash })
  }
  anchorCache = anchors
  return anchors
}

function flatDhash(hash: string): boolean {
  return hash === '0000000000000000' || hash === 'ffffffffffffffff'
}

/**
 * A content page of a locked developing sample, including a later re-export
 * whose whole-file sha256 is not the catalog value. High samples are not matched here.
 */
export function developingPageHit(pageDhashes: readonly string[]): LockedSample | null {
  const anchors = developingAnchors()
  let best: LockedSample | null = null
  let seen = 0
  for (const hash of pageDhashes) {
    if (seen >= 64) break
    seen += 1
    const normalized = hash.trim().toLowerCase()
    if (!/^[0-9a-f]{16}$/.test(normalized) || flatDhash(normalized)) continue
    for (const anchor of anchors) {
      const distance = dhashDistance(normalized, anchor.dhash)
      if (distance == null || distance > DEVELOPING_PAGE_DISTANCE_MAX) continue
      const sample = LOCKED_SAMPLES.find((item) => item.sampleSha256 === anchor.sampleSha256)
      if (!sample) continue
      if (!best || strictness(sample) < strictness(best)) best = sample
    }
  }
  return best
}

function stricterHit(left: LockedSample | null, right: LockedSample | null): LockedSample | null {
  if (!left) return right
  if (!right) return left
  return strictness(left) <= strictness(right) ? left : right
}

/** Pixel fingerprints of one received page. A PDF contributes embedded images. The file name is not read. */
export function receivedPageDhashes(bytes: Uint8Array): string[] {
  const png = rgbaFromPng(bytes)
  if (png) {
    const hash = dhashFromRgba(png.data, png.width, png.height)
    return hash ? [hash] : []
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const hash = dhashFromJpegBytes(bytes)
    return hash ? [hash] : []
  }
  return embeddedJpegDhashes(bytes)
}

/**
 * A sha256 hit follows that sample's band hint.
 * 待改進示例 A is 發展中, about 2.5, and is not 4.5 or 良好.
 * A high sample stays on 良好 and keeps an explicit unofficial 5.
 */
export function applyLockedSampleHit<T extends { band: PracticeBandId; score: number | null; axes: FormativeAxes }>(
  result: T,
  hashes: readonly string[],
  pageDhashes: readonly string[] = [],
): T {
  const hit = stricterHit(strictestLockedHit(hashes), developingPageHit(pageDhashes))
  if (!hit) return result
  if (
    hit.sampleSha256 === LOCKED_LOW_A_SHA256 ||
    hit.sampleSha256 === LOCKED_LOW_A_REEXPORT_SHA256 ||
    hit.bandHint === '發展中'
  ) {
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
  if (hit.sampleSha256 === LOCKED_SECURE_A_SHA256 || hit.bandHint === '穩固') {
    return {
      ...result,
      band: 'practice-secure',
      score: 3.5,
      axes: clampAxes(result.axes, 3.5),
    }
  }
  if (hit.sampleSha256 === LOCKED_HONEST_FIVE_A_SHA256) {
    return { ...result, band: 'practice-strong', score: 5 }
  }
  if (hit.sampleSha256 === LOCKED_GOOD_A_SHA256) {
    const score =
      result.score === 5 || result.score === 4.5 || result.score === 4
        ? result.score
        : result.score == null
          ? null
          : 4
    return { ...result, band: 'practice-strong', score }
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
