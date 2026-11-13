/**
 * Slice ③ activity paper for F4-U3-L3 and F4-U3-L4 only.
 * Case lines are composed from the already-shipped case.* and video.* strings.
 * The sample label is a preview stand-in, not a student.
 */

export const WORKSHEET_LESSON_IDS = ['F4-U3-L3', 'F4-U3-L4'] as const

export type WorksheetLessonId = (typeof WORKSHEET_LESSON_IDS)[number]

export type WorksheetAudience = 'teacher' | 'student'

export type WorksheetMode = 'preview' | 'print' | 'download'

/** Official locale keys for this slice. Question lines are separate keys. */
export const WORKSHEET_LOCALE_KEYS = [
  'worksheet.title',
  'worksheet.preview',
  'worksheet.print',
  'worksheet.download',
  'worksheet.printHint',
  'worksheet.l3.title',
  'worksheet.l4.title',
  'worksheet.intro',
  'worksheet.sampleNote',
  'worksheet.noSchool',
  'worksheet.section.case',
  'worksheet.section.questions',
] as const

export const WORKSHEET_QUESTION_KEYS = {
  'F4-U3-L3': ['worksheet.l3.q1', 'worksheet.l3.q2', 'worksheet.l3.q3', 'worksheet.l3.q4'],
  'F4-U3-L4': ['worksheet.l4.q1', 'worksheet.l4.q2', 'worksheet.l4.q3'],
} as const

/** Teacher-preview sample. Not a locale key, and not a real student. */
export const WORKSHEET_SAMPLE_LABEL = '示例同學甲'

export function worksheetLessonOf(id: string): WorksheetLessonId | null {
  if (id === 'F4-U3-L3' || id === 'F4-U3-L4') return id
  return null
}

/** Sample name is only the L3 teacher preview, matching Soft SCOUT plate 08. */
export function worksheetShowsSample(
  lessonId: WorksheetLessonId,
  audience: WorksheetAudience,
  mode: WorksheetMode,
): boolean {
  return lessonId === 'F4-U3-L3' && audience === 'teacher' && mode === 'preview'
}

export function worksheetCaseLines(
  lessonId: WorksheetLessonId,
  audience: WorksheetAudience,
  text: (key: string) => string,
): string[] {
  if (lessonId === 'F4-U3-L3') {
    if (audience === 'student') {
      return [`${text('case.hill.title')} · ${text('case.hill.english')}`, text('case.hill.frame')]
    }
    return [
      text('case.hill.title'),
      text('case.hill.english'),
      `${text('case.hill.org')} · ${text('case.hill.plan')}`,
      text('case.hill.artist'),
      text('case.hill.source'),
      text('case.hill.frame'),
    ]
  }
  if (audience === 'student') {
    return [
      `${text('case.deepfood.collective')}「${text('case.deepfood.project')}」 · ${text('case.deepfood.english')}`,
      text('case.deepfood.frame'),
    ]
  }
  return [
    `${text('case.deepfood.collective')}「${text('case.deepfood.project')}」`,
    text('case.deepfood.english'),
    `${text('case.deepfood.invite')} · ${text('case.deepfood.venue')} · ${text('case.deepfood.when')}`,
    text('video.classroomOnly'),
    text('video.noDownload'),
  ]
}

export function worksheetQuestions(lessonId: WorksheetLessonId, text: (key: string) => string): string[] {
  return WORKSHEET_QUESTION_KEYS[lessonId].map((key) => text(key))
}

export function worksheetDownloadName(lessonId: WorksheetLessonId): string {
  return lessonId === 'F4-U3-L3' ? 'classroom-activity-F4-U3-L3.html' : 'classroom-activity-F4-U3-L4.html'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Printable file for this paper only. No sample name and no school record. */
export function worksheetDownloadHtml(input: {
  lang: string
  title: string
  intro: string
  noSchool: string
  caseHeading: string
  caseLines: readonly string[]
  questionsHeading: string
  questions: readonly string[]
}): string {
  const lines = input.caseLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
  const questions = input.questions
    .map(
      (question) =>
        `<li><p>${escapeHtml(question)}</p><div class="lines" aria-hidden="true"><hr><hr></div></li>`,
    )
    .join('')
  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.lang)}">
<meta charset="utf-8">
<title>${escapeHtml(input.title)}</title>
<style>
  body { margin: 24px; background: #FFF9E9; color: #042f2e; font-family: sans-serif; }
  h1 { font-size: 20px; }
  .case { border: 2px solid #0D9488; border-radius: 16px; padding: 12px 16px; }
  .lines hr { border: 0; border-bottom: 1px solid #94a3b8; margin: 16px 0; }
</style>
<h1>${escapeHtml(input.title)}</h1>
<p>${escapeHtml(input.intro)}</p>
<p>${escapeHtml(input.noSchool)}</p>
<section class="case">
  <h2>${escapeHtml(input.caseHeading)}</h2>
  ${lines}
</section>
<h2>${escapeHtml(input.questionsHeading)}</h2>
<ol>${questions}</ol>
</html>
`
}
