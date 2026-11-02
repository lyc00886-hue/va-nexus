import { contentJson } from '../i18n/content'
import { perLocale, t } from '../i18n'
import { adaptCards, adaptQuiz, fillAnswersOf, type ContentLesson } from './content'
import type { Lesson, Unit } from './types'

/**
 * Art-history learning map — content by PEANUTS (src/content/art-history-map[.<locale>].json).
 * Facts not yet source-checked → every lesson carries 「內容待老師審閱」.
 * To add a unit: append another `{ unit }` JSON and push it into contentUnits().
 */
type ContentUnit = { id: string; title: string; intro?: string; lessons: ContentLesson[] }

function contentUnits(): ContentUnit[] {
  return [contentJson<{ unit: ContentUnit }>('art-history-map').unit]
}

function toLesson(l: ContentLesson, pool: string[]): Lesson {
  return {
    id: l.id,
    title: l.title,
    subtitle: l.subtitle ?? t('lesson.subtitle', { cards: l.cards.length, quiz: l.quiz.length }),
    minutes: l.minutes ?? Math.max(3, Math.round((l.cards.length + l.quiz.length) / 2)),
    demo: true,
    cards: adaptCards(l.cards),
    questions: adaptQuiz(l.id, l.quiz, pool),
  }
}

/** Units for the active locale (memoised per locale). */
export const getUnits = perLocale<Unit[]>(() =>
  contentUnits().map((u) => {
    const pool = fillAnswersOf(u.lessons)
    return { id: u.id, title: u.title, subtitle: u.intro ?? '', nodes: u.lessons.map((l) => toLesson(l, pool)) }
  }),
)

export const getAllNodes = perLocale(() => getUnits().flatMap((u) => u.nodes))
export const getNodeById = perLocale(() => new Map(getAllNodes().map((n) => [n.id, n])))
