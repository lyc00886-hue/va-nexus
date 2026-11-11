/**
 * Form 6 learning-map pack.
 * Files: src/content/f6-demo.json (zh-Hant), f6-demo.en.json, f6-demo.zh-Hans.json.
 * Same Learning Map shape as the Form 4 pack.
 */
import { contentJson } from '../i18n/content'
import { perLocale } from '../i18n'
import { fillAnswersOf, type ContentLesson } from './content'
import { lessonFromContent } from './curriculum'
import { artistsFromLesson, coverFromUnit } from './f4Media'
import type { Unit } from './types'

export const F6_UNIT_IDS = [
  'F6-U1-ORIENT',
  'F6-U2-MINGQING',
  'F6-U3-DAILY',
  'F6-U4-LITERATI',
  'F6-U5-ROLE',
  'F6-U6-PORTFOLIO',
] as const

export const F6_LESSON_COUNTS = [2, 3, 4, 2, 3, 2] as const

type YearLessonSource = ContentLesson & {
  artistIds?: unknown
  artistMedia?: unknown
  coverImage?: unknown
  coverCredit?: unknown
}

type YearUnitSource = {
  id?: string
  title?: string
  intro?: string
  coverImage?: unknown
  coverCredit?: unknown
  lessons?: YearLessonSource[]
}

type YearFile = { units?: YearUnitSource[] }

function playableLessons(lessons: YearLessonSource[] | undefined): YearLessonSource[] {
  return (lessons ?? []).filter(
    (lesson): lesson is YearLessonSource =>
      Boolean(lesson) &&
      typeof lesson.id === 'string' &&
      lesson.id.length > 0 &&
      Array.isArray(lesson.cards) &&
      Array.isArray(lesson.quiz),
  )
}

export function unitsFromF6File(raw: YearFile | null | undefined): Unit[] {
  const units = raw?.units
  if (!Array.isArray(units) || units.length === 0) throw new Error('[f6-demo] missing units[]')
  const built = units.map((unit) => {
    const lessons = playableLessons(unit.lessons)
    const pool = fillAnswersOf(lessons)
    return {
      id: unit.id ?? '',
      title: unit.title ?? '',
      subtitle: unit.intro ?? '',
      ...coverFromUnit(unit),
      nodes: lessons.map((lesson) => {
        const node = lessonFromContent(lesson, pool)
        const artists = artistsFromLesson(lesson)
        return { ...node, demo: false, ...coverFromUnit(lesson), ...(artists ? { artists } : {}) }
      }),
    }
  })
  const ids = built.map((unit) => unit.id).join(',')
  if (ids !== F6_UNIT_IDS.join(',')) {
    throw new Error(`[f6-demo] expected units ${F6_UNIT_IDS.join(', ')} but got ${ids}`)
  }
  return built
}

/** F.6 units for the active locale (memoised per locale). */
export const getF6Units = perLocale<Unit[]>(() => unitsFromF6File(contentJson<YearFile>('f6-demo')))
