import { useState } from 'react'
import { HomeworkFileReview } from './HomeworkReview'
import { InSchoolPrivacyName } from './InSchoolPrivacyName'
import { useT } from '../i18n'
import { getF4Units } from '../game/f4Demo'
import { getF5Units } from '../game/f5Demo'
import { visibleAssignment } from '../lib/assignList'
import { currentUnitFace } from '../lib/cropAsk'
import { fileFollowKind, type HwSubmission } from '../lib/homeworkSubmit'
import { GRADE_LABEL } from '../lib/softGoMaps'

/**
 * One real file on the teacher queue.
 * The live November homework keeps its official name. The school display name stays covered.
 */
export function RealHandInCard({ submission }: { submission: HwSubmission }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const kind = fileFollowKind(submission.assignmentId)
  const grade = kind === 'f5' ? 'f5' : kind === 'f4' ? 'f4' : null
  const unit = grade ? currentUnitFace(grade === 'f5' ? getF5Units() : getF4Units(), null) : null
  const shown = visibleAssignment(
    {
      id: submission.assignmentId,
      classId: submission.classId,
      title: '',
      due: '',
      instructions: '',
      attach: 'paper',
      demo: grade != null,
    },
    {
      title: t('assign.staff.demoTitle'),
      due: t('assign.staff.demoDue'),
      instructions: t('assign.staff.demoInstructions'),
    },
    {
      title: t('assign.staff.f5demoTitle'),
      due: t('assign.staff.f5demoDue'),
      instructions: t('assign.staff.f5demoInstructions'),
    },
  )

  return (
    <li
      data-testid={`crop-ask-real-${submission.id}`}
      data-hw-real="true"
      className="rounded-3xl border border-[#0D9488]/40 bg-white p-4"
    >
      <p className="text-xs font-semibold text-slate-500">{t('cropask.staff.student')}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
        <InSchoolPrivacyName label={t('cropask.staff.student')} />
        <button
          type="button"
          data-testid={`crop-ask-real-open-${submission.id}`}
          className="rounded-full border border-[#0D9488] px-3 py-1 text-sm font-semibold text-[#0D9488]"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? t('cropask.back') : t('cropask.staff.viewRegion')}
        </button>
      </div>
      {grade && unit ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-[#0D9488] px-2 py-0.5 text-xs font-semibold text-[#0D9488]">
            {t(GRADE_LABEL[grade])}
          </span>
          <span className="rounded-full bg-[#0D9488] px-2 py-0.5 text-xs font-semibold text-white">{t('cropask.unitLabel')}</span>
          <span className="font-semibold text-slate-900">{unit.title}</span>
          <span className="rounded-full bg-[#FFF4D6] px-2 py-0.5 text-xs font-semibold text-amber-950">
            {t('cropask.status.pending')}
          </span>
        </div>
      ) : null}
      {open ? (
        <div className="mt-4 space-y-3">
          {shown.title ? <h3 className="text-lg font-bold text-slate-900">{shown.title}</h3> : null}
          <p>
            <span className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]">
              {t('hw.staff.homeworkDoneChip')}
            </span>
          </p>
          <HomeworkFileReview submission={submission} classId={submission.classId} onBack={() => setOpen(false)} />
        </div>
      ) : null}
    </li>
  )
}
