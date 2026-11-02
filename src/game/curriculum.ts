import artHistory from '../content/art-history-map.json'
import { adaptCards, adaptQuiz, fillAnswersOf, type ContentLesson } from './content'
import type { Lesson, Unit } from './types'

/**
 * Art-history learning map — content by PEANUTS (src/content/art-history-map.json).
 * Facts not yet source-checked → every lesson carries 「內容待老師審閱」.
 * To add a unit: append another `{ unit }` JSON and push it into CONTENT_UNITS.
 */
type ContentUnit = { id: string; title: string; intro?: string; lessons: ContentLesson[] }

const CONTENT_UNITS: ContentUnit[] = [(artHistory as unknown as { unit: ContentUnit }).unit]

function toLesson(l: ContentLesson, pool: string[]): Lesson {
  return {
    id: l.id,
    title: l.title,
    subtitle: l.subtitle ?? `${l.cards.length} 張短課卡 · ${l.quiz.length} 題小測`,
    minutes: l.minutes ?? Math.max(3, Math.round((l.cards.length + l.quiz.length) / 2)),
    demo: true,
    cards: adaptCards(l.cards),
    questions: adaptQuiz(l.id, l.quiz, pool),
  }
}

export const UNITS: Unit[] = CONTENT_UNITS.map((u) => {
  const pool = fillAnswersOf(u.lessons)
  return { id: u.id, title: u.title, subtitle: u.intro ?? '', nodes: u.lessons.map((l) => toLesson(l, pool)) }
})

export const ALL_NODES = UNITS.flatMap((u) => u.nodes)
export const NODE_BY_ID = new Map(ALL_NODES.map((n) => [n.id, n]))
