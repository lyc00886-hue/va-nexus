import { Check, ChevronLeft, Crown, Lock, Play, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { useSenSupport } from '../../context/SenSupportContext'
import { getNodeById, getUnits } from '../../game/curriculum'
import { getF4Units } from '../../game/f4Demo'
import { isSequentialUnlocked } from '../../game/mediaCatalog'
import { getMediaUnits, type MediaUnit } from '../../game/mediaIntro'
import { masteryFor, masteryLabel } from '../../game/rewards'
import { t } from '../../i18n'
import type { Lesson, Mastery, Unit } from '../../game/types'
import { ActivityLog } from './ActivityLog'
import { DemoBadge } from './DemoBadge'
import { LessonPlayer } from './LessonPlayer'
import { StatCards } from './StatCards'

const MASTERY_CHIP: Record<Mastery, string> = {
  none: 'bg-slate-100 text-slate-500',
  attempted: 'bg-orange-50 text-orange-700',
  familiar: 'bg-sky-50 text-sky-700',
  proficient: 'bg-blue-100 text-blue-800',
  mastered: 'bg-violet-100 text-violet-800',
}

const OFFSETS = ['ml-0', 'ml-10', 'ml-20', 'ml-10']
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
  const [open, setOpen] = useState<Lesson | null>(null)
  const [track, setTrack] = useState<Track>(readTrack)
  const [mediaId, setMediaId] = useState<string | null>(readMediaId)
  const motion = !settings.reduceMotion

  if (open) return <LessonPlayer lesson={open} kind="lesson" onExit={() => setOpen(null)} />

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('tab.map')}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
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
              indent={!focusTunnel}
              isUnlocked={isUnlocked}
              completed={completed}
              masteryOf={(id) => masteryFor(state.nodes[id])}
              onOpen={setOpen}
            />
          ) : track === 'f4' ? (
            <HistoryTrack
              units={f4Units}
              current={f4Current}
              currentNodeId={f4Current?.id ?? null}
              motion={motion}
              indent={!focusTunnel}
              isUnlocked={f4Unlocked}
              completed={completed}
              masteryOf={(id) => masteryFor(state.nodes[id])}
              onOpen={setOpen}
            />
          ) : selected ? (
            <MediaDetail
              unit={selected}
              motion={motion}
              completed={completed}
              masteryOf={(id) => masteryFor(state.nodes[id])}
              onOpen={setOpen}
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

function HistoryTrack({
  units,
  current,
  currentNodeId,
  motion,
  indent,
  isUnlocked,
  completed,
  masteryOf,
  onOpen,
}: {
  units: Unit[]
  current: Lesson | undefined
  currentNodeId: string | null
  motion: boolean
  indent: boolean
  isUnlocked: (id: string) => boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
  onOpen: (lesson: Lesson) => void
}) {
  return (
    <>
      {current && (
        <ContinueButton lesson={current} onOpen={onOpen} />
      )}
      {units.map((unit) => (
        <UnitSection
          key={unit.id}
          unit={unit}
          motion={motion}
          indent={indent}
          currentId={currentNodeId}
          isUnlocked={isUnlocked}
          completed={completed}
          masteryOf={masteryOf}
          onOpen={onOpen}
        />
      ))}
      {!current && <p className="rounded-3xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{t('map.allDone')}</p>}
    </>
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
  onOpen,
  onBack,
}: {
  unit: MediaUnit
  motion: boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
  onOpen: (lesson: Lesson) => void
  onBack: () => void
}) {
  const ids = unit.nodes.map((node) => node.id)
  const unlocked = (id: string) => isSequentialUnlocked(ids, id, completed)
  const current = unit.nodes.find((node) => unlocked(node.id) && !completed(node.id))
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t('map.media.back')}
      </button>
      {current && <ContinueButton lesson={current} onOpen={onOpen} />}
      <UnitSection
        unit={unit}
        motion={motion}
        currentId={current?.id ?? null}
        isUnlocked={unlocked}
        completed={completed}
        masteryOf={masteryOf}
        onOpen={onOpen}
        banner={<MediaNotes unit={unit} />}
      />
      {!current && (
        <p className="rounded-3xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{t('map.media.allDone')}</p>
      )}
    </>
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

function ContinueButton({ lesson, onOpen }: { lesson: Lesson; onOpen: (lesson: Lesson) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(lesson)}
      className="flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-left text-white shadow-md hover:from-blue-500 hover:to-indigo-500"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
        <Play className="h-6 w-6 fill-white" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-blue-100">{t('map.continue')}</span>
        <span className="block text-lg font-bold">{lesson.title}</span>
        <span className="block text-sm text-blue-100">
          {lesson.subtitle} · {t('common.aboutMin', { n: lesson.minutes })}
        </span>
      </span>
    </button>
  )
}

function UnitSection({
  unit,
  motion,
  indent = true,
  currentId,
  isUnlocked,
  completed,
  masteryOf,
  onOpen,
  banner,
}: {
  unit: Unit
  motion: boolean
  indent?: boolean
  currentId: string | null
  isUnlocked: (id: string) => boolean
  completed: (id: string) => boolean
  masteryOf: (id: string) => Mastery
  onOpen: (lesson: Lesson) => void
  banner?: ReactNode
}) {
  const done = unit.nodes.filter((node) => completed(node.id)).length
  const total = unit.nodes.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{unit.title}</h3>
          {unit.subtitle && <p className="text-sm text-slate-500">{unit.subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {unit.nodes.some((node) => node.demo) && <DemoBadge />}
          <span
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
            aria-label={t('map.unitProgressAria', { title: unit.title, done, total, pct })}
          >
            {t('map.unitProgress', { done, total, pct })}
          </span>
        </div>
      </div>
      {banner}
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t('map.unitProgressAria', { title: unit.title, done, total, pct })}
      >
        <div className={`h-full rounded-full bg-blue-600 ${motion ? 'transition-all' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-5">
        {unit.nodes.map((node, i) => {
          const unlocked = isUnlocked(node.id)
          const isDone = completed(node.id)
          const isCurrent = node.id === currentId
          const mastery = masteryOf(node.id)
          const last = i === unit.nodes.length - 1
          return (
            <li key={node.id} className={`relative ${indent ? OFFSETS[i % OFFSETS.length] : ''}`}>
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => onOpen(node)}
                className="group flex w-full items-center gap-4 rounded-2xl p-1 text-left disabled:cursor-not-allowed"
                aria-label={t('map.nodeAria', {
                  title: node.title,
                  status: t(isDone ? 'map.status.done' : unlocked ? 'map.status.open' : 'map.status.locked'),
                })}
              >
                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                  {isCurrent && motion && <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-40" aria-hidden />}
                  <span
                    className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-sm ${
                      isDone
                        ? mastery === 'mastered'
                          ? 'border-violet-200 bg-violet-500 text-white'
                          : 'border-emerald-200 bg-emerald-500 text-white'
                        : isCurrent
                          ? 'border-blue-200 bg-blue-600 text-white ring-4 ring-blue-300'
                          : unlocked
                            ? 'border-blue-100 bg-white text-blue-600'
                            : 'border-slate-200 bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      mastery === 'mastered' ? (
                        <Crown className="h-7 w-7" aria-hidden />
                      ) : (
                        <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                      )
                    ) : unlocked ? (
                      <Sparkles className="h-7 w-7" aria-hidden />
                    ) : (
                      <Lock className="h-6 w-6" aria-hidden />
                    )}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-bold ${unlocked ? 'text-slate-900 group-hover:text-blue-700' : 'text-slate-400'}`}>
                    {node.title}
                  </span>
                  <span className={`block text-xs ${unlocked ? 'text-slate-500' : 'text-slate-400'}`}>{node.subtitle}</span>
                  {mastery !== 'none' && (
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${MASTERY_CHIP[mastery]}`}>
                      {masteryLabel(mastery)}
                    </span>
                  )}
                </span>
              </button>
              {!last && <span className="ml-[2.2rem] block h-8 border-l-4 border-dotted border-slate-300" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
