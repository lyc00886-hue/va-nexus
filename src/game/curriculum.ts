import { contentJson } from '../i18n/content'
import { perLocale, t } from '../i18n'
import { adaptCards, adaptQuiz, fillAnswersOf, type ContentLesson } from './content'
import { coverFromUnit } from './f4Media'
import type { Lesson, Unit } from './types'

/**
 * Art-history learning map — content by PEANUTS (src/content/art-history-map[.<locale>].json).
 * Accepts either legacy `{ unit }` or multi-unit `{ units: [...] }` (v2/v3; U6–U11 electives unlock per unit).
 * Facts not yet source-checked → every lesson carries 「內容待老師審閱」.
 */
type ContentUnit = {
  id: string
  title: string
  intro?: string
  coverImage?: unknown
  coverCredit?: unknown
  lessons: ContentLesson[]
}

type ArtHistoryMapFile = { units?: ContentUnit[]; unit?: ContentUnit }

function contentUnits(): ContentUnit[] {
  const raw = contentJson<ArtHistoryMapFile>('art-history-map')
  if (Array.isArray(raw.units) && raw.units.length > 0) return raw.units
  if (raw.unit) return [raw.unit]
  throw new Error('[curriculum] art-history-map missing units[] or unit')
}

export function lessonFromContent(l: ContentLesson, pool: string[]): Lesson {
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
    return {
      id: u.id,
      title: u.title,
      subtitle: u.intro ?? '',
      ...coverFromUnit(u),
      nodes: u.lessons.map((l) => lessonFromContent(l, pool)),
    }
  }),
)

export const getAllNodes = perLocale(() => getUnits().flatMap((u) => u.nodes))
export const getNodeById = perLocale(() => new Map(getAllNodes().map((n) => [n.id, n])))
