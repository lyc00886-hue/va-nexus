export type SenMode = 'standard' | 'spld' | 'adhd'

export type Artist = {
  id: string
  name_en: string
  name_zh: string | null
  region: 'east' | 'west'
  era: string | null
  medium: string | null
  themes: string[]
  style_keywords: string[]
  bio_short: string | null
  image_url: string | null
  /** Optional extra Supabase fields (artists.dse_concept / spld_summary / culture_group) */
  dse_concept?: string | null
  spld_summary?: string | null
  culture_group?: string | null
}

export type ArtistPair = {
  id: string
  east_artist_id: string
  west_artist_id: string
  theme: string
  compare_prompt: string | null
  /** Optional extra Supabase fields (artist_pairs.medium / comparison_matrix) */
  medium?: string | null
  comparison_matrix?: unknown
}

export type TabId = 'artists' | 'sba' | 'feldman'

/* ---------- Content JSON (PEANUTS, src/content/*.json) ---------- */

export type FeldmanStageId = 'describe' | 'analyse' | 'interpret' | 'judge'

/** feldman.json → stages[] */
export type FeldmanStage = {
  id: FeldmanStageId
  zh: string
  en: string
  goal: string
  frames: string[]
  checklist: string[]
}

/** feldman.json → vocab[] (grouped oral variants, with English gloss) */
export type FeldmanVocabGroup = {
  oral: string[]
  term: string
  stage: FeldmanStageId
  en: string
}

export type FeldmanContent = {
  version: number
  stages: FeldmanStage[]
  vocab: FeldmanVocabGroup[]
}

/** feldman-vocab.json → one entry per colloquial phrase (71 entries) */
export type FeldmanVocabEntry = {
  colloquial: string
  term: string
  stage: FeldmanStageId
  /** Auto-generated placeholder example sentence; show as secondary text */
  example: string
}

/** artist-pair-compare.json → pairs[]; a = west artist_id, b = east artist_id */
export type PairCompareEntry = {
  pair_id: string
  a: string
  b: string
  theme: string
  same: string[]
  diff: string[]
  sba: string[]
}

export type PairCompareContent = {
  version: number
  note: string
  pairs: PairCompareEntry[]
}
