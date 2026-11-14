import { useRef, useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import { assignmentsForClass, useAssignList, visibleAssignment, type StaffAssignment } from '../lib/assignList'
import { DEMO_CLASS_ID } from '../lib/classList'
import {
  HW_LEARNER_ID,
  homeworkFileError,
  homeworkSubmissionId,
  rememberHomeworkFile,
  submitHomework,
  useHomeworkSubmissions,
} from '../lib/homeworkSubmit'

/** Learning-map entry. The bottom bar does not gain a tab. */
export function HomeworkMapEntry() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  return (
    <div data-testid="hw-map-entry" data-soft-motion="off" className="mt-3 space-y-2">
      <button
        type="button"
        data-testid="hw-student-open"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
      >
        {t('hw.student.title')}
      </button>
      <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.mapEntry')}</p>
      {open ? <HomeworkStudent /> : null}
    </div>
  )
}

export function HomeworkStudent() {
  const { t } = useT()
  const rows = assignmentsForClass({ assignments: useAssignList() }, DEMO_CLASS_ID)
  const titleId = 'hw-student-title'
  const demoCopy = {
    title: t('assign.staff.demoTitle'),
    due: t('assign.staff.demoDue'),
    instructions: t('assign.staff.demoInstructions'),
  }
  return (
    <section
      aria-labelledby={titleId}
      data-testid="hw-student"
      data-soft-motion="off"
      className="space-y-3 rounded-[2rem] border border-[#0D9488]/30 bg-[#FFF9E9] p-4"
    >
      <div>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {t('hw.student.title')}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#0D9488]">{t('hw.student.systemName')}</p>
      </div>
      {rows.length === 0 ? (
        <div role="status" data-testid="hw-student-empty" className="space-y-2 rounded-2xl bg-white px-3 py-3">
          <p className="text-sm text-slate-700">{t('hw.student.empty')}</p>
          <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.emptyHint')}</p>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.intro')}</p>
          <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.privateNote')}</p>
          <ul className="m-0 list-none space-y-3 p-0">
            {rows.map((assignment) => {
              const shown = visibleAssignment(assignment, demoCopy)
              return <HomeworkCard key={assignment.id} assignment={assignment} due={shown.due} title={shown.title} />
            })}
          </ul>
        </>
      )}
    </section>
  )
}

function HomeworkCard({ assignment, title, due }: { assignment: StaffAssignment; title: string; due: string }) {
  const { t } = useT()
  const submissions = useHomeworkSubmissions()
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const existing =
    submissions.find(
      (row) => row.classId === DEMO_CLASS_ID && row.assignmentId === assignment.id && row.studentId === HW_LEARNER_ID,
    ) ?? null
  const error = file ? homeworkFileError(file) : null
  const ready = file != null && error == null
  const inputId = `hw-student-file-${assignment.id}`

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!file || homeworkFileError(file)) return
    const id = homeworkSubmissionId(DEMO_CLASS_ID, assignment.id, HW_LEARNER_ID)
    const ok = submitHomework({
      classId: DEMO_CLASS_ID,
      assignmentId: assignment.id,
      studentId: HW_LEARNER_ID,
      fileName: file.name,
    })
    if (!ok) return
    rememberHomeworkFile(id, file)
    if (inputRef.current) inputRef.current.value = ''
    setFile(null)
  }

  return (
    <li data-testid={`hw-student-card-${assignment.id}`} data-hw-handed-in={existing ? 'true' : 'false'} className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-700">
        {t('hw.student.due')} {due}
      </p>
      {existing ? <p className="mt-2 text-sm font-semibold text-[#0D9488]">{existing.fileName}</p> : null}
      <form onSubmit={submit} className="mt-3 space-y-3">
        <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.wholeFile')}</p>
        <label
          htmlFor={inputId}
          className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
        >
          {t('hw.student.upload')}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="application/pdf,image/*"
            data-testid={`hw-student-file-${assignment.id}`}
            data-hw-file-error={error ?? ''}
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {file ? <p className="text-sm text-slate-700">{file.name}</p> : null}
        <button
          type="submit"
          data-testid={`hw-student-submit-${assignment.id}`}
          disabled={!ready}
          className="whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t('hw.student.submit')}
        </button>
        <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.teacherCanOpen')}</p>
      </form>
    </li>
  )
}
