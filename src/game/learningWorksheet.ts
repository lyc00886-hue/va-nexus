/**
 * Official Form 4 community-art learning worksheet.
 * The served file is the ordinary-lines work copy. Activity papers stay on their own lessons.
 * November homework stays `demo-november`. This id only joins the live hand-in list.
 */
import {
  DEMO_ASSIGN_ID,
  LEARNING_WORKSHEET_ASSIGN_ID,
  type StaffAssignment,
} from '../lib/assignList.ts'

export { LEARNING_WORKSHEET_ASSIGN_ID }

export const LEARNING_WORKSHEET_URL = '/content/f4-community-art-learning-worksheet.pdf'
export const LEARNING_WORKSHEET_SHA256 = '581e75cb217bcd665afee6ba5101dc7c299b493d4cd64db18b9183ff5ab6071a'
export const LEARNING_WORKSHEET_BYTES = 775841
export const LEARNING_WORKSHEET_PAGES = 8

export const LEARNING_WORKSHEET_LESSONS = ['F4-U3-L3', 'F4-U3-L4'] as const

export function learningWorksheetLesson(id: string): boolean {
  return (LEARNING_WORKSHEET_LESSONS as readonly string[]).includes(id)
}

export function learningWorksheetAssignment(classId: string): StaffAssignment {
  return {
    id: LEARNING_WORKSHEET_ASSIGN_ID,
    classId,
    title: '',
    due: '',
    instructions: '',
    attach: 'none',
    demo: true,
  }
}

/** Keep November where it is. Insert this worksheet once, directly after it. */
export function withLearningWorksheet(rows: readonly StaffAssignment[], classId: string): StaffAssignment[] {
  if (rows.some((row) => row.id === LEARNING_WORKSHEET_ASSIGN_ID)) return [...rows]
  const next = learningWorksheetAssignment(classId)
  const at = rows.findIndex((row) => row.id === DEMO_ASSIGN_ID)
  if (at < 0) return [...rows, next]
  return [...rows.slice(0, at + 1), next, ...rows.slice(at + 1)]
}
