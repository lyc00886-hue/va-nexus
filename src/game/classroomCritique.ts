/**
 * Classroom appreciation notes follow the lesson's verified works.
 * Feedback may name a work only when that work is on the verified list.
 * Student-facing copy keeps the live Education Bureau directions and does not
 * name a coined method.
 */
import type { VerifiedWork } from './verifiedArtworks'

export type CritiqueObjectKey = 'critique.object.f4u3l1' | 'critique.object'

/** Live five directions. The strings themselves stay in the locale files. */
export const CRITIQUE_DIRECTION_KEYS = ['dir.feel', 'dir.surface', 'dir.form', 'dir.meaning', 'dir.value'] as const

const BANNED_LABEL = /Feldman|DAIE|ArtInsight|Duolingo|Grok|\bSEN\b/

/**
 * Lesson 2 keeps the stored `critique.object` sentence.
 * Lesson 1 uses its own sentence. Other lessons do not borrow lesson 2's sentence.
 */
export function critiqueObjectKey(lessonId: string): CritiqueObjectKey | null {
  if (lessonId === 'F4-U3-L1') return 'critique.object.f4u3l1'
  if (lessonId === 'F4-U3-L2') return 'critique.object'
  return null
}

/** True when every 《title》 in the text is one of the allowed titles. */
export function bracketedTitlesAreListed(text: string, titles: readonly string[]): boolean {
  if (BANNED_LABEL.test(text)) return false
  const allowed = new Set(titles)
  for (const match of text.matchAll(/《([^》]+)》/g)) {
    if (!allowed.has(match[1] ?? '')) return false
  }
  return true
}

/** Classroom critique may cite a title only when that exact title is on the list. */
export function critiqueMayCite(title: string, works: readonly Pick<VerifiedWork, 'title'>[]): boolean {
  const trimmed = title.trim()
  return trimmed.length > 0 && works.some((work) => work.title === trimmed)
}

/**
 * The sentence names this lesson's verified works, and no other listed work.
 * A lesson with no verified plates does not pass.
 */
export function objectFollowsLesson(
  lessonId: string,
  text: string,
  works: readonly Pick<VerifiedWork, 'lessonId' | 'title'>[],
): boolean {
  const mine = works.filter((work) => work.lessonId === lessonId)
  if (mine.length === 0) return false
  if (BANNED_LABEL.test(text)) return false
  if (!mine.every((work) => text.includes(work.title))) return false
  const others = works.filter((work) => work.lessonId !== lessonId)
  if (others.some((work) => text.includes(work.title))) return false
  return bracketedTitlesAreListed(
    text,
    mine.map((work) => work.title),
  )
}

export function critiqueSentenceFor(
  lessonId: string,
  text: (key: CritiqueObjectKey) => string,
  works: readonly Pick<VerifiedWork, 'lessonId' | 'title'>[],
): string {
  const key = critiqueObjectKey(lessonId)
  if (!key) return ''
  const sentence = text(key)
  return objectFollowsLesson(lessonId, sentence, works) ? sentence : ''
}
