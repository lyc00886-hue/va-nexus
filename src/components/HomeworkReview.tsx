import { useMemo, useRef, useState } from 'react'
import { contentJson } from '../i18n/content'
import { useT, type MessageKey } from '../i18n'
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
  confirmHomeworkTeacherMark,
  homeworkCounts,
  homeworkFileLabel,
  homeworkPlateMatch,
  homeworkRosterIds,
  homeworkRows,
  homeworkSessionFile,
  homeworkSubmissionId,
  saveHomeworkTeacherComment,
  teacherCommentForSubmission,
  teacherMarkForSubmission,
  useHomeworkSubmissions,
  useHomeworkTeacherComments,
  useHomeworkTeacherMarks,
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
export function HomeworkReview({
  classId,
  demoClass,
  sharedRoom = null,
}: {
  classId: string
  demoClass: boolean
  sharedRoom?: InviteRoom | null
}) {
  const { t } = useT()
  const assignments = assignmentsForClass({ assignments: useAssignList() }, classId)
  const localSubmissions = useHomeworkSubmissions()
  const remoteSubmissions: HwSubmission[] = (sharedRoom?.submissions ?? []).flatMap((row) => {
    if (!row.memberId || !row.assignmentId || !row.fileName) return []
    return [
      {
        id: homeworkSubmissionId(classId, row.assignmentId, row.memberId),
        classId,
        assignmentId: row.assignmentId,
        studentId: row.memberId,
        fileName: row.fileName,
        demo: false,
      },
    ]
  })
  const submissions = [...localSubmissions, ...remoteSubmissions]
  const sharedRoster = sharedRoom ? sharedRoom.members.map((member) => member.id) : null
  const reviewed =
    submissions.find((row) => row.classId === classId && row.studentId === 'demo-a') ??
    submissions.find((row) => row.classId === classId) ??
    null
  const [open, setOpen] = useState(true)
  const [fileId, setFileId] = useState<string | null>(null)
  const titleId = 'hw-staff-title'
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
          key={opened.id}
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
                const shown = visibleAssignment(assignment, demoCopy, f5Copy)
                const roster = sharedRoster ?? homeworkRosterIds(classId, demoClass)
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
              {reviewed ? <CompareReview submission={reviewed} /> : null}
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
      <GradePanel submissionId={submission.id} />
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

function GradePanel({ submissionId }: { submissionId: string }) {
  const { t } = useT()
  const marks = useHomeworkTeacherMarks()
  const saved = teacherMarkForSubmission(marks, submissionId)
  const official = t('hw.staff.teacherGradeValue')
  const [draft, setDraft] = useState(saved ?? official)
  const [confirmed, setConfirmed] = useState(saved != null)
  const fieldId = 'hw-staff-teacher-grade'

  function confirm() {
    const ok = confirmHomeworkTeacherMark(submissionId, draft)
    if (ok) setConfirmed(true)
  }

  return (
    <div data-testid="hw-staff-grade" data-hw-grade-saved={confirmed ? 'true' : 'false'} className="space-y-3">
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.criteriaTitle')}</h4>
        <p data-testid="hw-staff-criteria" className="mt-1 text-sm leading-relaxed text-slate-700">
          {t('hw.staff.criteriaBody')}
        </p>
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">{t('hw.staff.autoGradeLabel')}</h4>
        <p data-testid="hw-staff-auto-grade" className="mt-1 text-sm leading-relaxed text-slate-700">
          {t('hw.staff.autoGradeValue')}
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
          value={draft}
          rows={2}
          onChange={(event) => {
            setDraft(event.target.value)
            setConfirmed(false)
          }}
          className="mt-2 w-full resize-y rounded-full border border-[#0D9488] bg-white px-4 py-3 text-sm leading-relaxed text-slate-800"
        />
      </div>
      <button
        type="button"
        data-testid="hw-staff-save-grade"
        onClick={confirm}
        className="whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
      >
        {t('hw.staff.saveGrade')}
      </button>
    </div>
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
  const nameKey = NAME_KEY[submission.studentId]
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
        <p className="mt-2 font-semibold text-[#0D9488]">{nameKey ? t(nameKey) : submission.studentId}</p>
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
