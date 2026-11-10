import { contentJson } from '../i18n/content'
import { DESIGN_PAPER_ID, PAINT_PAPER_ID } from './practiceDraft.ts'

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

export type PracticeCheckItem = { id: string; key: string; text: string }

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
  status?: string
  note?: string
  theme?: string
  themePrompt?: string
  mediaConstraints?: string[]
  checklist?: PracticeCheckItem[]
  uploadKeys?: string[]
  timeBoxMinutes?: number
  referenceArtworks?: PracticeArtwork[]
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

/** One practice paper. Part B creation fields live on each question's `part-b`. */
export type PracticePaperFile = {
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

export { PRACTICE_SPLIT_SCOUT_DIR, PRACTICE_SPLIT_SHA256 } from './practiceScout.ts'

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

export function loadPaintPaper(): PracticePaperFile {
  return contentJson<PracticePaperFile>(PAINT_PAPER_ID)
}

export function loadDesignPaper(): PracticePaperFile {
  return contentJson<PracticePaperFile>(DESIGN_PAPER_ID)
}
