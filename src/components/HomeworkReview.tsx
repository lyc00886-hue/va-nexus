import { useState } from 'react'
import { useT, type MessageKey } from '../i18n'
import { assignmentsForClass, useAssignList, visibleAssignment } from '../lib/assignList'
import {
  homeworkCounts,
  homeworkFileLabel,
  homeworkPlateMatch,
  homeworkRosterIds,
  homeworkRows,
  homeworkSessionFile,
  useHomeworkSubmissions,
  type HwSubmission,
} from '../lib/homeworkSubmit'

const NAME_KEY: Record<string, MessageKey> = {
  'demo-a': 'inspect.demo.a',
  'demo-b': 'inspect.demo.b',
  'demo-c': 'inspect.demo.c',
}

/**
 * Submission list for one opened class, placed after the published assignments.
 * The short button label is not the system name.
 */
export function HomeworkReview({ classId, demoClass }: { classId: string; demoClass: boolean }) {
  const { t } = useT()
  const assignments = assignmentsForClass({ assignments: useAssignList() }, classId)
  const submissions = useHomeworkSubmissions()
  const [open, setOpen] = useState(true)
  const [fileId, setFileId] = useState<string | null>(null)
  const titleId = 'hw-staff-title'
  const opened = submissions.find((row) => row.id === fileId) ?? null
  const demoCopy = {
    title: t('assign.staff.demoTitle'),
    due: t('assign.staff.demoDue'),
    instructions: t('assign.staff.demoInstructions'),
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid="hw-staff"
      data-soft-motion="off"
      data-hw-open={fileId ? 'file' : open ? 'list' : 'closed'}
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5"
    >
      <h2 id={titleId} className="text-xl font-bold text-slate-900">
        {t('hw.staff.title')}
      </h2>

      {opened ? (
        <SubmittedFile
          submission={opened}
          onBack={() => setFileId(null)}
        />
      ) : (
        <>
          <button
            type="button"
            data-testid="hw-staff-nav"
            aria-expanded={open}
            aria-controls="hw-staff-list"
            onClick={() => setOpen((value) => !value)}
            className="whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
          >
            {t('hw.staff.navShort')}
          </button>
          {open ? (
            <div id="hw-staff-list" className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">{t('hw.staff.intro')}</p>
              {assignments.map((assignment) => {
                const shown = visibleAssignment(assignment, demoCopy)
                const roster = homeworkRosterIds(classId, demoClass)
                const rows = homeworkRows({ submissions }, classId, assignment.id, roster)
                const counts = homeworkCounts(rows)
                const plate = homeworkPlateMatch(counts)
                return (
                  <div key={assignment.id} data-testid={`hw-staff-assignment-${assignment.id}`} className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900">{shown.title}</h3>
                    {roster.length > 0 ? (
                      <div
                        data-testid="hw-staff-counts"
                        data-hw-submitted={counts.submitted}
                        data-hw-missing={counts.missing}
                        data-hw-total={counts.total}
                      >
                        <p data-testid="hw-staff-count" className="text-sm font-semibold text-[#0D9488]">
                          {plate ? t('hw.staff.count') : `${counts.submitted}\uFF0F${counts.total}`}
                        </p>
                        <p data-testid="hw-staff-missing" className="text-sm text-slate-700">
                          {plate ? t('hw.staff.missingCount') : String(counts.missing)}
                        </p>
                      </div>
                    ) : null}
                    <ul className="m-0 list-none space-y-3 p-0">
                      {rows.map((row) => {
                        const submitted = row.status === 'submitted'
                        const nameKey = NAME_KEY[row.studentId]
                        const fileName = row.submission ? homeworkFileLabel(row.submission, t('hw.staff.genericFile')) : ''
                        return (
                          <li
                            key={row.studentId}
                            data-testid={`hw-staff-row-${row.studentId}`}
                            data-hw-status={row.status}
                            className="rounded-3xl border border-[#0D9488]/30 bg-white p-4"
                          >
                            <p className="font-semibold text-slate-900">{nameKey ? t(nameKey) : row.studentId}</p>
                            <p className="mt-2">
                              <span
                                className={
                                  submitted
                                    ? 'inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]'
                                    : 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700'
                                }
                              >
                                {submitted ? t('hw.staff.homeworkDoneChip') : t('hw.staff.homeworkChip')}
                              </span>
                            </p>
                            {submitted && row.submission ? (
                              <>
                                <p className="mt-2 text-sm text-slate-700">{fileName}</p>
                                <button
                                  type="button"
                                  data-testid={`hw-staff-open-file-${row.studentId}`}
                                  onClick={() => setFileId(row.submission?.id ?? null)}
                                  className="mt-3 whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
                                >
                                  {t('hw.staff.openFile')}
                                </button>
                              </>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
              <p data-testid="hw-staff-not-marking" className="text-sm leading-relaxed text-slate-600">
                {t('hw.staff.notMarking')}
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function SubmittedFile({ submission, onBack }: { submission: HwSubmission; onBack: () => void }) {
  const { t } = useT()
  const session = homeworkSessionFile(submission.id)
  const image = session && session.mime.startsWith('image/') ? session.url : null
  const pdf = session && !image ? session.url : null
  const name = homeworkFileLabel(submission, t('hw.staff.genericFile'))
  const viewId = 'hw-staff-file-title'
  return (
    <div data-testid="hw-staff-file" data-hw-complete="true" className="space-y-3">
      <h3 id={viewId} className="text-lg font-bold text-slate-900">
        {t('hw.staff.viewTitle')}
      </h3>
      <p data-testid="hw-staff-file-name" className="text-sm font-semibold text-[#0D9488]">
        {name}
      </p>
      <p data-testid="hw-staff-file-note" className="text-sm leading-relaxed text-slate-600">
        {t('hw.staff.fileNote')}
      </p>
      {pdf ? (
        <object data={pdf} type={session?.mime || 'application/pdf'} data-testid="hw-staff-pdf" className="h-80 w-full rounded-2xl border border-[#0D9488]/30 bg-white">
          <a href={pdf}>{name}</a>
        </object>
      ) : null}
      <ol data-testid="hw-staff-pages" data-hw-pages="3" aria-label={t('hw.staff.pagesHint')} className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        <li data-hw-page="1" className="rounded-2xl border border-[#0D9488]/30 bg-white p-3">
          <p className="text-xs font-semibold text-[#0D9488]">1</p>
          {image ? (
            <img src={image} alt="" className="mt-2 h-40 w-full rounded-lg object-contain" />
          ) : (
            <div className="mt-2 flex h-40 items-center justify-center rounded-lg bg-[#f4fbfa]">
              <div className="h-24 w-16 rounded-md border-2 border-[#0D9488]" />
            </div>
          )}
        </li>
        <li data-hw-page="2" className="rounded-2xl border border-[#0D9488]/30 bg-white p-3">
          <p className="text-xs font-semibold text-[#0D9488]">2</p>
          <div className="mt-2 space-y-2">
            {['a', 'b', 'c', 'd', 'e', 'f'].map((line) => (
              <div key={line} className="h-2 rounded bg-[#0D9488]/20" />
            ))}
          </div>
        </li>
        <li data-hw-page="3" className="rounded-2xl border border-[#0D9488]/30 bg-white p-3">
          <p className="text-xs font-semibold text-[#0D9488]">3</p>
          <div className="mt-2 space-y-2">
            {['a', 'b', 'c', 'd'].map((line) => (
              <div key={line} className="h-2 rounded bg-[#0D9488]/20" />
            ))}
            <div className="h-16 rounded-lg border border-[#0D9488]/40" />
          </div>
        </li>
      </ol>
      <p data-testid="hw-staff-pages-hint" className="text-sm leading-relaxed text-slate-600">
        {t('hw.staff.pagesHint')}
      </p>
      <p data-testid="hw-staff-file-not-marking" className="text-sm leading-relaxed text-slate-600">
        {t('hw.staff.notMarking')}
      </p>
      <button
        type="button"
        data-testid="hw-staff-back"
        onClick={onBack}
        className="whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
      >
        {t('hw.staff.backToList')}
      </button>
    </div>
  )
}
