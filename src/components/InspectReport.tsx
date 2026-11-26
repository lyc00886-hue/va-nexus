import { useEffect } from 'react'
import { HTML_LANG, useT, type MessageKey } from '../i18n'
import { useRealClassrooms } from '../lib/classInvite'
import { gradeLabelKey, useInspectRows, type InspectView } from '../lib/useInspectClass'
import {
  fileFollowKind,
  homeworkFileLabel,
  inSchoolCommentForStudent,
  inSchoolMarkForStudent,
  preferredHomework,
  realRoomSubmissions,
  useHomeworkSubmissions,
  useHomeworkTeacherComments,
  useHomeworkTeacherMarks,
  type FileFollowKind,
  type HwSubmission,
} from '../lib/homeworkSubmit'
import {
  collectedReportValue,
  inspectExportDate,
  learningProgressFilename,
  renderInspectReportHtml,
  studentHomeworkCollected,
  teacherCommentText,
  type ReportSection,
} from '../lib/inspectReport'
import { StaffStudentName } from './InSchoolPrivacyName'

export type InspectPreview = { kind: 'one'; id: string } | { kind: 'class' }

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

function analysisKey(kind: FileFollowKind | null): MessageKey {
  if (kind === 'f4') return 'report.staff.analysisValue.f4'
  if (kind === 'f5') return 'report.staff.analysisValue.f5'
  return 'report.staff.analysisValue'
}

function sectionFor(
  row: InspectView,
  labels: Record<string, string>,
  gradeText: string,
  extra: {
    homework: string
    note: string
    bandKeep: string
    noteHint: string
    auto: string
    teacher: string
    analysis: string
    refNote: string
    teacherComment: string
    evidenceIntro: string
    studentWork: string
    studentCritique: string
  },
): ReportSection {
  return {
    name: row.name,
    rows: [
      { label: labels.student, value: row.name },
      { label: labels.grade, value: gradeText },
      { label: labels.units, value: row.units },
      { label: labels.practice, value: `${row.mcScore}\n${row.written}` },
      { label: labels.artwork, value: row.artwork },
      { label: labels.research, value: row.research },
      { label: labels.band, value: `${row.band}\n${extra.bandKeep}` },
      { label: labels.homework, value: extra.homework },
      { label: labels.note, value: `${extra.note}\n${extra.noteHint}` },
      { label: labels.auto, value: extra.auto },
      { label: labels.teacher, value: extra.teacher },
      { label: labels.analysis, value: `${extra.analysis}\n${extra.refNote}` },
      { label: labels.teacherComment, value: extra.teacherComment },
      { label: labels.date, value: row.date },
      { label: labels.evidence, value: extra.evidenceIntro },
      { label: labels.studentWork, value: extra.studentWork },
      { label: labels.studentCritique, value: extra.studentCritique },
      { label: labels.evidenceComment, value: extra.teacherComment },
    ],
  }
}

function mergeReportSubmissions(local: readonly HwSubmission[], remote: readonly HwSubmission[]): HwSubmission[] {
  if (remote.length === 0) return [...local]
  const seen = new Set(local.map((row) => row.id))
  return [...local, ...remote.filter((row) => !seen.has(row.id))]
}

function realReportViews(
  rows: readonly InspectView[],
  submissions: readonly HwSubmission[],
  privacyLabel: string,
  none: string,
  unset: string,
): InspectView[] {
  const known = new Set(rows.map((row) => row.id))
  const views: InspectView[] = []
  const seen = new Set<string>()
  for (const row of submissions) {
    if (row.demo || known.has(row.studentId) || seen.has(row.studentId)) continue
    seen.add(row.studentId)
    const preferred = preferredHomework(submissions, row.studentId)
    const kind = preferred ? fileFollowKind(preferred.assignmentId) : null
    views.push({
      id: row.studentId,
      name: privacyLabel,
      demo: false,
      grade: kind === 'f5' ? 'f5' : kind === 'f4' ? 'f4' : null,
      manualAttention: false,
      status: { missing: false, behind: false, attention: false, steady: true },
      done: 1,
      total: 1,
      units: none,
      mcScore: none,
      written: none,
      artwork: none,
      research: none,
      band: unset,
      date: inspectExportDate(),
    })
  }
  return views
}

export function InspectReport({ preview, onClose }: { preview: InspectPreview | null; onClose: () => void }) {
  const { t, locale } = useT()
  const rows = useInspectRows()
  const localSubmissions = useHomeworkSubmissions()
  const rooms = useRealClassrooms()
  const remoteSubmissions = rooms.flatMap((room) => realRoomSubmissions(room))
  const submissions = mergeReportSubmissions(localSubmissions, remoteSubmissions)
  const marks = useHomeworkTeacherMarks()
  const comments = useHomeworkTeacherComments()
  const privacyLabel = t('cropask.staff.student')
  const none = t('inspect.report.none')
  const unset = t('inspect.report.unsetBand')
  const realViews = realReportViews(rows, remoteSubmissions, privacyLabel, none, unset)
  const privacyIds = new Set(realViews.map((row) => row.id))
  const classRows = [...rows, ...realViews]
  const shown = preview?.kind === 'class' ? classRows : rows.filter((row) => row.id === preview?.id)

  function collectionFor(row: InspectView): {
    homework: string
    note: string
    auto: string
    teacher: string
    analysis: string
    teacherComment: string
    studentWork: string
    studentCritique: string
    collected: boolean
  } {
    const collected = studentHomeworkCollected(submissions, row.id)
    const none = t('inspect.report.none')
    const saved = inSchoolMarkForStudent(marks, submissions, row.id)
    const savedComment = inSchoolCommentForStudent(comments, submissions, row.id)
    const preferred = preferredHomework(submissions, row.id)
    const kind = preferred ? fileFollowKind(preferred.assignmentId) : null
    const file = preferred ?? submissions.find((item) => item.studentId === row.id)
    return {
      homework: collectedReportValue(collected, t('report.staff.homeworkValue'), none),
      note: collectedReportValue(collected, t('report.staff.noteValue'), none),
      auto: collectedReportValue(collected, t(autoGradeKey(kind)), none),
      teacher: collected ? (saved ?? t(teacherGradeKey(kind))) : none,
      analysis: collectedReportValue(collected, t(analysisKey(kind)), none),
      teacherComment: teacherCommentText(collected, savedComment, t('hw.staff.autoCommentValue'), none),
      studentWork: collected && file ? homeworkFileLabel(file, t('hw.staff.genericFile')) : none,
      studentCritique: collectedReportValue(collected, t('hw.staff.studentCritiqueValue'), none),
      collected,
    }
  }

  useEffect(() => {
    if (!preview) return
    document.getElementById('inspect-report')?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [preview])

  function download(list: InspectView[]) {
    const labels = {
      student: t('inspect.report.student'),
      grade: t('inspect.report.grade'),
      units: t('inspect.report.units'),
      practice: t('inspect.report.practice'),
      artwork: t('inspect.report.artwork'),
      research: t('inspect.report.research'),
      band: t('inspect.report.band'),
      homework: t('report.staff.homework'),
      note: t('report.staff.note'),
      auto: t('report.staff.autoGrade'),
      teacher: t('report.staff.teacherGrade'),
      analysis: t('report.staff.analysis'),
      teacherComment: t('report.staff.teacherComment'),
      date: t('inspect.report.date'),
      evidence: t('inspect.evidence.title'),
      studentWork: t('inspect.evidence.studentWork'),
      studentCritique: t('inspect.evidence.studentCritique'),
      evidenceComment: t('inspect.evidence.teacherComment'),
    }
    const bandKeep = t('report.staff.bandKeep')
    const noteHint = t('report.staff.noteHint')
    const refNote = t('report.staff.refNote')
    const sections = list
      .filter((row) => row.name.trim() !== '')
      .map((row) =>
        sectionFor(row, labels, row.grade ? t(gradeLabelKey(row.grade)) : t('inspect.report.none'), {
          ...collectionFor(row),
          bandKeep,
          noteHint,
          refNote,
          teacherComment: collectionFor(row).teacherComment,
          evidenceIntro: t('inspect.evidence.intro'),
          studentWork: collectionFor(row).studentWork,
          studentCritique: collectionFor(row).studentCritique,
        }),
      )
    const filename = learningProgressFilename()
    const html = renderInspectReportHtml({
      lang: HTML_LANG[locale],
      title: t('report.staff.title'),
      disclaimer: t('inspect.report.disclaimer'),
      sections,
      filename,
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.html`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const one = preview?.kind === 'one' ? shown[0] : undefined

  return (
    <section id="inspect-report" aria-labelledby="inspect-report-title" data-testid="inspect-report" data-soft-motion="off" className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5">
      <div>
        <h2 id="inspect-report-title" data-testid="report-staff-title" className="text-xl font-bold text-slate-900">
          {t('report.staff.title')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('report.staff.intro')}</p>
      </div>

      {preview && shown.length > 0 ? (
        <article data-testid="inspect-report-preview" className="rounded-3xl border-2 border-[#0D9488] bg-white p-4">
          <p role="note" data-testid="inspect-report-disclaimer" className="rounded-2xl border border-amber-200 bg-[#fff4e5] px-4 py-3 text-sm leading-relaxed text-amber-950">
            {t('inspect.report.disclaimer')}
          </p>
          <div className="mt-4 space-y-6">
            {shown.map((row) => {
              const collection = collectionFor(row)
              return (
              <div key={row.id}>
                <h3 className="text-base font-bold text-[#0D9488]">
                  {privacyIds.has(row.id) ? <StaffStudentName studentId={row.id} /> : row.name}
                </h3>
                <dl className="mt-2 space-y-2 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.student')}</dt>
                    <dd>{privacyIds.has(row.id) ? <StaffStudentName studentId={row.id} /> : row.name}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.grade')}</dt>
                    <dd>{row.grade ? t(gradeLabelKey(row.grade)) : t('inspect.report.none')}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.units')}</dt>
                    <dd>{row.units}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.practice')}</dt>
                    <dd>{row.mcScore}</dd>
                    <dd>{row.written}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.artwork')}</dt>
                    <dd>{row.artwork}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.research')}</dt>
                    <dd>{row.research}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.band')}</dt>
                    <dd data-testid={`inspect-band-${row.id}`}>{row.band}</dd>
                    <p data-testid={`report-band-keep-${row.id}`} className="mt-1 text-sm leading-relaxed text-slate-600">
                      {t('report.staff.bandKeep')}
                    </p>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.homework')}</dt>
                    <dd data-testid={`report-homework-${row.id}`}>{collection.homework}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.note')}</dt>
                    <dd data-testid={`report-note-${row.id}`}>{collection.note}</dd>
                    <p data-testid={`report-note-hint-${row.id}`} className="mt-1 text-sm leading-relaxed text-slate-600">
                      {t('report.staff.noteHint')}
                    </p>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.autoGrade')}</dt>
                    <dd data-testid={`report-auto-${row.id}`}>{collection.auto}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.teacherGrade')}</dt>
                    <dd data-testid={`report-teacher-${row.id}`}>{collection.teacher}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.analysis')}</dt>
                    <dd data-testid={`report-analysis-${row.id}`}>{collection.analysis}</dd>
                    <p data-testid={`report-ref-note-${row.id}`} className="mt-1 text-sm leading-relaxed text-slate-600">
                      {t('report.staff.refNote')}
                    </p>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.teacherComment')}</dt>
                    <dd data-testid={`report-teacher-comment-${row.id}`}>{collection.teacherComment}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.date')}</dt>
                    <dd>{row.date}</dd>
                  </div>
                </dl>
                <section data-testid={`inspect-evidence-${row.id}`} className="mt-4 space-y-3 border-t border-[#0D9488]/30 pt-4">
                  <h4 className="text-base font-bold text-slate-900">{t('inspect.evidence.title')}</h4>
                  <p className="text-sm leading-relaxed text-slate-600">{t('inspect.evidence.intro')}</p>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{t('inspect.evidence.studentWork')}</h5>
                    <p data-testid={`inspect-evidence-work-${row.id}`} className="mt-1 text-sm text-slate-700">
                      {collection.studentWork}
                    </p>
                    {collection.collected ? (
                      <ol data-testid="inspect-evidence-pages" data-evidence-pages="3" className="m-0 mt-3 grid list-none gap-3 p-0 sm:grid-cols-3">
                        <li className="rounded-2xl border border-[#0D9488]/30 bg-[#FFF9E9] p-3">
                          <p className="text-xs font-semibold text-[#0D9488]">1</p>
                          <div className="mt-2 flex h-28 items-center justify-center rounded-lg bg-white">
                            <div className="h-20 w-12 rounded-md border-2 border-[#0D9488]" />
                          </div>
                        </li>
                        <li className="rounded-2xl border border-[#0D9488]/30 bg-[#FFF9E9] p-3">
                          <p className="text-xs font-semibold text-[#0D9488]">2</p>
                          <div className="mt-2 space-y-2">
                            {['a', 'b', 'c', 'd', 'e'].map((line) => (
                              <div key={line} className="h-2 rounded bg-[#0D9488]/20" />
                            ))}
                          </div>
                        </li>
                        <li className="rounded-2xl border border-[#0D9488]/30 bg-[#FFF9E9] p-3">
                          <p className="text-xs font-semibold text-[#0D9488]">3</p>
                          <div className="mt-2 space-y-2">
                            {['a', 'b', 'c'].map((line) => (
                              <div key={line} className="h-2 rounded bg-[#0D9488]/20" />
                            ))}
                            <div className="h-12 rounded-lg border border-[#0D9488]/40" />
                          </div>
                        </li>
                      </ol>
                    ) : null}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{t('inspect.evidence.studentCritique')}</h5>
                    <p data-testid={`inspect-evidence-critique-${row.id}`} className="mt-1 text-sm leading-relaxed text-slate-700">
                      {collection.studentCritique}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{t('inspect.evidence.teacherComment')}</h5>
                    <p data-testid={`inspect-evidence-comment-${row.id}`} className="mt-1 text-sm leading-relaxed text-slate-700">
                      {collection.teacherComment}
                    </p>
                  </div>
                </section>
              </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              {t('inspect.staff.closePreview')}
            </button>
            <button
              type="button"
              data-testid="inspect-export-one"
              disabled={!one}
              onClick={() => {
                if (one) download([one])
              }}
              className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('inspect.staff.exportOne')}
            </button>
            <button
              type="button"
              data-testid="inspect-export-class"
              disabled={preview.kind !== 'class'}
              onClick={() => download(classRows)}
              className="rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488] disabled:opacity-40"
            >
              {t('inspect.staff.exportClass')}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600">{t('inspect.report.printHint')}</p>
        </article>
      ) : null}
    </section>
  )
}
