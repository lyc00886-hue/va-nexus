import { useId } from 'react'
import { useT } from '../i18n'
import { schoolBandRows } from '../lib/schoolScore'
import { formatFormative, formativeForBand } from '../lib/schoolScoreDual'
import { SCHOOL_SCORE_LATER_PLATES, laterPending, studentVisibleBand } from '../lib/schoolScoreLater'
import { useSchoolScoreLater } from '../lib/useSchoolScoreLater'

function PageThumb({ name, url, mime }: { name: string; url: string | null; mime: string }) {
  const image = Boolean(url && mime.startsWith('image/'))
  return (
    <div className="flex h-28 w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-[#0D9488]/30 bg-[#f4fbfa] p-2">
      {image && url ? (
        <img src={url} alt="" className="h-full w-full rounded-md object-cover" />
      ) : (
        <svg viewBox="0 0 64 72" aria-hidden="true" className="h-16 w-12 text-[#0D9488]">
          <rect x="8" y="6" width="48" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 22h32M16 32h32M16 42h24" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
      <span className="sr-only">{name}</span>
    </div>
  )
}

/**
 * Read-only learning-progress reference for an uploaded page.
 * Students cannot change the approximate band or the teacher adjust.
 */
export function SchoolScoreLaterStudent() {
  const { t } = useT()
  const { draft, previewUrl } = useSchoolScoreLater()
  const headingId = useId()
  const named = useId()
  const rows = schoolBandRows()
  const pending = draft ? laterPending(draft) : false
  const visible = draft ? studentVisibleBand(draft) : null
  const current = rows.find((row) => row.id === visible)

  return (
    <section
      data-testid="score-later-student"
      data-readonly="true"
      data-scout-plate={SCHOOL_SCORE_LATER_PLATES.student}
      aria-labelledby={headingId}
      className="space-y-4 border-t border-[#0D9488]/20 pt-4"
    >
      <div>
        <h3 id={headingId} className="text-xl font-bold text-slate-900">
          {t('score.later.studentRo')}
        </h3>
        <p className="mt-1 text-sm font-semibold text-[#0D9488]">{t('score.later.studentSub')}</p>
      </div>

      <p
        role="status"
        className="rounded-2xl border border-[#0D9488]/30 bg-[#e7f7f5] px-4 py-3 text-sm font-semibold leading-relaxed text-teal-950"
      >
        {t('score.dual.replaceSelfKeep')}
      </p>

      <p
        role="note"
        data-testid="score-later-disclaimer"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.disclaimerLabel')}</span>
        {t('score.later.disclaimer')}
      </p>

      <div className="rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4">
        {draft && current ? (
          <div className="space-y-3">
            {pending ? (
              <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
                {t('score.later.pending')}
              </p>
            ) : (
              <p className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-xs font-bold text-white">
                {t('score.later.written')}
              </p>
            )}
            <p className="text-base font-bold text-slate-900">
              {pending ? t('score.later.submitted') : t('score.later.prevail')}
            </p>
            <div className="flex gap-3">
              <PageThumb name={draft.fileName} url={previewUrl} mime={draft.mime} />
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-slate-600">{t('score.later.informalRo')}</p>
                <p
                  data-testid="score-later-student-band"
                  data-band={visible ?? 'unset'}
                  className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600"
                >
                  {t(current.label)}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {t('score.later.aboutInformal', { value: formatFormative(formativeForBand(current.id)) })}
                </p>
                <p className="text-sm font-semibold text-[#0D9488]">{t('score.later.prevail')}</p>
              </div>
            </div>
          </div>
        ) : (
          <p data-testid="score-later-student-band" data-band="unset" className="text-sm font-semibold text-slate-700">
            {t('score.later.empty')}
          </p>
        )}
        <button
          type="button"
          disabled
          data-testid="score-later-student-lock"
          className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
        >
          {t('score.later.cannotEdit')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold">{t('score.later.draftPill')}</span>
        <span>{t('score.later.draftPath')}</span>
      </div>

      <p
        role="note"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.hintLabel')}</span>
        {t('score.later.studentHint')}
      </p>

      <p id={named} className="text-center text-xs text-slate-500">
        {t('island.chip.sba')} · {t('island.chip.exam')} · {t('atlas.card.compare.title')}
      </p>
    </section>
  )
}
