/**
 * Locale-resolved artist / pair body text.
 *
 * English reads `*_en` columns (same idea as artist_media.title_en). A missing
 * or blank English value becomes EN_BODY_PENDING — never the Chinese source.
 * zh-Hant keeps the original columns, including nulls.
 * zh-Hans prefers parallel `*_zh_hans` fields when they are non-blank (client
 * overlay keyed by artist_id; Hant and EN columns are not rewritten) and
 * otherwise falls back to those original columns.
 *
 * `spld_summary` is an internal column id. It is copied onto `bio_short` /
 * the easy-read summary only. Student UI must not render the id or the
 * letters SPLD / SEN.
 */

export const EN_BODY_PENDING = 'Translation pending／暫未翻譯'

export type BodyLocale = 'en' | 'zh-Hant' | 'zh-Hans'

export type ArtistBodySource = {
  sba_theme_tags: string[] | null
  sba_theme_tags_en?: string[] | null
  formal_traits: string | null
  formal_traits_en?: string | null
  dse_concept: string | null
  dse_concept_en?: string | null
  spld_summary: string | null
  spld_summary_en?: string | null
  origin: string | null
  origin_en?: string | null
  /** Simplified themes. Semicolon tags already split. Absent → Hant tags. */
  sba_theme_tags_zh_hans?: string[] | null
  formal_traits_zh_hans?: string | null
  dse_concept_zh_hans?: string | null
  /** Internal easy-read summary source. Never a student-facing label. */
  spld_summary_zh_hans?: string | null
  /** Maps to Artist.medium. Overlay key is `medium` (origin column). */
  origin_zh_hans?: string | null
}

export type ArtistBody = {
  medium: string | null
  themes: string[]
  style_keywords: string[]
  bio_short: string | null
  dse_concept: string | null
  spld_summary: string | null
}

export type PairBodySource = {
  theme: string
  theme_en?: string | null
  medium: string | null
  medium_en?: string | null
}

export type PairBody = {
  theme: string
  medium: string | null
}

export function isTranslationPending(value: string | null | undefined): boolean {
  return value?.trim() === EN_BODY_PENDING
}

function trimmed(value: string | null | undefined): string | null {
  const text = value?.trim()
  return text ? text : null
}

function enOrPending(value: string | null | undefined): string {
  return trimmed(value) ?? EN_BODY_PENDING
}

function splitTraits(formalTraits: string | null | undefined): string[] {
  if (!formalTraits?.trim()) return []
  return formalTraits
    .split(/[、,，;/|]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function enThemes(tags: string[] | null | undefined): string[] {
  const items = (tags ?? []).map((tag) => tag.trim()).filter(Boolean)
  return items.length > 0 ? items : [EN_BODY_PENDING]
}

function enKeywords(formalTraits: string | null | undefined): string[] {
  const parts = splitTraits(formalTraits)
  return parts.length > 0 ? parts : [EN_BODY_PENDING]
}

function preferText(hans: string | null | undefined, hant: string | null): string | null {
  const text = hans?.trim()
  if (text) return text
  return hant
}

function preferThemes(hans: string[] | null | undefined, hant: string[] | null): string[] {
  const items = (hans ?? []).map((tag) => tag.trim()).filter(Boolean)
  if (items.length > 0) return items
  return hant ?? []
}

/** Shared Chinese mapping. Hans reads `*_zh_hans` first; Hant ignores those fields. */
function chineseFields(row: ArtistBodySource, hans: boolean): ArtistBody {
  const themes = hans ? preferThemes(row.sba_theme_tags_zh_hans, row.sba_theme_tags) : (row.sba_theme_tags ?? [])
  const traits = hans ? preferText(row.formal_traits_zh_hans, row.formal_traits) : row.formal_traits
  const concept = hans ? preferText(row.dse_concept_zh_hans, row.dse_concept) : row.dse_concept
  const summary = hans ? preferText(row.spld_summary_zh_hans, row.spld_summary) : row.spld_summary
  const medium = hans ? preferText(row.origin_zh_hans, row.origin) : row.origin
  return {
    medium,
    themes,
    style_keywords: splitTraits(traits),
    bio_short: summary || concept || null,
    dse_concept: concept,
    spld_summary: summary,
  }
}

export function artistFields(row: ArtistBodySource, locale: BodyLocale): ArtistBody {
  if (locale === 'zh-Hant') return chineseFields(row, false)
  if (locale === 'zh-Hans') return chineseFields(row, true)

  const summary = trimmed(row.spld_summary_en)
  const concept = trimmed(row.dse_concept_en)
  return {
    medium: enOrPending(row.origin_en),
    themes: enThemes(row.sba_theme_tags_en),
    style_keywords: enKeywords(row.formal_traits_en),
    bio_short: summary || concept || EN_BODY_PENDING,
    dse_concept: concept ?? EN_BODY_PENDING,
    spld_summary: summary ?? EN_BODY_PENDING,
  }
}

export function pairFields(row: PairBodySource, locale: BodyLocale): PairBody {
  if (locale !== 'en') return { theme: row.theme, medium: row.medium }
  return {
    theme: enOrPending(row.theme_en),
    medium: enOrPending(row.medium_en),
  }
}

/**
 * Easy-read prefers the short summary. The pending placeholder must not hide a
 * real English concept already folded into bio_short. Chinese locales never
 * store that placeholder, so this matches `summary || bio`.
 */
export function artistReadText(
  artist: { spld_summary?: string | null; bio_short?: string | null },
  easyRead: boolean,
): string | null {
  const summary = artist.spld_summary
  const bio = artist.bio_short ?? null
  if (easyRead && summary && !isTranslationPending(summary)) return summary
  if (bio && !isTranslationPending(bio)) return bio
  if (easyRead && isTranslationPending(summary)) return summary ?? null
  if (isTranslationPending(bio)) return bio
  return bio
}
