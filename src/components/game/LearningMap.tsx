import { ChevronLeft, Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { useSenSupport } from '../../context/SenSupportContext'
import { getNodeById, getUnits } from '../../game/curriculum'
import { getF4Units } from '../../game/f4Demo'
import { isSequentialUnlocked } from '../../game/mediaCatalog'
import { getMediaUnits, type MediaUnit } from '../../game/mediaIntro'
import { masteryFor } from '../../game/rewards'
import { t } from '../../i18n'
import {
  loadLearningMapSections,
  saveLearningMapSections,
  sectionOpen,
  type LearningMapSections,
  type LessonFoldId,
} from '../../lib/learningMapSections'
import { useEasyRead } from '../../context/EasyReadContext'
import { EasyReadBar } from '../easy-read/EasyReadBar'
import { StepMap } from '../easy-read/StepPath'
import { useMapOneShell } from '../../lib/useMapOneShell'
import type { Lesson, Mastery, Unit } from '../../game/types'
import { CommitmentBanner } from '../CommitmentBadges'
import { ActivityLog } from './ActivityLog'
import { DemoBadge } from './DemoBadge'
import { MapPath } from './MapPath'
import { MapOneCard, MapOneLesson } from './MapOneLesson'
import { StatCards } from './StatCards'

const TRACK_KEY = 'va-nexus:map-track'
const MEDIA_KEY = 'va-nexus:map-media'

type Track = 'history' | 'media' | 'f4'

function readTrack(): Track {
  try {
    const saved = sessionStorage.getItem(TRACK_KEY)
    if (saved === 'media' || saved === 'f4') return saved
    return 'history'
  } catch {
    return 'history'
  }
}

function readMediaId(): string | null {
  try {
    return sessionStorage.getItem(MEDIA_KEY)
  } catch {
    return null
  }
}

function remember(track: Track, mediaId: string | null) {
  try {
    sessionStorage.setItem(TRACK_KEY, track)
    if (mediaId) sessionStorage.setItem(MEDIA_KEY, mediaId)
    else sessionStorage.removeItem(MEDIA_KEY)
  } catch {
    /* ignore */
  }
}

export function LearningMap() {
  const { state, isUnlocked, currentNodeId } = useGame()
  const { settings, focusTunnel } = useSen()
  const { openCheckIn, stored } = useSenSupport()
  const mapOne = useMapOneShell()
  const easy = useEasyRead()
  const [mapLessonId, setMapLessonId] = useState<string | null>(null)
  const [sections, setSections] = useState<LearningMapSections>(loadLearningMapSections)
  const [track, setTrack] = useState<Track>(readTrack)
  const [mediaId, setMediaId] = useState<string | null>(readMediaId)
  const motion = !settings.reduceMotion

  function commitSections(next: LearningMapSections) {
    saveLearningMapSections(next)
    return next
  }

  function setLesson(id: string, open: boolean) {
    setSections((prev) => {
      if (sectionOpen(prev.lessons, id) === open) return prev
      return commitSections({ ...prev, lessons: { ...prev.lessons, [id]: open } })
    })
  }

  function toggleLesson(id: string) {
    setSections((prev) =>
      commitSections({ ...prev, lessons: { ...prev.lessons, [id]: !sectionOpen(prev.lessons, id) } }),
    )
  }

  function setFold(id: LessonFoldId, open: boolean) {
    setSections((prev) => {
      if (prev.folds[id] === open) return prev
      return commitSections({ ...prev, folds: { ...prev.folds, [id]: open } })
    })
  }

  function revealLesson(lesson: Lesson) {
    setSections((prev) =>
      commitSections({
        ...prev,
        lessons: { ...prev.lessons, [lesson.id]: true },
      }),
    )
    window.requestAnimationFrame(() => {
      document.getElementById(`map-lesson-${lesson.id}`)?.scrollIntoView({
        behavior: settings.reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  const history = getUnits()
  const media = getMediaUnits()
  const f4All = getF4Units()
  const completed = (id: string) => Boolean(state.nodes[id]?.completed)
  const selected = media.find((unit) => unit.id === mediaId && !unit.pending) ?? null
  const current = currentNodeId ? getNodeById().get(currentNodeId) : undefined
  const historyUnits = focusTunnel && current ? history.filter((u) => u.nodes.some((n) => n.id === current.id)) : history
  const f4Unlocked = (id: string) => {
    for (const unit of f4All) {
      const ids = unit.nodes.map((node) => node.id)
      if (ids.includes(id)) return isSequentialUnlocked(ids, id, completed)
    }
    return false
  }
  const f4Current = f4All.flatMap((unit) => unit.nodes).find((node) => f4Unlocked(node.id) && !completed(node.id))
  const f4Units =
    focusTunnel && f4Current ? f4All.filter((unit) => unit.nodes.some((node) => node.id === f4Current.id)) : f4All
  const subtitle =
    track === 'media'
      ? t('map.media.subtitle', { n: media.length })
      : track === 'f4'
        ? t('map.f4.subtitle')
        : t('map.subtitle')

  function chooseTrack(next: Track) {
    setTrack(next)
    remember(next, next === 'media' ? mediaId : null)
  }

  function openMedia(id: string) {
    setMediaId(id)
    remember('media', id)
    window.scrollTo({ top: 0 })
  }

  function closeMedia() {
    setMediaId(null)
    remember('media', null)
  }

  if (easy.on) {
    return <StepMap />
  }

  if (mapOne) {
    const openLesson = mapLessonId ? getNodeById().get(mapLessonId) : undefined
    return (
      <div data-map-shell="one" className="space-y-5">
        {openLesson ? (
          <MapOneLesson
            key={openLesson.id}
            lesson={openLesson}
            onExit={() => setMapLessonId(null)}
            onOpenLesson={setMapLessonId}
          />
        ) : (
          <>
            {easy.preview ? <EasyReadBar /> : null}
            <CommitmentBanner />
            <MapOneCard onOpen={setMapLessonId} />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {easy.preview ? <EasyReadBar /> : null}
      <CommitmentBanner />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('tab.map')}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
        <p className="mt-1 text-sm text-slate-600" data-testid="map-page-intro">
          {t('map.pageIntro')}
        </p>
      </div>

      <div className="inline-flex max-w-full flex-wrap rounded-full bg-slate-100 p-1 ring-1 ring-slate-200" role="tablist" aria-label={t('map.track.aria')}>
        <TrackTab active={track === 'history'} onClick={() => chooseTrack('history')}>
          {t('map.track.history')}
        </TrackTab>
        <TrackTab active={track === 'media'} onClick={() => chooseTrack('media')}>
          {t('map.track.media')}
        </TrackTab>
        <TrackTab active={track === 'f4'} onClick={() => chooseTrack('f4')}>
          {t('map.track.f4')}
        </TrackTab>
      </div>

      {!focusTunnel && <StatCards />}

      <div className={`grid gap-5 ${focusTunnel ? '' : 'lg:grid-cols-3'}`}>
        <div className="space-y-5 lg:col-span-2">
          {track === 'history' ? (
            <HistoryTrack
              units={historyUnits}
              current={current}
              currentNodeId={currentNodeId}
              motion={motion}
              isUnlocked={isUnlocked}
              completed={completed}
              masteryOf={(id) => masteryFor(state.nodes[id])}
              sections={sections}
              onToggleLesson={toggleLesson}
              onCloseLesson={(id) => setLesson(id, false)}
              onSetFold={setFold}
              onReveal={revealLesson}
            />
          ) : track === 'f4' ? (
            <HistoryTrack
              units={f4Units}
              current={f4Current}
              currentNodeId={f4Current?.id ?? null}
              motion={motion}
              isUnlocked={f4Unlocked}
              completed={completed}
              masteryOf={(id) => masteryFor(state.nodes[id])}
              sections={sections}
              onToggleLesson={toggleLesson}
              onCloseLesson={(id) => setLesson(id, false)}
              onSetFold={setFold}
              onReveal={revealLesson}
            />
          ) : selected ? (
            <MediaDetail
              unit={selected}
              motion={motion}
              completed={completed}
              masteryOf={(id) => masteryFor(state.nodes[id])}
              sections={sections}
              onToggleLesson={toggleLesson}
              onCloseLesson={(id) => setLesson(id, false)}
              onSetFold={setFold}
              onReveal={revealLesson}
              onBack={closeMedia}
            />
          ) : (
            <MediaPicker units={media} completed={completed} onOpen={openMedia} />
          )}
        </div>

        {!focusTunnel && (
          <div className="space-y-5">
            <ActivityLog />
            <section className="rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h3 className="font-bold text-slate-900">{t('map.ladder')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('map.ladder.text')}</p>
              <h3 className="mt-4 font-bold text-slate-900">{t('map.support')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('map.support.text')}</p>
              <button
                type="button"
                onClick={openCheckIn}
                className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                {stored.checkIn ? t('map.checkin.redo') : t('map.checkin.start')}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function TrackTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 shadow'
          : 'rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200'
      }
    >
      {children}
    </button>
  )
}

type PathControls = {
  sections: LearningMapSections
  onToggleLesson: (id: string) => void
  onCloseLesson: (id: string) => void
  onSetFold: (id: LessonFoldId, open: boolean) => void
  onReveal: (lesson: Lesson) => void
}

function HistoryTrack({
  units,
  current,
  currentNodeId,
  motion,
  isUnlocked,
  completed,
  masteryOf,
  sections,
  onToggleLesson,
  onCloseLesson,
  onSetFold,
  onReveal,
}: {
  units: Unit[]
  current: Lesson | undefined
  currentNodeId: string | null
  motion: boolean
  isUnlocked: (id: string) => boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
} & PathControls) {
  return (
    <div data-map-chrome="path" className="space-y-5 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-6">
      {current && <ContinueButton lesson={current} onContinue={() => onReveal(current)} />}
      <MapPath
        units={units}
        currentId={currentNodeId}
        motion={motion}
        isUnlocked={isUnlocked}
        completed={completed}
        masteryOf={masteryOf}
        sections={sections}
        onToggleLesson={onToggleLesson}
        onCloseLesson={onCloseLesson}
        onSetFold={onSetFold}
        renderCover={(node) =>
          node.coverImage ? (
            <UnitCover src={node.coverImage} credit={node.coverCredit} lesson title={node.title} lessonId={node.id} />
          ) : null
        }
      />
      {!current && <p className="rounded-3xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{t('map.allDone')}</p>}
    </div>
  )
}

function MediaPicker({
  units,
  completed,
  onOpen,
}: {
  units: MediaUnit[]
  completed: (id: string) => boolean
  onOpen: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-3xl border border-teal-100 bg-white p-4 shadow-sm">
        <img src="/o2-otter.png" alt="" width={64} height={64} className="h-14 w-14 shrink-0 object-contain" decoding="async" />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">{t('map.media.legend')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {units.map((unit) => {
          const done = unit.nodes.filter((node) => completed(node.id)).length
          const total = unit.nodes.length
          const showNote = !unit.pending && unit.paper2Note.length > 0
          return (
            <button
              key={unit.id}
              type="button"
              disabled={unit.pending}
              onClick={() => onOpen(unit.id)}
              aria-label={
                unit.pending
                  ? t('map.media.pendingAria', { title: unit.title })
                  : t('map.media.cardAria', { title: unit.title, status: t('map.media.open') })
              }
              className={`flex flex-col rounded-3xl border p-5 text-left shadow-sm disabled:cursor-not-allowed ${
                unit.pending
                  ? 'border-dashed border-slate-300 bg-slate-50 text-slate-500'
                  : unit.paper2Applicable
                    ? 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    : 'border-amber-200 bg-amber-50/60 hover:border-amber-300 hover:shadow-md'
              }`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-blue-700">{unit.id}</span>
                {unit.pending ? (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {t('map.media.pending')}
                  </span>
                ) : (
                  <DemoBadge />
                )}
              </span>
              <span className={`mt-2 text-base font-bold leading-snug ${unit.pending ? 'text-slate-600' : 'text-slate-900'}`}>
                {unit.title}
              </span>
              {unit.pending ? (
                <span className="mt-2 text-xs leading-relaxed text-slate-500">{t('map.media.pendingNote')}</span>
              ) : (
                showNote && (
                  <span
                    className={`mt-2 line-clamp-4 text-xs leading-relaxed ${
                      unit.paper2Applicable ? 'text-slate-600' : 'text-amber-950'
                    }`}
                  >
                    {!unit.paper2Applicable && (
                      <span className="mb-0.5 block font-semibold">{t('map.media.examCaveat')}</span>
                    )}
                    {unit.paper2Note}
                  </span>
                )
              )}
              <span className={`mt-3 text-sm font-semibold ${unit.pending ? 'text-slate-400' : 'text-blue-700'}`}>
                {unit.pending ? t('map.media.pending') : `${t('map.media.open')} · ${t('map.unitProgress', { done, total, pct: total ? Math.round((done / total) * 100) : 0 })}`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MediaDetail({
  unit,
  motion,
  completed,
  masteryOf,
  sections,
  onToggleLesson,
  onCloseLesson,
  onSetFold,
  onReveal,
  onBack,
}: {
  unit: MediaUnit
  motion: boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
  onBack: () => void
} & PathControls) {
  const ids = unit.nodes.map((node) => node.id)
  const unlocked = (id: string) => isSequentialUnlocked(ids, id, completed)
  const current = unit.nodes.find((node) => unlocked(node.id) && !completed(node.id))
  return (
    <div data-map-chrome="path" className="space-y-5 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t('map.media.back')}
      </button>
      {current && <ContinueButton lesson={current} onContinue={() => onReveal(current)} />}
      <MapPath
        units={[unit]}
        currentId={current?.id ?? null}
        motion={motion}
        isUnlocked={unlocked}
        completed={completed}
        masteryOf={masteryOf}
        sections={sections}
        onToggleLesson={onToggleLesson}
        onCloseLesson={onCloseLesson}
        onSetFold={onSetFold}
        bannerFor={() => <MediaNotes unit={unit} />}
        renderCover={(node) =>
          node.coverImage ? (
            <UnitCover src={node.coverImage} credit={node.coverCredit} lesson title={node.title} lessonId={node.id} />
          ) : null
        }
      />
      {!current && (
        <p className="rounded-3xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{t('map.media.allDone')}</p>
      )}
    </div>
  )
}

function MediaNotes({ unit }: { unit: MediaUnit }) {
  const hasKit = unit.materials.length > 0 || unit.safetyNotes.length > 0
  return (
    <div className="mt-3 space-y-3">
      {unit.paper2Note && (
        <p
          className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
            unit.paper2Applicable ? 'bg-slate-50 text-slate-700' : 'bg-amber-50 text-amber-950'
          }`}
        >
          {!unit.paper2Applicable && <span className="mb-0.5 block font-semibold">{t('map.media.examCaveat')}</span>}
          {unit.paper2Note}
        </p>
      )}
      {hasKit && (
        <details className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-800">{t('map.media.kit')}</summary>
          {unit.materials.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-slate-700">{t('map.media.materials')}</p>
              <ul className="mt-1 list-disc pl-4">
                {unit.materials.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {unit.safetyNotes.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-slate-700">{t('map.media.safety')}</p>
              <ul className="mt-1 list-disc pl-4">
                {unit.safetyNotes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </details>
      )}
    </div>
  )
}

function ContinueButton({ lesson, onContinue }: { lesson: Lesson; onContinue: () => void }) {
  return (
    <button
      type="button"
      data-map-cta="primary"
      onClick={onContinue}
      className="flex min-h-14 w-full items-center gap-4 rounded-3xl bg-[#0D9488] px-5 py-4 text-left text-white shadow-md hover:bg-teal-700"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
        <Play className="h-6 w-6 fill-white" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-teal-50">{t('map.continue')}</span>
        <span className="block text-lg font-bold">{lesson.title}</span>
        <span className="block text-sm text-teal-50">
          {lesson.subtitle} · {t('common.aboutMin', { n: lesson.minutes })}
        </span>
      </span>
    </button>
  )
}

/**
 * Blank title plates on the November lesson covers (1280×720).
 * The overlay is the lesson title for the active locale, never the short goal or one-liner.
 */
const COVER_TITLE_PLATE: Record<string, string> = {
  'F4-U2-L3': 'inset-x-[6%] top-[7%] h-[27%]',
  'F4-U3-L3': 'inset-x-[7%] top-[5%] h-[26%]',
  'F4-U3-L4': 'inset-x-[6%] top-[3%] h-[19%]',
}

/** Blank plate on 1280×720 lesson and art-history unit covers. */
const COVER_TITLE_PLATE_FALLBACK = 'inset-x-[6%] top-[7%] h-[27%]'

function UnitCover({
  src,
  credit,
  lesson = false,
  title,
  lessonId,
}: {
  src: string
  credit?: string
  lesson?: boolean
  title?: string
  lessonId?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  const plate = (lessonId && COVER_TITLE_PLATE[lessonId]) || COVER_TITLE_PLATE_FALLBACK
  return (
    <figure>
      <div className="relative">
        <img
          src={src}
          alt=""
          width={lesson ? 1280 : 1152}
          height={lesson ? 720 : 864}
          loading="lazy"
          decoding="async"
          className={lesson ? 'aspect-video h-auto w-full object-cover object-center' : 'h-44 w-full object-cover object-center sm:h-52'}
          onError={() => setFailed(true)}
        />
        {lesson && title ? (
          <p
            data-cover-title={title}
            data-testid={lessonId ? `cover-title-${lessonId}` : 'cover-title'}
            className={`pointer-events-none absolute ${plate} flex items-center justify-center overflow-hidden text-balance px-1 text-center text-[clamp(0.72rem,2.1vw,1.35rem)] font-bold leading-[1.15] text-[#164e4c]`}
            aria-hidden="true"
          >
            {title}
          </p>
        ) : null}
      </div>
      {credit ? (
        <figcaption className="border-b border-slate-100 bg-slate-50 px-5 py-1.5 text-[11px] leading-snug text-slate-500">
          {credit}
        </figcaption>
      ) : null}
    </figure>
  )
}
