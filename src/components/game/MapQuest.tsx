import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { getF4Units } from '../../game/f4Demo'
import { getF5Units } from '../../game/f5Demo'
import { getF6Units } from '../../game/f6Demo'
import type { Unit } from '../../game/types'
import { useT, type MessageKey } from '../../i18n'
import { QUEST_CHROME, questXpMoves, type QuestFormId } from '../../lib/mapQuest'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useQuestForm, useQuestMotionPlay } from '../../lib/useQuestForm'
import { QuestMotionButton, QuestSectionSwitch } from './MapQuestChrome'
import { MapVersionToggle } from './MapVersionToggle'
import {
  questBand,
  questCurrentIndex,
  questNodeFramed,
  questNodeProgress,
  questLabelSpan,
  questPathLayout,
  questPathSpacing,
  type QuestBandId,
  type QuestNodeProgress,
} from '../../lib/questPathLayout'
import { CommitmentFooter } from '../CommitmentBadges'
import { HomeworkMapEntry } from '../HomeworkStudent'
import { InspectMapEntry } from '../InspectMapEntry'
import { BiSpan } from './BilingualText'
import { F4SlidesEntry } from './F4SlidesEntry'
import { LessonPlayer } from './LessonPlayer'
import { OfficialUnitHeader } from './OfficialFormat'
import { QuestPathArt } from './QuestPathArt'
import { QuestTraining } from './QuestTraining'

const BAND_LABEL: Record<QuestBandId, MessageKey> = {
  garden: 'map.band.garden',
  studio: 'map.band.studio',
  classroom: 'map.band.classroom',
  frames: 'map.band.frames',
  exam: 'map.band.exam',
}

const EMPTY_UNITS: Unit[] = []

/** Stick map controls just under the platform header. A tucked header leaves the top clear. */
function usePlatformHeaderOffset() {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-platform-header]')
    if (!header) return
    const apply = () => {
      const hidden = header.dataset.collapsed === 'true'
      const height = hidden ? 0 : Math.ceil(header.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--platform-header-offset', `${height}px`)
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(header, { attributes: true, attributeFilter: ['data-collapsed'] })
    const resize = new ResizeObserver(apply)
    resize.observe(header)
    return () => {
      observer.disconnect()
      resize.disconnect()
    }
  }, [])
}

export function MapQuest({ art = EMPTY_UNITS, media = EMPTY_UNITS }: { art?: Unit[]; media?: Unit[] }) {
  const { locale, t, bilingual } = useT()
  usePlatformHeaderOffset()
  const pathRef = useRef<HTMLDivElement>(null)
  const [pathWidth, setPathWidth] = useState(360)
  const [form, choose] = useQuestForm()
  const motion = useQuestMotionPlay()
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  useLayoutEffect(() => {
    const el = pathRef.current
    if (!el) return
    const read = () => {
      const next = el.clientWidth || 360
      setPathWidth((prev) => (Math.abs(prev - next) < 2 ? prev : next))
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => observer.disconnect()
  }, [form, bilingual, openUnitId])
  const [seenForm, setSeenForm] = useState(form)
  if (seenForm !== form) {
    setSeenForm(form)
    setOpenUnitId(null)
    setLessonId(null)
  }
  const chrome = QUEST_CHROME[locale]
  const yearUnits = form === 's5' ? getF5Units() : form === 's6' ? getF6Units() : getF4Units()
  const openYear = yearUnits.find((unit) => unit.id === openUnitId)
  const openLesson = openYear?.nodes.find((node) => node.id === lessonId) ?? null
  const spacing = questPathSpacing(pathWidth, bilingual)
  const stageWidth = Math.max(360, pathWidth)
  const layout = questPathLayout(yearUnits.length, spacing.gap, spacing.bottom, stageWidth)
  const labelSpan = questLabelSpan(layout.width)
  const currentIndex = questCurrentIndex(0, yearUnits.length)
  const bands = Array.from({ length: yearUnits.length }, (_, index) => {
    const id = questBand(index)
    return { id, label: t(BAND_LABEL[id]) }
  })

  function chooseForm(next: QuestFormId) {
    choose(next)
    setOpenUnitId(null)
    setLessonId(null)
  }

  return (
    <>
    <section
      data-quest-map
      data-quest-form={form}
      data-quest-motion={motion ? 'on' : 'off'}
      className="relative rounded-[1.75rem] border-2 border-[#0D9488] bg-white px-3 sm:px-4"
    >
      <div
        data-quest-sticky="controls"
        className="quest-map-sticky -mx-3 shrink-0 rounded-t-[1.55rem] border-b border-[#d7efe9] bg-[#FFF9E9] px-3 pt-2.5 pb-3 sm:-mx-4 sm:px-4"
      >
        <MapVersionToggle mapOne bar />
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <QuestSectionSwitch form={form} onChoose={chooseForm} />
          <QuestMotionButton />
        </div>
      </div>
      <div data-quest-under className="quest-map-under">
        <div className="pb-32">
        {form === 's4' && !openYear ? (
          <div className="mt-3">
            <F4SlidesEntry />
          </div>
        ) : null}
        {openYear ? (
          <F4UnitPanel
            unit={openYear}
            lessonId={lessonId}
            art={art}
            media={media}
            backLabel={chrome.back}
            onBack={() => {
              setOpenUnitId(null)
              setLessonId(null)
            }}
            onLesson={setLessonId}
          />
        ) : (
          <div
            ref={pathRef}
            data-quest-path="illustrated"
            data-quest-entry="path"
            data-quest-xp="static"
            data-quest-gap={spacing.gap}
            data-quest-path-width={pathWidth}
            data-quest-bilingual={bilingual ? 'on' : 'off'}
            className="relative mt-2 w-full"
          >
            <QuestPathArt layout={layout} bands={bands} motion={motion} />
            <ol className="absolute inset-0 m-0 list-none p-0">
              {yearUnits.map((unit, index) => {
                const point = layout.points[index]
                const progress = questNodeProgress(index, currentIndex)
                if (!point) return null
                return (
                  <li
                    key={unit.id}
                    className="absolute text-center"
                    style={{
                      left: `calc(${(point.x / layout.width) * 100}% - ${labelSpan * 50}%)`,
                      top: `calc(${(point.y / layout.height) * 100}% - 1.5rem)`,
                      width: `${labelSpan * 100}%`,
                      minWidth: 0,
                      maxWidth: '78%',
                    }}
                  >
                    <PathNode
                      unitId={unit.id}
                      cover={unit.coverImage}
                      progress={progress}
                      framed={questNodeFramed(index)}
                      motion={motion}
                      label={unit.title}
                      onOpen={() => {
                        setLessonId(null)
                        setOpenUnitId(unit.id)
                      }}
                    />
                  </li>
                )
              })}
            </ol>
          </div>
        )}
        <div data-quest-follow className="mt-4 space-y-3">
          <InspectMapEntry grade={form === 's5' ? 'f5' : form === 's6' ? 'f6' : 'f4'} />
          <HomeworkMapEntry />
        </div>
        <CommitmentFooter dataLine={t(isSupabaseConfigured ? 'app.footer.live' : 'app.footer.mock')} />
        </div>
      </div>
    </section>
    {typeof document === 'undefined'
      ? null
      : createPortal(
          <div data-quest-lesson-host>
            {openLesson ? (
              <LessonPlayer lesson={openLesson} kind="lesson" exitLabel={chrome.back} onExit={() => setLessonId(null)} />
            ) : null}
          </div>,
          document.body,
        )}
    </>
  )
}

function PathNode({
  unitId,
  cover,
  progress,
  framed,
  motion,
  label,
  onOpen,
}: {
  unitId: string
  cover?: string
  progress: QuestNodeProgress
  framed: boolean
  motion: boolean
  label: string
  onOpen: () => void
}) {
  const moves = questXpMoves()
  const current = progress === 'current'
  const done = progress === 'done'
  const locked = progress === 'locked'
  return (
    <button
      type="button"
      data-quest-node={unitId}
      data-quest-active={current ? 'true' : 'false'}
      data-quest-progress={progress}
      data-quest-state={framed ? 'checkpoint' : progress}
      data-quest-shape={framed ? 'frame' : 'ring'}
      data-unit-image={cover ? 'cover' : 'empty'}
      aria-current={current ? 'step' : undefined}
      onClick={onOpen}
      className="flex w-full flex-col items-center bg-transparent"
    >
      <span className="relative flex h-16 w-16 items-center justify-center">
        {motion ? <QuestNodeRings moves={moves} /> : null}
        {current && !motion ? <QuestCurrentMark moves={moves} /> : null}
        <span
          className={`relative h-12 w-12 overflow-hidden rounded-full border-2 bg-[#FFF9E9] ${
            locked ? 'border-[#0D9488]/45 opacity-80' : 'border-[#0D9488]'
          }`}
        >
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
          {done ? (
            <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-[#0D9488]">
              <Check className="h-3.5 w-3.5 text-[#0D9488]" strokeWidth={2.6} aria-hidden />
            </span>
          ) : null}
        </span>
      </span>
      <span className="quest-label mt-1 block w-full rounded-xl bg-white/95 px-2 py-1 text-center text-xs font-bold leading-snug text-slate-900 shadow-sm ring-1 ring-[#d7efe9]">
        <BiSpan text={label} keepWords />
      </span>
    </button>
  )
}

/** Same concentric rings on every title button once path motion is already on. */
function QuestNodeRings({ moves }: { moves: boolean }) {
  return (
    <>
      <span className="quest-ring-pulse absolute h-16 w-16 rounded-full border-2 border-[#0D9488]" aria-hidden />
      <span
        data-quest-xp="static"
        data-quest-rings="on"
        data-quest-xp-moves={moves ? 'on' : 'off'}
        className="absolute h-[4.6rem] w-[4.6rem] rounded-full border-2 border-[#0D9488]"
        aria-hidden
      />
      <span className="absolute h-14 w-14 rounded-full border-2 border-[#0D9488]" aria-hidden />
    </>
  )
}

/** Already-live current step: a still pointer, with no pulsing rings. */
function QuestCurrentMark({ moves }: { moves: boolean }) {
  return (
    <span
      data-quest-mark="static"
      data-quest-xp="static"
      data-quest-xp-moves={moves ? 'on' : 'off'}
      className="quest-current-mark pointer-events-none absolute -top-2 left-1/2 z-[1] -translate-x-1/2"
      aria-hidden
    >
      <svg width="16" height="12" viewBox="0 0 16 12">
        <path d="M8 12 L1 1.2 H15 Z" fill="#0D9488" />
      </svg>
    </span>
  )
}

function F4UnitPanel({
  unit,
  lessonId,
  art,
  media,
  backLabel,
  onBack,
  onLesson,
}: {
  unit: Unit
  lessonId: string | null
  art: Unit[]
  media: Unit[]
  backLabel: string
  onBack: () => void
  onLesson: (id: string | null) => void
}) {
  return (
    <div data-quest-unit={unit.id} className="mt-4 w-full max-w-none">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-[#0D9488]">
        {backLabel}
      </button>
      <h2 className="quest-label mt-3 text-xl font-bold text-slate-900">
        <BiSpan text={unit.title} keepWords />
      </h2>
      <OfficialUnitHeader unitId={unit.id} />
      <ul className="mt-4 space-y-2">
        {unit.nodes.map((node) => {
          const shown = node.id === lessonId
          return (
            <li key={node.id} data-f4-lesson={node.id} className="rounded-2xl bg-[#FFF9E9] px-3 py-2 ring-1 ring-[#b7e4df]">
              <button
                type="button"
                aria-expanded={shown}
                onClick={() => onLesson(shown ? null : node.id)}
                className="quest-label block w-full min-w-0 text-left text-sm font-bold text-slate-900"
              >
                <BiSpan text={node.title} keepWords />
              </button>
            </li>
          )
        })}
      </ul>
      {unit.id === 'F4-U1-ORIENT' ? (
        <div className="mt-5">
          <QuestTraining art={art} media={media} />
        </div>
      ) : null}
    </div>
  )
}
