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

/** Full cards follow the plate order. The lock list itself stays islands-first. */
const CARD_ORDER: SoftGoTrack[] = ['history-cn', 'history-west', 'media', 'f4', 'islands']

function chipClass(selected: boolean, compact: boolean): string {
  const size = compact ? 'min-h-9 px-2.5 py-1 text-[13px]' : 'min-h-9 px-3 py-1 text-sm'
  return selected
    ? `${CHIP} ${size} border-[#0D9488] bg-[#0D9488] text-[#FFF9E9]`
    : `${CHIP} ${size} border-[#0D9488] bg-white text-[#0D9488]`
}

function cardSubtitle(id: SoftGoTrack): string {
  if (id === 'f4') return t('map.card.f4')
  if (id === 'islands') return t('map.card.islands')
  return t(SCOPE_CHIP[id])
}

function TrackMark({ id }: { id: SoftGoTrack }) {
  const common = { width: 28, height: 28, viewBox: '0 0 28 28', 'aria-hidden': true as const, className: 'shrink-0' }
  if (id === 'history-cn') {
    return (
      <svg {...common}>
        <circle cx="14" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (id === 'history-west') {
    return (
      <svg {...common}>
        <rect x="7" y="7" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (id === 'media') {
    return (
      <svg {...common}>
        <path d="M14 6 L23 22 H5 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (id === 'f4') {
    return (
      <svg {...common}>
        <text x="14" y="19" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">
          4
        </text>
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="14" cy="14" r="5" fill="currentColor" />
    </svg>
  )
}

export function GradeEmpty() {
  return (
    <p data-map-grade-empty className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-medium text-slate-700">
      {t('map.grade.empty')}
    </p>
  )
}

function GradeRow({
  grade,
  onGrade,
  compact,
}: {
  grade: SoftGoGrade
  onGrade: (grade: SoftGoGrade) => void
  compact: boolean
}) {
  return (
    <div className={compact ? 'mt-3' : 'mt-4'}>
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
      <p data-map-grade-later className="mt-2 text-xs text-slate-500">
        {t('map.grade.later')}
      </p>
    </div>
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
  onMotion,
}: {
  track: SoftGoTrack
  grade: SoftGoGrade
  compact: boolean
  onTrack: (track: SoftGoTrack) => void
  onGrade: (grade: SoftGoGrade) => void
  onOpen: () => void
  onBack: () => void
  onMotion?: () => void
}) {
  return (
    <section data-map-picker={compact ? 'compact' : 'full'} className="rounded-[2rem] bg-[#FFF9E9] px-3 py-4 sm:px-5">
      {compact ? null : (
        <>
          <h2 className="text-2xl font-bold text-slate-900">{t('map.pickTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('map.pickSub')}</p>
        </>
      )}
      {compact ? null : <GradeRow grade={grade} onGrade={onGrade} compact={false} />}
      {compact ? (
        <div>
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
                  className={chipClass(selected, true)}
                >
                  {t(SCOPE_CHIP[id])}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs font-semibold text-teal-800">{t('map.trackLabel')}</p>
          <div role="radiogroup" aria-label={t('map.trackLabel')} className="mt-2 grid grid-cols-2 gap-2">
            {CARD_ORDER.map((id) => {
              const selected = track === id
              const title = t(SCOPE_LABEL[id])
              const subtitle = cardSubtitle(id)
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${title} ${subtitle}`}
                  data-map-track={id}
                  data-map-card={id}
                  data-selected={selected ? 'true' : 'false'}
                  onClick={() => onTrack(id)}
                  className={`flex min-h-24 items-center gap-2 rounded-2xl border border-[#0D9488] px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488] ${
                    selected ? 'bg-[#0D9488] text-[#FFF9E9]' : 'bg-white text-slate-900'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug">{title}</span>
                    <span className={`mt-0.5 block text-xs ${selected ? 'text-[#FFF9E9]' : 'text-slate-500'}`}>{subtitle}</span>
                    {selected ? (
                      <span className="mt-2 inline-flex rounded-full bg-[#FFF9E9] px-2 py-0.5 text-[11px] font-bold text-[#0D9488]">
                        {t('map.selected')}
                      </span>
                    ) : null}
                  </span>
                  <TrackMark id={id} />
                </button>
              )
            })}
          </div>
        </div>
      )}
      {compact ? <GradeRow grade={grade} onGrade={onGrade} compact /> : null}
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
      {compact ? null : (
        <>
          <div data-map-tip className="mt-4 rounded-xl border border-[#f0c48a] bg-[#fde8c8] px-3 py-2.5 text-[#7a4b1a]">
            <p className="text-sm font-bold">{t('island.quest.tipTitle')}</p>
            <p className="mt-0.5 text-sm leading-relaxed">{t('map.pickTip')}</p>
          </div>
          <div data-map-quick className="mt-4">
            <p className="text-xs font-semibold text-teal-800">{t('map.quick')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CARD_ORDER.map((id) => (
                <button key={id} type="button" onClick={() => onTrack(id)} className={chipClass(track === id, true)}>
                  {t(SCOPE_CHIP[id])}
                </button>
              ))}
            </div>
          </div>
          {onMotion ? (
            <button
              type="button"
              data-map-motion
              onClick={onMotion}
              className="mt-3 text-sm font-semibold text-[#0D9488] underline-offset-2 hover:underline"
            >
              {t('map.motion')}
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
