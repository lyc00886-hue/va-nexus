import { useT } from '../i18n'
import type { CropAskGrade } from '../lib/cropAsk'
import { GRADE_LABEL } from '../lib/softGoMaps'
import { CropAskWork } from './CropAskWork'

const CHIP = 'rounded-full border border-[#0D9488] px-2 py-0.5 text-xs font-semibold text-[#0D9488]'

/** Opened Look closely tool. The research pair is the only student entry. */
export function CropAskEntry({
  grade,
  unit,
  onClose,
  onOpenWriting,
}: {
  grade: CropAskGrade
  unit: { id: string; title: string }
  onClose?: () => void
  onOpenWriting?: () => void
}) {
  const { t } = useT()
  return (
    <section
      data-crop-ask-entry
      data-crop-ask-unit={unit.id}
      data-soft-motion="off"
      className="mt-4 rounded-3xl border-2 border-[#0D9488] bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-xl font-bold text-[#0D9488]">{t('cropask.title')}</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#0D9488] px-3 py-1 text-sm font-semibold text-[#0D9488]"
          >
            {t('cropask.close')}
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('cropask.intro')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-800">
        <span className={CHIP}>{t('cropask.unitLabel')}</span>
        <span className="font-semibold">{unit.title}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <span className={CHIP}>{t('cropask.gradeLabel')}</span>
        <span className="rounded-full bg-[#0D9488] px-2 py-0.5 text-xs font-semibold text-white">{t(GRADE_LABEL[grade])}</span>
        <span>{t('cropask.entry.fromUnit')}</span>
      </div>
      <CropAskWork grade={grade} unit={unit} onOpenWriting={onOpenWriting} />
    </section>
  )
}
