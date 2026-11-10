import { useId, useState } from 'react'
import { useT } from '../i18n'
import { schoolBandRows } from '../lib/schoolScore'
import { SCHOOL_SCORE_LATER_PLATES, effectiveBand, laterPending } from '../lib/schoolScoreLater'
import { formatFormative, formativeForBand } from '../lib/schoolScoreDual'
import { acceptLaterFile, keepLaterAi, setLaterAdjust, useSchoolScoreLater, writeLaterAdjust } from '../lib/useSchoolScoreLater'

function DocIcon() {
  return (
    <svg viewBox="0 0 48 56" aria-hidden="true" className="h-10 w-8 text-[#0D9488]">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M10 4h18l10 10v34a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="2" d="M28 4v12h12" />
    </svg>
  )
}

function bandClass(on: boolean): string {
  return on
    ? 'rounded-full bg-[#0D9488] px-3 py-1 text-xs font-semibold text-white'
    : 'rounded-full border border-[#0D9488]/35 bg-white px-3 py-1 text-xs font-semibold text-teal-950'
}

/**
 * Staff upload, approximate reference band, and teacher adjust.
 * Sits beside school-score v1 and the dual radar. One school. Local draft only.
 */
export function SchoolScoreLaterStaff() {
  const { t } = useT()
  const { draft, previewUrl } = useSchoolScoreLater()
  const [rejected, setRejected] = useState(false)
  const titleId = useId()
  const uploadId = useId()
  const flowId = useId()
  const rulesId = useId()
  const inputId = useId()
  const rows = schoolBandRows()
  const approx = draft?.approxBand ?? null
  const selected = draft ? effectiveBand(draft) : null
  const pending = draft ? laterPending(draft) : false
  const image = Boolean(previewUrl && draft?.mime.startsWith('image/'))

  function take(file: File | undefined) {
    if (!file) return
    const ok = acceptLaterFile(file)
    setRejected(!ok)
  }

  return (
    <div
      data-testid="score-later-staff"
      data-scout-plate={SCHOOL_SCORE_LATER_PLATES.staff}
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-6"
    >
      <p className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-xs font-bold text-white">
        {t('score.later.staffNav')}
      </p>
      <div>
        <h2 id={titleId} className="text-2xl font-bold text-slate-900">
          {t('score.later.upload')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t('score.later.staffSub')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-[#0D9488]/40 bg-white px-3 py-1 text-xs font-semibold text-[#0D9488]">
          {t('score.later.aiApprox')}
        </span>
        <span className="rounded-full border border-[#0D9488]/40 bg-white px-3 py-1 text-xs font-semibold text-[#0D9488]">
          {t('score.later.teacherAdjust')}
        </span>
      </div>

      <p
        role="note"
        data-testid="score-later-disclaimer"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.disclaimerLabel')}</span>
        {t('score.later.disclaimer')}
      </p>

      <section aria-labelledby={uploadId} className="space-y-2">
        <h3 id={uploadId} className="text-sm font-bold text-[#0D9488]">
          {t('score.later.dropHint')}
        </h3>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            take(event.dataTransfer.files?.[0])
          }}
          className="relative block cursor-pointer rounded-2xl border border-dashed border-[#0D9488]/50 bg-white px-4 py-8 text-center"
        >
          <input
            id={inputId}
            type="file"
            accept="image/*,application/pdf"
            data-testid="score-later-upload"
            className="absolute inset-0 cursor-pointer opacity-0"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              take(event.dataTransfer.files?.[0])
            }}
            onChange={(event) => {
              take(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <span className="pointer-events-none flex flex-col items-center gap-2">
            <DocIcon />
            <span className="text-sm font-semibold text-[#0D9488]">{t('score.later.dropHint')}</span>
            <span className="text-xs text-slate-500">{t('score.later.dropNote')}</span>
          </span>
        </label>
        {draft ? (
          <p className="flex items-center gap-3 rounded-2xl bg-[#d7f3ef] px-3 py-2 text-sm text-teal-950">
            {image && previewUrl ? (
              <img src={previewUrl} alt="" className="h-10 w-8 rounded-md object-cover" />
            ) : null}
            <span className="rounded-full bg-[#0D9488] px-2.5 py-1 text-xs font-bold text-white">{t('score.later.uploaded')}</span>
            <span className="min-w-0 truncate font-semibold">{draft.fileName}</span>
          </p>
        ) : null}
        <p role="status" data-testid="score-later-file-status" className="min-h-5 text-sm text-slate-600">
          {rejected ? t('score.later.fileReject') : ''}
        </p>
      </section>

      <section data-testid="score-later-ai-approx" className="space-y-3 rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4">
        <h3 className="text-base font-bold text-slate-900">{t('score.later.aiApprox')}</h3>
        <p className="inline-flex rounded-full border border-[#0D9488]/30 px-3 py-1 text-xs font-semibold text-teal-900">
          {t('score.later.informal')}
        </p>
        {draft ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {rows.map((row) => (
                <span
                  key={row.id}
                  data-testid={`score-later-ai-band-${row.id}`}
                  aria-current={approx === row.id ? 'true' : undefined}
                  className={bandClass(approx === row.id)}
                >
                  {t(row.label)}
                </span>
              ))}
            </div>
            <p className="text-sm font-bold text-[#0D9488]">
              {t('score.later.about', { value: formatFormative(formativeForBand(draft.approxBand)) })}
            </p>
            <p className="text-sm text-slate-600">
              {draft.committedBand == null
                ? t('score.later.aiPendingWrite')
                : pending
                  ? t('score.later.pending')
                  : t('score.later.written')}
            </p>
            <p className="text-xs leading-relaxed text-slate-500">{t('score.later.stubNote')}</p>
          </>
        ) : (
          <p className="text-sm text-slate-600">{t('score.later.needFile')}</p>
        )}
      </section>

      <section data-testid="score-later-teacher-adjust" className="space-y-3 rounded-2xl border border-[#0D9488]/35 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">{t('score.later.teacherAdjust')}</h3>
          <span className="rounded-full bg-[#0D9488] px-2.5 py-1 text-xs font-bold text-white">{t('score.later.staffOnly')}</span>
        </div>
        {draft ? (
          <>
            <p className="text-sm text-slate-700">
              {t('score.later.aiSuggest', {
                band: t(rows.find((row) => row.id === draft.approxBand)?.label ?? 'score.v1.band.emerging'),
                value: formatFormative(formativeForBand(draft.approxBand)),
              })}
            </p>
            <p className="text-sm font-semibold text-slate-900">{t('score.later.override')}</p>
            <div role="group" aria-label={t('score.later.override')} className="flex flex-wrap gap-1.5">
              {rows.map((row) => {
                const on = selected === row.id
                return (
                  <button
                    key={row.id}
                    type="button"
                    aria-pressed={on}
                    data-testid={`score-later-adjust-${row.id}`}
                    onClick={() => setLaterAdjust(row.id)}
                    className={bandClass(on)}
                  >
                    {t(row.label)}
                  </button>
                )
              })}
            </div>
            <p className="text-sm font-bold text-[#0D9488]">
              {t('score.later.about', { value: formatFormative(formativeForBand(effectiveBand(draft))) })}
            </p>
            <p className="text-sm text-slate-600">{t('score.later.feedNote')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                data-testid="score-later-keep-ai"
                onClick={keepLaterAi}
                className="rounded-2xl border border-[#0D9488] bg-white px-4 py-3 text-sm font-bold text-[#0D9488]"
              >
                {t('score.later.keepAi')}
              </button>
              <button
                type="button"
                data-testid="score-later-write"
                onClick={writeLaterAdjust}
                className="rounded-2xl bg-[#0D9488] px-4 py-3 text-sm font-bold text-white"
              >
                {t('score.later.write')}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">{t('score.later.needFile')}</p>
        )}
      </section>

      <p className="rounded-2xl bg-[#d7f3ef] px-4 py-3 text-sm font-semibold leading-relaxed text-teal-950">
        {t('score.later.afterWrite')}
      </p>

      <section
        aria-labelledby={flowId}
        data-testid="score-later-flow"
        data-scout-plate={SCHOOL_SCORE_LATER_PLATES.flow}
        className="space-y-3"
      >
        <div>
          <h3 id={flowId} className="text-lg font-bold text-slate-900">
            {t('score.later.flowTitle')}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{t('score.later.flowSub')}</p>
        </div>
        <ol className="space-y-2">
          {(
            [
              ['1', 'score.later.step1', 'score.later.step1note'],
              ['2', 'score.later.step2', 'score.later.step2note'],
              ['3', 'score.later.step3', 'score.later.step3note'],
              ['4', 'score.later.step4', 'score.later.step4note'],
            ] as const
          ).map(([n, title, note]) => (
            <li key={n} className="flex items-center gap-3 rounded-2xl border border-[#0D9488]/30 bg-white px-3 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D9488] text-sm font-bold text-white">
                {n}
              </span>
              <span>
                <span className="block text-sm font-bold text-[#0D9488]">{t(title)}</span>
                <span className="block text-xs text-slate-600">{t(note)}</span>
              </span>
            </li>
          ))}
        </ol>
        <div>
          <h4 id={rulesId} className="text-sm font-bold text-[#0D9488]">
            {t('score.later.rules')}
          </h4>
          <ul className="mt-2 space-y-2">
            {(['score.later.rule1', 'score.later.rule2', 'score.later.rule3'] as const).map((key) => (
              <li key={key} className="flex items-center gap-3 rounded-2xl border border-[#0D9488]/25 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0D9488] text-xs font-bold text-white" aria-hidden="true">
                  ✓
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">{t('score.dual.absentTitle')}</p>
          <p className="mt-1">{t('score.later.absentBody')}</p>
        </div>
        <p className="text-center text-xs text-slate-500">{t('score.later.flowFoot')}</p>
      </section>

      <p className="pt-2 text-center text-xs text-slate-500">{t('score.later.staffFoot')}</p>
    </div>
  )
}
