/**
 * Classroom activity papers for F4-U3-L3, F4-U3-L4, and the Form 5 heritage unit.
 * Form 4 papers follow the locked community-art lesson. Old question keys stay in
 * the locale files and are not shown. The sample label is a preview stand-in, not a student.
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

/** Visible Form 4 tasks. Old q1–q3 stay in the locale files and are not shown. */
export const WORKSHEET_QUESTION_KEYS = {
  'F4-U3-L3': [
    'worksheet.l3.prompt',
    'worksheet.l3.case1.q',
    'worksheet.l3.case2.q',
    'worksheet.l3.compare',
    'worksheet.l3.notice',
  ],
  'F4-U3-L4': [
    'worksheet.l4.sketch',
    'worksheet.l4.reflect',
    'worksheet.l4.diary',
    'worksheet.l4.compare',
    'worksheet.l4.further',
  ],
} as const

/** Kept in the locale files. Not shown on the Form 4 papers. */
export const WORKSHEET_HIDDEN_KEYS = [
  'worksheet.intro',
  'worksheet.l3.q1',
  'worksheet.l3.q2',
  'worksheet.l3.q3',
  'worksheet.l4.q1',
  'worksheet.l4.q2',
  'worksheet.l4.q3',
] as const

export const FORM4_NEW_KEYS = [
  'worksheet.l3.intro',
  'worksheet.l4.intro',
  'worksheet.section.prompt',
  'worksheet.l3.prompt',
  'worksheet.section.what',
  'worksheet.l3.what',
  'worksheet.section.cases',
  'worksheet.l3.case1.title',
  'worksheet.l3.case1.when',
  'worksheet.l3.case1.org',
  'worksheet.l3.case1.groups',
  'worksheet.l3.case1.work',
  'worksheet.l3.case1.q',
  'worksheet.l3.case2.title',
  'worksheet.l3.case2.who',
  'worksheet.l3.case2.when',
  'worksheet.l3.case2.items',
  'worksheet.l3.case2.org',
  'worksheet.l3.case2.q',
  'worksheet.l3.contrast',
  'worksheet.section.compare',
  'worksheet.l3.compare',
  'worksheet.section.notice',
  'worksheet.l3.notice',
  'worksheet.section.vocab',
  'worksheet.l3.vocab.communityArt',
  'worksheet.l3.vocab.publicArt',
  'worksheet.l3.vocab.participation',
  'worksheet.l3.vocab.siteSpecific',
  'worksheet.l3.vocab.audience',
  'worksheet.l3.vocab.collaboration',
  'worksheet.l3.vocab.senseOfPlace',
  'worksheet.section.sketch',
  'worksheet.l4.sketch',
  'worksheet.section.reflect',
  'worksheet.l4.reflect',
  'worksheet.section.diary',
  'worksheet.l4.diary',
  'worksheet.l4.compare',
  'worksheet.l4.further',
] as const

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

export function worksheetIsHeritage(
  lessonId: WorksheetLessonId,
): lessonId is (typeof F5_WORKSHEET_LESSON_IDS)[number] {
  return lessonId === 'F5-U3-L1' || lessonId === 'F5-U3-L2' || lessonId === 'F5-U3-L3' || lessonId === 'F5-U3-L4'
}

/** Form 4 activity paper, case card, and download body. Form 5 papers stay cream. */
export type WorksheetPaperBackground = '#FFFFFF' | '#FFF9E9'

export function worksheetPaperBackground(lessonId: WorksheetLessonId): WorksheetPaperBackground {
  return worksheetIsHeritage(lessonId) ? '#FFF9E9' : '#FFFFFF'
}

/** Sample name is only the L3 teacher preview, matching Soft SCOUT plate 08. */
export function worksheetShowsSample(
  lessonId: WorksheetLessonId,
  audience: WorksheetAudience,
  mode: WorksheetMode,
): boolean {
  return lessonId === 'F4-U3-L3' && audience === 'teacher' && mode === 'preview'
}

export type WorksheetBlock = {
  key: string
  lines: boolean
  title: boolean
}

export type WorksheetSection = {
  headingKey: string
  caseCard: boolean
  blocks: readonly WorksheetBlock[]
}

function block(key: string, lines = false, title = false): WorksheetBlock {
  return { key, lines, title }
}

const L3_SECTIONS: readonly WorksheetSection[] = [
  { headingKey: 'worksheet.section.prompt', caseCard: false, blocks: [block('worksheet.l3.prompt', true)] },
  { headingKey: 'worksheet.section.what', caseCard: false, blocks: [block('worksheet.l3.what')] },
  {
    headingKey: 'worksheet.section.cases',
    caseCard: true,
    blocks: [
      block('worksheet.l3.case1.title', false, true),
      block('worksheet.l3.case1.when'),
      block('worksheet.l3.case1.org'),
      block('worksheet.l3.case1.groups'),
      block('worksheet.l3.case1.work'),
      block('worksheet.l3.case1.q', true),
      block('worksheet.l3.case2.title', false, true),
      block('worksheet.l3.case2.who'),
      block('worksheet.l3.case2.when'),
      block('worksheet.l3.case2.items'),
      block('worksheet.l3.case2.org'),
      block('worksheet.l3.case2.q', true),
      block('worksheet.l3.contrast'),
    ],
  },
  { headingKey: 'worksheet.section.compare', caseCard: false, blocks: [block('worksheet.l3.compare', true)] },
  { headingKey: 'worksheet.section.notice', caseCard: false, blocks: [block('worksheet.l3.notice', true)] },
  {
    headingKey: 'worksheet.section.vocab',
    caseCard: false,
    blocks: [
      block('worksheet.l3.vocab.communityArt'),
      block('worksheet.l3.vocab.publicArt'),
      block('worksheet.l3.vocab.participation'),
      block('worksheet.l3.vocab.siteSpecific'),
      block('worksheet.l3.vocab.audience'),
      block('worksheet.l3.vocab.collaboration'),
      block('worksheet.l3.vocab.senseOfPlace'),
    ],
  },
]

const L4_SECTIONS: readonly WorksheetSection[] = [
  { headingKey: 'worksheet.section.sketch', caseCard: false, blocks: [block('worksheet.l4.sketch', true)] },
  { headingKey: 'worksheet.section.reflect', caseCard: false, blocks: [block('worksheet.l4.reflect', true)] },
  {
    headingKey: 'worksheet.section.diary',
    caseCard: false,
    blocks: [block('worksheet.l4.diary', true), block('worksheet.l4.compare', true), block('worksheet.l4.further', true)],
  },
]

export function worksheetForm4Sections(lessonId: 'F4-U3-L3' | 'F4-U3-L4'): readonly WorksheetSection[] {
  return lessonId === 'F4-U3-L3' ? L3_SECTIONS : L4_SECTIONS
}

/** Locked case copy on the L3 paper. L4 does not repeat the case text. Same lines for both audiences. */
export function worksheetCaseLines(
  lessonId: WorksheetLessonId,
  audience: WorksheetAudience,
  text: (key: string) => string,
): string[] {
  if (worksheetIsHeritage(lessonId) || lessonId !== 'F4-U3-L3') return []
  if (audience !== 'teacher' && audience !== 'student') return []
  const cases = L3_SECTIONS.find((section) => section.caseCard)
  return (cases?.blocks ?? []).map((item) => text(item.key))
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

export function worksheetIntroKey(
  lessonId: WorksheetLessonId,
): 'worksheet.f5.intro' | 'worksheet.l3.intro' | 'worksheet.l4.intro' {
  if (lessonId === 'F4-U3-L3') return 'worksheet.l3.intro'
  if (lessonId === 'F4-U3-L4') return 'worksheet.l4.intro'
  return 'worksheet.f5.intro'
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

/** Same file the lesson toolbar and the homework page download. */
export function worksheetDownloadFor(
  lessonId: WorksheetLessonId,
  lang: string,
  text: (key: string) => string,
): { name: string; html: string } {
  if (lessonId === 'F4-U3-L3' || lessonId === 'F4-U3-L4') {
    return {
      name: worksheetDownloadName(lessonId),
      html: worksheetForm4DownloadHtml({
        lang,
        title: text(worksheetTitleKey(lessonId)),
        intro: text(worksheetIntroKey(lessonId)),
        noSchool: text('worksheet.noSchool'),
        sections: worksheetForm4Sections(lessonId).map((section) => ({
          heading: text(section.headingKey),
          caseCard: section.caseCard,
          blocks: section.blocks.map((item) => ({
            text: text(item.key),
            lines: item.lines,
            title: item.title,
          })),
        })),
        background: worksheetPaperBackground(lessonId),
      }),
    }
  }
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
      background: worksheetPaperBackground(lessonId),
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

/** Printable Form 4 file. White body. No sample name and no school record. */
export function worksheetForm4DownloadHtml(input: {
  lang: string
  title: string
  intro: string
  noSchool: string
  sections: readonly {
    heading: string
    caseCard: boolean
    blocks: readonly { text: string; lines: boolean; title: boolean }[]
  }[]
  background: WorksheetPaperBackground
}): string {
  const sections = input.sections
    .map((section) => {
      const body = section.blocks
        .map((item) => {
          const paragraph = `<p${item.title ? ' class="title"' : ''}>${escapeHtml(item.text)}</p>`
          const lines = item.lines ? '<div class="lines" aria-hidden="true"><hr><hr></div>' : ''
          return paragraph + lines
        })
        .join('')
      const cls = section.caseCard ? ' class="case"' : ''
      return `<section${cls}>
  <h2>${escapeHtml(section.heading)}</h2>
  ${body}
</section>
`
    })
    .join('')
  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.lang)}">
<meta charset="utf-8">
<title>${escapeHtml(input.title)}</title>
<style>
  body { margin: 24px; background: ${input.background}; color: #042f2e; font-family: sans-serif; }
  h1 { font-size: 20px; }
  h2 { font-size: 16px; color: #0D9488; }
  .title { font-weight: 700; }
  .case { background: ${input.background}; border: 2px solid #0D9488; border-radius: 16px; padding: 12px 16px; }
  .lines hr { border: 0; border-bottom: 1px solid #94a3b8; margin: 16px 0; }
</style>
<h1>${escapeHtml(input.title)}</h1>
<p>${escapeHtml(input.intro)}</p>
<p>${escapeHtml(input.noSchool)}</p>
${sections}</html>
`
}

/** Printable file for the Form 5 paper. No sample name and no school record. */
export function worksheetDownloadHtml(input: {
  lang: string
  title: string
  intro: string
  noSchool: string
  caseHeading: string
  caseLines: readonly string[]
  questionsHeading: string
  questions: readonly string[]
  background: WorksheetPaperBackground
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
  body { margin: 24px; background: ${input.background}; color: #042f2e; font-family: sans-serif; }
  h1 { font-size: 20px; }
  .case { background: ${input.background}; border: 2px solid #0D9488; border-radius: 16px; padding: 12px 16px; }
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
