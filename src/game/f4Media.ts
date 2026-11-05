/**
 * Optional Learning Map illustration fields for the F.4 demo slice.
 * Covers and artist thumbs are additive: missing fields leave the unit/lesson unchanged.
 * A thumb is accepted only as a local public path under the illustration pack.
 * Remote URLs are dropped so an uncleared artist stays a placeholder.
 */
import type { LessonArtistRef } from './types'

const ASSET_PREFIX = '/content/learning-map-illustrations/'

/** Root-relative pack path, or undefined when the value is not a local illustration. */
export function learningMapAssetPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const path = value.trim()
  if (!path.startsWith(ASSET_PREFIX)) return undefined
  if (path.includes('..') || path.includes('\\') || /[\s?#]/.test(path)) return undefined
  if (!/^\/content\/learning-map-illustrations\/[A-Za-z0-9._/-]+$/.test(path)) return undefined
  return path
}

function httpsSourceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const url = value.trim()
  if (!/^https:\/\/[^\s]+$/.test(url)) return undefined
  return url
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Optional in-lesson card art. A remote or parent-path image is dropped so the
 * card still renders as title + body. Credit is kept only with a local image.
 */
export function cardArtFrom(card: { image?: unknown; imageCredit?: unknown }): {
  image?: string
  imageCredit?: string
} {
  const image = learningMapAssetPath(card.image)
  if (!image) return {}
  const imageCredit = text(card.imageCredit)
  return imageCredit ? { image, imageCredit } : { image }
}

/** Cover fields for a unit card. Credit is kept only when a local cover image is present. */
export function coverFromUnit(unit: { coverImage?: unknown; coverCredit?: unknown }): {
  coverImage?: string
  coverCredit?: string
} {
  const coverImage = learningMapAssetPath(unit.coverImage)
  if (!coverImage) return {}
  const coverCredit = text(unit.coverCredit)
  return coverCredit ? { coverImage, coverCredit } : { coverImage }
}

/**
 * One row per artistId. A row gets a thumb only when that id has a cleared local file.
 * Other ids stay `{ artistId }` so the UI can show the empty-image placeholder.
 */
export function artistsFromLesson(lesson: {
  artistIds?: unknown
  artistMedia?: unknown
}): LessonArtistRef[] | undefined {
  if (!Array.isArray(lesson.artistIds)) return undefined
  const ids = lesson.artistIds
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim())
  if (ids.length === 0) return undefined
  const media =
    lesson.artistMedia && typeof lesson.artistMedia === 'object'
      ? (lesson.artistMedia as Record<string, unknown>)
      : {}
  return ids.map((artistId) => {
    const raw = media[artistId]
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    const thumb = row ? learningMapAssetPath(row.thumb) : undefined
    if (!row || !thumb) return { artistId }
    return {
      artistId,
      thumb,
      license: text(row.license),
      credit: text(row.credit),
      sourceUrl: httpsSourceUrl(row.sourceUrl),
    }
  })
}
