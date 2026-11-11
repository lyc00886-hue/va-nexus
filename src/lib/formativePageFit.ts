/**
 * Fit a later-path page so POST /api/formative-comment can leave the browser.
 * Vercel rejects a function body above 4.5 MB. Base64 of a 3_500_000-byte page
 * is already larger than that, so an oversized PDF or image is reduced here
 * instead of being dropped. At most four pages are returned.
 */
import { decode, encode, type JpegImage } from 'jpeg-js'

/** Platform function body cap. A larger JSON body never reaches the route. */
export const FORMATIVE_PLATFORM_BODY_MAX = 4_500_000

/** Largest JSON body the client will post and the route will read. */
export const FORMATIVE_BODY_CHAR_MAX = 4_400_000

/**
 * Fitted bytes for one page and for the whole request.
 * Base64 of this size, plus the JSON wrapper, stays under FORMATIVE_BODY_CHAR_MAX.
 */
export const FORMATIVE_PAGE_BYTE_MAX = 3_200_000

export const FORMATIVE_TOTAL_BYTE_MAX = 3_200_000

const PAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
const EDGES = [1600, 1280, 960, 720, 480]
const QUALITIES = [72, 56, 40, 28]

export type FittedFormativePage = {
  side: string
  mime: string
  bytes: Uint8Array
}

export function mimeFromFileName(name: string): string | null {
  if (/\.pdf$/i.test(name)) return 'application/pdf'
  if (/\.png$/i.test(name)) return 'image/png'
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg'
  if (/\.webp$/i.test(name)) return 'image/webp'
  if (/\.gif$/i.test(name)) return 'image/gif'
  return null
}

export function mimeFromMagic(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

/** A known image or PDF mime, otherwise the file name, otherwise the byte header. */
export function formativePageMime(name: string, mime: string, bytes?: Uint8Array): string | null {
  const type = mime.toLowerCase().split(';')[0].trim()
  if (type === 'image/jpg') return 'image/jpeg'
  if (PAGE_MIME.has(type)) return type
  return mimeFromFileName(name) ?? (bytes ? mimeFromMagic(bytes) : null)
}

function isPdf(bytes: Uint8Array): boolean {
  return mimeFromMagic(bytes) === 'application/pdf'
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function pdfPageCountLoose(bytes: Uint8Array): number {
  return new TextDecoder('latin1').decode(bytes).match(/\/Type\s*\/Page(?!s)\b/g)?.length ?? 0
}

function hasPdfTrailer(bytes: Uint8Array): boolean {
  const start = Math.max(0, bytes.length - 65536)
  return new TextDecoder('latin1').decode(bytes.subarray(start)).includes('startxref')
}

/** First page, last page, and a spread between them. At most `max` indexes. */
export function representativePageIndexes(count: number, max = 4): number[] {
  if (count <= 0) return []
  if (count <= max) return Array.from({ length: count }, (_, index) => index)
  const used = new Set<number>()
  const indexes: number[] = []
  for (let i = 0; i < max; i += 1) {
    const index = Math.round((i * (count - 1)) / (max - 1))
    if (used.has(index)) continue
    used.add(index)
    indexes.push(index)
  }
  return indexes
}

function extractJpegs(bytes: Uint8Array): Uint8Array[] {
  const found: Uint8Array[] = []
  let i = 0
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8 || bytes[i + 2] !== 0xff) {
      i += 1
      continue
    }
    let j = i + 3
    let end = -1
    while (j + 1 < bytes.length) {
      if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
        end = j + 2
        break
      }
      j += 1
    }
    if (end <= i) break
    if (end - i >= 200) found.push(bytes.slice(i, end))
    i = end
  }
  return found
}

function pickRepresentativeJpegs(all: Uint8Array[]): Uint8Array[] {
  if (all.length === 0) return []
  const large = all.filter((item) => item.byteLength >= 12_000)
  const pool = large.length > 0 ? large : all
  if (pool.length <= 4) return pool
  return representativePageIndexes(pool.length, 4).map((index) => pool[index])
}

function downscaleRgba(src: Uint8Array, sw: number, sh: number, maxEdge: number): JpegImage {
  const scale = Math.min(1, maxEdge / Math.max(sw, sh, 1))
  const width = Math.max(1, Math.round(sw * scale))
  const height = Math.max(1, Math.round(sh * scale))
  if (width === sw && height === sh) return { data: src, width, height }
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / height))
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / width))
      const si = (sy * sw + sx) * 4
      const di = (y * width + x) * 4
      data[di] = src[si]
      data[di + 1] = src[si + 1]
      data[di + 2] = src[si + 2]
      data[di + 3] = src[si + 3]
    }
  }
  return { data, width, height }
}

function fitJpegBytes(bytes: Uint8Array, maxBytes: number): Uint8Array | null {
  if (bytes.byteLength <= maxBytes && isJpeg(bytes)) return bytes
  let decoded: JpegImage
  try {
    decoded = decode(bytes, {
      useTArray: true,
      formatAsRGBA: true,
      maxMemoryUsageInMB: 384,
      maxResolutionInMP: 36,
    })
  } catch {
    return null
  }
  if (!decoded.width || !decoded.height || decoded.data.length < decoded.width * decoded.height * 4) return null
  for (const edge of EDGES) {
    const scaled = downscaleRgba(decoded.data, decoded.width, decoded.height, edge)
    for (const quality of QUALITIES) {
      try {
        const encoded = encode(scaled, quality)
        if (encoded.data.byteLength > 0 && encoded.data.byteLength <= maxBytes) return new Uint8Array(encoded.data)
      } catch {
        return null
      }
    }
  }
  return null
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}

async function fitImageWithCanvas(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array | null> {
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
    if (bitmap.width < 1 || bitmap.height < 1) return null
    for (const edge of EDGES) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(bitmap, 0, 0, width, height)
      for (const quality of QUALITIES) {
        const blob = await canvasToJpeg(canvas, quality / 100)
        if (!blob || blob.size === 0 || blob.size > maxBytes) continue
        return new Uint8Array(await blob.arrayBuffer())
      }
    }
    return null
  } finally {
    bitmap.close()
  }
}

async function fitImage(bytes: Uint8Array, mime: string, maxBytes: number): Promise<FittedFormativePage | null> {
  if (bytes.byteLength <= maxBytes && PAGE_MIME.has(mime) && mime !== 'application/pdf') {
    return { side: '', mime, bytes }
  }
  const canvas = await fitImageWithCanvas(bytes, maxBytes)
  if (canvas) return { side: '', mime: 'image/jpeg', bytes: canvas }
  if (mime === 'image/jpeg' || isJpeg(bytes)) {
    const shrunk = fitJpegBytes(bytes, maxBytes)
    if (shrunk) return { side: '', mime: 'image/jpeg', bytes: shrunk }
  }
  return null
}

async function fitExtractedJpegs(bytes: Uint8Array, side: string, maxBytes: number): Promise<FittedFormativePage[]> {
  const images = pickRepresentativeJpegs(extractJpegs(bytes))
  if (images.length === 0) return []
  const share = Math.max(1, Math.floor(maxBytes / images.length))
  const fitted: FittedFormativePage[] = []
  for (const jpeg of images) {
    if (fitted.length >= 4) break
    const one = await fitImage(jpeg, 'image/jpeg', share)
    if (!one) continue
    fitted.push({ side, mime: one.mime, bytes: one.bytes })
  }
  return fitted
}

async function subsetPdf(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array | null> {
  if (!hasPdfTrailer(bytes)) return null
  try {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const count = doc.getPageCount()
    if (count <= 0) return null
    if (count <= 4 && bytes.byteLength <= maxBytes) return bytes
    const indexes = representativePageIndexes(count, 4)
    const out = await PDFDocument.create()
    const copied = await out.copyPages(doc, indexes)
    for (const page of copied) out.addPage(page)
    const saved = new Uint8Array(await out.save())
    if (saved.byteLength === 0 || saved.byteLength > maxBytes) return null
    return saved
  } catch {
    return null
  }
}

async function fitPdf(bytes: Uint8Array, side: string, maxBytes: number): Promise<FittedFormativePage[]> {
  if (!isPdf(bytes)) {
    return bytes.byteLength > 0 && bytes.byteLength <= maxBytes ? [{ side, mime: 'application/pdf', bytes }] : []
  }
  if (bytes.byteLength <= maxBytes) {
    const loose = pdfPageCountLoose(bytes)
    // Object streams hide /Type /Page. A trailer with no visible pages still needs a real count.
    const needsCount = loose === 0 && hasPdfTrailer(bytes)
    if (loose >= 1 && loose <= 4) return [{ side, mime: 'application/pdf', bytes }]
    if (loose > 4 || needsCount) {
      const subset = await subsetPdf(bytes, maxBytes)
      if (subset) return [{ side, mime: 'application/pdf', bytes: subset }]
    }
    return [{ side, mime: 'application/pdf', bytes }]
  }
  const images = await fitExtractedJpegs(bytes, side, maxBytes)
  if (images.length > 0) return images
  const subset = await subsetPdf(bytes, maxBytes)
  if (subset) return [{ side, mime: 'application/pdf', bytes: subset }]
  return []
}

export async function fitFormativePayload(input: {
  side?: string
  mime: string
  bytes: Uint8Array
  fileName?: string
  maxBytes?: number
}): Promise<FittedFormativePage[]> {
  const maxBytes = Math.min(FORMATIVE_PAGE_BYTE_MAX, Math.max(1, input.maxBytes ?? FORMATIVE_PAGE_BYTE_MAX))
  const mime = formativePageMime(input.fileName ?? '', input.mime, input.bytes)
  if (!mime || input.bytes.byteLength === 0) return []
  const side = input.side === 'artwork' || input.side === 'research_workbook' ? input.side : ''
  if (mime === 'application/pdf') return fitPdf(input.bytes, side, maxBytes)
  const image = await fitImage(input.bytes, mime, maxBytes)
  return image ? [{ side, mime: image.mime, bytes: image.bytes }] : []
}
