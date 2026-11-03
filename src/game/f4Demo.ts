/**
 * F.4 Learning Map demo slice (PEANUTS) — not a full Form 4 year.
 * Files: src/content/f4-demo.json (zh-Hant), f4-demo.en.json, f4-demo.zh-Hans.json.
 * Same Learning Map v3 shape as art-history: { units: [{ id, title, intro, lessons }] }.
 * Optional coverImage / coverCredit and per-lesson artistMedia are additive.
 * U1–U6 each ship a local 自制 cover. A unit with no coverImage still renders without one.
 * The map chrome and unit cards do not show a syllabus year.
 */
import { contentJson } from '../i18n/content'
import { perLocale } from '../i18n'
import { fillAnswersOf, type ContentLesson } from './content'
import { lessonFromContent } from './curriculum'
import { artistsFromLesson, coverFromUnit } from './f4Media'
import type { Unit } from './types'

export const F4_UNIT_IDS = [
  'F4-U1-ORIENT',
  'F4-U2-DRAW-DESIGN',
  'F4-U3-COMMUNITY',
  'F4-U4-SELF-RESEARCH',
  'F4-U5-ART-HIST',
  'F4-U6-THEME-SEEDS',
] as const

type F4LessonSource = ContentLesson & { artistIds?: unknown; artistMedia?: unknown }

type F4UnitSource = {
  id?: string
  title?: string
  intro?: string
  coverImage?: unknown
  coverCredit?: unknown
  lessons?: F4LessonSource[]
}

type F4File = { units?: F4UnitSource[] }

function playableLessons(lessons: F4LessonSource[] | undefined): F4LessonSource[] {
  return (lessons ?? []).filter(
    (lesson): lesson is F4LessonSource =>
      Boolean(lesson) &&
      typeof lesson.id === 'string' &&
      lesson.id.length > 0 &&
      Array.isArray(lesson.cards) &&
      Array.isArray(lesson.quiz),
  )
}

export function unitsFromF4File(raw: F4File | null | undefined): Unit[] {
  const units = raw?.units
  if (!Array.isArray(units) || units.length === 0) throw new Error('[f4-demo] missing units[]')
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
        return artists ? { ...node, artists } : node
      }),
    }
  })
  const ids = built.map((unit) => unit.id).join(',')
  if (ids !== F4_UNIT_IDS.join(',')) {
    throw new Error(`[f4-demo] expected units ${F4_UNIT_IDS.join(', ')} but got ${ids}`)
  }
  return built
}

/** F.4 units for the active locale (memoised per locale). */
export const getF4Units = perLocale<Unit[]>(() => unitsFromF4File(contentJson<F4File>('f4-demo')))
