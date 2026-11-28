import { buildLessonSteps } from '../game/lessonSteps.ts'

/**
 * Spoken text for an open lesson step.
 * 英中對照 reads the English line, then the active Chinese line.
 * Identical lines stay one sentence. No new product copy.
 */
export function bilingualSpeech(
  text: string,
  english: string | undefined,
  bilingual: boolean,
  sep: string,
): string {
  if (!bilingual) return text
  const current = text.trim()
  const alt = english?.trim()
  if (!current || !alt || alt === current) return text
  return `${alt}${sep}${current}`
}

export type AutoReadPlan = {
  start: boolean
  /** Set once a start is issued, so the same step does not restart. */
  arm?: string
}

/**
 * Opening a new step starts reading. That includes the first teaching card
 * and a critique step after a question.
 * The same key does not start again. Stop on that key stays stopped.
 * A start that never armed (speech was dropped) may start again.
 */
export function planAutoRead(input: {
  auto: boolean
  autoKey: string | undefined
  text: string
  armedKey: string | undefined
  stoppedKey: string | undefined
}): AutoReadPlan {
  if (!input.auto || !input.autoKey || !input.text.trim()) return { start: false }
  if (input.armedKey === input.autoKey || input.stoppedKey === input.autoKey) return { start: false }
  return { start: true, arm: input.autoKey }
}

/** A replaced reader must not cancel speech that a newer reader already owns. */
export function releaseOwnsSpeech(activeToken: number, myToken: number): boolean {
  return myToken !== 0 && activeToken === myToken
}

/** Cancel only when speech is already playing. An idle first card must not be cancelled before it starts. */
export function speechNeedsCancel(input: { speaking: boolean; pending: boolean }): boolean {
  return input.speaking || input.pending
}

export function speechSeparator(locale: string): string {
  return locale === 'en' ? '. ' : '。'
}

/** The line the lesson card's main read control speaks. */
export function spokenCardText(input: {
  title: string
  body: string
  easy: readonly string[]
  readingEasy: boolean
  bilingual: boolean
  englishTitle?: string
  englishBody?: string
  sep: string
}): string {
  const cardBody = input.readingEasy ? input.easy.join(input.sep) : input.body
  if (!input.bilingual) return `${input.title}${input.sep}${cardBody}`
  return [input.englishTitle, input.englishBody, input.title, cardBody].filter(Boolean).join(input.sep)
}

/**
 * Speech for the step that opens with the lesson.
 * A leading media step is left to the card, so this does not speak the wrong line.
 */
export function openingCardSpeech(input: {
  lessonId: string
  cards: readonly { title: string; body: string; easy: readonly string[] }[]
  questionCount: number
  media: boolean
  readingEasy: boolean
  bilingual: boolean
  sep: string
  alt?: (text: string) => string | undefined
}): { key: string; text: string } | null {
  const first = buildLessonSteps({
    cardCount: input.cards.length,
    questionCount: input.questionCount,
    media: input.media,
  })[0]
  if (!first || first.kind !== 'card') return null
  const card = input.cards[first.cardIndex]
  if (!card) return null
  const text = spokenCardText({
    title: card.title,
    body: card.body,
    easy: card.easy,
    readingEasy: input.readingEasy,
    bilingual: input.bilingual,
    englishTitle: input.alt?.(card.title),
    englishBody: input.alt?.(card.body),
    sep: input.sep,
  })
  if (!text.trim()) return null
  return { key: `${input.lessonId}-card-${first.cardIndex}`, text }
}

export type GestureAutoReadPlan = {
  speak: boolean
  key?: string
  text?: string
}

/**
 * 讀寫支援 turns auto-read on. Opening the card then speaks in that same click.
 * 低感官刺激 and the default path leave auto-read off, so they do not speak.
 */
export function planGestureAutoRead(input: {
  auto: boolean
  key: string
  text: string
  stoppedKey?: string
}): GestureAutoReadPlan {
  if (!input.auto) return { speak: false }
  const key = input.key.trim()
  const text = input.text.trim()
  if (!key || !text) return { speak: false }
  if (input.stoppedKey === key) return { speak: false }
  return { speak: true, key, text }
}

/** Visible main control. Auto-read that has already been issued shows the short stop label. */
export function readAloudFace(input: { speaking: boolean; gestureLive: boolean }): 'stop' | 'read' {
  return input.speaking || input.gestureLive ? 'stop' : 'read'
}

/**
 * An idle engine speaks inside the open click.
 * Chrome drops speak() in the same turn as cancel(), so a busy engine waits.
 */
export function gestureSpeakTiming(busy: boolean): 'now' | 'after-cancel' {
  return busy ? 'after-cancel' : 'now'
}
