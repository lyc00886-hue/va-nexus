import { useT } from '../i18n'
import { requestOpenInspect, type InspectGrade } from '../lib/inspectPractice'

/** Shared entry. The quest map and the classic map both open the same in-school bank. */
export function InspectMapEntry({ grade }: { grade: InspectGrade }) {
  const { t } = useT()
  return (
    <button
      type="button"
      data-inspect-entry
      data-inspect-grade={grade}
      data-soft-motion="off"
      onClick={() => requestOpenInspect(grade)}
      className="mt-3 inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
    >
      {t('inspect.practice.label')}
    </button>
  )
}
