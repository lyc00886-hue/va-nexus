/**
 * Locale-resolved artist / pair body text.
 *
 * English reads `*_en` columns (same idea as artist_media.title_en). A missing
 * or blank English value becomes EN_BODY_PENDING — never the Chinese source.
 * zh-Hant and zh-Hans keep the original columns, including nulls.
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

export function artistFields(row: ArtistBodySource, locale: BodyLocale): ArtistBody {
  if (locale !== 'en') {
    return {
      medium: row.origin,
      themes: row.sba_theme_tags ?? [],
      style_keywords: splitTraits(row.formal_traits),
      bio_short: row.spld_summary || row.dse_concept || null,
      dse_concept: row.dse_concept,
      spld_summary: row.spld_summary,
    }
  }

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
