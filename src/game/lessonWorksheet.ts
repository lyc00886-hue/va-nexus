/**
 * Slice ③ activity paper for F4-U3-L3 and F4-U3-L4 only.
 * Case lines are composed from the already-shipped case.* and video.* strings.
 * The sample label is a preview stand-in, not a student.
 */

export const WORKSHEET_LESSON_IDS = ['F4-U3-L3', 'F4-U3-L4'] as const

/** One classroom paper for the Form 5 heritage demo unit, on each of its four lessons. */
export const F5_WORKSHEET_LESSON_IDS = ['F5-U3-L1', 'F5-U3-L2', 'F5-U3-L3', 'F5-U3-L4'] as const

export type WorksheetLessonId = (typeof WORKSHEET_LESSON_IDS)[number] | (typeof F5_WORKSHEET_LESSON_IDS)[number]

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

/** L3 keeps worksheet.l3.q4 in the locale file and does not show it. */
export const WORKSHEET_QUESTION_KEYS = {
  'F4-U3-L3': ['worksheet.l3.q1', 'worksheet.l3.q2', 'worksheet.l3.q3'],
  'F4-U3-L4': ['worksheet.l4.q1', 'worksheet.l4.q2', 'worksheet.l4.q3'],
} as const

export const F5_WORKSHEET_QUESTION_KEYS = [
  'worksheet.f5.q1',
  'worksheet.f5.q2',
  'worksheet.f5.q3',
  'worksheet.f5.q4',
] as const

export const WORKSHEET_UNUSED_QUESTION_KEY = 'worksheet.l3.q4'

/** Teacher-preview sample. Not a locale key, and not a real student. */
export const WORKSHEET_SAMPLE_LABEL = '示例同學甲'

export function worksheetLessonOf(id: string): WorksheetLessonId | null {
  if (id === 'F4-U3-L3' || id === 'F4-U3-L4') return id
  if (id === 'F5-U3-L1' || id === 'F5-U3-L2' || id === 'F5-U3-L3' || id === 'F5-U3-L4') return id
  return null
}

export function worksheetIsHeritage(lessonId: WorksheetLessonId): boolean {
  return lessonId === 'F5-U3-L1' || lessonId === 'F5-U3-L2' || lessonId === 'F5-U3-L3' || lessonId === 'F5-U3-L4'
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
  if (worksheetIsHeritage(lessonId)) return []
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
  if (lessonId === 'F4-U3-L3' || lessonId === 'F4-U3-L4') {
    return WORKSHEET_QUESTION_KEYS[lessonId].map((key) => text(key))
  }
  return F5_WORKSHEET_QUESTION_KEYS.map((key) => text(key))
}

export function worksheetTitleKey(
  lessonId: WorksheetLessonId,
): 'worksheet.l3.title' | 'worksheet.l4.title' | 'worksheet.f5.title' {
  if (lessonId === 'F4-U3-L3') return 'worksheet.l3.title'
  if (lessonId === 'F4-U3-L4') return 'worksheet.l4.title'
  return 'worksheet.f5.title'
}

export function worksheetIntroKey(lessonId: WorksheetLessonId): 'worksheet.f5.intro' | 'worksheet.intro' {
  return worksheetIsHeritage(lessonId) ? 'worksheet.f5.intro' : 'worksheet.intro'
}

export function worksheetQuestionsHeadingKey(
  lessonId: WorksheetLessonId,
): 'worksheet.f5.section.tasks' | 'worksheet.section.questions' {
  return worksheetIsHeritage(lessonId) ? 'worksheet.f5.section.tasks' : 'worksheet.section.questions'
}

export function worksheetDownloadName(lessonId: WorksheetLessonId): string {
  if (lessonId === 'F4-U3-L3') return 'classroom-activity-F4-U3-L3.html'
  if (lessonId === 'F4-U3-L4') return 'classroom-activity-F4-U3-L4.html'
  return 'classroom-activity-F5-U3-HERITAGE.html'
}

/** Same file the lesson toolbar downloads. Form 4 keeps the teacher case lines. */
export function worksheetDownloadFor(
  lessonId: WorksheetLessonId,
  lang: string,
  text: (key: string) => string,
): { name: string; html: string } {
  return {
    name: worksheetDownloadName(lessonId),
    html: worksheetDownloadHtml({
      lang,
      title: text(worksheetTitleKey(lessonId)),
      intro: text(worksheetIntroKey(lessonId)),
      noSchool: text('worksheet.noSchool'),
      caseHeading: text('worksheet.section.case'),
      caseLines: worksheetCaseLines(lessonId, 'teacher', text),
      questionsHeading: text(worksheetQuestionsHeadingKey(lessonId)),
      questions: worksheetQuestions(lessonId, text),
    }),
  }
}

export const F5_INSTRUCTIONS_DOWNLOAD_NAME = 'f5-heritage-homework-instructions.html'

/** Homework-list download of the existing Form 5 assignment instructions. */
export function homeworkInstructionsHtml(input: { lang: string; title: string; dueLine: string; instructions: string }): string {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.lang)}">
<meta charset="utf-8">
<title>${escapeHtml(input.title)}</title>
<style>
  body { margin: 24px; background: #FFF9E9; color: #042f2e; font-family: sans-serif; }
  h1 { font-size: 20px; }
</style>
<h1>${escapeHtml(input.title)}</h1>
<p>${escapeHtml(input.dueLine)}</p>
<p>${escapeHtml(input.instructions)}</p>
</html>
`
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
  const caseBlock =
    input.caseLines.length === 0
      ? ''
      : `<section class="case">
  <h2>${escapeHtml(input.caseHeading)}</h2>
  ${lines}
</section>
`
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
${caseBlock}<h2>${escapeHtml(input.questionsHeading)}</h2>
<ol>${questions}</ol>
</html>
`
}
