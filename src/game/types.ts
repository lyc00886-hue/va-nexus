/* ---------- Gamified learning content + state types ---------- */

export type LessonCard = {
  title: string
  /** Full text (standard mode) */
  body: string
  /** Short easy-read version (SpLD / 讀寫支援) — bullet points */
  easy: string[]
  /** Optional in-lesson illustration. Absent when the card has no local image. */
  image?: string
  imageCredit?: string
}

export type QuestionType = 'mcq' | 'match' | 'fill' | 'order' | 'dualRead' | 'short'

export type McqQuestion = {
  id: string
  type: 'mcq'
  prompt: string
  options: string[]
  answer: number
  explain: string
  /** Optional question illustration. Same local pack path as lesson cards. */
  image?: string
  imageCredit?: string
}

export type MatchQuestion = {
  id: string
  type: 'match'
  prompt: string
  /** left term ↔ right description; shuffled at runtime */
  pairs: { left: string; right: string }[]
  explain: string
  /** Optional question illustration. Same local pack path as lesson cards. */
  image?: string
  imageCredit?: string
}

export type FillQuestion = {
  id: string
  type: 'fill'
  /** Sentence with ＿＿ as the blank */
  prompt: string
  bank: string[]
  answer: string
  explain: string
  /** Optional question illustration. Same local pack path as lesson cards. */
  image?: string
  imageCredit?: string
}

/** Canonical order is `items`. The board shuffles them for the student. */
export type OrderQuestion = {
  id: string
  type: 'order'
  prompt: string
  items: string[]
  explain: string
  /** Optional question illustration. Same local pack path as lesson cards. */
  image?: string
  imageCredit?: string
}

/** Verified public-domain plate. Labels come from art.attr.*, not from this record. */
export type ComparePlate = {
  image: string
  title: string
  artist: string
  year: string
  source: string
}

/** Text-only artist and concept profile. No image is accepted on this side. */
export type ConceptProfile = {
  name: string
  nationality: string
  active: string
  movement: string
  technique: string
  search: string
}

/** Two writing lines beside one local frame, or beside a plate and a text profile. */
export type DualReadQuestion = {
  id: string
  type: 'dualRead'
  prompt: string
  labels: [string, string]
  image?: string
  imageCredit?: string
  /** Present when one side is a verified public-domain image. */
  plate?: ComparePlate
  /** Present when one side has no image and the student reads a text profile. */
  profile?: ConceptProfile
  explain: string
}

/** One open line. Structure practice, not a marked paper. */
export type ShortQuestion = {
  id: string
  type: 'short'
  prompt: string
  explain: string
  /** Optional question illustration. Same local pack path as lesson cards. */
  image?: string
  imageCredit?: string
}

export type Question = McqQuestion | MatchQuestion | FillQuestion | OrderQuestion | DualReadQuestion | ShortQuestion

/** Cleared lesson artwork, or a VA-Nexus reference image. No `thumb` means the card keeps the empty-image placeholder. */
export type LessonArtistRef = {
  artistId: string
  thumb?: string
  license?: string
  credit?: string
  sourceUrl?: string
  /** Reference image. Not a cleared artwork, so it has no license or source. */
  reference?: boolean
  /** Public https site. Omitted when none is set. */
  artistSiteUrl?: string
}

export type Lesson = {
  id: string
  title: string
  subtitle: string
  minutes: number
  /** 示範內容 pending PEANUTS review */
  demo: boolean
  cards: LessonCard[]
  questions: Question[]
  /** Present when the content lesson lists artistIds. Thumbs only for cleared media. */
  artists?: LessonArtistRef[]
  /** Optional lesson-tile illustration. Same local pack path as unit covers. */
  coverImage?: string
  coverCredit?: string
}

export type Unit = {
  id: string
  title: string
  subtitle: string
  nodes: Lesson[]
  /** Optional unit-card illustration. Omitted on packs that have no cover yet. */
  coverImage?: string
  coverCredit?: string
}

export type ResearchQuest = Lesson & {
  badgeId: string
  badgeTitle: string
  skill: string
  /** Embed the Feldman writer after the quiz */
  embedFeldman?: boolean
}

export type Mastery = 'none' | 'attempted' | 'familiar' | 'proficient' | 'mastered'

export type NodeProgress = {
  attempts: number
  bestAccuracy: number
  /** number of sessions finished with 100% first-try accuracy */
  perfectRuns: number
  completed: boolean
  lastTs: number
}

export type ActivityEntry = {
  id: string
  ts: number
  kind: 'lesson' | 'quest' | 'badge' | 'sba' | 'feldman' | 'level' | 'streak'
  text: string
  xp?: number
}

/** Single versioned state object → easy to sync to Supabase per user later. */
export type GameStateV1 = {
  version: 1
  xp: number
  streak: { count: number; best: number; lastDate: string | null }
  nodes: Record<string, NodeProgress>
  quests: Record<string, { completed: boolean; ts: number }>
  badges: Record<string, number>
  activity: ActivityEntry[]
  /** idempotency keys for one-off XP rewards (e.g. sba-step-3) */
  awarded: Record<string, number>
  prefs: Record<string, never>
}

export type SessionResult = {
  total: number
  firstTryCorrect: number
  accuracy: number
  wrongByType: Partial<Record<QuestionType, number>>
}
