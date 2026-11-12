/**
 * Fit a later-path page so POST /api/formative-comment can leave the browser.
 * Vercel rejects a function body above 4.5 MB. Base64 of a 3_500_000-byte page
 * is already larger than that, so an oversized PDF or image is reduced here
 * instead of being dropped. Every page of the file is returned. A file that
 * cannot be sent whole returns nothing, so the caller does not score a subset.
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
  /** Original pages this part stands for. A whole PDF counts every page. One image is one page. */
  pageCount?: number
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

/** Pages in a PDF. A file pdf-lib cannot open falls back to the visible page objects. */
export async function formativeSourcePageCount(bytes: Uint8Array, mime: string): Promise<number> {
  if (mime !== 'application/pdf' && !isPdf(bytes)) return 1
  const loose = pdfPageCountLoose(bytes)
  try {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const count = doc.getPageCount()
    if (count > 0) return count
  } catch {
    /* A partial header still uses the loose count below. */
  }
  return loose > 0 ? loose : 1
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

function pageImages(all: Uint8Array[]): Uint8Array[] {
  if (all.length === 0) return []
  const large = all.filter((item) => item.byteLength >= 12_000)
  return large.length > 0 ? large : all
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

/**
 * One fitted image per original page. A shorter list is not the whole file,
 * so the caller receives nothing instead of a four-page stand-in.
 */
async function fitEveryExtractedPage(
  bytes: Uint8Array,
  side: string,
  maxBytes: number,
  pageCount: number,
): Promise<FittedFormativePage[]> {
  if (pageCount < 1) return []
  const images = pageImages(extractJpegs(bytes))
  if (images.length !== pageCount) return []
  const share = Math.max(1, Math.floor(maxBytes / pageCount))
  const fitted: FittedFormativePage[] = []
  let total = 0
  for (const jpeg of images) {
    const one = await fitImage(jpeg, 'image/jpeg', Math.min(share, Math.max(1, maxBytes - total)))
    if (!one || one.bytes.byteLength === 0) return []
    total += one.bytes.byteLength
    if (total > maxBytes) return []
    fitted.push({ side, mime: one.mime, bytes: one.bytes, pageCount: 1 })
  }
  return fitted.length === pageCount ? fitted : []
}

async function fitPdf(bytes: Uint8Array, side: string, maxBytes: number): Promise<FittedFormativePage[]> {
  if (!isPdf(bytes)) {
    return bytes.byteLength > 0 && bytes.byteLength <= maxBytes
      ? [{ side, mime: 'application/pdf', bytes, pageCount: 1 }]
      : []
  }
  const pageCount = await formativeSourcePageCount(bytes, 'application/pdf')
  if (bytes.byteLength <= maxBytes) {
    return [{ side, mime: 'application/pdf', bytes, pageCount }]
  }
  return fitEveryExtractedPage(bytes, side, maxBytes, pageCount)
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
