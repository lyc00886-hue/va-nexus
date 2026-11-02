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
}

export type ArtistPair = {
  id: string
  east_artist_id: string
  west_artist_id: string
  theme: string
  compare_prompt: string | null
}

export type TabId = 'artists' | 'sba' | 'feldman'
