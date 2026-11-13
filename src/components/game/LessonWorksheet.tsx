import { useState } from 'react'
import { flushSync } from 'react-dom'
import {
  worksheetCaseLines,
  worksheetDownloadHtml,
  worksheetDownloadName,
  worksheetLessonOf,
  worksheetQuestions,
  worksheetShowsSample,
  WORKSHEET_SAMPLE_LABEL,
  type WorksheetAudience,
  type WorksheetMode,
} from '../../game/lessonWorksheet'
import { getLocale, HTML_LANG, t, type MessageKey } from '../../i18n'
import { useStaffRole } from '../../lib/useStaffRole'

const MODES = [
  { id: 'preview', label: 'worksheet.preview' },
  { id: 'print', label: 'worksheet.print' },
  { id: 'download', label: 'worksheet.download' },
] as const satisfies readonly { id: WorksheetMode; label: MessageKey }[]

function copy(key: string): string {
  return t(key as MessageKey)
}

/**
 * Thin activity paper on the two November community-art lessons.
 * Teachers get preview, print, and download. Students get the paper only.
 */
export function LessonWorksheet({ lessonId }: { lessonId: string }) {
  const role = useStaffRole()
  const [mode, setMode] = useState<WorksheetMode>('preview')
  const [seen, setSeen] = useState(lessonId)
  if (seen !== lessonId) {
    setSeen(lessonId)
    setMode('preview')
  }
  const lesson = worksheetLessonOf(lessonId)
  if (!lesson) return null

  const audience: WorksheetAudience = role ? 'teacher' : 'student'
  const titleKey = lesson === 'F4-U3-L3' ? 'worksheet.l3.title' : 'worksheet.l4.title'
  const caseLines = worksheetCaseLines(lesson, audience, copy)
  const questions = worksheetQuestions(lesson, copy)
  const sample = worksheetShowsSample(lesson, audience, mode)

  function downloadPaper() {
    const html = worksheetDownloadHtml({
      lang: HTML_LANG[getLocale()],
      title: t(titleKey),
      intro: t('worksheet.intro'),
      noSchool: t('worksheet.noSchool'),
      caseHeading: t('worksheet.section.case'),
      caseLines: worksheetCaseLines(lesson!, 'teacher', copy),
      questionsHeading: t('worksheet.section.questions'),
      questions: worksheetQuestions(lesson!, copy),
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = worksheetDownloadName(lesson!)
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function choose(next: WorksheetMode) {
    if (next === 'print') {
      flushSync(() => setMode('print'))
      window.print()
      return
    }
    if (next === 'download') {
      setMode('download')
      downloadPaper()
      return
    }
    setMode('preview')
  }

  return (
    <section
      data-lesson-worksheet={lesson}
      data-worksheet-audience={audience}
      data-worksheet-mode={audience === 'teacher' ? mode : 'paper'}
      className="space-y-3"
    >
      {audience === 'teacher' ? (
        <div data-worksheet-toolbar className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">{t('worksheet.title')}</h3>
          <div role="group" aria-label={t('worksheet.title')} className="flex flex-wrap gap-2">
            {MODES.map((item) => {
              const selected = mode === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  data-worksheet-action={item.id}
                  data-selected={selected ? 'true' : 'false'}
                  aria-pressed={selected}
                  onClick={() => choose(item.id)}
                  className={
                    selected
                      ? 'min-h-9 rounded-full border border-[#0D9488] bg-[#0D9488] px-4 py-1 text-sm font-semibold text-[#FFF9E9]'
                      : 'min-h-9 rounded-full border border-[#0D9488] bg-white px-4 py-1 text-sm font-semibold text-[#0D9488]'
                  }
                >
                  {t(item.label)}
                </button>
              )
            })}
          </div>
          <p className="text-sm text-slate-600">{t('worksheet.printHint')}</p>
        </div>
      ) : null}
      <article
        data-testid="worksheet-paper"
        data-worksheet-paper=""
        data-worksheet-open="true"
        className="space-y-4 rounded-3xl bg-[#FFF9E9] px-4 py-4 text-slate-900"
      >
        <h3 className="text-base font-bold leading-snug">{t(titleKey)}</h3>
        <p className="text-sm leading-relaxed text-slate-700">{t('worksheet.intro')}</p>
        <p className="text-sm leading-relaxed text-slate-700">{t('worksheet.noSchool')}</p>
        {sample ? (
          <div data-worksheet-sample>
            <p className="text-sm text-slate-600">{t('worksheet.sampleNote')}</p>
            <p data-testid="worksheet-sample-label" className="mt-1 text-sm font-semibold">
              {WORKSHEET_SAMPLE_LABEL}
            </p>
          </div>
        ) : null}
        <section
          data-worksheet-case={lesson === 'F4-U3-L3' ? 'hill' : 'deepfood'}
          className="space-y-1 rounded-2xl border-2 border-[#0D9488] bg-[#FFF9E9] px-4 py-3 text-sm leading-relaxed"
        >
          <h4 className="font-bold text-[#0D9488]">{t('worksheet.section.case')}</h4>
          {caseLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
        <div data-worksheet-questions>
          <h4 className="font-bold text-[#0D9488]">{t('worksheet.section.questions')}</h4>
          <ol className="mt-2 list-decimal space-y-4 pl-5 text-sm leading-relaxed">
            {questions.map((question) => (
              <li key={question}>
                <p>{question}</p>
                <div data-worksheet-answer className="mt-3 space-y-3" aria-hidden="true">
                  <div className="h-6 border-b border-slate-400" />
                  <div className="h-6 border-b border-slate-400" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </article>
    </section>
  )
}
