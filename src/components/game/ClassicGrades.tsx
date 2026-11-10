import { t } from '../../i18n'
import { GRADE_LABEL, SOFT_GO_GRADES, type SoftGoGrade } from '../../lib/softGoMaps'

const CHIP =
  'rounded-full border font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

/** Classic-map year chips. Labels stay 中四／中五／中六. The version switch is not printed here. */
export function ClassicGrades({ grade, onGrade }: { grade: SoftGoGrade; onGrade: (grade: SoftGoGrade) => void }) {
  return (
    <div data-classic-grades>
      <p className="text-xs font-semibold text-teal-800">{t('map.gradeLabel')}</p>
      <div role="radiogroup" aria-label={t('map.gradeLabel')} className="mt-2 flex flex-wrap gap-1.5">
        {SOFT_GO_GRADES.map((id) => {
          const selected = grade === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-map-grade={id}
              data-selected={selected ? 'true' : 'false'}
              onClick={() => onGrade(id)}
              className={
                selected
                  ? `${CHIP} min-h-9 border-[#0D9488] bg-[#0D9488] px-3 py-1 text-sm text-[#FFF9E9]`
                  : `${CHIP} min-h-9 border-[#0D9488] bg-white px-3 py-1 text-sm text-[#0D9488]`
              }
            >
              {t(GRADE_LABEL[id])}
            </button>
          )
        })}
      </div>
    </div>
  )
}
