import { useRef, useState, type FormEvent } from 'react'
import { getLocale, HTML_LANG, t, useT, type MessageKey } from '../i18n'
import {
  DEMO_ASSIGN_ID,
  F5_DEMO_ASSIGN_ID,
  LEARNING_WORKSHEET_ASSIGN_ID,
  assignmentsForClass,
  useAssignList,
  visibleAssignment,
  type StaffAssignment,
} from '../lib/assignList'
import { learningWorksheetAssignment, withLearningWorksheet } from '../game/learningWorksheet'
import { LearningWorksheetFile } from './game/LearningWorksheetFile'
import { joinRealClassroom, submitJoinedHomework, useJoinedClassroom, type InviteRoom } from '../lib/classInvite'
import {
  F5_INSTRUCTIONS_DOWNLOAD_NAME,
  homeworkInstructionsHtml,
  worksheetDownloadFor,
  worksheetLessonOf,
} from '../game/lessonWorksheet'
import { DEMO_CLASS_ID } from '../lib/classList'
import {
  HW_LEARNER_ID,
  homeworkFileError,
  homeworkSubmissionId,
  rememberHomeworkFile,
  submitHomework,
  useHomeworkSubmissions,
} from '../lib/homeworkSubmit'

function ClassInviteJoin() {
  const { t } = useT()
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const titleId = 'class-student-invite-title'
  const normalized = code.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 6)

  async function join(event: FormEvent) {
    event.preventDefault()
    if (normalized.length !== 6 || pending) return
    setPending(true)
    const room = await joinRealClassroom(normalized)
    setPending(false)
    setInvalid(room == null)
    if (room) setCode('')
  }

  return (
    <section aria-labelledby={titleId} data-testid="class-student-invite" data-soft-motion="off" className="space-y-3">
      <div>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {t('class.student.inviteTitle')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('class.student.inviteIntro')}</p>
      </div>
      <form onSubmit={join} className="rounded-3xl border-2 border-[#0D9488] bg-white p-4">
        <label htmlFor="class-student-code" className="block text-sm font-semibold text-slate-700">
          {t('class.staff.inviteCode')}
        </label>
        <input
          id="class-student-code"
          data-testid="class-student-code"
          value={code}
          placeholder={t('class.student.invitePlaceholder')}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={invalid}
          maxLength={12}
          onChange={(event) => {
            setInvalid(false)
            setCode(event.target.value.toUpperCase())
          }}
          className="mt-2 w-full rounded-xl border border-[#0D9488]/40 px-3 py-2 text-lg font-semibold tracking-wide text-slate-900 placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
        />
        <button
          type="submit"
          data-testid="class-student-join"
          disabled={pending || normalized.length !== 6}
          className="mt-3 whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t('class.student.joinWithCode')}
        </button>
      </form>
      <div className="rounded-3xl border border-[#0D9488]/30 bg-[#F6E7C1] px-4 py-3">
        <p className="text-sm leading-relaxed text-slate-700">{t('class.student.inviteIntro')}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('hw.student.mapEntry')}</p>
      </div>
    </section>
  )
}

/** Learning-map entry. The bottom bar does not gain a tab. */
export function HomeworkMapEntry() {
  const { t } = useT()
  const joined = useJoinedClassroom()
  const [open, setOpen] = useState(false)
  const shown = open || joined != null
  return (
    <div data-testid="hw-map-entry" data-soft-motion="off" className="mt-3 space-y-3">
      {joined ? null : <ClassInviteJoin />}
      <button
        type="button"
        data-testid="hw-student-open"
        aria-expanded={shown}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
      >
        {t('hw.student.title')}
      </button>
      <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.mapEntry')}</p>
      {shown ? <HomeworkStudent /> : null}
    </div>
  )
}

function JoinedHomework({ room }: { room: InviteRoom }) {
  const { t } = useT()
  const titleId = 'hw-student-joined-title'
  const live = {
    id: DEMO_ASSIGN_ID,
    classId: room.id,
    title: '',
    due: '',
    instructions: '',
    attach: 'paper' as const,
    demo: true,
  }
  const published = room.assignments
    .filter((row) => row.demo !== true && row.title.trim() !== '' && row.due.trim() !== '')
    .map((row) => ({
      id: row.id,
      classId: room.id,
      title: row.title,
      due: row.due,
      instructions: row.instructions,
      attach: row.attach,
      demo: false,
    }))
  return (
    <section
      aria-labelledby={titleId}
      data-testid="hw-student-joined"
      data-class-name={room.name}
      data-soft-motion="off"
      className="space-y-3 rounded-[2rem] border border-[#0D9488]/30 bg-[#FFF9E9] p-4"
    >
      <div>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {t('hw.student.title')}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#0D9488]">{t('hw.student.systemName')}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]">
            {t('class.staff.realChip')}
          </span>
          <span className="text-sm font-semibold text-slate-800">{room.name}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('class.student.joinedHint')}</p>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.intro')}</p>
      <ul className="m-0 list-none space-y-3 p-0">
        <HomeworkCard
          assignment={live}
          due={t('assign.staff.demoDue')}
          title={t('assign.staff.demoTitle')}
          instructions={t('assign.staff.demoInstructions')}
          classId={room.id}
          roomCode={room.code}
          roomName={room.name}
          joined
        />
        <HomeworkCard
          assignment={learningWorksheetAssignment(room.id)}
          due=""
          title=""
          instructions=""
          classId={room.id}
          roomCode={room.code}
          roomName=""
          joined
        />
        {published.map((assignment) => (
          <HomeworkCard
            key={assignment.id}
            assignment={assignment}
            due={assignment.due}
            title={assignment.title}
            instructions={assignment.instructions}
            classId={room.id}
            roomCode={room.code}
            roomName={room.name}
            joined
          />
        ))}
      </ul>
      <div className="rounded-3xl border border-[#0D9488]/30 bg-[#F6E7C1] px-4 py-3">
        <p className="text-sm leading-relaxed text-slate-700">{t('hw.student.privateNote')}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('hw.student.mapEntry')}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('hw.student.teacherCanOpen')}</p>
      </div>
    </section>
  )
}

export function HomeworkStudent() {
  const { t } = useT()
  const joined = useJoinedClassroom()
  const rows = withLearningWorksheet(
    assignmentsForClass({ assignments: useAssignList() }, DEMO_CLASS_ID),
    DEMO_CLASS_ID,
  )
  if (joined) return <JoinedHomework room={joined} />
  const titleId = 'hw-student-title'
  const demoCopy = {
    title: t('assign.staff.demoTitle'),
    due: t('assign.staff.demoDue'),
    instructions: t('assign.staff.demoInstructions'),
  }
  const f5Copy = {
    title: t('assign.staff.f5demoTitle'),
    due: t('assign.staff.f5demoDue'),
    instructions: t('assign.staff.f5demoInstructions'),
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
              const shown = visibleAssignment(assignment, demoCopy, f5Copy)
              return (
                <HomeworkCard
                  key={assignment.id}
                  assignment={assignment}
                  due={shown.due}
                  title={shown.title}
                  instructions={assignment.id === F5_DEMO_ASSIGN_ID ? shown.instructions : ''}
                />
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

function saveHtml(name: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function copy(key: string): string {
  return t(key as MessageKey)
}

function HomeworkDownloads({ assignmentId }: { assignmentId: string }) {
  const { t } = useT()
  const downloads =
    assignmentId === DEMO_ASSIGN_ID
      ? [
          { id: 'l3', label: t('hw.student.downloadL3'), lessonId: 'F4-U3-L3' },
          { id: 'l4', label: t('hw.student.downloadL4'), lessonId: 'F4-U3-L4' },
        ]
      : assignmentId === F5_DEMO_ASSIGN_ID
        ? [
            { id: 'f5-paper', label: t('hw.student.downloadF5Paper'), lessonId: 'F5-U3-L1' },
            { id: 'f5-instructions', label: t('hw.student.downloadF5Instructions'), lessonId: '' },
          ]
        : []
  if (downloads.length === 0) return null

  function download(id: string, lessonId: string) {
    if (id === 'f5-instructions') {
      const dueLine = `${t('hw.student.due')} ${t('assign.staff.f5demoDue')}`
      saveHtml(
        F5_INSTRUCTIONS_DOWNLOAD_NAME,
        homeworkInstructionsHtml({
          lang: HTML_LANG[getLocale()],
          title: t('assign.staff.f5demoTitle'),
          dueLine,
          instructions: t('assign.staff.f5demoInstructions'),
        }),
      )
      return
    }
    const lesson = worksheetLessonOf(lessonId)
    if (!lesson) return
    const file = worksheetDownloadFor(lesson, HTML_LANG[getLocale()], copy)
    saveHtml(file.name, file.html)
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2" data-testid={`hw-student-downloads-${assignmentId}`}>
      {downloads.map((item) => (
        <button
          key={item.id}
          type="button"
          data-testid={`hw-download-${item.id}`}
          onClick={() => download(item.id, item.lessonId)}
          className="inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-white px-4 py-2 text-left text-sm font-semibold text-[#0D9488]"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function HomeworkCard({
  assignment,
  title,
  due,
  instructions,
  classId = DEMO_CLASS_ID,
  studentId = HW_LEARNER_ID,
  roomCode = '',
  roomName = '',
  joined = false,
}: {
  assignment: StaffAssignment
  title: string
  due: string
  instructions: string
  classId?: string
  studentId?: string
  roomCode?: string
  roomName?: string
  joined?: boolean
}) {
  const { t } = useT()
  const submissions = useHomeworkSubmissions()
  const joinedRoom = useJoinedClassroom()
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const existing =
    submissions.find(
      (row) => row.classId === classId && row.assignmentId === assignment.id && row.studentId === studentId,
    ) ?? null
  const remoteName =
    joinedRoom?.submissions.find((row) => row.assignmentId === assignment.id && row.fileName)?.fileName ?? ''
  const handedName = existing?.fileName || remoteName
  const error = file ? homeworkFileError(file) : null
  const ready = file != null && error == null
  const inputId = `hw-student-file-${assignment.id}`

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!file || homeworkFileError(file)) return
    const id = homeworkSubmissionId(classId, assignment.id, studentId)
    const ok = submitHomework({
      classId,
      assignmentId: assignment.id,
      studentId,
      fileName: file.name,
    })
    if (!ok) return
    if (joined && roomCode) void submitJoinedHomework({ assignmentId: assignment.id, fileName: file.name })
    rememberHomeworkFile(id, file)
    if (inputRef.current) inputRef.current.value = ''
    setFile(null)
  }

  const handedIn = handedName !== ''
  return (
    <li
      data-testid={`hw-student-card-${assignment.id}`}
      data-hw-handed-in={handedIn ? 'true' : 'false'}
      className={
        joined
          ? 'rounded-3xl border-2 border-[#0D9488] bg-white p-4'
          : 'rounded-3xl border border-[#0D9488]/30 bg-white p-4'
      }
    >
      {assignment.id === LEARNING_WORKSHEET_ASSIGN_ID ? <LearningWorksheetFile /> : null}
      {title ? <h3 className="text-lg font-bold text-slate-900">{title}</h3> : null}
      {joined && roomName ? <p className="mt-1 text-sm text-slate-700">{roomName}</p> : null}
      {joined || due ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
          {joined ? (
            <span
              className={
                handedIn
                  ? 'inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]'
                  : 'inline-flex rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600'
              }
            >
              {handedIn ? t('inspect.practice.submitted') : t('inspect.practice.notSubmitted')}
            </span>
          ) : null}
          {due ? (
            <span>
              {t('hw.student.due')} {due}
            </span>
          ) : null}
        </p>
      ) : null}
      {assignment.id === LEARNING_WORKSHEET_ASSIGN_ID && !joined && !handedIn ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('hw.student.wholeFile')}</p>
      ) : null}
      {instructions ? <p className="mt-2 text-sm leading-relaxed text-slate-700">{instructions}</p> : null}
      {joined && assignment.id === DEMO_ASSIGN_ID ? (
        <p className="mt-3">
          <span className="inline-flex max-w-full rounded-full border border-[#0D9488] bg-white px-3 py-1 text-left text-sm font-semibold text-[#0D9488]">
            {t('assign.staff.attachPaper')}
          </span>
        </p>
      ) : null}
      <HomeworkDownloads assignmentId={assignment.id} />
      {handedName ? <p className="mt-2 text-sm font-semibold text-[#0D9488]">{handedName}</p> : null}
      {joined ? (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">{t('hw.student.wholeFile')}</p>
          <div>
            <p className="text-sm font-semibold text-slate-800">{t('hw.student.upload')}</p>
            <p className="mt-1 text-sm text-slate-700">{t('hw.staff.genericFile')}</p>
            <p className="text-sm text-slate-600">{t('hw.staff.pagesHint')}</p>
          </div>
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
            {t('hw.student.upload')}
          </button>
        </form>
      ) : handedIn ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-700" data-testid={`hw-student-handed-${assignment.id}`}>
          {t('hw.student.handedQuiet')}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
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
          {file ? <p className="text-sm text-slate-700">{file.name}</p> : null}
          <button
            type={ready ? 'submit' : 'button'}
            data-testid={`hw-student-submit-${assignment.id}`}
            onClick={() => {
              if (!ready) inputRef.current?.click()
            }}
            className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
          >
            {t('hw.student.uploadAndHandIn')}
          </button>
        </form>
      )}
    </li>
  )
}
