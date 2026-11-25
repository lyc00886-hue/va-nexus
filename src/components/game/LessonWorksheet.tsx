import { useState } from 'react'
import { flushSync } from 'react-dom'
import {
  F5_WORKSHEET_QUESTION_KEYS,
  worksheetDownloadFor,
  worksheetForm4Sections,
  worksheetIntroKey,
  worksheetIsHeritage,
  worksheetLessonOf,
  worksheetQuestionsHeadingKey,
  worksheetShowsSample,
  worksheetTitleKey,
  WORKSHEET_SAMPLE_LABEL,
  type WorksheetAudience,
  type WorksheetMode,
} from '../../game/lessonWorksheet'
import { getLocale, HTML_LANG, t, type MessageKey } from '../../i18n'
import { useStaffRole } from '../../lib/useStaffRole'
import { BiKey } from './BilingualText'

const MODES = [
  { id: 'preview', label: 'worksheet.preview' },
  { id: 'print', label: 'worksheet.print' },
  { id: 'download', label: 'worksheet.download' },
] as const satisfies readonly { id: WorksheetMode; label: MessageKey }[]

function copy(key: string): string {
  return t(key as MessageKey)
}

/**
 * Classroom activity paper.
 * Form 4 lessons follow the locked community-art paper. Form 5 heritage lessons share one unit paper.
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
  const titleKey = worksheetTitleKey(lesson)
  const introKey = worksheetIntroKey(lesson)
  const heritage = worksheetIsHeritage(lesson)
  const sample = worksheetShowsSample(lesson, audience, mode)
  const form4Sections = heritage ? [] : worksheetForm4Sections(lesson)

  function downloadPaper() {
    const file = worksheetDownloadFor(lesson!, HTML_LANG[getLocale()], copy)
    const blob = new Blob([file.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
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
          <h3 id={`worksheet-toolbar-${lesson}`} className="text-lg font-bold text-slate-900">
            <BiKey name="worksheet.title" />
          </h3>
          <div role="group" aria-labelledby={`worksheet-toolbar-${lesson}`} className="flex flex-wrap gap-2">
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
                      ? 'inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-[#0D9488] px-4 py-1.5 text-left text-sm font-semibold text-[#FFF9E9]'
                      : 'inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-white px-4 py-1.5 text-left text-sm font-semibold text-[#0D9488]'
                  }
                >
                  <BiKey name={item.label} />
                </button>
              )
            })}
          </div>
          <p className="text-sm text-slate-600">
            <BiKey name="worksheet.printHint" />
          </p>
        </div>
      ) : null}
      <article
        data-testid="worksheet-paper"
        data-worksheet-paper=""
        data-worksheet-open="true"
        className={`space-y-4 rounded-3xl px-4 py-4 text-slate-900 ${heritage ? 'bg-[#FFF9E9]' : 'bg-[#FFFFFF]'}`}
      >
        <h3 className="text-base font-bold leading-snug">
          <BiKey name={titleKey} />
        </h3>
        <p className="text-sm leading-relaxed text-slate-700">
          <BiKey name={introKey} />
        </p>
        <p className="text-sm leading-relaxed text-slate-700">
          <BiKey name="worksheet.noSchool" />
        </p>
        {sample ? (
          <div data-worksheet-sample>
            <p className="text-sm text-slate-600">
              <BiKey name="worksheet.sampleNote" />
            </p>
            <p data-testid="worksheet-sample-label" className="mt-1 text-sm font-semibold">
              {WORKSHEET_SAMPLE_LABEL}
            </p>
          </div>
        ) : null}
        {heritage ? (
          <div data-worksheet-questions>
            <h4 className="font-bold text-[#0D9488]">
              <BiKey name={worksheetQuestionsHeadingKey(lesson)} />
            </h4>
            <ol className="mt-2 list-decimal space-y-4 pl-5 text-sm leading-relaxed">
              {F5_WORKSHEET_QUESTION_KEYS.map((key) => (
                <li key={key}>
                  <p>
                    <BiKey name={key} />
                  </p>
                  <div data-worksheet-answer className="mt-3 space-y-3" aria-hidden="true">
                    <div className="h-6 border-b border-slate-400" />
                    <div className="h-6 border-b border-slate-400" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          form4Sections.map((section) => (
            <section
              key={section.headingKey}
              data-worksheet-section={section.headingKey}
              data-worksheet-case={section.caseCard ? 'community-art' : undefined}
              className={
                section.caseCard
                  ? 'space-y-2 rounded-2xl border-2 border-[#0D9488] bg-[#FFFFFF] px-4 py-3 text-sm leading-relaxed'
                  : 'space-y-2 text-sm leading-relaxed'
              }
            >
              <h4 className="font-bold text-[#0D9488]">
                <BiKey name={section.headingKey as MessageKey} />
              </h4>
              {section.blocks.map((item) => (
                <div key={item.key} data-worksheet-block={item.key}>
                  <p className={item.title ? 'font-semibold text-slate-900' : undefined}>
                    <BiKey name={item.key as MessageKey} />
                  </p>
                  {item.lines ? (
                    <div data-worksheet-answer className="mt-3 space-y-3" aria-hidden="true">
                      <div className="h-6 border-b border-slate-400" />
                      <div className="h-6 border-b border-slate-400" />
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          ))
        )}
      </article>
    </section>
  )
}
