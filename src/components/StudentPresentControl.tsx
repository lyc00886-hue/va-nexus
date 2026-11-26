import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { StaffStudentName } from './InSchoolPrivacyName'
import {
  presentationOverrideFor,
  setPresentationOverride,
  usePresentationOverrides,
  type PresentationMode,
} from '../lib/lessonPresentation'

const MODE_BUTTON =
  'whitespace-nowrap rounded-full border border-[#0D9488] px-4 py-2 text-sm font-semibold'

/**
 * Per-student standard or easy-read control inside the existing class roster.
 * The labels are the live presentation labels.
 */
export function StudentPresentControl({
  studentId,
  open,
  onOpen,
  extra = null,
}: {
  studentId: string
  open: boolean
  onOpen: () => void
  extra?: ReactNode
}) {
  const { t } = useT()
  const overrides = usePresentationOverrides()
  const saved = presentationOverrideFor(overrides, studentId)
  const current: PresentationMode = saved ?? 'standard'

  function choose(mode: PresentationMode) {
    setPresentationOverride(studentId, mode)
  }

  return (
    <li
      data-testid={`class-present-${studentId}`}
      data-present-open={open ? 'true' : 'false'}
      data-present-mode={current}
      data-present-saved={saved ? 'true' : 'false'}
      className={
        open
          ? 'rounded-3xl border-2 border-[#0D9488] bg-[#FFF9E9] p-4'
          : 'flex items-center justify-between gap-3 rounded-3xl border border-[#0D9488]/40 bg-white px-4 py-3'
      }
    >
      <div className={open ? '' : 'min-w-0'}>
        <button
          type="button"
          data-testid={`class-present-toggle-${studentId}`}
          aria-expanded={open}
          onClick={onOpen}
          className="text-left font-semibold text-slate-900"
        >
          <StaffStudentName studentId={studentId} />
        </button>
        {extra ? <div className="mt-2">{extra}</div> : null}
        {open ? (
          <div className="mt-3 space-y-2">
            <h4 className="text-base font-bold text-[#0D9488]">{t('class.staff.presentTitle')}</h4>
            <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.presentHint')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('present.choose')}>
              <button
                type="button"
                data-testid={`class-present-standard-${studentId}`}
                aria-pressed={current === 'standard'}
                onClick={() => choose('standard')}
                className={`${MODE_BUTTON} ${current === 'standard' ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'}`}
              >
                {t('present.standard')}
              </button>
              <button
                type="button"
                data-testid={`class-present-easy-${studentId}`}
                aria-pressed={current === 'easy'}
                onClick={() => choose('easy')}
                className={`${MODE_BUTTON} ${current === 'easy' ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'}`}
              >
                {t('present.easy')}
              </button>
            </div>
            {saved ? (
              <p data-testid={`class-present-saved-${studentId}`} className="text-sm text-slate-700">
                {t('class.staff.presentSaved')}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {open ? null : (
        <span className="shrink-0 rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488]">
          {t(current === 'easy' ? 'present.easy' : 'present.standard')}
        </span>
      )}
    </li>
  )
}
