import { t } from '../../i18n'
import {
  GRADE_LABEL,
  SCOPE_CHIP,
  SCOPE_LABEL,
  SOFT_GO_GRADES,
  SOFT_GO_TRACKS,
  type SoftGoGrade,
  type SoftGoTrack,
} from '../../lib/softGoMaps'

const CHIP =
  'rounded-full border font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

function chipClass(selected: boolean, compact: boolean): string {
  const size = compact ? 'min-h-9 px-2.5 py-1 text-[13px]' : 'min-h-9 px-3 py-1 text-sm'
  return selected
    ? `${CHIP} ${size} border-[#0D9488] bg-[#0D9488] text-[#FFF9E9]`
    : `${CHIP} ${size} border-[#0D9488] bg-white text-[#0D9488]`
}

export function GradeEmpty() {
  return (
    <p data-map-grade-empty className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-medium text-slate-700">
      {t('map.grade.empty')}
    </p>
  )
}

export function SoftMapPicker({
  track,
  grade,
  compact,
  onTrack,
  onGrade,
  onOpen,
  onBack,
}: {
  track: SoftGoTrack
  grade: SoftGoGrade
  compact: boolean
  onTrack: (track: SoftGoTrack) => void
  onGrade: (grade: SoftGoGrade) => void
  onOpen: () => void
  onBack: () => void
}) {
  return (
    <section data-map-picker={compact ? 'compact' : 'full'} className="rounded-[2rem] bg-[#FFF9E9] px-3 py-4 sm:px-5">
      {compact ? null : (
        <>
          <h2 className="text-center text-2xl font-bold text-slate-900">{t('map.pickTitle')}</h2>
          <p className="mt-1 text-center text-sm text-slate-500">{t('map.pickSub')}</p>
        </>
      )}
      <div className={compact ? '' : 'mt-4'}>
        <p className="text-xs font-semibold text-teal-800">{t('map.trackLabel')}</p>
        <div role="radiogroup" aria-label={t('map.trackLabel')} className="mt-2 flex flex-wrap gap-1.5">
          {SOFT_GO_TRACKS.map((id) => {
            const selected = track === id
            const full = t(SCOPE_LABEL[id])
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={full}
                data-map-track={id}
                data-selected={selected ? 'true' : 'false'}
                onClick={() => onTrack(id)}
                className={chipClass(selected, compact)}
              >
                {t(compact ? SCOPE_CHIP[id] : SCOPE_LABEL[id])}
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-3">
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
                className={chipClass(selected, compact)}
              >
                {t(GRADE_LABEL[id])}
              </button>
            )
          })}
        </div>
      </div>
      {compact ? (
        <button
          type="button"
          data-map-back
          onClick={onBack}
          className="mt-3 text-sm font-semibold text-[#0D9488] underline-offset-2 hover:underline"
        >
          {t('map.backTracks')}
        </button>
      ) : (
        <button
          type="button"
          data-map-open
          onClick={onOpen}
          className="mt-4 min-h-12 w-full rounded-2xl bg-[#0D9488] text-base font-bold text-white hover:bg-teal-700"
        >
          {t('map.openMap')}
        </button>
      )}
    </section>
  )
}
