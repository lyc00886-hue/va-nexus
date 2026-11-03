/**
 * Client zh-Hans body overlay, keyed by artist_id.
 *
 * Mirrors the EN pack idea (`*_en` beside Hant columns) without a second write
 * to `name_zh_en` or the Traditional columns. Applied only when the active
 * locale is zh-Hans, before `artistFields`.
 *
 * `spld_summary` in the pack is the internal easy-read / bio_short source.
 * It is not a student label.
 */
import overlayData from '../data/artist-zh-hans-overlay.json' with { type: 'json' }
import type { ArtistBodySource, BodyLocale } from './artistBody.ts'

export type ArtistHansPack = {
  name_zh_hans?: string
  sba_theme_tags?: string
  formal_traits?: string
  dse_concept?: string
  /** Internal mapping onto bio_short / easy-read summary. Not student chrome. */
  spld_summary?: string
  /** Stored as artists.origin and shown as Artist.medium. */
  medium?: string
  origin?: string
}

export const ARTIST_ZH_HANS_OVERLAY = overlayData as Record<string, ArtistHansPack>

type HansRow = {
  artist_id: string
  name_zh_hans?: string | null
}

export type HansBodyColumns = Pick<
  ArtistBodySource,
  | 'sba_theme_tags_zh_hans'
  | 'formal_traits_zh_hans'
  | 'dse_concept_zh_hans'
  | 'spld_summary_zh_hans'
  | 'origin_zh_hans'
>

function blankToNull(value: string | null | undefined): string | null {
  const text = value?.trim()
  return text ? text : null
}

/** Theme chips in the pack are semicolon-separated. */
export function splitHansTags(value: string | null | undefined): string[] | null {
  const text = value?.trim()
  if (!text) return null
  const items = text
    .split(/[;；]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}

/**
 * zh-Hans attaches the overlay. zh-Hant and EN return the same row
 * so Hant columns and `*_en` stay as fetched.
 */
export function artistRowForLocale<T extends HansRow>(row: T, locale: BodyLocale): T | (T & HansBodyColumns) {
  if (locale !== 'zh-Hans') return row
  return withZhHansOverlay(row)
}

/**
 * Copy Simplified body fields onto parallel `*_zh_hans` keys.
 * Does not mutate `row` and does not replace Hant or EN columns.
 */
export function withZhHansOverlay<T extends HansRow>(row: T): T & HansBodyColumns {
  const pack = ARTIST_ZH_HANS_OVERLAY[row.artist_id]
  if (!pack) return row
  const name = pack.name_zh_hans?.trim()
  return {
    ...row,
    name_zh_hans: name || row.name_zh_hans,
    sba_theme_tags_zh_hans: splitHansTags(pack.sba_theme_tags),
    formal_traits_zh_hans: blankToNull(pack.formal_traits),
    dse_concept_zh_hans: blankToNull(pack.dse_concept),
    spld_summary_zh_hans: blankToNull(pack.spld_summary),
    origin_zh_hans: blankToNull(pack.medium) ?? blankToNull(pack.origin),
  }
}
