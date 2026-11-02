import { contentJson } from '../i18n/content'
import type { Artist } from '../types'

export type CompareLens = {
  id: string
  dbFields: string[]
  label: string
  questions: string[]
  frames: string[]
}

export type CompareLensesFile = {
  version: number
  minArtists: number
  maxArtists: number
  intro: string
  columns: { same: string; diff: string }
  lenses: CompareLens[]
}

export function getCompareLenses(): CompareLensesFile {
  return contentJson<CompareLensesFile>('compare-lenses')
}

/** Map lens dbFields → display values. `medium` has no artists column; use origin via Artist.medium. */
export function lensFieldValues(artist: Artist, dbField: string): string[] {
  switch (dbField) {
    case 'sba_theme_tags':
      return artist.themes.filter(Boolean)
    case 'formal_traits':
      return artist.style_keywords.filter(Boolean)
    case 'medium':
      return artist.medium ? [artist.medium] : []
    case 'culture_group':
      return artist.culture_group ? [artist.culture_group] : []
    case 'spld_summary':
      return artist.spld_summary ? [artist.spld_summary] : []
    case 'dse_concept':
      return artist.dse_concept ? [artist.dse_concept] : []
    case 'origin':
      return artist.medium ? [artist.medium] : []
    default:
      return []
  }
}

export function lensValues(artist: Artist, lens: CompareLens): string[] {
  const out: string[] = []
  for (const f of lens.dbFields) {
    for (const v of lensFieldValues(artist, f)) {
      if (!out.includes(v)) out.push(v)
    }
  }
  return out
}

/** Culture filter buckets used by the library UI. */
export type CultureBucket = 'all' | 'hk' | 'china' | 'west' | 'mingqing'

export function cultureBucket(cultureGroup: string | null | undefined): CultureBucket | 'other' {
  const g = cultureGroup ?? ''
  if (g === 'HK_Local') return 'hk'
  if (g === 'Chinese_Contemporary' || g === 'CN_HK') return 'china'
  if (g === 'Western' || g === 'International') return 'west'
  if (g === 'CN_MingQing') return 'mingqing'
  return 'other'
}

export const UNMATCHED_LENS_DB_FIELDS = ['medium'] as const
