import { useId, useState } from 'react'
import { useT } from '../i18n'
import { FORMATIVE_AI_COMMENT_PLATES } from '../lib/formativeAiCommentScout'
import { schoolBandRows } from '../lib/schoolScore'
import {
  DUAL_CHARTS,
  axisLabelKey,
  bandForFormative,
  dualBandMapRows,
  formatFormative,
  type DualAxisId,
} from '../lib/schoolScoreDual'
import { scoreFoldLaterHasResults, useScoreFold } from '../lib/scoreFold'
import {
  SCHOOL_SCORE_LATER_PLATES,
  aiReferenceAxes,
  aiReferenceFormative,
  studentVisibleBand,
  type LaterDraft,
} from '../lib/schoolScoreLater'
import { acceptLaterFiles, requestLaterComment, useSchoolScoreLater, type LaterPagePreview } from '../lib/useSchoolScoreLater'
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
  previews,
  pale,
  rejected,
  onFiles,
}: {
  draft: LaterDraft | null
  previews: LaterPagePreview[]
  pale: boolean
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
          accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp,.gif"
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
      {previews.length > 0 ? (
        <div data-testid="score-later-student-previews" className={`flex flex-wrap gap-3 ${pale ? 'opacity-60' : ''}`}>
          {previews.map((page) => (
            <PageThumb key={`${page.side}-${page.fileName}`} name={page.fileName} url={page.url} mime={page.mime} />
          ))}
        </div>
      ) : null}
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

function formatAiReadout(value: number): string {
  return formatFormative(value).replace('/', '／')
}

function AiReferenceChart({
  chart,
  values,
  testId,
}: {
  chart: (typeof DUAL_CHARTS)[number]
  values: number[]
  testId: 'score-later-ai-chart-artwork' | 'score-later-ai-chart-research_workbook'
}) {
  const { t } = useT()
  const rows = schoolBandRows()
  return (
    <div data-testid={testId} data-axes={chart.axes.length}>
      <h5 className="text-center text-base font-bold text-[#0D9488]">{t(chart.title)}</h5>
      <SchoolScoreDualFigure
        chartId={`ai-${chart.id}`}
        labels={chart.axes.map((id) => t(axisLabelKey(id)))}
        values={values}
        drawLabels={false}
      />
      <ul className="space-y-1">
        {chart.axes.map((id: DualAxisId, index) => {
          const value = values[index]
          const band = rows.find((row) => row.id === bandForFormative(value))
          return (
            <li
              key={id}
              data-testid={`score-later-ai-axis-${id}`}
              data-value={value}
              className="text-sm leading-relaxed text-slate-800"
            >
              <span className="block font-semibold">{t(axisLabelKey(id))}</span>
              <span className="text-slate-600">
                {formatAiReadout(value)}
                {band ? ` · ${t(band.label)}` : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Read-only learning-progress reference.
 * A successful upload starts the unofficial comment, band, and per-axis request.
 * Those appear only after a model result read from the uploaded pages.
 * Students cannot change them.
 * The formal school dual radar stays on the staff surface.
 */
export function SchoolScoreLaterStudent() {
  const { locale, t } = useT()
  const { draft, pagePreviews } = useSchoolScoreLater()
  const [rejected, setRejected] = useState(false)
  const headingId = useId()
  const named = useId()
  const rows = schoolBandRows()
  const maps = dualBandMapRows()
  const approx = draft ? studentVisibleBand(draft) : null
  const current = rows.find((row) => row.id === approx)
  const mapRow = maps.find((row) => row.id === approx)
  const showComment = Boolean(draft && draft.aiStatus === 'model' && draft.aiComment)
  const formative = draft ? aiReferenceFormative(draft) : null
  const artworkChart = DUAL_CHARTS.find((chart) => chart.id === 'artwork')
  const workbookChart = DUAL_CHARTS.find((chart) => chart.id === 'research_workbook')
  const previews = [...pagePreviews].sort((a, b) => (a.side === b.side ? 0 : a.side === 'artwork' ? -1 : 1))
  const artworkValues = draft && artworkChart ? aiReferenceAxes(draft, artworkChart.axes) : null
  const workbookValues = draft && workbookChart ? aiReferenceAxes(draft, workbookChart.axes) : null
  const radarDrawable = Boolean(artworkValues || workbookValues)
  const hasLater = scoreFoldLaterHasResults({
    approxBand: approx,
    comment: showComment ? (draft?.aiComment ?? null) : null,
    radarDrawable,
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
        previews={previews}
        pale={draft?.aiStatus !== 'model'}
        rejected={rejected}
        onFiles={(files) => {
          if (files.length === 0) return
          const accepted = acceptLaterFiles(files)
          setRejected(!accepted)
          if (accepted) void requestLaterComment(locale, false)
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
          <NotFinalPill label={t('score.later.notFinal')} />
        </div>
        {draft && current && formative != null && mapRow ? (
          <div className="space-y-3">
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
          </div>
        ) : (
          <p
            data-testid="score-later-student-band"
            data-band="unset"
            className="text-sm font-semibold text-slate-500"
          >
            {draft ? t('score.dual.unset') : t('score.later.empty')}
          </p>
        )}
        <button
          type="button"
          disabled
          data-testid="score-later-student-lock"
          className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
        >
          {t('score.later.cannotEdit')}
        </button>
      </article>

      <article
        data-testid="score-later-student-comment"
        data-present={showComment ? 'true' : 'false'}
        className="space-y-2 rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-bold text-slate-900">{t('score.later.aiComment')}</h4>
          <NotFinalPill label={t('score.later.notFinal')} />
        </div>
        {showComment && draft?.aiComment ? (
          <>
            <p className="text-sm text-slate-600">{t('score.later.aiCommentHint')}</p>
            <p className="text-sm leading-relaxed text-slate-800">{draft.aiComment}</p>
          </>
        ) : draft?.aiStatus === 'unsent' ? (
          <p data-testid="score-later-file-not-sent" className="text-sm leading-relaxed text-slate-500">
            {t('score.later.fileNotSent')}
          </p>
        ) : draft?.aiStatus === 'fallback' ? (
          <p data-testid="score-later-student-unavailable" className="text-sm leading-relaxed text-slate-500">
            {t('score.later.aiUnavailable')}
          </p>
        ) : (
          <p className="text-sm font-semibold text-slate-500">{t('score.dual.unset')}</p>
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
          <NotFinalPill label={t('score.later.notFinal')} />
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{t('score.later.aiRadarHint')}</p>
        {radarDrawable && artworkChart && workbookChart ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {artworkValues ? (
              <AiReferenceChart chart={artworkChart} values={artworkValues} testId="score-later-ai-chart-artwork" />
            ) : null}
            {workbookValues ? (
              <AiReferenceChart
                chart={workbookChart}
                values={workbookValues}
                testId="score-later-ai-chart-research_workbook"
              />
            ) : null}
          </div>
        ) : null}
        {draft?.aiStatus !== 'unsent' && (!artworkValues || !workbookValues) ? (
          <p data-testid="score-later-radar-pending" className="text-sm leading-relaxed text-slate-500">
            {t('score.later.radarPending')}
          </p>
        ) : null}
      </article>

      {draft && draft.aiStatus !== 'model' && draft.aiStatus !== 'unsent' ? (
        <p data-testid="score-later-stub-note" className="text-xs leading-relaxed text-slate-500">
          {t('score.later.stubNote')}
        </p>
      ) : null}

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
