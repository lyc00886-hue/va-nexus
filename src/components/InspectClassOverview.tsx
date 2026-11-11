import { useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import { gradeLabelKey, useInspectRows, type InspectView } from '../lib/useInspectClass'
import { addInspectStudent, toggleInspectAttention } from '../lib/inspectClass'
import { INSPECT_GRADES, type InspectGrade } from '../lib/inspectPractice'
import { setActivePortfolio } from '../lib/useTeacherDraftStore'
import { PORTFOLIO_LABEL_MAX, portfolioKey } from '../lib/teacherDraftBand'

const STATUS_CHIP = {
  attention: 'bg-[#F3E6C4] text-amber-950',
  missing: 'bg-slate-100 text-slate-600',
  behind: 'bg-[#FFF4DE] text-amber-900',
  steady: 'bg-white text-[#0D9488] ring-1 ring-[#0D9488]',
} as const

export function InspectClassOverview({
  onPreviewOne,
  onPreviewClass,
}: {
  onPreviewOne: (id: string) => void
  onPreviewClass: () => void
}) {
  const { t } = useT()
  const rows = useInspectRows()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<InspectGrade>('f4')
  const showDemo = rows.some((row) => row.demo)
  const titleId = 'inspect-class-title'

  function add(event: FormEvent) {
    event.preventDefault()
    const next = name.trim()
    if (!next) return
    if (rows.some((row) => portfolioKey(row.name) === portfolioKey(next))) return
    const added = addInspectStudent(next, grade)
    if (!added) return
    setActivePortfolio(next)
    setName('')
  }

  return (
    <section aria-labelledby={titleId} data-testid="inspect-class" data-soft-motion="off" className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5">
      <div>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {t('inspect.staff.overviewTitle')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('inspect.staff.overviewIntro')}</p>
      </div>
      {rows.length === 0 ? (
        <p role="status" data-testid="inspect-class-empty" className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
          {t('inspect.staff.emptyClass')}
        </p>
      ) : null}
      {showDemo ? (
        <p data-testid="inspect-demo-note" className="text-sm text-slate-600">
          {t('inspect.staff.demoNote')}
        </p>
      ) : null}

      <form onSubmit={add} className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
        <label htmlFor="inspect-add-name" className="block text-sm font-semibold text-slate-900">
          {t('inspect.staff.addName')}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="inspect-add-name"
            data-testid="inspect-add-name"
            value={name}
            maxLength={PORTFOLIO_LABEL_MAX}
            autoComplete="off"
            placeholder={t('inspect.staff.namePlaceholder')}
            onChange={(event) => setName(event.target.value.slice(0, PORTFOLIO_LABEL_MAX))}
            className="w-full rounded-xl border border-[#0D9488]/30 px-3 py-2 text-sm text-slate-900 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
          />
          <button type="submit" className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white">
            {t('inspect.staff.addName')}
          </button>
        </div>
        <fieldset className="mt-3">
          <legend className="text-sm font-semibold text-slate-900">{t('inspect.staff.gradeLabel')}</legend>
          <div role="radiogroup" aria-label={t('inspect.staff.gradeLabel')} className="mt-2 flex flex-wrap gap-1.5">
            {INSPECT_GRADES.map((id) => {
              const selected = grade === id
              return (
                <label
                  key={id}
                  className={
                    selected
                      ? 'min-h-9 cursor-pointer rounded-full border border-[#0D9488] bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]'
                      : 'min-h-9 cursor-pointer rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488]'
                  }
                >
                  <input
                    type="radio"
                    name="inspect-add-grade"
                    value={id}
                    checked={selected}
                    onChange={() => setGrade(id)}
                    className="sr-only"
                  />
                  {t(gradeLabelKey(id))}
                </label>
              )
            })}
          </div>
        </fieldset>
      </form>

      <ul className="m-0 list-none space-y-3 p-0">
        {rows.map((row) => (
          <StudentCard
            key={row.id}
            row={row}
            onPreview={() => {
              setActivePortfolio(row.name)
              onPreviewOne(row.id)
            }}
          />
        ))}
      </ul>

      <button
        type="button"
        data-testid="inspect-preview-class"
        onClick={onPreviewClass}
        disabled={rows.length === 0}
        className="rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488] disabled:opacity-40"
      >
        {t('inspect.staff.exportClass')}
      </button>
    </section>
  )
}

function StudentCard({ row, onPreview }: { row: InspectView; onPreview: () => void }) {
  const { t } = useT()
  const chips: { id: keyof typeof STATUS_CHIP; label: string }[] = []
  if (row.status.attention) chips.push({ id: 'attention', label: t('inspect.status.attention') })
  if (row.status.missing) chips.push({ id: 'missing', label: t('inspect.status.missing') })
  if (row.status.behind) chips.push({ id: 'behind', label: t('inspect.status.behind') })
  if (row.status.steady) chips.push({ id: 'steady', label: t('inspect.status.steady') })
  return (
    <li data-testid={`inspect-student-${row.id}`} data-inspect-demo={row.demo ? 'true' : 'false'} className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          {row.grade ? (
            <p className="mt-1 text-xs font-semibold text-[#0D9488]">{t(gradeLabelKey(row.grade))}</p>
          ) : null}
          {row.grade ? (
            <p className="mt-2 text-sm text-slate-600" data-testid={`inspect-count-${row.id}`}>
              {t('inspect.staff.count', { done: row.done, total: row.total })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          data-testid={`inspect-preview-${row.id}`}
          onClick={onPreview}
          className="rounded-full border border-[#0D9488] bg-white px-3 py-1.5 text-sm font-semibold text-[#0D9488]"
        >
          {t('inspect.staff.preview')}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span key={chip.id} data-inspect-status={chip.id} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[chip.id]}`}>
            {chip.label}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => toggleInspectAttention(row.id)}
        className="mt-3 text-sm font-semibold text-[#0D9488] underline-offset-2 hover:underline"
      >
        {row.manualAttention ? t('inspect.staff.clearAttention') : t('inspect.staff.flagAttention')}
      </button>
    </li>
  )
}
