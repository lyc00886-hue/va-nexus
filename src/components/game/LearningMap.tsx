import { ChevronLeft, Play } from 'lucide-react'
import { useLayoutEffect, useState, type ReactNode } from 'react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { getNodeById, getUnits } from '../../game/curriculum'
import { getF4Units } from '../../game/f4Demo'
import { isSequentialUnlocked } from '../../game/mediaCatalog'
import { getMediaUnits, type MediaUnit } from '../../game/mediaIntro'
import {
  F4_CHROME_KEY,
  GRADE_LABEL,
  historyUnitsFor,
  QUEST_ART_UNITS,
  QUEST_MEDIA_UNITS,
  softGoGradeFromSearch,
  unitsById,
  type SoftGoGrade,
} from '../../lib/softGoMaps'
import { masteryFor, masteryLabel } from '../../game/rewards'
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
import { PLATFORM_HEADER_PATH_EVENT } from '../../lib/platformHeaderShell'
import { useMapOneShell } from '../../lib/useMapOneShell'
import type { Lesson, Mastery, Unit } from '../../game/types'
import { CommitmentBanner } from '../CommitmentBadges'
import { softShellFromSearch, type SoftShell } from '../../lib/softAtlas'
import { ClassicGrades } from './ClassicGrades'
import { MapPath } from './MapPath'
import { MapQuest } from './MapQuest'
import { MapVersionToggle } from './MapVersionToggle'
import { SoftAtlas, SoftMine } from './SoftAtlas'

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
  const mapOne = useMapOneShell()
  const easy = useEasyRead()
  const [shell, setShell] = useState<SoftShell>(() =>
    typeof window === 'undefined' ? 'map' : softShellFromSearch(window.location.search),
  )
  const [sections, setSections] = useState<LearningMapSections>(loadLearningMapSections)
  const [track, setTrack] = useState<Track>(readTrack)
  const [mediaId, setMediaId] = useState<string | null>(readMediaId)
  const [grade, setGrade] = useState<SoftGoGrade>(() =>
    typeof window === 'undefined' ? 'all' : softGoGradeFromSearch(window.location.search),
  )

  function chooseGrade(next: SoftGoGrade) {
    setGrade(next)
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (next === 'all') params.delete('grade')
    else params.set('grade', next)
    const q = params.toString()
    const nextUrl = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', nextUrl)
  }

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
      window.requestAnimationFrame(() => {
        const panel = document.getElementById(`map-lesson-panel-${lesson.id}`)
        const anchor = panel ?? document.getElementById(`map-lesson-${lesson.id}`)
        anchor?.scrollIntoView({
          behavior: settings.reduceMotion ? 'auto' : 'smooth',
          block: 'nearest',
        })
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

  const yearHistory = grade === 'f5' || grade === 'f6' ? historyUnitsFor(history, 'all', grade) : []
  const yearCurrent = yearHistory.flatMap((unit) => unit.nodes).find((node) => isUnlocked(node.id) && !completed(node.id))
  const gradePath = grade === 'f4' || grade === 'f5' || grade === 'f6'
  const pathOn = !easy.on && (mapOne || track === 'history' || track === 'f4' || selected != null || gradePath)
  useLayoutEffect(() => {
    if (!pathOn) return
    window.dispatchEvent(new Event(PLATFORM_HEADER_PATH_EVENT))
    return () => {
      window.dispatchEvent(new Event(PLATFORM_HEADER_PATH_EVENT))
    }
  }, [pathOn])

  useLayoutEffect(() => {
    if (!mapOne || easy.on || (shell !== 'atlas' && shell !== 'mine')) return
    document.documentElement.dataset.softNav = 'atlas'
    return () => {
      delete document.documentElement.dataset.softNav
    }
  }, [mapOne, easy.on, shell])

  function onShell(next: SoftShell) {
    setShell(next)
  }

  if (easy.on) {
    return <StepMap />
  }

  if (mapOne) {
    const onPath = shell !== 'atlas' && shell !== 'mine'
    return (
      <div data-map-shell="one" data-map-scope="quest" data-soft-shell={shell} className="space-y-5">
        {easy.preview ? <EasyReadBar /> : null}
        <div className={onPath ? 'space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5' : 'space-y-5'}>
          <MapVersionToggle mapOne />
          {shell === 'atlas' ? (
            <SoftAtlas onShell={onShell} />
          ) : shell === 'mine' ? (
            <SoftMine onShell={onShell} />
          ) : (
            <MapQuest art={unitsById(history, QUEST_ART_UNITS)} media={unitsById(media, QUEST_MEDIA_UNITS)} />
          )}
        </div>
      </div>
    )
  }

  const yearUnits = grade === 'f4' ? f4Units : grade === 'f5' || grade === 'f6' ? yearHistory : []
  const yearLesson = grade === 'f4' ? f4Current : yearCurrent
  const yearUnlocked = grade === 'f4' ? f4Unlocked : isUnlocked

  return (
    <div className="space-y-5">
      {easy.preview ? <EasyReadBar /> : null}
      <div className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5">
        <MapVersionToggle mapOne={false} />
        <ClassicGrades grade={grade} onGrade={chooseGrade} />
        {grade === 'all' ? null : yearUnits.length === 0 ? (
          <p data-map-grade-empty className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-medium text-slate-700">
            {t('map.grade.empty')}
          </p>
        ) : grade === 'f4' || grade === 'f5' || grade === 'f6' ? (
          <ClassicYear
            grade={grade}
            units={yearUnits}
            current={yearLesson}
            currentNodeId={yearLesson?.id ?? null}
            isUnlocked={yearUnlocked}
            completed={completed}
            masteryOf={(id) => masteryFor(state.nodes[id])}
            sections={sections}
            onToggleLesson={toggleLesson}
            onCloseLesson={(id) => setLesson(id, false)}
            onSetFold={setFold}
            onReveal={revealLesson}
          />
        ) : null}
      </div>

      {grade === 'all' ? <div className="inline-flex max-w-full flex-wrap rounded-full bg-slate-100 p-1 ring-1 ring-slate-200" role="tablist" aria-label={t('map.track.aria')}>
        <TrackTab active={track === 'history'} onClick={() => chooseTrack('history')}>
          {t('map.track.history')}
        </TrackTab>
        <TrackTab active={track === 'media'} onClick={() => chooseTrack('media')}>
          {t('map.track.media')}
        </TrackTab>
        <TrackTab active={track === 'f4'} onClick={() => chooseTrack('f4')}>
          {t('map.track.f4')}
        </TrackTab>
      </div> : null}

      {grade === 'all' && track === 'history' ? (
        <HistoryTrack
          units={historyUnits}
          current={current}
          currentNodeId={currentNodeId}
          isUnlocked={isUnlocked}
          completed={completed}
          masteryOf={(id) => masteryFor(state.nodes[id])}
          sections={sections}
          onToggleLesson={toggleLesson}
          onCloseLesson={(id) => setLesson(id, false)}
          onSetFold={setFold}
          onReveal={revealLesson}
        />
      ) : grade === 'all' && track === 'f4' ? (
        <HistoryTrack
          units={f4Units}
          current={f4Current}
          currentNodeId={f4Current?.id ?? null}
          isUnlocked={f4Unlocked}
          completed={completed}
          masteryOf={(id) => masteryFor(state.nodes[id])}
          sections={sections}
          onToggleLesson={toggleLesson}
          onCloseLesson={(id) => setLesson(id, false)}
          onSetFold={setFold}
          onReveal={revealLesson}
        />
      ) : grade === 'all' && selected ? (
        <MediaDetail
          unit={selected}
          completed={completed}
          masteryOf={(id) => masteryFor(state.nodes[id])}
          sections={sections}
          onToggleLesson={toggleLesson}
          onCloseLesson={(id) => setLesson(id, false)}
          onSetFold={setFold}
          onReveal={revealLesson}
          onBack={closeMedia}
        />
      ) : grade === 'all' ? (
        <MediaPicker units={media} onOpen={openMedia} />
      ) : null}
      <MapCommitments />
    </div>
  )
}

function MapCommitments() {
  return (
    <details data-map-chrome="commitments" className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-slate-500">{t('map.commitments')}</summary>
      <div className="mt-2">
        <CommitmentBanner embedded />
      </div>
    </details>
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

function classicTitle(unit: Unit): string {
  const key = F4_CHROME_KEY[unit.id]
  return key ? t(key) : unit.title
}

function ClassicYear({
  grade,
  units,
  current,
  currentNodeId,
  isUnlocked,
  completed,
  masteryOf,
  sections,
  onToggleLesson,
  onCloseLesson,
  onSetFold,
  onReveal,
}: {
  grade: 'f4' | 'f5' | 'f6'
  units: Unit[]
  current: Lesson | undefined
  currentNodeId: string | null
  isUnlocked: (id: string) => boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
} & PathControls) {
  const [openId, setOpenId] = useState<string | null>(null)
  const badge = t(GRADE_LABEL[grade])
  return (
    <div data-classic-grade={grade} className="space-y-3">
      {units.map((unit) => {
        const open = openId === unit.id
        const unitCurrent = open && current && unit.nodes.some((node) => node.id === current.id) ? current : undefined
        return (
          <article key={unit.id} data-classic-unit={unit.id} className="rounded-2xl border border-[#8ecfc9] bg-white px-4 py-3">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : unit.id)}
              className="w-full text-left"
            >
              <span className="inline-flex rounded-full bg-[#0D9488] px-2.5 py-0.5 text-xs font-bold text-[#FFF9E9]">{badge}</span>
              <span className="mt-2 block text-base font-bold leading-snug text-slate-900">{classicTitle(unit)}</span>
            </button>
            {open ? (
              <div className="mt-3">
                <HistoryTrack
                  units={[unit]}
                  current={unitCurrent}
                  currentNodeId={unitCurrent ? currentNodeId : null}
                  isUnlocked={isUnlocked}
                  completed={completed}
                  masteryOf={masteryOf}
                  sections={sections}
                  onToggleLesson={onToggleLesson}
                  onCloseLesson={onCloseLesson}
                  onSetFold={onSetFold}
                  onReveal={onReveal}
                />
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function HistoryTrack({
  units,
  current,
  currentNodeId,
  isUnlocked,
  completed,
  masteryOf,
  sections,
  onToggleLesson,
  onCloseLesson,
  onSetFold,
  onReveal,
  bannerFor,
}: {
  units: Unit[]
  current: Lesson | undefined
  currentNodeId: string | null
  isUnlocked: (id: string) => boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
  bannerFor?: (unit: Unit) => ReactNode
} & PathControls) {
  return (
    <div data-map-chrome="path" className="space-y-5 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-6">
      {current && (
        <ContinueButton lesson={current} mastery={masteryOf(current.id)} onContinue={() => onReveal(current)} />
      )}
      <MapPath
        units={units}
        currentId={currentNodeId}
        isUnlocked={isUnlocked}
        completed={completed}
        sections={sections}
        onToggleLesson={onToggleLesson}
        onCloseLesson={onCloseLesson}
        onSetFold={onSetFold}
        bannerFor={bannerFor}
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

function MediaPicker({ units, onOpen }: { units: MediaUnit[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-3xl border border-teal-100 bg-white p-4 shadow-sm">
        <img src="/o2-otter.png" alt="" width={64} height={64} className="h-14 w-14 shrink-0 object-contain" decoding="async" />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">{t('map.media.legend')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {units.map((unit) => {
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
                ) : null}
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
                {unit.pending ? t('map.media.pending') : t('map.media.open')}
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
      {current && (
        <ContinueButton lesson={current} mastery={masteryOf(current.id)} onContinue={() => onReveal(current)} />
      )}
      <MapPath
        units={[unit]}
        currentId={current?.id ?? null}
        isUnlocked={unlocked}
        completed={completed}
        sections={sections}
        onToggleLesson={onToggleLesson}
        onCloseLesson={onCloseLesson}
        onSetFold={onSetFold}
        bannerFor={() => (
          <>
            <UnitCoverBanner unit={unit} />
            <MediaNotes unit={unit} />
          </>
        )}
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

function ContinueButton({
  lesson,
  mastery,
  onContinue,
}: {
  lesson: Lesson
  mastery: Mastery
  onContinue: () => void
}) {
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
          {mastery !== 'none' ? ` · ${masteryLabel(mastery)}` : ''}
        </span>
      </span>
    </button>
  )
}

/**
 * Blank title plates on the November lesson covers (1280×720).
 * The overlay is the lesson title for the active locale, never the short goal or one-liner.
 *
 * Plates are 19–27% of a w-40 16:9 cover (~17–24px). Type stays in rem so it
 * scales with that card, not the viewport. 0.4375rem (7px at the default root)
 * keeps every locale title inside the band, at most two lines.
 */
const COVER_TITLE_PLATE: Record<string, string> = {
  'F4-U2-L3': 'inset-x-[6%] top-[7%] h-[27%]',
  'F4-U3-L3': 'inset-x-[7%] top-[5%] h-[26%]',
  'F4-U3-L4': 'inset-x-[6%] top-[3%] h-[19%]',
}

/** Blank plate on 1280×720 lesson and art-history unit covers. */
const COVER_TITLE_PLATE_FALLBACK = 'inset-x-[6%] top-[7%] h-[27%]'

function UnitCoverBanner({ unit }: { unit: Unit }) {
  const [failed, setFailed] = useState(false)
  if (!unit.coverImage || failed) return null
  return (
    <figure data-unit-cover={unit.id} className="rounded-3xl border border-teal-100 bg-white">
      <img
        src={unit.coverImage}
        alt=""
        width={1152}
        height={864}
        loading="lazy"
        decoding="async"
        className="h-36 w-full rounded-t-3xl object-cover object-center"
        onError={() => setFailed(true)}
      />
      {unit.coverCredit ? (
        <figcaption className="px-3 py-1.5 text-[11px] leading-snug text-slate-500">{unit.coverCredit}</figcaption>
      ) : null}
    </figure>
  )
}

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
            className={`pointer-events-none absolute ${plate} flex items-center justify-center px-1 text-center text-[#164e4c]`}
            aria-hidden="true"
          >
            <span className="block w-full min-w-0 text-[0.4375rem] font-bold leading-[1.2]">{title}</span>
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
