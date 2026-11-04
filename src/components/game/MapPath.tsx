import { Check, Lock } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Lesson, Unit } from '../../game/types'
import { lessonExerciseIds, MOOD_PATH_SOFT, pathBendSide } from '../../game/exerciseLogos'
import { artistCreditSummary } from '../../game/lessonArtistLabels'
import { MOOD_EMPTY_MAP } from '../../game/softMotion'
import { t } from '../../i18n'
import { requestOpenTab } from '../../lib/openTab'
import type { LessonFoldId } from '../../lib/learningMapSections'
import { sectionOpen, type LearningMapSections } from '../../lib/learningMapSections'
import { mapPathVisibleIds } from '../../lib/mapPathViewport'
import { useMapPathAdvance } from '../../lib/useMapPathAdvance'
import { ExerciseMarks } from './ExerciseMark'
import { LessonPlayer } from './LessonPlayer'
import { MapPresence } from './MapPresence'

type Props = {
  units: Unit[]
  currentId: string | null
  isUnlocked: (id: string) => boolean
  completed: (id: string) => boolean
  sections: LearningMapSections
  onToggleLesson: (id: string) => void
  onCloseLesson: (id: string) => void
  onSetFold: (id: LessonFoldId, open: boolean) => void
  renderCover?: (lesson: Lesson) => ReactNode
  bannerFor?: (unit: Unit) => ReactNode
}

/**
 * Vertical soft-bent path. Unit titles stay as quiet labels.
 * The default window is the current lesson, one recent done lesson, and two ahead.
 */
export function MapPath({
  units,
  currentId,
  isUnlocked,
  completed,
  sections,
  onToggleLesson,
  onCloseLesson,
  onSetFold,
  renderCover,
  bannerFor,
}: Props) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [expanded, setExpanded] = useState(false)
  const flat = units.flatMap((unit) =>
    unit.nodes.map((node) => ({
      id: node.id,
      done: completed(node.id),
      current: node.id === currentId,
    })),
  )
  const advancing = useMapPathAdvance(
    currentId,
    flat.map((node) => node.id),
  )
  const openIds = new Set(flat.filter((node) => sectionOpen(sections.lessons, node.id)).map((node) => node.id))
  const windowIds = mapPathVisibleIds(flat, { openIds })
  const visibleIds = expanded ? flat.map((node) => node.id) : windowIds
  const visible = new Set(visibleIds)
  const pathIndex = new Map(visibleIds.map((id, index) => [id, index]))
  const lessonCount = flat.length
  const canToggle = flat.length > mapPathVisibleIds(flat).length

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = visibleIds.length - 1
    let next = index
    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    buttonRefs.current[visibleIds[next]]?.focus()
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
    <div data-path-mood={MOOD_PATH_SOFT} data-map-viewport={expanded ? 'all' : 'window'} className="space-y-8">
      {units.map((unit) => {
        const nodes = unit.nodes.filter((node) => visible.has(node.id))
        if (nodes.length === 0) return null
        const openNodes = nodes.filter((node) => isUnlocked(node.id) && sectionOpen(sections.lessons, node.id))
        return (
          <section key={unit.id} data-testid={`map-unit-${unit.id}`} data-map-residual="unit" className="scroll-mt-24">
            <div className="mx-auto mb-2 max-w-xs text-center">
              <p className="text-xs font-semibold tracking-wide text-teal-800">{t('map.fold.gradeOrUnit')}</p>
              <h3 className="text-lg font-bold text-slate-900">{unit.title}</h3>
            </div>
            {bannerFor ? <div className="mx-auto mt-3 max-w-md">{bannerFor(unit)}</div> : null}
            <ol aria-label={t('map.path.aria')} className="mx-auto mt-4 max-w-sm">
              {nodes.map((node, index) => {
                const indexOnPath = pathIndex.get(node.id) ?? index
                const unlocked = isUnlocked(node.id)
                const isDone = completed(node.id)
                const isCurrent = node.id === currentId
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
                        {isCurrent ? (
                          <span className="mx-auto mb-1 block min-h-[5.5rem] w-36">
                            <MapPresence advancing={advancing} />
                          </span>
                        ) : null}
                        {cover ? (
                          <CoverFace state={state}>{cover}</CoverFace>
                        ) : isCurrent ? null : (
                          <StatusFace state={state} />
                        )}
                        <span
                          className={`mt-2 block text-sm font-bold leading-snug ${unlocked ? 'text-slate-900' : 'text-slate-400'}`}
                        >
                          {node.title}
                        </span>
                        <ExerciseMarks ids={marks} center />
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
      {canToggle ? (
        <button
          type="button"
          data-map-more="path"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mx-auto block min-h-11 px-2 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
        >
          {expanded ? t('map.path.less') : t('map.path.more')}
        </button>
      ) : null}
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
