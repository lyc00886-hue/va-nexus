import { useId, useState } from 'react'
import { useT } from '../i18n'
import {
  DUAL_CHARTS,
  DUAL_RADAR_PLATES,
  axisLabelKey,
  axisShortKey,
  bandForFormative,
  dualBandMapRows,
  dualChartValues,
  formatFormative,
  formativeForBand,
  parseFormative,
  type DualAxisId,
} from '../lib/schoolScoreDual'
import { saveDualAxis, useSchoolScoreDual } from '../lib/useSchoolScoreDual'
import { SchoolScoreDualFigure } from './SchoolScoreDualFigure'

function AxisEditor({ id, value }: { id: DualAxisId; value: number | null }) {
  const { t } = useT()
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setDraft(value == null ? '' : String(value))
  }
  const label = t(axisLabelKey(id))
  const active = value == null ? null : bandForFormative(value)

  return (
    <div data-testid={`score-dual-axis-${id}`} className="rounded-2xl border border-[#0D9488]/25 bg-white px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          <span className="text-[#0D9488]">{id}</span> {t(axisShortKey(id))}
        </p>
        <p data-testid={`score-dual-value-${id}`} className="text-sm font-bold text-slate-800">
          {value == null ? t('score.dual.unset') : formatFormative(value)}
        </p>
      </div>
      <div role="group" aria-label={label} className="mt-2 flex flex-wrap gap-1.5">
        {dualBandMapRows().map((row) => {
          const on = active === row.id
          return (
            <button
              key={row.id}
              type="button"
              aria-pressed={on}
              data-testid={`score-dual-band-${id}-${row.id}`}
              onClick={() => saveDualAxis(id, formativeForBand(row.id))}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                on ? 'bg-[#0D9488] text-white' : 'bg-[#e7f7f5] text-teal-950'
              }`}
            >
              {t(row.label)}
            </button>
          )
        })}
        <button
          type="button"
          data-testid={`score-dual-clear-${id}`}
          onClick={() => saveDualAxis(id, null)}
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
        >
          {t('score.dual.clearAxis')}
        </button>
      </div>
      <label className="mt-2 block text-xs text-slate-600">
        {t('score.dual.formativeField')}
        <input
          type="number"
          min={0}
          max={5}
          step={0.25}
          inputMode="decimal"
          data-testid={`score-dual-formative-${id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft.trim() === '') {
              saveDualAxis(id, null)
              return
            }
            const parsed = parseFormative(Number(draft))
            if (parsed == null) {
              setDraft(value == null ? '' : String(value))
              return
            }
            saveDualAxis(id, parsed)
          }}
          className="mt-1 w-full rounded-xl border border-[#0D9488]/30 px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
    </div>
  )
}

/** Staff dual radar. Sits beside school-score v1. Scan / estimate stays muted. */
export function SchoolScoreDualStaff() {
  const { t } = useT()
  const store = useSchoolScoreDual()
  const titleId = useId()
  const mapId = useId()
  const lockId = useId()
  const rows = dualBandMapRows()

  return (
    <div
      data-testid="score-dual-staff"
      data-scout-plate={DUAL_RADAR_PLATES.staff}
      data-scout-map={DUAL_RADAR_PLATES.map}
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-6"
    >
      <p className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-xs font-bold text-white">
        {t('score.dual.staffNav')}
      </p>
      <div>
        <h2 id={titleId} className="text-2xl font-bold text-slate-900">
          {t('score.dual.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t('score.dual.staffSub')}</p>
      </div>

      <p
        role="note"
        data-testid="score-dual-disclaimer"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.disclaimerLabel')}</span>
        {t('score.dual.disclaimer')}
      </p>

      <p className="text-sm font-semibold text-[#0D9488]">{t('score.dual.bandSource')}</p>

      <div className="grid gap-3 lg:grid-cols-2">
        {DUAL_CHARTS.map((chart) => {
          const values = dualChartValues(store, chart.axes)
          return (
            <article
              key={chart.id}
              data-testid={`score-dual-chart-${chart.id}`}
              data-axes={chart.axes.length}
              className="rounded-2xl border border-[#0D9488]/35 bg-white px-3 py-4"
            >
              <h3 className="text-center text-base font-bold text-[#0D9488]">{t(chart.title)}</h3>
              <p className="text-center text-xs text-slate-500">{t(chart.axesNote)}</p>
              <SchoolScoreDualFigure
                chartId={chart.id}
                labels={chart.axes.map((id) => t(axisShortKey(id)))}
                values={values}
              />
              <ul className="mt-2 space-y-2">
                {chart.axes.map((id) => (
                  <li key={id}>
                    <AxisEditor id={id} value={store.axes[id] ?? null} />
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>

      <p data-testid="score-dual-value-note" className="rounded-2xl bg-[#e7f7f5] px-4 py-3 text-sm text-teal-950">
        {t('score.dual.valueNote')}
      </p>

      <button
        type="button"
        data-testid="score-dual-later"
        disabled
        className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
      >
        {t('score.v1.later')}
      </button>

      <section aria-labelledby={lockId} data-testid="score-dual-axis-lock">
        <h3 id={lockId} className="text-sm font-bold text-[#0D9488]">
          {t('score.dual.axisLock')}
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {DUAL_CHARTS.flatMap((chart) => chart.axes).map((id) => (
            <li key={id}>
              {id} {t(axisLabelKey(id))}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby={mapId}
        data-testid="score-dual-band-map"
        data-scout-plate={DUAL_RADAR_PLATES.map}
        className="space-y-3"
      >
        <h3 id={mapId} className="text-sm font-bold text-[#0D9488]">
          {t('score.dual.mapTitle')}
        </h3>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              data-testid={`score-dual-map-${row.id}`}
              className="flex items-center gap-3 rounded-2xl border border-[#0D9488]/30 bg-white px-3 py-3"
            >
              <span className="shrink-0 rounded-full bg-[#0D9488] px-3 py-1 text-sm font-bold text-white">
                {t(row.label)}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{t(row.map)}</span>
                <span className="mt-0.5 block text-xs text-slate-600">{t(row.hint)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="rounded-2xl bg-[#e7f7f5] px-4 py-3 text-sm leading-relaxed text-teal-950">{t('score.dual.purpose')}</p>
        <p className="text-sm leading-relaxed text-slate-600">{t('score.dual.handbook')}</p>
        <div className="rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">{t('score.dual.absentTitle')}</p>
          <p className="mt-1">{t('score.dual.absentBody')}</p>
        </div>
      </section>

      <p className="pt-2 text-center text-xs text-slate-500">{t('score.dual.staffFoot')}</p>
    </div>
  )
}
