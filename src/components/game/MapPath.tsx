import { Check, Lock } from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { Lesson, Mastery, Unit } from '../../game/types'
import { lessonExerciseIds, MOOD_PATH_SOFT, pathBendSide } from '../../game/exerciseLogos'
import { artistCreditSummary } from '../../game/lessonArtistLabels'
import { masteryLabel } from '../../game/rewards'
import { MOOD_EMPTY_MAP } from '../../game/softMotion'
import { t } from '../../i18n'
import { requestOpenTab } from '../../lib/openTab'
import type { LessonFoldId } from '../../lib/learningMapSections'
import { sectionOpen, type LearningMapSections } from '../../lib/learningMapSections'
import { DemoBadge } from './DemoBadge'
import { ExerciseMarks } from './ExerciseMark'
import { LessonPlayer } from './LessonPlayer'

const MASTERY_CHIP: Record<Mastery, string> = {
  none: 'bg-slate-100 text-slate-500',
  attempted: 'bg-orange-50 text-orange-700',
  familiar: 'bg-sky-50 text-sky-700',
  proficient: 'bg-blue-100 text-blue-800',
  mastered: 'bg-violet-100 text-violet-800',
}

type Props = {
  units: Unit[]
  currentId: string | null
  motion: boolean
  isUnlocked: (id: string) => boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
  sections: LearningMapSections
  onToggleLesson: (id: string) => void
  onCloseLesson: (id: string) => void
  onSetFold: (id: LessonFoldId, open: boolean) => void
  renderCover?: (lesson: Lesson) => ReactNode
  bannerFor?: (unit: Unit) => ReactNode
}

/**
 * Vertical soft-bent path. Unit titles stay as quiet labels.
 * The path is the thing you see first — lessons are not tucked inside a fold.
 */
export function MapPath({
  units,
  currentId,
  motion,
  isUnlocked,
  completed,
  masteryOf,
  sections,
  onToggleLesson,
  onCloseLesson,
  onSetFold,
  renderCover,
  bannerFor,
}: Props) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const ids = units.flatMap((unit) => unit.nodes.map((node) => node.id))
  const pathIndex = new Map(ids.map((id, index) => [id, index]))
  const lessonCount = ids.length

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = ids.length - 1
    let next = index
    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    buttonRefs.current[ids[next]]?.focus()
  }

  if (lessonCount === 0) {
    return (
      <div data-map-empty="path" className="rounded-[2rem] bg-[#FFF9E9] px-6 py-8 text-center">
        <img
          src={MOOD_EMPTY_MAP}
          alt=""
          width={1152}
          height={864}
          className="mx-auto w-full max-w-sm rounded-3xl object-contain"
          decoding="async"
        />
        <p className="mt-4 text-base font-semibold text-slate-800">{t('empty.noContent')}</p>
        <button
          type="button"
          data-map-cta="primary"
          onClick={() => requestOpenTab('research')}
          className="mt-4 min-h-14 w-full rounded-2xl bg-[#0D9488] text-base font-bold text-white hover:bg-teal-700"
        >
          {t('empty.noContent.cta')}
        </button>
      </div>
    )
  }

  return (
    <div data-path-mood={MOOD_PATH_SOFT} className="space-y-8">
      {units.map((unit) => {
        const done = unit.nodes.filter((node) => completed(node.id)).length
        const total = unit.nodes.length
        const pct = total === 0 ? 0 : Math.round((done / total) * 100)
        const openNodes = unit.nodes.filter((node) => isUnlocked(node.id) && sectionOpen(sections.lessons, node.id))
        return (
          <section key={unit.id} data-testid={`map-unit-${unit.id}`} data-map-residual="unit" className="scroll-mt-24">
            <div className="mx-auto mb-2 max-w-xs text-center">
              <p className="text-xs font-semibold tracking-wide text-teal-800">{t('map.fold.gradeOrUnit')}</p>
              <h3 className="text-lg font-bold text-slate-900">{unit.title}</h3>
              {unit.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{unit.subtitle}</p> : null}
              {unit.coverCredit ? <p className="mt-1 text-[11px] leading-snug text-slate-500">{unit.coverCredit}</p> : null}
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {t('map.unitProgress', { done, total, pct })}
              </p>
              {unit.nodes.some((node) => node.demo) ? (
                <span className="mt-1 inline-flex justify-center">
                  <DemoBadge />
                </span>
              ) : null}
            </div>
            <div
              className="mx-auto mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label={t('map.unitProgressAria', { title: unit.title, done, total, pct })}
            >
              <div
                className={`h-full rounded-full bg-[#2f9d96] ${motion ? 'transition-[width]' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {bannerFor ? <div className="mx-auto mt-3 max-w-md">{bannerFor(unit)}</div> : null}
            <ol aria-label={t('map.path.aria')} className="mx-auto mt-4 max-w-sm">
              {unit.nodes.map((node, index) => {
                const indexOnPath = pathIndex.get(node.id) ?? index
                const unlocked = isUnlocked(node.id)
                const isDone = completed(node.id)
                const isCurrent = node.id === currentId
                const mastery = masteryOf(node.id)
                const cover = renderCover?.(node)
                const marks = lessonExerciseIds({ questions: node.questions, artists: node.artists })
                const status = t(isDone ? 'map.status.done' : unlocked ? 'map.status.open' : 'map.status.locked')
                const artistNote = node.artists?.length ? artistCreditSummary(node.artists) : ''
                const state = !unlocked ? 'locked' : isCurrent ? 'current' : isDone ? 'done' : 'open'
                return (
                  <li
                    key={node.id}
                    id={`map-lesson-${node.id}`}
                    data-testid={`map-lesson-${node.id}`}
                    data-open={sectionOpen(sections.lessons, node.id) ? 'true' : 'false'}
                    data-node-state={state}
                    data-exercises={marks.join(' ')}
                    className="scroll-mt-24"
                  >
                    {index > 0 ? <PathBend side={pathBendSide(index)} /> : null}
                    <h4 className="m-0 text-base">
                      <button
                        type="button"
                        ref={(el) => {
                          buttonRefs.current[node.id] = el
                        }}
                        aria-disabled={!unlocked}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-expanded={unlocked ? sectionOpen(sections.lessons, node.id) : undefined}
                        onClick={() => {
                          if (unlocked) onToggleLesson(node.id)
                        }}
                        onKeyDown={(event) => onKeyDown(event, indexOnPath)}
                        aria-label={
                          artistNote
                            ? t('map.nodeAriaCredit', { title: node.title, status, credit: artistNote })
                            : t('map.nodeAria', { title: node.title, status })
                        }
                        className={`mx-auto flex w-full max-w-[16rem] flex-col items-center rounded-3xl px-2 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D9488] ${unlocked ? '' : 'cursor-not-allowed'}`}
                      >
                        {cover ? (
                          <CoverFace state={state}>{cover}</CoverFace>
                        ) : (
                          <StatusFace state={state} />
                        )}
                        <span
                          className={`mt-2 block text-sm font-bold leading-snug ${unlocked ? 'text-slate-900' : 'text-slate-400'}`}
                        >
                          {node.title}
                        </span>
                        {node.subtitle ? (
                          <span className={`mt-0.5 line-clamp-2 text-xs ${unlocked ? 'text-slate-500' : 'text-slate-400'}`}>
                            {node.subtitle}
                          </span>
                        ) : null}
                        <ExerciseMarks ids={marks} center />
                        {mastery !== 'none' ? (
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${MASTERY_CHIP[mastery]}`}>
                            {masteryLabel(mastery)}
                          </span>
                        ) : null}
                      </button>
                    </h4>
                  </li>
                )
              })}
            </ol>
            {openNodes.map((node) => (
              <div key={node.id} id={`map-lesson-panel-${node.id}`} role="region" className="mx-auto mt-4 max-w-2xl">
                <LessonPlayer
                  lesson={node}
                  kind="lesson"
                  presentation="folds"
                  folds={sections.folds}
                  onSetFold={onSetFold}
                  onExit={() => onCloseLesson(node.id)}
                />
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

function PathBend({ side }: { side: 'left' | 'right' }) {
  const d =
    side === 'right'
      ? 'M40 2 C40 16 70 14 70 28 C70 42 40 40 40 54'
      : 'M40 2 C40 16 10 14 10 28 C10 42 40 40 40 54'
  return (
    <svg viewBox="0 0 80 56" className="mx-auto h-12 w-24 text-[#8ecfc9]" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}

function StatusFace({ state }: { state: 'locked' | 'current' | 'done' | 'open' }) {
  const size = state === 'current' ? 'h-[5.5rem] w-[5.5rem]' : 'h-16 w-16'
  const face =
    state === 'done'
      ? 'border-[#c7ebe7] bg-[#2f9d96] text-white'
      : state === 'current'
        ? 'border-[#2f9d96] bg-[#FFF9E9] shadow-[0_0_22px_rgba(47,157,150,0.45)] ring-4 ring-[#b7ebe4]'
        : state === 'open'
          ? 'border-[#8ecfc9] bg-white text-[#0D9488]'
          : 'border-[#ececec] bg-[#cfcfcf] text-slate-600'
  return (
    <span className={`relative flex items-center justify-center overflow-hidden rounded-full border-4 ${size} ${face}`}>
      {state === 'done' ? (
        <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
      ) : state === 'current' ? (
        <img
          src="/o2-otter.png"
          alt=""
          width={512}
          height={512}
          className="h-[145%] w-[145%] max-w-none object-cover object-[center_22%]"
          decoding="async"
        />
      ) : state === 'locked' ? (
        <Lock className="h-6 w-6" aria-hidden />
      ) : (
        <span className="h-6 w-6 rounded-full border-4 border-[#8ecfc9]" aria-hidden />
      )}
    </span>
  )
}

function CoverFace({ state, children }: { state: 'locked' | 'current' | 'done' | 'open'; children: ReactNode }) {
  const ring =
    state === 'current'
      ? 'ring-4 ring-[#2f9d96] shadow-[0_0_22px_rgba(47,157,150,0.35)]'
      : state === 'done'
        ? 'ring-4 ring-[#8ecfc9]'
        : state === 'open'
          ? 'ring-2 ring-[#8ecfc9]'
          : 'opacity-60 grayscale ring-2 ring-slate-300'
  return (
    <span className={`relative block w-40 overflow-hidden rounded-[1.6rem] bg-white ${ring}`}>
      {children}
      {state === 'done' ? (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2f9d96] text-white">
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
      {state === 'locked' ? (
        <span className="absolute inset-0 flex items-center justify-center bg-white/55">
          <Lock className="h-7 w-7 text-slate-500" aria-hidden />
        </span>
      ) : null}
    </span>
  )
}
