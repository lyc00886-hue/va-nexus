import type { Artist, ArtistPair } from '../types'
import { t } from '../i18n'

/** Raw row shapes matching Supabase public.artists / artist_pairs */
export type DbArtist = {
  artist_id: string
  name_zh_en: string
  culture_group: string | null
  sba_theme_tags: string[] | null
  formal_traits: string | null
  dse_concept: string | null
  spld_summary: string | null
  gifted_theory: string | null
  artwork_example: string | null
  origin: string | null
}

export type DbArtistPair = {
  id: string
  theme: string
  medium: string | null
  west_artist_id: string
  east_artist_id: string
  comparison_matrix: unknown
}

/** Parse "中文 (English)" / "English" / "中文（English）" into zh + en. */
export function parseNameZhEn(nameZhEn: string): { nameZh: string | null; nameEn: string } {
  const text = nameZhEn.trim()
  const m = text.match(/^(.+?)\s*[（(]\s*([^）)]+)\s*[）)]\s*$/)
  if (m) {
    return { nameZh: m[1].trim() || null, nameEn: m[2].trim() }
  }
  // English-only fallback
  if (/^[\x00-\x7F]+$/.test(text)) {
    return { nameZh: null, nameEn: text }
  }
  return { nameZh: text, nameEn: text }
}

function splitTraits(formalTraits: string | null): string[] {
  if (!formalTraits?.trim()) return []
  return formalTraits
    .split(/[、,，;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function regionFromCulture(cultureGroup: string | null): 'east' | 'west' {
  const g = (cultureGroup ?? '').toLowerCase()
  if (g.includes('west')) return 'west'
  return 'east'
}

export function mapDbArtist(row: DbArtist): Artist {
  const { nameZh, nameEn } = parseNameZhEn(row.name_zh_en)
  return {
    id: row.artist_id,
    name_en: nameEn,
    name_zh: nameZh,
    region: regionFromCulture(row.culture_group),
    era: null,
    medium: row.origin,
    themes: row.sba_theme_tags ?? [],
    style_keywords: splitTraits(row.formal_traits),
    bio_short: row.spld_summary || row.dse_concept || null,
    image_url: null,
    dse_concept: row.dse_concept,
    spld_summary: row.spld_summary,
    culture_group: row.culture_group,
  }
}

export function mapDbPair(row: DbArtistPair): ArtistPair {
  const matrixHint =
    Array.isArray(row.comparison_matrix) && row.comparison_matrix.length > 0
      ? String(row.comparison_matrix[0])
      : null
  const compare_prompt =
    matrixHint ||
    (row.medium
      ? t('am.prompt.medium', { medium: row.medium, theme: row.theme })
      : t('am.prompt', { theme: row.theme }))

  return {
    id: row.id,
    east_artist_id: row.east_artist_id,
    west_artist_id: row.west_artist_id,
    theme: row.theme,
    compare_prompt,
    medium: row.medium,
    comparison_matrix: row.comparison_matrix ?? null,
  }
}
