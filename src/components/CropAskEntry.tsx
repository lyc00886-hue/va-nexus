import { useT } from '../i18n'
import type { CropAskGrade } from '../lib/cropAsk'
import { GRADE_LABEL } from '../lib/softGoMaps'
import { setCropAskOpen, useCropAskStore } from '../lib/useCropAsk'
import { CropAskWork } from './CropAskWork'

const CHIP = 'rounded-full border border-[#0D9488] px-2 py-0.5 text-xs font-semibold text-[#0D9488]'

/** Light entry shared by the quest map and the classic map. Both open this tool and its draft library. */
export function CropAskEntry({
  mode,
  grade,
  unit,
}: {
  mode: 'map1' | 'classic'
  grade: CropAskGrade
  unit: { id: string; title: string }
}) {
  const { t } = useT()
  const open = useCropAskStore().open
  return (
    <section
      data-crop-ask-entry
      data-crop-ask-mode={mode}
      data-crop-ask-unit={unit.id}
      data-soft-motion="off"
      className="rounded-3xl border-2 border-[#0D9488] bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-xl font-bold text-[#0D9488]">{t('cropask.title')}</h2>
        {open ? (
          <button
            type="button"
            onClick={() => setCropAskOpen(false)}
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
      <button
        type="button"
        data-testid="crop-ask-start"
        onClick={() => setCropAskOpen(true)}
        className="mt-3 rounded-full bg-[#0D9488] px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
      >
        {t('cropask.entry.cta')}
      </button>
      {open ? <CropAskWork grade={grade} unit={unit} /> : null}
    </section>
  )
}
