import { useId } from 'react'
import { useT } from '../i18n'
import {
  DUAL_CHARTS,
  DUAL_RADAR_PLATES,
  axisShortKey,
  dualChartValues,
  dualHasValue,
  formatFormative,
} from '../lib/schoolScoreDual'
import { useSchoolScoreDual } from '../lib/useSchoolScoreDual'
import { SchoolScoreDualFigure } from './SchoolScoreDualFigure'

/**
 * Read-only dual radar on the learning-progress surface.
 * Students cannot set a value. An empty store draws the blank chart.
 */
export function SchoolScoreDualStudent() {
  const { t } = useT()
  const store = useSchoolScoreDual()
  const headingId = useId()
  const chartsId = useId()
  const named = useId()
  const filled = dualHasValue(store)

  return (
    <section
      data-testid="score-dual-student"
      data-readonly="true"
      data-scout-plate={DUAL_RADAR_PLATES.student}
      aria-labelledby={headingId}
      className="space-y-4 border-t border-[#0D9488]/20 pt-4"
    >
      <h3 id={headingId} className="sr-only">
        {t('score.dual.studentSurface')}
      </h3>
      <p
        data-testid="score-dual-not-final"
        className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900"
      >
        {t('score.later.notFinal')}
      </p>
      <p
        role="status"
        data-testid="score-dual-keep"
        className="rounded-2xl border border-[#0D9488]/30 bg-[#e7f7f5] px-4 py-3 text-sm font-semibold leading-relaxed text-teal-950"
      >
        {t('score.dual.replaceSelfKeep')}
      </p>
      <p className="text-sm font-semibold text-[#0D9488]">{t('score.dual.studentReadOnly')}</p>
      <p
        role="note"
        data-testid="score-dual-student-disclaimer"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.disclaimerLabel')}</span>
        {t('score.dual.disclaimer')}
      </p>

      <div>
        <h4 id={chartsId} className="text-sm font-bold text-[#0D9488]">
          {t('score.dual.readonlyNote')}
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {DUAL_CHARTS.map((chart) => {
            const values = dualChartValues(store, chart.axes)
            return (
              <article
                key={chart.id}
                data-testid={`score-dual-student-chart-${chart.id}`}
                data-axes={chart.axes.length}
                className="rounded-2xl border border-[#0D9488]/35 bg-white px-3 py-4"
              >
                <h5 className="text-center text-base font-bold text-[#0D9488]">{t(chart.title)}</h5>
                <p className="text-center text-xs text-slate-500">{t(chart.axesNote)}</p>
                <SchoolScoreDualFigure
                  chartId={chart.id}
                  labels={chart.axes.map((id) => t(axisShortKey(id)))}
                  values={values}
                />
                <button
                  type="button"
                  disabled
                  data-testid={`score-dual-lock-${chart.id}`}
                  className="mx-auto mt-2 block rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
                >
                  {t('score.dual.cannotEdit')}
                </button>
                <ul className="sr-only">
                  {chart.axes.map((id, index) => {
                    const value = values[index]
                    return (
                      <li key={id} data-testid={`score-dual-student-value-${id}`} data-value={value ?? 'unset'}>
                        {t(axisShortKey(id))} {value == null ? t('score.dual.unset') : formatFormative(value)}
                      </li>
                    )
                  })}
                </ul>
              </article>
            )
          })}
        </div>
      </div>

      <div
        data-testid="score-dual-empty"
        data-filled={filled ? 'true' : 'false'}
        className="rounded-2xl border border-[#0D9488]/30 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700"
      >
        <p className="font-semibold text-slate-900">
          {t('score.dual.unset')} {t('score.dual.emptyWhen')}
        </p>
        <p className="mt-1">{t('score.dual.emptyDetail')}</p>
        <p className="mt-1">{t('score.dual.emptyPace')}</p>
      </div>

      <p
        role="note"
        data-testid="score-dual-student-hint"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.hintLabel')}</span>
        {t('score.dual.studentHint')}
      </p>

      <p data-testid="score-dual-name-lock" id={named} className="text-center text-xs text-slate-500">
        {t('island.chip.sba')} · {t('island.chip.exam')} · {t('atlas.card.compare.title')}
      </p>
    </section>
  )
}
