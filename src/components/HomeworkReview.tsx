import { useEffect, useMemo, useRef, useState } from 'react'
import { contentJson } from '../i18n/content'
import { useT, type MessageKey } from '../i18n'
import { pullClassShellMarks, pushClassShellMark } from '../lib/classShellMarks'
import {
  comparisonChoiceAllowed,
  lessonComparisonWorks,
  verifiedAppreciationList,
  type AppreciationPack,
  type VerifiedWork,
} from '../game/verifiedArtworks'
import { assignmentsForClass, useAssignList, visibleAssignment } from '../lib/assignList'
import type { InviteRoom } from '../lib/classInvite'
import {
  assignmentsForSharedRoom,
  confirmHomeworkTeacherMark,
  homeworkCounts,
  fileFollowKind,
  homeworkFileLabel,
  homeworkPlateMatch,
  homeworkRosterIds,
  homeworkRows,
  homeworkSessionFile,
  mergeSharedAssignments,
  realRoomSubmissions,
  type FileFollowKind,
  saveHomeworkTeacherComment,
  teacherCommentForSubmission,
  teacherMarkForSubmission,
  useHomeworkSubmissions,
  useHomeworkTeacherComments,
  useHomeworkTeacherMarks,
  type HwSubmission,
} from '../lib/homeworkSubmit'
import { StaffStudentName } from './InSchoolPrivacyName'

/**
 * Submission list for one opened class, placed after the published assignments.
 * The short button label is not the system name.
 */
export function HomeworkReview({
  classId,
  classLabel,
  demoClass,
  sharedRoom = null,
}: {
  classId: string
  classLabel: string
  demoClass: boolean
  sharedRoom?: InviteRoom | null
}) {
  const { t } = useT()
  const localAssignments = assignmentsForClass({ assignments: useAssignList() }, classId)
  const assignments = sharedRoom
    ? mergeSharedAssignments(assignmentsForSharedRoom(sharedRoom), localAssignments)
    : localAssignments
  const localSubmissions = useHomeworkSubmissions()
  const remoteSubmissions = sharedRoom ? realRoomSubmissions(sharedRoom) : []
  const submissions = [...localSubmissions, ...remoteSubmissions]
  const sharedRoster = sharedRoom ? sharedRoom.members.map((member) => member.id) : null
  const reviewed =
    submissions.find((row) => row.classId === classId && row.studentId === 'demo-a') ??
    submissions.find((row) => row.classId === classId) ??
    null
  const [open, setOpen] = useState(true)
  const [fileId, setFileId] = useState<string | null>(null)
  const titleId = 'hw-staff-title'
  const markTitleId = 'hw-staff-mark-title'
  useEffect(() => {
    void pullClassShellMarks(classId)
  }, [classId])
  const opened = submissions.find((row) => row.id === fileId) ?? null
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

  const roster = sharedRoster ?? homeworkRosterIds(classId, demoClass)
  const marks = useHomeworkTeacherMarks()

  return (
    <>
    <section
      aria-labelledby={markTitleId}
      data-testid="hw-staff"
      data-soft-motion="off"
      data-hw-open={fileId ? 'file' : open ? 'list' : 'closed'}
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5"
    >
      <h2 id={markTitleId} className="text-xl font-bold text-[#0D9488]">
        {t('staff.block.assignmentMark')}
      </h2>
      <h3 id={titleId} className="text-xl font-bold text-slate-900">
        {t('hw.staff.title')}
      </h3>

      {opened ? (
        <SubmittedFile
          key={opened.id}
          submission={opened}
          classId={classId}
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
                const shown = visibleAssignment(assignment, demoCopy, f5Copy)
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
                        const fileName = row.submission ? homeworkFileLabel(row.submission, t('hw.staff.genericFile')) : ''
                        return (
                          <li
                            key={row.studentId}
                            data-testid={`hw-staff-row-${row.studentId}`}
                            data-hw-status={row.status}
                            className="rounded-3xl border border-[#0D9488]/30 bg-white p-4"
                          >
                            <p className="font-semibold text-slate-900">
                              <StaffStudentName studentId={row.studentId} />
                            </p>
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
              {reviewed ? <CompareReview submission={reviewed} /> : null}
              <p data-testid="hw-staff-not-marking" className="text-sm leading-relaxed text-slate-600">
                {t('hw.staff.notMarking')}
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
    <AssignmentAnalysis
      classId={classId}
      demoClass={demoClass}
      assignments={assignments}
      submissions={submissions}
      roster={roster}
      marks={marks}
      demoCopy={demoCopy}
      f5Copy={f5Copy}
    />
    <ClassAnalysis
      classId={classId}
      classLabel={classLabel}
      demoClass={demoClass}
      assignments={assignments}
      submissions={submissions}
      roster={roster}
      marks={marks}
      demoCopy={demoCopy}
      f5Copy={f5Copy}
    />
    </>
  )
}

export function HomeworkFileReview({
  submission,
  classId,
  onBack,
}: {
  submission: HwSubmission
  classId: string
  onBack: () => void
}) {
  return <SubmittedFile submission={submission} classId={classId} onBack={onBack} />
}

function SubmittedFile({
  submission,
  classId,
  onBack,
}: {
  submission: HwSubmission
  classId: string
  onBack: () => void
}) {
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
      <GradePanel submissionId={submission.id} classId={classId} assignmentId={submission.assignmentId} />
      <CommentEditor submissionId={submission.id} />
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

function autoGradeKey(kind: FileFollowKind | null): MessageKey {
  if (kind === 'f4') return 'hw.staff.autoGradeValue.f4'
  if (kind === 'f5') return 'hw.staff.autoGradeValue.f5'
  return 'hw.staff.autoGradeValue'
}

function teacherGradeKey(kind: FileFollowKind | null): MessageKey {
  if (kind === 'f4') return 'hw.staff.teacherGradeValue.f4'
  if (kind === 'f5') return 'hw.staff.teacherGradeValue.f5'
  return 'hw.staff.teacherGradeValue'
}

function StatusChip({ tone, children }: { tone: 'teal' | 'quiet'; children: string }) {
  const face =
    tone === 'teal'
      ? 'inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]'
      : 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700'
  return <span className={face}>{children}</span>
}

function GradePanel({
  submissionId,
  classId,
  assignmentId,
}: {
  submissionId: string
  classId: string
  assignmentId: string
}) {
  const { t } = useT()
  const marks = useHomeworkTeacherMarks()
  const saved = teacherMarkForSubmission(marks, submissionId)
  const official = t(teacherGradeKey(fileFollowKind(assignmentId)))
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? saved ?? official
  const fieldId = 'hw-staff-teacher-grade'
  const savedNow = saved != null && value.trim() === saved
  const readyFace = 'whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white'
  const savedFace = 'whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]'

  function confirm() {
    const ok = confirmHomeworkTeacherMark(submissionId, value, classId)
    if (!ok) return
    setDraft(null)
    void pushClassShellMark(classId, submissionId, value)
  }

  return (
    <div data-testid="hw-staff-grade" data-hw-grade-saved={savedNow ? 'true' : 'false'} data-class-shell="marks" className="space-y-3">
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.criteriaTitle')}</h4>
        <p data-testid="hw-staff-criteria" className="mt-1 text-sm leading-relaxed text-slate-700">
          {t('hw.staff.criteriaBody')}
        </p>
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.autoGradeLabel')}</h4>
        <p data-testid="hw-staff-auto-grade" className="mt-1 text-sm leading-relaxed text-slate-700">
          {t(autoGradeKey(fileFollowKind(assignmentId)))}
        </p>
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.adjustLabel')}</h4>
        <p data-testid="hw-staff-adjust" className="mt-1 text-sm leading-relaxed text-slate-700">
          {t('hw.staff.adjustHint')}
        </p>
      </div>
      <div>
        <label htmlFor={fieldId} className="text-base font-bold text-slate-900">
          {t('hw.staff.teacherGradeLabel')}
        </label>
        <textarea
          id={fieldId}
          data-testid="hw-staff-teacher-grade"
          value={value}
          rows={3}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          className="mt-2 w-full resize-y rounded-3xl border border-[#0D9488] bg-white px-4 py-3 text-sm leading-relaxed text-slate-800"
        />
      </div>
      <p className="m-0">
        {savedNow ? (
          <StatusChip tone="teal">{t('hw.staff.gradeSavedChip')}</StatusChip>
        ) : (
          <StatusChip tone="quiet">{t('hw.staff.waitingConfirmChip')}</StatusChip>
        )}
      </p>
      {savedNow ? (
        <p data-testid="hw-staff-grade-saved" className="text-sm leading-relaxed text-[#0D9488]">
          {t('hw.staff.gradeSaved')}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="hw-staff-save-grade"
        data-grade-face={savedNow ? 'saved' : 'ready'}
        onClick={confirm}
        className={savedNow ? savedFace : readyFace}
      >
        {t('hw.staff.saveGrade')}
      </button>
      <p data-testid="hw-staff-reconfirm" className="text-sm leading-relaxed text-slate-600">
        {t('hw.staff.reconfirmHint')}
      </p>
    </div>
  )
}

function AssignmentAnalysis({
  classId,
  demoClass,
  assignments,
  submissions,
  roster,
  marks,
  demoCopy,
  f5Copy,
}: {
  classId: string
  demoClass: boolean
  assignments: ReturnType<typeof assignmentsForClass>
  submissions: HwSubmission[]
  roster: readonly string[]
  marks: readonly { id: string; mark: string }[]
  demoCopy: { title: string; due: string; instructions: string }
  f5Copy: { title: string; due: string; instructions: string }
}) {
  const { t } = useT()
  const titleId = 'staff-assignment-analysis-title'
  return (
    <section
      aria-labelledby={titleId}
      data-testid="staff-assignment-analysis"
      data-soft-motion="off"
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5"
    >
      <h2 id={titleId} className="text-xl font-bold text-[#0D9488]">
        {t('staff.block.assignmentAnalysis')}
      </h2>
      <p className="text-sm leading-relaxed text-slate-600">{t('staff.assignmentAnalysis.lead')}</p>
      {assignments.map((assignment) => {
        const shown = visibleAssignment(assignment, demoCopy, f5Copy)
        const rows = homeworkRows({ submissions }, classId, assignment.id, roster)
        const counts = homeworkCounts(rows)
        const plate = homeworkPlateMatch(counts)
        const kind = fileFollowKind(assignment.id)
        return (
          <div key={assignment.id} data-testid={`staff-assignment-analysis-${assignment.id}`} className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">{shown.title}</h3>
            {roster.length > 0 ? (
              <p className="text-sm font-semibold text-[#0D9488]">
                {plate ? t('hw.staff.count') : `${counts.submitted}\uFF0F${counts.total}`}
              </p>
            ) : null}
            {counts.submitted > 0 ? (
              <p className="text-sm leading-relaxed text-slate-700">{t(autoGradeKey(kind))}</p>
            ) : null}
            <ul className="m-0 list-none space-y-3 p-0">
              {rows.map((row) => (
                <WorkRow key={row.studentId} studentId={row.studentId} submitted={row.status === 'submitted'} saved={row.submission != null && teacherMarkForSubmission(marks, row.submission.id) != null} />
              ))}
            </ul>
          </div>
        )
      })}
      {demoClass ? <p className="text-sm text-slate-600">{t('inspect.staff.demoNote')}</p> : null}
    </section>
  )
}

function ClassAnalysis({
  classId,
  classLabel,
  demoClass,
  assignments,
  submissions,
  roster,
  marks,
  demoCopy,
  f5Copy,
}: {
  classId: string
  classLabel: string
  demoClass: boolean
  assignments: ReturnType<typeof assignmentsForClass>
  submissions: HwSubmission[]
  roster: readonly string[]
  marks: readonly { id: string; mark: string }[]
  demoCopy: { title: string; due: string; instructions: string }
  f5Copy: { title: string; due: string; instructions: string }
}) {
  const { t } = useT()
  const titleId = 'staff-class-analysis-title'
  return (
    <section
      aria-labelledby={titleId}
      data-testid="staff-class-analysis"
      data-soft-motion="off"
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5"
    >
      <h2 id={titleId} className="text-xl font-bold text-[#0D9488]">
        {t('staff.block.classAnalysis')}
      </h2>
      <p className="text-sm leading-relaxed text-slate-600">{t('staff.classAnalysis.lead')}</p>
      <p className="font-semibold text-slate-900">{classLabel}</p>
      {demoClass ? <p className="text-sm text-slate-600">{t('inspect.staff.demoNote')}</p> : null}
      <ul className="m-0 list-none space-y-3 p-0">
        {roster.map((studentId) => (
          <li key={studentId} data-testid={`staff-class-analysis-${studentId}`} className="rounded-3xl border border-[#0D9488]/30 bg-[#FFF9E9] p-4">
            <p className="font-semibold text-slate-900">
              <StaffStudentName studentId={studentId} />
            </p>
            <div className="mt-3 space-y-3">
              {assignments.map((assignment) => {
                const shown = visibleAssignment(assignment, demoCopy, f5Copy)
                const row = homeworkRows({ submissions }, classId, assignment.id, [studentId])[0]
                const submitted = row?.status === 'submitted'
                const saved = row?.submission != null && teacherMarkForSubmission(marks, row.submission.id) != null
                return (
                  <div key={assignment.id}>
                    <p className="text-sm text-slate-700">{shown.title}</p>
                    <p className="mt-2 flex flex-wrap gap-2">
                      <StatusChip tone={submitted ? 'teal' : 'quiet'}>
                        {submitted ? t('hw.staff.homeworkDoneChip') : t('hw.staff.homeworkChip')}
                      </StatusChip>
                      {submitted ? (
                        <StatusChip tone={saved ? 'teal' : 'quiet'}>
                          {saved ? t('hw.staff.gradeSavedChip') : t('hw.staff.waitingConfirmChip')}
                        </StatusChip>
                      ) : null}
                    </p>
                  </div>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function WorkRow({ studentId, submitted, saved }: { studentId: string; submitted: boolean; saved: boolean }) {
  const { t } = useT()
  return (
    <li className="rounded-3xl border border-[#0D9488]/30 bg-[#FFF9E9] p-4">
      <p className="font-semibold text-slate-900">
        <StaffStudentName studentId={studentId} />
      </p>
      <p className="mt-2 flex flex-wrap gap-2">
        <StatusChip tone={submitted ? 'teal' : 'quiet'}>
          {submitted ? t('hw.staff.homeworkDoneChip') : t('hw.staff.homeworkChip')}
        </StatusChip>
        {submitted ? (
          <StatusChip tone={saved ? 'teal' : 'quiet'}>
            {saved ? t('hw.staff.gradeSavedChip') : t('hw.staff.waitingConfirmChip')}
          </StatusChip>
        ) : null}
      </p>
    </li>
  )
}

function CommentEditor({ submissionId }: { submissionId: string }) {
  const { t } = useT()
  const comments = useHomeworkTeacherComments()
  const saved = teacherCommentForSubmission(comments, submissionId)
  const [draft, setDraft] = useState(saved ?? '')
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const fieldId = 'hw-staff-teacher-comment'

  function write(next: string) {
    setDraft(next)
    saveHomeworkTeacherComment(submissionId, next)
  }

  function edit() {
    const next = draft.trim() === '' ? t('hw.staff.autoCommentValue') : draft
    write(next)
    fieldRef.current?.focus()
  }

  function replace() {
    write(t('hw.staff.teacherCommentValue'))
    fieldRef.current?.focus()
  }

  return (
    <div data-testid="hw-staff-comment" data-hw-comment-saved={saved ? 'true' : 'false'} className="space-y-3">
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.autoCommentLabel')}</h4>
        <p data-testid="hw-staff-auto-comment" className="mt-1 text-sm leading-relaxed text-slate-700">
          {t('hw.staff.autoCommentValue')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="hw-staff-edit-comment"
          onClick={edit}
          className="whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
        >
          {t('hw.staff.editComment')}
        </button>
        <button
          type="button"
          data-testid="hw-staff-replace-comment"
          onClick={replace}
          className="whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
        >
          {t('hw.staff.replaceComment')}
        </button>
      </div>
      <p data-testid="hw-staff-comment-hint" className="text-sm leading-relaxed text-slate-600">
        {t('hw.staff.commentHint')}
      </p>
      <div>
        <label htmlFor={fieldId} className="text-base font-bold text-slate-900">
          {t('hw.staff.teacherCommentLabel')}
        </label>
        <textarea
          id={fieldId}
          ref={fieldRef}
          data-testid="hw-staff-teacher-comment"
          value={draft}
          rows={2}
          onChange={(event) => write(event.target.value)}
          className="mt-2 w-full resize-y rounded-full border border-[#0D9488] bg-white px-4 py-3 text-sm leading-relaxed text-slate-800"
        />
      </div>
    </div>
  )
}

function PageSketch({ image, testId, label }: { image: string | null; testId: string; label: string }) {
  return (
    <ol data-testid={testId} data-hw-pages="3" aria-label={label} className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
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
  )
}

function CompareReview({ submission }: { submission: HwSubmission }) {
  const { t } = useT()
  const works = useMemo(() => {
    const listed = verifiedAppreciationList(
      contentJson<AppreciationPack>('f4-demo'),
      contentJson<AppreciationPack>('f5-demo'),
    )
    return lessonComparisonWorks(listed)
  }, [])
  const [picked, setPicked] = useState<string | null>(null)
  const selected = works.find((work) => work.image === picked) ?? works[0] ?? null
  const session = homeworkSessionFile(submission.id)
  const image = session && session.mime.startsWith('image/') ? session.url : null
  const fileName = homeworkFileLabel(submission, t('hw.staff.genericFile'))
  if (!selected || !comparisonChoiceAllowed(selected)) return null

  function choose(work: VerifiedWork) {
    if (!comparisonChoiceAllowed(work)) return
    setPicked(work.image)
  }

  return (
    <div data-testid="hw-staff-compare" data-compare-image={selected.image} className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[#0D9488]">{t('hw.staff.compareTitle')}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('hw.staff.reviewPairIntro')}</p>
        <p className="mt-2 font-semibold text-[#0D9488]">
          <StaffStudentName studentId={submission.studentId} />
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-base font-bold text-slate-900">{t('hw.staff.submittedWork')}</h4>
          <p className="mt-1 text-sm text-slate-600">{fileName}</p>
          <div className="mt-3">
            <PageSketch image={image} testId="hw-compare-pages" label={t('hw.staff.submittedWork')} />
          </div>
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">{t('hw.staff.compareWork')}</h4>
          <img src={selected.image} alt={selected.title} className="mt-3 h-48 w-full rounded-2xl object-cover" />
          <dl className="mt-3 space-y-1 text-sm text-slate-800">
            <div>
              <dt className="inline font-semibold">{t('art.attr.title')}</dt>
              <dd className="inline"> {selected.title}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{t('art.attr.artist')}</dt>
              <dd className="inline"> {selected.artist}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{t('art.attr.year')}</dt>
              <dd className="inline"> {selected.year}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{t('art.attr.source')}</dt>
              <dd className="inline"> {selected.source}</dd>
            </div>
          </dl>
          <p className="mt-2">
            <span className="inline-flex rounded-full border border-[#0D9488] px-3 py-1 text-sm font-semibold text-[#0D9488]">
              {t('art.attr.pd')}
            </span>
          </p>
        </div>
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.studentCritique')}</h4>
        <p data-testid="hw-staff-student-critique" className="mt-1 text-sm leading-relaxed text-slate-700">
          {t('hw.staff.studentCritiqueValue')}
        </p>
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.pickCompare')}</h4>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('hw.staff.pickCompareHint')}</p>
        <ul className="m-0 mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
          {works.map((work) => {
            const active = work.image === selected.image
            return (
              <li key={work.image}>
                <button
                  type="button"
                  data-testid={`hw-compare-pick-${work.side}`}
                  aria-pressed={active}
                  onClick={() => choose(work)}
                  className={
                    active
                      ? 'w-full rounded-2xl border-2 border-[#0D9488] bg-white p-3 text-left'
                      : 'w-full rounded-2xl border border-[#0D9488]/40 bg-white p-3 text-left'
                  }
                >
                  <img src={work.image} alt="" className="h-24 w-full rounded-xl object-cover" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">{work.title}</p>
                  <p className="text-sm text-slate-600">{work.source}</p>
                  <span className="mt-2 inline-flex rounded-full border border-[#0D9488] px-3 py-1 text-sm font-semibold text-[#0D9488]">
                    {t('art.attr.pd')}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <p data-testid="hw-compare-no-stand-in" className="text-sm leading-relaxed text-slate-600">
        {t('image.noStandIn')}
      </p>
    </div>
  )
}
