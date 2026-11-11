import { useId, useState } from 'react'
import { useT } from '../i18n'
import { FORMATIVE_AI_COMMENT_PLATES } from '../lib/formativeAiCommentScout'
import { schoolBandRows } from '../lib/schoolScore'
import {
  DUAL_CHARTS,
  axisLabelKey,
  dualBandMapRows,
  formatFormative,
  type DualAxisId,
} from '../lib/schoolScoreDual'
import { scoreFoldLaterHasResults, useScoreFold } from '../lib/scoreFold'
import { SCHOOL_SCORE_LATER_PLATES, aiReferenceFormative, type LaterDraft } from '../lib/schoolScoreLater'
import { acceptLaterFiles, useSchoolScoreLater } from '../lib/useSchoolScoreLater'
import { SchoolScoreDualFigure } from './SchoolScoreDualFigure'
import { ScoreFold } from './ScoreFold'

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

function uploadNames(draft: LaterDraft | null): string[] {
  if (!draft) return []
  const names = draft.pages.map((page) => page.fileName)
  if (!names.includes(draft.fileName)) names.unshift(draft.fileName)
  return names
}

function LaterUpload({
  draft,
  rejected,
  onFiles,
}: {
  draft: LaterDraft | null
  rejected: boolean
  onFiles: (files: File[]) => void
}) {
  const { t } = useT()
  const inputId = useId()
  const names = uploadNames(draft)
  return (
    <div data-testid="score-later-student-upload" className="space-y-3 rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="rounded-full border border-[#0D9488]/40 bg-[#f4fbfa] px-3 py-1 text-xs font-semibold text-[#0D9488]">
          {t('score.later.draftPill')}
        </span>
        <span>{t('score.later.draftPath')}</span>
      </div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          onFiles(Array.from(event.dataTransfer.files ?? []))
        }}
        className="relative block cursor-pointer rounded-2xl border border-dashed border-[#0D9488]/50 bg-[#f4fbfa] px-4 py-6 text-center"
      >
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          multiple
          data-testid="score-later-student-file"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            onFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
        <span className="pointer-events-none flex flex-col items-center gap-2">
          <span className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-bold text-white">{t('score.later.upload')}</span>
          <span className="text-sm font-semibold text-[#0D9488]">{t('score.later.dropHint')}</span>
          <span className="text-xs text-slate-500">{t('score.later.dropNote')}</span>
        </span>
      </label>
      {names.length > 0 ? (
        <ul className="flex flex-wrap gap-2" data-testid="score-later-student-files">
          {names.map((name) => (
            <li key={name} className="rounded-full bg-[#d7f3ef] px-3 py-1 text-xs font-semibold text-teal-950">
              <span className="sr-only">{t('score.later.uploaded')}</span>
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      <p role="status" data-testid="score-later-student-file-status" className="min-h-5 text-sm text-slate-600">
        {rejected ? t('score.later.fileReject') : ''}
      </p>
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

function AiReferenceChart({
  chart,
  formative,
  testId,
}: {
  chart: (typeof DUAL_CHARTS)[number]
  formative: number
  testId: 'score-later-ai-chart-artwork' | 'score-later-ai-chart-research_workbook'
}) {
  const { t } = useT()
  return (
    <div data-testid={testId} data-axes={chart.axes.length}>
      <h5 className="text-center text-base font-bold text-[#0D9488]">{t(chart.title)}</h5>
      <SchoolScoreDualFigure
        chartId={`ai-${chart.id}`}
        labels={chart.axes.map((id) => t(axisLabelKey(id)))}
        values={chart.axes.map(() => formative)}
        drawLabels={false}
      />
      <ul className="space-y-1">
        {chart.axes.map((id: DualAxisId) => (
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
  )
}

/**
 * Read-only learning-progress reference.
 * An existing approximate band, comment, and both AI reference radars show immediately.
 * Students cannot change them. The formal school dual radar stays on the staff surface.
 */
export function SchoolScoreLaterStudent() {
  const { t } = useT()
  const { draft, previewUrl } = useSchoolScoreLater()
  const [rejected, setRejected] = useState(false)
  const headingId = useId()
  const named = useId()
  const rows = schoolBandRows()
  const maps = dualBandMapRows()
  const approx = draft?.approxBand ?? null
  const current = rows.find((row) => row.id === approx)
  const mapRow = maps.find((row) => row.id === approx)
  const showComment = Boolean(draft && draft.aiStatus === 'model' && draft.aiComment)
  const formative = draft ? aiReferenceFormative(draft) : null
  const artworkChart = DUAL_CHARTS.find((chart) => chart.id === 'artwork')
  const workbookChart = DUAL_CHARTS.find((chart) => chart.id === 'research_workbook')
  const hasLater = scoreFoldLaterHasResults({
    approxBand: draft?.approxBand ?? null,
    comment: showComment ? (draft?.aiComment ?? null) : null,
    radarDrawable: Boolean(draft && formative != null && artworkChart && workbookChart),
  })
  const laterFold = useScoreFold(hasLater)

  return (
    <section
      data-testid="score-later-student"
      data-readonly="true"
      data-scout-plate={SCHOOL_SCORE_LATER_PLATES.student}
      data-formative-scout={FORMATIVE_AI_COMMENT_PLATES.student}
      className="space-y-4 border-t border-[#0D9488]/20 pt-4"
    >
      <LaterUpload
        draft={draft}
        rejected={rejected}
        onFiles={(files) => {
          if (files.length === 0) return
          setRejected(!acceptLaterFiles(files))
        }}
      />
      <ScoreFold
        testId="score-fold-later"
        level="h4"
        open={laterFold.open}
        manual={laterFold.manual}
        hasResults={hasLater}
        onToggle={laterFold.toggle}
        titles={[t('score.later.aiApprox'), t('score.later.aiComment'), t('score.later.aiRadar')]}
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
        {draft && formative != null && artworkChart && workbookChart ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <AiReferenceChart chart={artworkChart} formative={formative} testId="score-later-ai-chart-artwork" />
            <AiReferenceChart
              chart={workbookChart}
              formative={formative}
              testId="score-later-ai-chart-research_workbook"
            />
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

      <p
        role="note"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.hintLabel')}</span>
        {t('score.later.studentHint')}
      </p>

      </ScoreFold>
      <p id={named} className="text-center text-xs text-slate-500">
        {t('island.chip.sba')} · {t('island.chip.exam')} · {t('atlas.card.compare.title')}
      </p>
    </section>
  )
}
