import { contentJson } from '../i18n/content'

/** Bundled public-domain plates only. Any other image_url is refused. */
const PRACTICE_PLATES: Record<string, { src: string; width: number; height: number }> = {
  'images/fan-kuan-travelers.jpg': {
    src: '/practice/fan-kuan-travelers.jpg',
    width: 900,
    height: 1804,
  },
  'images/turner-rain-steam-speed.jpg': {
    src: '/practice/turner-rain-steam-speed.jpg',
    width: 1280,
    height: 956,
  },
}

export type PracticePlate = { src: string; width: number; height: number }

export type PracticeArtwork = {
  id: string
  title: string
  artist: string
  year?: string
  medium?: string
  dims?: string
  museum?: string
  image_url: string | null
  source_url: string | null
  license: string | null
  credit: string | null
  image_status: string
  image_note?: string
}

export type PracticeSelfCheck = {
  id: string
  layer: string
  text: string
}

export type PracticePart = {
  id: string
  key: string
  label?: string
  marks: number
  timeLimitMinutes?: number
  prompt?: string
  framework?: string
  selfCheck?: PracticeSelfCheck[]
  markGuideSummary?: string[]
  hint?: string
  linkedPaper2Id?: string
  status?: string
  note?: string
  theme?: string
}

export type PracticeQuestion = {
  id: string
  number: number
  status: string
  title: string
  theme: string
  compareFocus?: string
  artworks: PracticeArtwork[]
  parts: PracticePart[]
}

export type Paper1File = {
  version: number
  id: string
  locale: string
  label: string
  set: string
  source: string
  paperLabel: string
  examNote: string
  totalMarks: number
  timeLimitMinutes: number
  aiPolicy: { under18?: string; adultOptionalAi?: string; note: string }
  instructions: string[]
  primaryQuestionId: string
  questions: PracticeQuestion[]
}

export type Paper2Check = { id: string; key: string; text: string }

export type Paper2File = {
  version: number
  id: string
  locale: string
  label: string
  set: string
  sourceQuestionId: string
  source: string
  title: string
  themeTitle: string
  themePrompt: string
  mediaConstraints: string[]
  timeBoxMinutes: number
  marks: number
  checklist: Paper2Check[]
  uploadKeys: string[]
  aiPolicy: { under18?: string; note: string }
  referenceArtworks: PracticeArtwork[]
}

export const DAIE_LAYERS = ['D', 'A', 'I', 'E'] as const
export type DaieLayer = (typeof DAIE_LAYERS)[number]

/**
 * Resolve a plate only when it is one of the two bundled files and the JSON
 * already carries credit, licence, and source. Otherwise render nothing.
 */
export function plateFor(art: PracticeArtwork): PracticePlate | null {
  if (art.image_status !== 'ok') return null
  if (!art.image_url || !art.credit || !art.license || !art.source_url) return null
  return PRACTICE_PLATES[art.image_url] ?? null
}

export function loadPaper1(): Paper1File {
  return contentJson<Paper1File>('paper1-set3')
}

export function loadPaper2(): Paper2File {
  return contentJson<Paper2File>('paper2-set3')
}
