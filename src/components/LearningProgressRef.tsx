import { useId } from 'react'
import { useT } from '../i18n'
import { schoolBandRows, schoolReferenceBand } from '../lib/schoolScore'
import { useTeacherDraftStore } from '../lib/useTeacherDraftStore'

/**
 * Read-only learning-progress reference. Replaces the student 1–4 self-rate line.
 * Students cannot pick a band. An empty store is “no reference yet”, not a missed target.
 */
export function LearningProgressRef({ titleId, compact = false }: { titleId?: string; compact?: boolean }) {
  const { t } = useT()
  const store = useTeacherDraftStore()
  const band = schoolReferenceBand(store)
  const rows = schoolBandRows()
  const current = rows.find((row) => row.id === band)
  const headingId = useId()
  const title = titleId ?? headingId
  const bandsLabelId = useId()

  return (
    <div data-testid="score-student" className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5">
      <div>
        <h2 id={title} className="text-xl font-bold text-slate-900">
          {t('score.v1.studentSurface')}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#0D9488]">{t('score.v1.title')}</p>
      </div>

      <p
        role="status"
        data-testid="score-replace-banner"
        className="rounded-2xl border border-[#0D9488]/30 bg-[#e7f7f5] px-4 py-3 text-sm font-semibold leading-relaxed text-teal-950"
      >
        {t('score.v1.replaceSelf')}
      </p>
      {compact ? null : (
        <p data-testid="score-replace-note" className="text-sm leading-relaxed text-slate-600">
          {t('score.v1.replaceNote')}
        </p>
      )}

      <p
        role="note"
        data-testid="score-student-disclaimer"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.disclaimerLabel')}</span>
        {t('score.v1.disclaimer')}
      </p>

      <section className="rounded-2xl border border-[#0D9488]/40 bg-white px-4 py-3" aria-labelledby={bandsLabelId}>
        <h3 id={bandsLabelId} className="text-sm font-bold text-[#0D9488]">
          {t('score.v1.now')}
        </h3>
        <p
          className="mt-2 text-base font-bold text-slate-900"
          data-testid="score-current"
          data-band={band ?? 'unset'}
        >
          {current ? t(current.label) : t('score.v1.unset')}
        </p>
        <p className="mt-1 text-sm text-slate-600">{t('score.v1.unsetHelp')}</p>
      </section>

      <section aria-labelledby={`${title}-bands`}>
        <h3 id={`${title}-bands`} className="text-sm font-bold text-[#0D9488]">
          {t('score.v1.bandsTitle')}
        </h3>
        <p className="mt-1 text-sm text-slate-600">{t('score.v1.bandsNote')}</p>
        <ul data-readonly="true" className="mt-3 space-y-2">
          {rows.map((row) => {
            const on = band === row.id
            return (
              <li
                key={row.id}
                data-testid={`score-student-band-${row.id}`}
                aria-current={on ? 'true' : undefined}
                className={`rounded-2xl border px-3 py-3 ${
                  on ? 'border-[#0D9488] bg-[#0D9488] text-white' : 'border-[#0D9488]/40 bg-white text-slate-900'
                }`}
              >
                <span className="block font-semibold">
                  {t('score.v1.bandLead')} · {t(row.label)}
                </span>
                <span className={`mt-0.5 block text-sm font-normal ${on ? 'text-white/90' : 'text-slate-600'}`}>
                  {t(row.hint)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <p
        role="note"
        data-testid="score-hint"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.hintLabel')}</span>
        {t('score.v1.hint')}
      </p>
    </div>
  )
}
