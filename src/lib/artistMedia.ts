/**
 * Artist portraits and artworks from public.artist_media.
 * Only status `ok` (or a legacy row with no status) may render an image, and
 * only when image_url is http(s). `needs_review` and `no_legal_image` become
 * the initials avatar or the 「暫無合法圖」 placeholder — never a generated
 * face, never a broken image, never an unreviewed file.
 */

export type ArtistMediaKind = 'portrait' | 'artwork'
export type ArtistMediaStatus = 'ok' | 'needs_review' | 'no_legal_image'
export type MediaLocale = 'en' | 'zh-Hant' | 'zh-Hans'

export type ArtistMedia = {
  id: string
  artist_id: string
  kind: ArtistMediaKind
  status: ArtistMediaStatus
  image_url: string | null
  source_url: string | null
  license: string | null
  credit: string | null
  title_en: string | null
  title_zh_hant: string | null
  title_zh_hans: string | null
  year: number | null
  sort_order: number
}

export type ArtistMediaBundle = {
  portraitUrl: string | null
  artworks: ArtistMedia[]
}

export const EMPTY_ARTIST_MEDIA: ArtistMediaBundle = {
  portraitUrl: null,
  artworks: [],
}

const HTTP_URL = /^https?:\/\/\S+$/i

const AVATAR_PALETTE = [
  'bg-teal-700 text-white',
  'bg-teal-800 text-teal-50',
  'bg-amber-700 text-white',
  'bg-teal-600 text-white',
  'bg-amber-800 text-amber-50',
] as const

const NAME_PARTICLES = new Set(['van', 'von', 'de', 'da', 'di', 'du', 'la', 'le', 'of', 'the'])

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const url = value.trim()
  return HTTP_URL.test(url) ? url : null
}

/** URL to put on an <img>, or null when the row must not render an image. */
export function displayImageUrl(row: Pick<ArtistMedia, 'status' | 'image_url'>): string | null {
  if (row.status !== 'ok') return null
  return safeHttpUrl(row.image_url)
}

export function mediaTitle(row: ArtistMedia, locale: MediaLocale): string {
  const en = row.title_en
  const hant = row.title_zh_hant
  const hans = row.title_zh_hans
  if (locale === 'en') return en || hant || hans || ''
  if (locale === 'zh-Hans') return hans || hant || en || ''
  return hant || hans || en || ''
}

/** Initials from the name in the active language. Latin: first + last. Han: up to two characters. */
export function initialsFromName(name: string): string {
  const text = name.trim()
  if (!text) return '·'
  const han = text.match(/\p{Script=Han}/gu)
  if (han && han.length > 0) return han.slice(0, 2).join('')
  const words = text
    .split(/[\s/]+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
  const significant = words.filter((word) => !NAME_PARTICLES.has(word.toLowerCase()))
  const usable = significant.length > 0 ? significant : words
  if (usable.length === 0) return '·'
  if (usable.length === 1) return usable[0].slice(0, 2).toUpperCase()
  return `${usable[0][0] ?? ''}${usable[usable.length - 1][0] ?? ''}`.toUpperCase()
}

/** Stable brand colour for an initials avatar. Same name, same swatch. */
export function avatarPalette(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length > 0 ? text : null
}

function parseYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

function parseSort(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return 0
}

/** Missing/blank status is legacy `ok`. Unknown values stay hidden. */
function parseStatus(value: unknown): ArtistMediaStatus {
  if (typeof value !== 'string') return 'ok'
  const raw = value.trim().toLowerCase()
  if (!raw || raw === 'ok') return 'ok'
  if (raw === 'needs_review' || raw === 'no_legal_image') return raw
  return 'needs_review'
}

/** Accept a Supabase row, or null when it is not a portrait/artwork we understand. */
export function parseArtistMedia(raw: unknown): ArtistMedia | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const artistId = optionalText(row.artist_id)
  const kindRaw = optionalText(row.kind)?.toLowerCase()
  if (!artistId || (kindRaw !== 'portrait' && kindRaw !== 'artwork')) return null
  const status = parseStatus(row.status)
  const sortOrder = parseSort(row.sort_order)
  const id =
    optionalText(row.id) ??
    (typeof row.id === 'number' && Number.isFinite(row.id) ? String(row.id) : null) ??
    `${artistId}:${kindRaw}:${sortOrder}`
  return {
    id,
    artist_id: artistId,
    kind: kindRaw,
    status,
    image_url: optionalText(row.image_url),
    source_url: safeHttpUrl(optionalText(row.source_url)),
    license: optionalText(row.license),
    credit: optionalText(row.credit),
    title_en: optionalText(row.title_en),
    title_zh_hant: optionalText(row.title_zh_hant),
    title_zh_hans: optionalText(row.title_zh_hans),
    year: parseYear(row.year),
    sort_order: sortOrder,
  }
}

export function indexArtistMedia(rows: readonly ArtistMedia[]): Map<string, ArtistMediaBundle> {
  const grouped = new Map<string, ArtistMedia[]>()
  for (const row of rows) {
    const list = grouped.get(row.artist_id)
    if (list) list.push(row)
    else grouped.set(row.artist_id, [row])
  }
  const out = new Map<string, ArtistMediaBundle>()
  for (const [artistId, list] of grouped) {
    const sorted = list.toSorted(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    )
    let portraitUrl: string | null = null
    const artworks: ArtistMedia[] = []
    for (const row of sorted) {
      const src = displayImageUrl(row)
      if (!src) continue
      if (row.kind === 'portrait' && portraitUrl === null) portraitUrl = src
      else if (row.kind === 'artwork') artworks.push(row)
    }
    if (portraitUrl || artworks.length > 0) out.set(artistId, { portraitUrl, artworks })
  }
  return out
}
