import { useState, type FormEvent, type ReactNode } from 'react'
import { useT } from '../i18n'
import {
  assignmentsForClass,
  publishStaffAssignment,
  useAssignList,
  visibleAssignment,
  type AssignAttach,
  type StaffAssignment,
} from '../lib/assignList'
import { PORTFOLIO_LABEL_MAX } from '../lib/teacherDraftBand'

const ATTACH_ORDER: AssignAttach[] = ['paper', 'none']

/**
 * Compose and published list for one opened class.
 * Publishing stores a name, a due date, a short note, and an optional
 * activity paper that is already available. It does not write a lesson plan.
 */
export function AssignmentPublish({
  classId,
  className,
  demoClass,
}: {
  classId: string
  className: string
  demoClass: boolean
}) {
  const { t } = useT()
  const rows = assignmentsForClass({ assignments: useAssignList() }, classId)
  const [view, setView] = useState<'compose' | 'list'>('compose')
  const [title, setTitle] = useState(() => (demoClass ? t('assign.staff.demoTitle') : ''))
  const [due, setDue] = useState(() => (demoClass ? t('assign.staff.demoDue') : ''))
  const [instructions, setInstructions] = useState(() => (demoClass ? t('assign.staff.demoInstructions') : ''))
  const [attach, setAttach] = useState<AssignAttach>('paper')
  const ready = title.trim() !== '' && due.trim() !== ''
  const titleId = 'assign-staff-title'
  const publishedId = 'assign-staff-published'

  function publish(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    publishStaffAssignment({ classId, title, due, instructions, attach })
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid="assign-staff"
      data-assign-view={view}
      data-soft-motion="off"
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5"
    >
      <div>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {t('assign.staff.title')}
        </h2>
        {view === 'compose' ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('assign.staff.intro')}</p>
        ) : (
          <p id={publishedId} data-testid="assign-list-heading" className="mt-1 text-sm font-semibold text-[#0D9488]">
            {t('assign.staff.published')} · {className}
          </p>
        )}
      </div>

      {view === 'list' && rows.length > 0 ? (
        <div className="rounded-[2rem] border-2 border-[#0D9488] bg-[#FFF9E9] p-3 sm:p-4">
          <PublishedList rows={rows} headingId={publishedId} />
        </div>
      ) : null}

      {view === 'list' ? (
        <p data-testid="assign-no-generator" className="text-sm leading-relaxed text-slate-600">
          {t('assign.staff.noGenerator')}
        </p>
      ) : null}

      {view === 'compose' ? (
        <form onSubmit={publish} data-testid="assign-form" className="space-y-3">
          <p data-testid="assign-class-label" className="text-sm font-semibold text-[#0D9488]">
            {t('assign.staff.classLabel')} {className}
          </p>
          <Field label={t('assign.staff.fieldTitle')} htmlFor="assign-title">
            <input
              id="assign-title"
              data-testid="assign-title"
              value={title}
              maxLength={PORTFOLIO_LABEL_MAX}
              autoComplete="off"
              onChange={(event) => setTitle(event.target.value.slice(0, PORTFOLIO_LABEL_MAX))}
              className="mt-2 w-full bg-transparent text-base text-slate-900 outline-none"
            />
          </Field>
          <Field label={t('assign.staff.fieldDue')} htmlFor="assign-due">
            <input
              id="assign-due"
              data-testid="assign-due"
              value={due}
              maxLength={PORTFOLIO_LABEL_MAX}
              autoComplete="off"
              onChange={(event) => setDue(event.target.value.slice(0, PORTFOLIO_LABEL_MAX))}
              className="mt-2 w-full bg-transparent text-base text-slate-900 outline-none"
            />
          </Field>
          <Field label={t('assign.staff.fieldInstructions')} htmlFor="assign-instructions">
            <textarea
              id="assign-instructions"
              data-testid="assign-instructions"
              value={instructions}
              rows={3}
              maxLength={PORTFOLIO_LABEL_MAX}
              autoComplete="off"
              onChange={(event) => setInstructions(event.target.value.slice(0, PORTFOLIO_LABEL_MAX))}
              className="mt-2 w-full resize-y bg-transparent text-base leading-relaxed text-slate-900 outline-none"
            />
          </Field>
          <fieldset className="rounded-3xl border border-[#0D9488]/40 bg-white px-4 py-3">
            <legend className="px-1 text-sm font-semibold text-[#0D9488]">{t('assign.staff.fieldAttach')}</legend>
            <div role="radiogroup" aria-label={t('assign.staff.fieldAttach')} className="mt-2 flex flex-wrap gap-2">
              {ATTACH_ORDER.map((id) => {
                const selected = attach === id
                const label = id === 'paper' ? t('assign.staff.attachPaper') : t('assign.staff.attachNone')
                return (
                  <label
                    key={id}
                    className={
                      selected
                        ? 'min-h-9 max-w-full cursor-pointer whitespace-normal rounded-full border border-[#0D9488] bg-[#0D9488] px-3 py-1 text-left text-sm font-semibold leading-snug text-[#FFF9E9]'
                        : 'min-h-9 max-w-full cursor-pointer whitespace-normal rounded-full border border-[#0D9488] bg-white px-3 py-1 text-left text-sm font-semibold leading-snug text-[#0D9488]'
                    }
                  >
                    <input
                      type="radio"
                      name="assign-attach"
                      value={id}
                      data-testid={`assign-attach-${id}`}
                      checked={selected}
                      onChange={() => setAttach(id)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <p data-testid="assign-no-generator" className="text-sm leading-relaxed text-slate-600">
            {t('assign.staff.noGenerator')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              data-testid="assign-publish"
              disabled={!ready}
              className="whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('assign.staff.publish')}
            </button>
            <button
              type="button"
              data-testid="assign-open-list"
              onClick={() => setView('list')}
              className="whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
            >
              {t('assign.staff.openList')}
            </button>
          </div>
        </form>
      ) : (
        <div data-testid="assign-compose-collapsed" className="rounded-3xl border border-[#0D9488]/40 bg-white p-4">
          <h3 className="text-base font-bold text-[#0D9488]">{t('assign.staff.publish')}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('assign.staff.intro')}</p>
          <button
            type="button"
            data-testid="assign-show-compose"
            onClick={() => setView('compose')}
            className="mt-3 whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
          >
            {t('assign.staff.title')}
          </button>
        </div>
      )}

      {view === 'compose' ? (
        <div className="space-y-3">
          <h3 id={publishedId} className="text-lg font-bold text-slate-900">
            {t('assign.staff.published')}
          </h3>
          <PublishedList rows={rows} headingId={publishedId} />
        </div>
      ) : null}
    </section>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block rounded-3xl border border-[#0D9488]/40 bg-white px-4 py-3">
      <span className="block text-sm font-semibold text-[#0D9488]">{label}</span>
      {children}
    </label>
  )
}

function PublishedList({ rows, headingId }: { rows: StaffAssignment[]; headingId: string }) {
  const { t } = useT()
  const demo = {
    title: t('assign.staff.demoTitle'),
    due: t('assign.staff.demoDue'),
    instructions: t('assign.staff.demoInstructions'),
  }
  return (
    <ul aria-labelledby={headingId} data-testid="assign-published-list" className="m-0 list-none space-y-3 p-0">
      {rows.map((row) => {
        const shown = visibleAssignment(row, demo)
        return (
          <li
            key={row.id}
            data-testid={`assign-card-${row.id}`}
            data-assign-demo={row.demo ? 'true' : 'false'}
            data-assign-attach={shown.attach}
            className="rounded-3xl border border-[#0D9488] bg-white p-4"
          >
            <p className="text-lg font-bold text-slate-900">{shown.title}</p>
            <p className="mt-1 text-sm text-slate-700">
              {t('assign.staff.fieldDue')} {shown.due}
            </p>
            {shown.instructions ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{shown.instructions}</p>
            ) : null}
            {shown.attach === 'paper' ? (
              <p className="mt-3">
                <span className="inline-flex max-w-full whitespace-normal rounded-full bg-[#0D9488] px-3 py-1 text-left text-sm font-semibold leading-snug text-[#FFF9E9]">
                  {t('assign.staff.attachPaper')}
                </span>
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
