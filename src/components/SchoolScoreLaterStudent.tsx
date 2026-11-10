import { useId } from 'react'
import { useT } from '../i18n'
import { FORMATIVE_AI_COMMENT_PLATES } from '../lib/formativeAiCommentScout'
import { schoolBandRows } from '../lib/schoolScore'
import {
  DUAL_CHARTS,
  axisLabelKey,
  dualBandMapRows,
  formatFormative,
} from '../lib/schoolScoreDual'
import { SCHOOL_SCORE_LATER_PLATES, aiReferenceFormative } from '../lib/schoolScoreLater'
import { useSchoolScoreLater } from '../lib/useSchoolScoreLater'
import { SchoolScoreDualFigure } from './SchoolScoreDualFigure'

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

function NotFinalPill({ label }: { label: string }) {
  return (
    <span
      data-testid="score-later-not-final"
      className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900"
    >
      {label}
    </span>
  )
}

function bandClass(on: boolean): string {
  return on
    ? 'rounded-full bg-[#0D9488] px-4 py-2 text-sm font-bold text-white'
    : 'rounded-full border border-[#0D9488]/35 bg-white px-3 py-1 text-xs font-semibold text-teal-950'
}

/**
 * Read-only learning-progress reference.
 * An existing approximate band, comment, and AI reference radar show immediately.
 * Students cannot change them. The formal school reference stays on the dual-radar surface.
 */
export function SchoolScoreLaterStudent() {
  const { t } = useT()
  const { draft, previewUrl } = useSchoolScoreLater()
  const headingId = useId()
  const named = useId()
  const rows = schoolBandRows()
  const maps = dualBandMapRows()
  const approx = draft?.approxBand ?? null
  const current = rows.find((row) => row.id === approx)
  const mapRow = maps.find((row) => row.id === approx)
  const showComment = Boolean(draft && draft.aiStatus === 'model' && draft.aiComment)
  const formative = draft ? aiReferenceFormative(draft) : null

  return (
    <section
      data-testid="score-later-student"
      data-readonly="true"
      data-scout-plate={SCHOOL_SCORE_LATER_PLATES.student}
      data-formative-scout={FORMATIVE_AI_COMMENT_PLATES.student}
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

      <p
        role="note"
        data-testid="score-later-not-final-note"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.later.notFinal')}</span>
        {t('score.later.notFinalNote')}
      </p>

      <article className="space-y-3 rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-bold text-slate-900">{t('score.later.aiApprox')}</h4>
          {current ? <NotFinalPill label={t('score.later.notFinal')} /> : null}
        </div>
        {draft && current && formative != null && mapRow ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <PageThumb name={draft.fileName} url={previewUrl} mime={draft.mime} />
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-slate-600">{t('score.later.informalRo')}</p>
                <p
                  data-testid="score-later-student-band"
                  data-band={approx ?? 'unset'}
                  className="text-2xl font-bold text-[#0D9488]"
                >
                  {t(current.label)}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {t('score.later.aboutInformal', { value: formatFormative(formative) })}
                </p>
                <p className="text-sm text-slate-600">{t(mapRow.map)}</p>
              </div>
            </div>
            <ul className="flex flex-wrap gap-1.5" aria-label={t('score.later.aiApprox')}>
              {rows.map((row) => {
                const on = row.id === approx
                return (
                  <li
                    key={row.id}
                    data-testid={`score-later-student-choice-${row.id}`}
                    aria-current={on ? 'true' : undefined}
                    className={bandClass(on)}
                  >
                    {t(row.label)}
                  </li>
                )
              })}
            </ul>
            {draft.aiStatus === 'fallback' ? (
              <p className="text-xs leading-relaxed text-slate-500">{t('score.later.stubNote')}</p>
            ) : null}
          </div>
        ) : (
          <p data-testid="score-later-student-band" data-band="unset" className="text-sm font-semibold text-slate-700">
            {t('score.later.empty')}
          </p>
        )}
      </article>

      <article
        data-testid="score-later-student-comment"
        data-present={showComment ? 'true' : 'false'}
        className="space-y-2 rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-bold text-slate-900">{t('score.later.aiComment')}</h4>
          {showComment ? <NotFinalPill label={t('score.later.notFinal')} /> : null}
        </div>
        {showComment && draft?.aiComment ? (
          <>
            <p className="text-sm text-slate-600">{t('score.later.aiCommentHint')}</p>
            <p className="text-sm leading-relaxed text-slate-800">{draft.aiComment}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-700">{t('score.dual.unset')}</p>
        )}
      </article>

      <article
        data-testid="score-later-ai-radar"
        data-readonly="true"
        data-band={approx ?? 'unset'}
        data-value={formative ?? 'unset'}
        className="space-y-3 rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-bold text-slate-900">{t('score.later.aiRadar')}</h4>
          {formative != null ? <NotFinalPill label={t('score.later.notFinal')} /> : null}
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{t('score.later.aiRadarHint')}</p>
        {draft && formative != null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {DUAL_CHARTS.map((chart) => (
              <div key={chart.id} data-testid={`score-later-ai-chart-${chart.id}`}>
                <h5 className="text-center text-base font-bold text-[#0D9488]">{t(chart.title)}</h5>
                <SchoolScoreDualFigure
                  chartId={`ai-${chart.id}`}
                  labels={chart.axes.map((id) => t(axisLabelKey(id)))}
                  values={chart.axes.map(() => formative)}
                  drawLabels={false}
                />
                <ul className="space-y-1">
                  {chart.axes.map((id) => (
                    <li
                      key={id}
                      data-testid={`score-later-ai-axis-${id}`}
                      data-value={formative}
                      className="text-sm leading-relaxed text-slate-800"
                    >
                      <span className="font-semibold">{t(axisLabelKey(id))}</span>
                      <span className="text-slate-600"> {formatFormative(formative)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-700">{t('score.dual.unset')}</p>
        )}
      </article>

      <button
        type="button"
        disabled
        data-testid="score-later-student-lock"
        className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
      >
        {t('score.later.cannotEdit')}
      </button>

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
