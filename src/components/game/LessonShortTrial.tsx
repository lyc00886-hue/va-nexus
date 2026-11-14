import { t, type MessageKey } from '../../i18n'
import { showsShortTrial } from '../../game/shortTrial'

const COPY = {
  title: 'trial.title',
  when: 'trial.when',
  do: 'trial.do',
  traceLabel: 'trial.trace.label',
  traceHint: 'trial.trace.hint',
  talkLabel: 'trial.talk.label',
  disclaimer: 'trial.disclaimer',
  noUpload: 'trial.noUpload',
} as const satisfies Record<string, MessageKey>

/**
 * Short in-class trial and talk traces beside the shipped criteria.
 * The fields stay on this page. Nothing is uploaded or scored.
 */
export function LessonShortTrial({ lessonId, index }: { lessonId: string; index: number }) {
  if (!showsShortTrial(lessonId, index)) return null
  const traceHintId = `trial-trace-hint-${lessonId}-${index}`
  return (
    <section
      data-short-trial=""
      data-short-trial-lesson={lessonId}
      data-short-trial-index={index}
      className="mt-3 space-y-2 rounded-2xl border border-[#0D9488]/40 bg-[#FFF9E9] px-3 py-3 text-sm leading-relaxed text-slate-800"
    >
      <h4 className="text-sm font-bold text-[#0D9488]">{t(COPY.title)}</h4>
      <p>{t(COPY.when)}</p>
      <p>{t(COPY.do)}</p>
      <label className="block space-y-1 font-semibold text-slate-800">
        <span>{t(COPY.traceLabel)}</span>
        <span id={traceHintId} className="block text-xs font-normal leading-relaxed text-slate-600">
          {t(COPY.traceHint)}
        </span>
        <textarea
          data-trial-trace=""
          rows={3}
          aria-describedby={traceHintId}
          autoComplete="off"
          className="w-full rounded-xl border border-[#0D9488]/40 bg-white px-3 py-2 text-sm font-normal text-slate-800"
        />
      </label>
      <label className="block space-y-1 font-semibold text-slate-800">
        <span>{t(COPY.talkLabel)}</span>
        <textarea
          data-trial-talk=""
          rows={3}
          autoComplete="off"
          className="w-full rounded-xl border border-[#0D9488]/40 bg-white px-3 py-2 text-sm font-normal text-slate-800"
        />
      </label>
      <p data-trial-disclaimer="">{t(COPY.disclaimer)}</p>
      <p data-trial-no-upload="">{t(COPY.noUpload)}</p>
    </section>
  )
}
