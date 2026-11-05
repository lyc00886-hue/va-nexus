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

export type QuestionType = 'mcq' | 'match' | 'fill'

export type McqQuestion = {
  id: string
  type: 'mcq'
  prompt: string
  options: string[]
  answer: number
  explain: string
}

export type MatchQuestion = {
  id: string
  type: 'match'
  prompt: string
  /** left term ↔ right description; shuffled at runtime */
  pairs: { left: string; right: string }[]
  explain: string
}

export type FillQuestion = {
  id: string
  type: 'fill'
  /** Sentence with ＿＿ as the blank */
  prompt: string
  bank: string[]
  answer: string
  explain: string
}

export type Question = McqQuestion | MatchQuestion | FillQuestion

/** Cleared lesson artwork. No `thumb` means the card keeps the empty-image placeholder. */
export type LessonArtistRef = {
  artistId: string
  thumb?: string
  license?: string
  credit?: string
  sourceUrl?: string
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
  prefs: { hearts: boolean }
}

export type SessionResult = {
  total: number
  firstTryCorrect: number
  accuracy: number
  wrongByType: Partial<Record<QuestionType, number>>
}
