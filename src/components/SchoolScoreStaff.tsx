import { useId, useMemo, useState } from 'react'
import zhHant from '../content/teacher-draft-band.json'
import en from '../content/teacher-draft-band.en.json'
import zhHans from '../content/teacher-draft-band.zh-Hans.json'
import { useT } from '../i18n'
import { checkTeacherDraftBandCopy, pickTeacherDraftBandCopy, type PracticeBandId } from '../lib/teacherDraftBand'
import {
  SCHOOL_SCORE_PLATES,
  SCHOOL_SCORE_SLOT,
  schoolBandRows,
  schoolReferenceBand,
} from '../lib/schoolScore'
import { saveTeacherDraft, useTeacherDraftStore } from '../lib/useTeacherDraftStore'

const COPIES = { 'zh-Hant': zhHant, en, 'zh-Hans': zhHans }

/**
 * Staff scoring-reference chrome for the single-school formative band.
 * Scan / estimate stays a muted hold. No sample file or hash is invented.
 */
export function SchoolScoreStaff() {
  const { locale, t } = useT()
  const store = useTeacherDraftStore()
  const saved = schoolReferenceBand(store)
  const [selected, setSelected] = useState<PracticeBandId | null>(saved)
  const [status, setStatus] = useState<'saved' | null>(null)
  const titleId = useId()
  const bandTitleId = useId()
  const criteriaId = useId()
  const checked = useMemo(() => checkTeacherDraftBandCopy(pickTeacherDraftBandCopy(COPIES, locale)), [locale])

  const rwb = checked.ok ? checked.copy.criteria.rows.filter((row) => row.component === 'rwb') : []
  const artwork = checked.ok ? checked.copy.criteria.rows.filter((row) => row.component === 'artwork') : []

  return (
    <div
      data-testid="score-staff"
      data-scout-plate={SCHOOL_SCORE_PLATES.staff}
      data-school-slot={SCHOOL_SCORE_SLOT}
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-6"
    >
      <p className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-xs font-bold text-white">
        {t('score.v1.staffNav')}
      </p>
      <div>
        <h1 id={titleId} className="text-2xl font-bold text-slate-900">
          {t('score.v1.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t('score.v1.staffSub')}</p>
      </div>

      <p
        role="note"
        data-testid="score-disclaimer"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        <span className="mb-1 block text-xs font-bold text-amber-800">{t('score.v1.disclaimerLabel')}</span>
        {t('score.v1.disclaimer')}
      </p>

      <section data-testid="score-sample" className="rounded-2xl border border-[#0D9488]/40 bg-white px-4 py-3">
        <h2 className="text-sm font-bold text-[#0D9488]">{t('score.v1.sampleStd')}</h2>
        <p data-testid="score-sample-pending" className="mt-2 text-base font-bold text-slate-900">
          {t('score.v1.samplePending')}
        </p>
        <p className="mt-1 text-sm text-slate-600">{t('score.v1.sampleNote')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('score.v1.sampleLock')}</p>
      </section>

      <section aria-labelledby={bandTitleId} data-testid="score-bands">
        <h2 id={bandTitleId} className="text-sm font-bold text-[#0D9488]">
          {t('score.v1.bandLead')}
        </h2>
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">{t('score.v1.bandLead')}</legend>
          {schoolBandRows().map((row) => {
            const on = selected === row.id
            return (
              <label
                key={row.id}
                className={`flex cursor-pointer gap-3 rounded-2xl border px-3 py-3 ${
                  on ? 'border-[#0D9488] bg-[#0D9488] text-white' : 'border-[#0D9488]/40 bg-white text-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="school-score-band"
                  value={row.id}
                  data-testid={`score-band-option-${row.id}`}
                  checked={on}
                  onChange={() => {
                    setSelected(row.id)
                    setStatus(null)
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold">
                    {t('score.v1.bandLead')} · {t(row.label)}
                  </span>
                  <span className={`mt-0.5 block text-sm font-normal ${on ? 'text-white/90' : 'text-slate-600'}`}>
                    {t(row.hint)}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
      </section>

      {checked.ok ? (
        <section aria-labelledby={criteriaId} data-testid="score-criteria">
          <h2 id={criteriaId} className="text-sm font-bold text-[#0D9488]">
            {t('score.v1.criteria')}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-[#0D9488]/30 bg-white px-4 py-3">
              <h3 className="font-bold text-[#0D9488]">{t('score.v1.criteriaRwb')}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {rwb.map((row) => (
                  <li key={row.id} data-testid={`score-criterion-${row.id}`}>
                    {row.label}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-[#0D9488]/30 bg-white px-4 py-3">
              <h3 className="font-bold text-[#0D9488]">{t('score.v1.criteriaArt')}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {artwork.map((row) => (
                  <li key={row.id} data-testid={`score-criterion-${row.id}`}>
                    {row.label}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        data-testid="score-save"
        disabled={selected == null}
        onClick={() => {
          if (!selected) return
          saveTeacherDraft(SCHOOL_SCORE_SLOT, selected)
          setStatus('saved')
        }}
        className="w-full rounded-2xl bg-[#0D9488] px-4 py-3 text-base font-bold text-white disabled:opacity-40"
      >
        {t('score.v1.save')}
      </button>
      <p role="status" data-testid="score-save-status" className="min-h-5 text-sm text-teal-800">
        {status === 'saved' ? t('staff.saved') : ''}
      </p>
      <p className="text-sm text-slate-600">{t('score.v1.studentSees')}</p>

      <button
        type="button"
        data-testid="score-later"
        disabled
        className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
      >
        {t('score.v1.later')}
      </button>

      <p className="pt-2 text-center text-xs text-slate-500">{t('score.v1.staffFoot')}</p>
    </div>
  )
}
