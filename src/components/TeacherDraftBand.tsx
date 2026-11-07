import { useId, useMemo, useState } from 'react'
import { SchoolScoreDualStaff } from './SchoolScoreDualStaff'
import { SchoolScoreStaff } from './SchoolScoreStaff'
import zhHant from '../content/teacher-draft-band.json'
import en from '../content/teacher-draft-band.en.json'
import zhHans from '../content/teacher-draft-band.zh-Hans.json'
import { useT } from '../i18n'
import { useStaffRole } from '../lib/useStaffRole'
import {
  bandForPortfolio,
  checkTeacherDraftBandCopy,
  pickTeacherDraftBandCopy,
  portfolioKey,
  PORTFOLIO_LABEL_MAX,
  type CriterionRow,
  type PracticeBandId,
  type TeacherDraftBandCopy,
} from '../lib/teacherDraftBand'
import { clearTeacherDraft, saveTeacherDraft, setActivePortfolio, useTeacherDraftStore } from '../lib/useTeacherDraftStore'
import type { StaffRole } from '../lib/staffRole'

const COPIES = {
  'zh-Hant': zhHant,
  en,
  'zh-Hans': zhHans,
}

function StaffDenied() {
  const { t } = useT()
  return (
    <p
      role="status"
      data-testid="teacher-draft-denied"
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
    >
      {t('staff.denied')}
    </p>
  )
}

function CriterionList({ title, rows, levelLabel }: { title: string; rows: CriterionRow[]; levelLabel: string }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mt-4">
      <h3 id={headingId} className="text-base font-bold text-slate-900">
        {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            data-testid={`teacher-draft-criterion-${row.id}`}
            className="rounded-2xl border border-slate-200 px-3 py-3"
          >
            <p className="font-semibold text-slate-900">{row.label}</p>
            {row.focusHint ? <p className="mt-1 text-sm text-slate-600">{row.focusHint}</p> : null}
            <div
              className="mt-2 h-10 rounded-xl border border-dashed border-slate-300 bg-slate-50"
              data-testid={`teacher-draft-level-${row.id}`}
            >
              <span className="sr-only">{levelLabel}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TeacherDraftBandPage({ role }: { role: StaffRole }) {
  const { locale, t } = useT()
  const store = useTeacherDraftStore()
  const checked = useMemo(
    () => checkTeacherDraftBandCopy(pickTeacherDraftBandCopy(COPIES, locale)),
    [locale],
  )
  const [portfolio, setPortfolio] = useState(() => store.activePortfolio)
  const [selected, setSelected] = useState<PracticeBandId | null>(() => bandForPortfolio(store, store.activePortfolio))
  const [status, setStatus] = useState<'saved' | 'cleared' | null>(null)
  const portfolioFieldId = useId()
  const disclaimerId = useId()
  const bandTitleId = useId()
  const tipsTitleId = useId()

  if (!checked.ok) {
    return (
      <p role="status" data-testid="teacher-draft-unavailable" data-reason={checked.reason} className="text-sm text-slate-700">
        {t('staff.unavailable')}
      </p>
    )
  }

  const copy: TeacherDraftBandCopy = checked.copy
  const portfolioReady = portfolioKey(portfolio) !== ''
  const saved = bandForPortfolio(store, portfolio)
  const rwbRows = copy.criteria.rows.filter((row) => row.component === 'rwb')
  const artworkRows = copy.criteria.rows.filter((row) => row.component === 'artwork')
  const levelLabel = t('staff.levelColumn')

  return (
    <div className="space-y-4" data-testid="teacher-draft-band" data-staff-role={role} data-audience="teacher-only">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{copy.pageTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{copy.pageIntro}</p>
      </div>

      <p
        id={disclaimerId}
        role="note"
        data-testid="teacher-draft-disclaimer"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      >
        {copy.disclaimer}
      </p>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <label htmlFor={portfolioFieldId} className="block text-sm font-semibold text-slate-900">
          {t('staff.portfolioLabel')}
        </label>
        <input
          id={portfolioFieldId}
          data-testid="teacher-draft-portfolio"
          value={portfolio}
          maxLength={PORTFOLIO_LABEL_MAX}
          autoComplete="off"
          placeholder={t('staff.portfolioPlaceholder')}
          onChange={(event) => {
            const value = event.target.value.slice(0, PORTFOLIO_LABEL_MAX)
            setPortfolio(value)
            setSelected(bandForPortfolio(store, value))
            setStatus(null)
            setActivePortfolio(value)
          }}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
        {!portfolioReady && (
          <p role="status" data-testid="teacher-draft-empty-student" className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {copy.empty.noStudent}
          </p>
        )}
      </section>

      <section
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        data-testid="teacher-draft-band-picker"
        aria-labelledby={bandTitleId}
      >
        <h2 id={bandTitleId} className="text-lg font-bold text-slate-900">
          {copy.bandPicker.title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{copy.bandPicker.help}</p>
        <p className="mt-2 text-sm text-slate-500">{copy.bandPicker.schoolMappingNote}</p>
        <fieldset className="mt-3 space-y-2" aria-describedby={disclaimerId}>
          <legend className="sr-only">{copy.bandPicker.title}</legend>
          {copy.bandPicker.bands.map((band) => {
            const checkedBand = selected === band.id
            return (
              <label
                key={band.id}
                className={`flex gap-3 rounded-2xl border px-3 py-3 ${
                  portfolioReady ? 'cursor-pointer' : 'cursor-not-allowed'
                } ${checkedBand ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`}
              >
                <input
                  type="radio"
                  name="teacher-draft-band"
                  value={band.id}
                  data-testid={`teacher-draft-band-option-${band.id}`}
                  checked={checkedBand}
                  disabled={!portfolioReady}
                  onChange={() => {
                    setSelected(band.id)
                    setStatus(null)
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-slate-900">{band.label}</span>
                  {band.hint ? <span className="mt-0.5 block text-sm font-normal text-slate-600">{band.hint}</span> : null}
                </span>
              </label>
            )
          })}
        </fieldset>
        {portfolioReady && !selected && (
          <p role="status" data-testid="teacher-draft-empty-band" className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {copy.empty.noBand}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="teacher-draft-save"
            disabled={!portfolioReady || !selected}
            onClick={() => {
              if (!selected) return
              saveTeacherDraft(portfolio, selected)
              setStatus('saved')
            }}
            className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {copy.bandPicker.saveCta}
          </button>
          <button
            type="button"
            data-testid="teacher-draft-clear"
            disabled={!portfolioReady || (selected == null && saved == null)}
            onClick={() => {
              clearTeacherDraft(portfolio)
              setSelected(null)
              setStatus('cleared')
            }}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            {copy.bandPicker.clearCta}
          </button>
        </div>
        <p role="status" data-testid="teacher-draft-status" className="mt-2 min-h-5 text-sm text-teal-800">
          {status === 'saved' ? t('staff.saved') : status === 'cleared' ? t('staff.cleared') : ''}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" data-testid="teacher-draft-criteria">
        <p className="text-sm text-slate-600">{copy.criteria.rowsHelp}</p>
        <p role="note" data-testid="teacher-draft-empty-criteria" className="mt-2 text-sm text-slate-500">
          {copy.empty.noCriteriaNote}
        </p>
        <CriterionList title={copy.criteria.sectionRwbTitle} rows={rwbRows} levelLabel={levelLabel} />
        <CriterionList title={copy.criteria.sectionArtworkTitle} rows={artworkRows} levelLabel={levelLabel} />
      </section>

      <section aria-labelledby={tipsTitleId} data-testid="teacher-draft-tips" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 id={tipsTitleId} className="text-lg font-bold text-slate-900">
          {t('staff.tipsTitle')}
        </h2>
        <ul className="mt-2 space-y-2">
          {copy.teacherTips.map((tip) => (
            <li key={tip.id} data-testid={`teacher-draft-tip-${tip.id}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {tip.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function TeacherDraftBand() {
  const role = useStaffRole()
  if (!role) return <StaffDenied />
  return (
    <div className="space-y-8">
      <SchoolScoreStaff />
      <SchoolScoreDualStaff />
      <TeacherDraftBandPage role={role} />
    </div>
  )
}
