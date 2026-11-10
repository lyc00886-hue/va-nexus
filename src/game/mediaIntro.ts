/**
 * Media-intro pack (PEANUTS): separate from art-history U1–U10.
 * Files: src/content/media-intro.json (zh-Hant), .en.json, .zh-Hans.json.
 * Missing units, including M12-PEN / M13-PHOTO, become pending stubs.
 */
import { contentJson } from '../i18n/content'
import { getLocale, perLocale } from '../i18n'
import { fillAnswersOf, type ContentLesson } from './content'
import { lessonFromContent } from './curriculum'
import { assembleMediaUnits, mediaAim, type MediaUnitSource } from './mediaCatalog'
import type { Lesson, Unit } from './types'

export type MediaUnit = Unit & {
  mediaKey: string
  paper2Applicable: boolean
  /** Official per-medium caveat. Empty on a pending stub — do not invent one. */
  paper2Note: string
  materials: string[]
  safetyNotes: string[]
  pending: boolean
}

function loadRaw(): MediaUnitSource[] | null {
  try {
    const file = contentJson<{ units?: MediaUnitSource[] }>('media-intro')
    return Array.isArray(file?.units) ? file.units : null
  } catch (err) {
    console.warn('[media-intro] content pack unavailable', err)
    return null
  }
}

function playableLessons(lessons: unknown[]): ContentLesson[] {
  return lessons.filter((lesson): lesson is ContentLesson => {
    if (!lesson || typeof lesson !== 'object') return false
    const row = lesson as Partial<ContentLesson>
    return typeof row.id === 'string' && row.id.length > 0 && Array.isArray(row.cards) && Array.isArray(row.quiz)
  })
}

function toNodes(lessons: ContentLesson[]): Lesson[] {
  try {
    const pool = fillAnswersOf(lessons)
    return lessons.map((lesson) => lessonFromContent(lesson, pool))
  } catch (err) {
    console.warn('[media-intro] could not adapt lessons', err)
    return []
  }
}

export const getMediaUnits = perLocale<MediaUnit[]>(() =>
  assembleMediaUnits(loadRaw(), getLocale()).map((unit) => {
    const lessons = unit.pending ? [] : playableLessons(unit.lessons)
    const nodes = lessons.length ? toNodes(lessons) : []
    const pending = unit.pending || nodes.length === 0
    return {
      id: unit.id,
      mediaKey: unit.mediaKey,
      title: unit.title,
      subtitle: mediaAim(unit.intro),
      paper2Applicable: unit.paper2Applicable,
      paper2Note: unit.paper2Note,
      materials: unit.materials,
      safetyNotes: unit.safetyNotes,
      pending,
      nodes: pending ? [] : nodes,
    }
  }),
)
