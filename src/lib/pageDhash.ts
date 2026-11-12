/**
 * Page-image fingerprint for a later upload.
 * A whole-file sha256 changes when the same pages are re-exported or rescanned.
 * This hash is only a fingerprint of the pixels. It is not a score, and the
 * file name is never read.
 */
import { decode } from 'jpeg-js'

const DHASH_WIDTH = 9
const DHASH_HEIGHT = 8

export function dhashDistance(left: string, right: string): number | null {
  if (!/^[0-9a-f]{16}$/.test(left) || !/^[0-9a-f]{16}$/.test(right)) return null
  let bits = BigInt(`0x${left}`) ^ BigInt(`0x${right}`)
  let count = 0
  while (bits > 0n) {
    count += Number(bits & 1n)
    bits >>= 1n
  }
  return count
}

function gray(data: ArrayLike<number>, index: number): number {
  return (data[index] * 77 + data[index + 1] * 150 + data[index + 2] * 29) >> 8
}

/** 64-bit horizontal gradient hash. The same page stays close after a rescale or a milder JPEG. */
export function dhashFromRgba(data: ArrayLike<number>, width: number, height: number): string | null {
  if (width < 2 || height < 2 || data.length < width * height * 4) return null
  const sample = new Uint8Array(DHASH_WIDTH * DHASH_HEIGHT)
  for (let y = 0; y < DHASH_HEIGHT; y += 1) {
    const y0 = Math.floor((y * height) / DHASH_HEIGHT)
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / DHASH_HEIGHT))
    for (let x = 0; x < DHASH_WIDTH; x += 1) {
      const x0 = Math.floor((x * width) / DHASH_WIDTH)
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / DHASH_WIDTH))
      let sum = 0
      let count = 0
      for (let yy = y0; yy < y1; yy += 1) {
        for (let xx = x0; xx < x1; xx += 1) {
          sum += gray(data, (yy * width + xx) * 4)
          count += 1
        }
      }
      sample[y * DHASH_WIDTH + x] = Math.round(sum / count)
    }
  }
  let bits = 0n
  for (let y = 0; y < DHASH_HEIGHT; y += 1) {
    for (let x = 0; x < DHASH_WIDTH - 1; x += 1) {
      const left = sample[y * DHASH_WIDTH + x]
      const right = sample[y * DHASH_WIDTH + x + 1]
      bits = (bits << 1n) | (left < right ? 1n : 0n)
    }
  }
  return bits.toString(16).padStart(16, '0')
}

export function dhashFromJpegBytes(bytes: Uint8Array): string | null {
  try {
    const image = decode(bytes, {
      useTArray: true,
      formatAsRGBA: true,
      maxMemoryUsageInMB: 128,
      maxResolutionInMP: 40,
    })
    if (!image.width || !image.height || image.data.length < image.width * image.height * 4) return null
    return dhashFromRgba(image.data, image.width, image.height)
  } catch {
    return null
  }
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function isBrowserRaster(bytes: Uint8Array): boolean {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

/** Keep the larger embedded images. A 23-page file stays under this cap. */
const EMBEDDED_JPEG_MAX = 32
const EMBEDDED_JPEG_MIN_BYTES = 12_000

function considerJpeg(kept: Uint8Array[], chunk: Uint8Array): void {
  if (chunk.byteLength < EMBEDDED_JPEG_MIN_BYTES) return
  if (kept.length < EMBEDDED_JPEG_MAX) {
    kept.push(chunk)
    return
  }
  let smallest = 0
  for (let index = 1; index < kept.length; index += 1) {
    if (kept[index].byteLength < kept[smallest].byteLength) smallest = index
  }
  if (chunk.byteLength > kept[smallest].byteLength) kept[smallest] = chunk
}

/** JPEGs stored inside a PDF. The whole file is scanned so a page outside the posted subset still counts. */
export function embeddedJpegDhashes(bytes: Uint8Array): string[] {
  const kept: Uint8Array[] = []
  let index = 0
  while (index + 3 < bytes.length) {
    if (bytes[index] !== 0xff || bytes[index + 1] !== 0xd8 || bytes[index + 2] !== 0xff) {
      index += 1
      continue
    }
    let end = index + 3
    let marker = -1
    while (end + 1 < bytes.length) {
      if (bytes[end] === 0xff && bytes[end + 1] === 0xd9) {
        marker = end + 2
        break
      }
      end += 1
    }
    if (marker <= index) break
    considerJpeg(kept, bytes.slice(index, marker))
    index = marker
  }
  const hashes: string[] = []
  for (const jpeg of kept) {
    const hash = dhashFromJpegBytes(jpeg)
    if (hash && !hashes.includes(hash)) hashes.push(hash)
  }
  return hashes
}

async function dhashFromBrowserImage(bytes: Uint8Array): Promise<string | null> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return null
  let bitmap: ImageBitmap
  try {
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    bitmap = await createImageBitmap(new Blob([copy]))
  } catch {
    return null
  }
  try {
    if (bitmap.width < 2 || bitmap.height < 2) return null
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height).data
    return dhashFromRgba(pixels, width, height)
  } catch {
    return null
  } finally {
    bitmap.close()
  }
}

/**
 * Fingerprints of the original upload, taken before a fitted subset replaces those bytes.
 * A JPEG file is hashed directly. A PDF contributes its embedded page images.
 * A PNG, GIF, or WebP is hashed in the browser. The file name is not an input.
 */
export async function pageDhashesOfUpload(bytes: Uint8Array): Promise<string[]> {
  const found: string[] = []
  const push = (hash: string | null) => {
    if (!hash || found.includes(hash) || found.length >= EMBEDDED_JPEG_MAX) return
    found.push(hash)
  }
  try {
    if (isJpeg(bytes)) push(dhashFromJpegBytes(bytes))
    else {
      if (isBrowserRaster(bytes)) push(await dhashFromBrowserImage(bytes))
      for (const hash of embeddedJpegDhashes(bytes)) push(hash)
    }
  } catch {
    return found
  }
  return found
}
