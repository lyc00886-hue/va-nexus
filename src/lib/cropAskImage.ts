/**
 * Image bytes for the region tool.
 * Portfolio photos already use a 5 MB image ceiling. This keeps that ceiling
 * and only draws the selected region when a request is sent.
 */
import { cropSourceRect, type CropRect } from './cropAsk.ts'

export const CROP_ASK_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function imageFileIssue(file: { type: string; size: number; name: string }): 'type' | 'large' | null {
  const type = file.type.toLowerCase().split(';')[0].trim()
  const normalized = type === 'image/jpg' ? 'image/jpeg' : type
  const byExt = /\.png$/i.test(file.name)
    ? 'image/png'
    : /\.jpe?g$/i.test(file.name)
      ? 'image/jpeg'
      : /\.webp$/i.test(file.name)
        ? 'image/webp'
        : /\.gif$/i.test(file.name)
          ? 'image/gif'
          : null
  const mime = TYPES.has(normalized) ? normalized : byExt
  if (!mime || file.size <= 0) return 'type'
  if (file.size > CROP_ASK_IMAGE_MAX_BYTES) return 'large'
  return null
}

function paint(source: CanvasImageSource, sw: number, sh: number, sx = 0, sy = 0, sourceW = sw, sourceH = sh): string | null {
  const maxEdge = sx === 0 && sy === 0 && sourceW === sw && sourceH === sh ? 960 : 768
  const scale = Math.min(1, maxEdge / Math.max(sourceW, sourceH))
  const width = Math.max(1, Math.round(sourceW * scale))
  const height = Math.max(1, Math.round(sourceH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, sx, sy, sourceW, sourceH, 0, 0, width, height)
  for (const quality of [0.72, 0.56, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.startsWith('data:image/jpeg;base64,') && url.length <= 900_000) return url
  }
  return null
}

export function resizeImageToDataUrl(img: HTMLImageElement): string | null {
  if (img.naturalWidth < 2 || img.naturalHeight < 2) return null
  return paint(img, img.naturalWidth, img.naturalHeight)
}

export function fullJpegBase64(img: HTMLImageElement): string | null {
  if (img.naturalWidth < 2 || img.naturalHeight < 2) return null
  const url = paint(img, img.naturalWidth, img.naturalHeight)
  const match = /^data:image\/jpeg;base64,(.+)$/.exec(url ?? '')
  return match?.[1] ?? null
}

export function regionJpegBase64(img: HTMLImageElement, crop: CropRect): string | null {
  const rect = cropSourceRect(img.naturalWidth, img.naturalHeight, crop)
  if (!rect) return null
  const url = paint(img, img.naturalWidth, img.naturalHeight, rect.sx, rect.sy, rect.sw, rect.sh)
  if (!url) return null
  const match = /^data:image\/jpeg;base64,(.+)$/.exec(url)
  return match?.[1] ?? null
}

export function captureFrameDataUrl(video: HTMLVideoElement): string | null {
  if (video.videoWidth < 2 || video.videoHeight < 2) return null
  return paint(video, video.videoWidth, video.videoHeight)
}

export function fileToDataUrl(file: File): Promise<{ dataUrl: string } | { error: 'type' | 'large' }> {
  const issue = imageFileIssue(file)
  if (issue) return Promise.resolve({ error: issue })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve({ error: 'type' })
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      const img = new Image()
      img.onload = () => {
        const dataUrl = resizeImageToDataUrl(img)
        resolve(dataUrl ? { dataUrl } : { error: 'large' })
      }
      img.onerror = () => resolve({ error: 'type' })
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
