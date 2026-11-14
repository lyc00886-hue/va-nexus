import { useState, type FormEvent, type ReactNode } from 'react'
import { AssignmentPublish } from './AssignmentPublish'
import { useT } from '../i18n'
import { addStaffClass, useClassList } from '../lib/classList'
import { PORTFOLIO_LABEL_MAX, portfolioKey } from '../lib/teacherDraftBand'

/**
 * Parent surface for the classes a teacher looks after.
 * The class list stays visible. The existing overview is rendered here
 * only after a class is opened.
 */
export function ClassroomManagement({ overview }: { overview: ReactNode }) {
  const { t } = useT()
  const classes = useClassList()
  const [name, setName] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const showDemo = classes.some((row) => row.demo)
  const openRow = classes.find((row) => row.id === openId)
  const open = openRow != null
  const titleId = 'class-staff-title'
  const listId = 'class-staff-list-title'

  function add(event: FormEvent) {
    event.preventDefault()
    const next = name.trim()
    if (!next) return
    if (classes.some((row) => !row.demo && portfolioKey(row.name) === portfolioKey(next))) return
    if (!addStaffClass(next)) return
    setName('')
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid="class-staff"
      data-soft-motion="off"
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5"
    >
      <div>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {t('class.staff.title')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('class.staff.intro')}</p>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.overviewHint')}</p>

      <div>
        <h3 id={listId} className="text-lg font-bold text-slate-900">
          {t('class.staff.listTitle')}
        </h3>
        {showDemo ? (
          <p data-testid="class-demo-note" className="mt-1 text-sm text-slate-600">
            {t('class.staff.demoClassNote')}
          </p>
        ) : null}
      </div>

      {classes.length === 0 ? (
        <p role="status" data-testid="class-staff-empty" className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
          {t('class.staff.empty')}
        </p>
      ) : null}

      <ul aria-labelledby={listId} className="m-0 list-none space-y-3 p-0">
        {classes.map((row) => {
          const opened = openId === row.id
          const label = row.demo ? t('class.staff.demoClass') : row.name
          return (
            <li
              key={row.id}
              data-testid={`class-staff-card-${row.id}`}
              data-class-demo={row.demo ? 'true' : 'false'}
              data-class-open={opened ? 'true' : 'false'}
              className="rounded-3xl border border-[#0D9488]/30 bg-white p-4"
            >
              <p className="font-semibold text-slate-900">{label}</p>
              {row.demo ? (
                <p data-testid="class-staff-count" className="mt-1 text-sm text-slate-600">
                  {t('class.staff.studentCount')}
                </p>
              ) : null}
              <button
                type="button"
                data-testid={`class-staff-open-${row.id}`}
                aria-expanded={opened}
                aria-controls={opened ? 'class-staff-overview' : undefined}
                onClick={() => setOpenId(row.id)}
                className="mt-3 whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
              >
                {t('class.staff.openClass')}
              </button>
            </li>
          )
        })}
      </ul>

      <form onSubmit={add} className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
        <label htmlFor="class-add-name" className="block text-sm font-semibold text-slate-900">
          {t('class.staff.addClass')}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="class-add-name"
            data-testid="class-add-name"
            value={name}
            maxLength={PORTFOLIO_LABEL_MAX}
            autoComplete="off"
            onChange={(event) => setName(event.target.value.slice(0, PORTFOLIO_LABEL_MAX))}
            className="w-full rounded-xl border border-[#0D9488]/30 px-3 py-2 text-sm text-slate-900 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
          />
          <button
            type="submit"
            data-testid="class-add-submit"
            className="shrink-0 whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
          >
            {t('class.staff.addClass')}
          </button>
        </div>
      </form>

      {open ? (
        <div id="class-staff-overview" data-testid="class-staff-overview" className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.keepOverview')}</p>
          {overview}
          {openRow ? (
            <AssignmentPublish
              key={openRow.id}
              classId={openRow.id}
              className={openRow.demo ? t('class.staff.demoClass') : openRow.name}
              demoClass={openRow.demo}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
