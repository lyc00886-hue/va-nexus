import {
  exerciseLogoSrc,
  exerciseMarkIsIconOnly,
  exerciseSpec,
  type ExerciseDocId,
} from '../../game/exerciseLogos'
import { t } from '../../i18n'

/** Logo plus the PEANUTS short name. ex.step is the icon only. */
export function ExerciseMark({ id }: { id: ExerciseDocId }) {
  const spec = exerciseSpec(id)
  const name = t(spec.shortKey)
  const iconOnly = exerciseMarkIsIconOnly(id)
  return (
    <span
      data-exercise={id}
      data-icon-only={iconOnly ? 'true' : 'false'}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/90 px-1.5 py-0.5 ring-1 ring-teal-100"
    >
      <span className="inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#FFF9E9]">
        <img
          src={exerciseLogoSrc(id)}
          alt=""
          width={1024}
          height={1024}
          decoding="async"
          className="h-full w-full scale-[1.45] object-cover"
        />
      </span>
      {iconOnly ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span className="truncate text-xs font-bold text-teal-950">{name}</span>
      )}
    </span>
  )
}

export function ExerciseMarks({ ids, center = false }: { ids: readonly ExerciseDocId[]; center?: boolean }) {
  if (ids.length === 0) return null
  return (
    <span data-exercise-marks className={`mt-1.5 flex flex-wrap gap-1 ${center ? 'justify-center' : ''}`}>
      {ids.map((id) => (
        <ExerciseMark key={id} id={id} />
      ))}
    </span>
  )
}
