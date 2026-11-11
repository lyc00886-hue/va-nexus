import { useState } from 'react'
import { Check } from 'lucide-react'
import { getF4Units } from '../../game/f4Demo'
import { getF5Units } from '../../game/f5Demo'
import { getF6Units } from '../../game/f6Demo'
import type { Unit } from '../../game/types'
import { useT, type MessageKey } from '../../i18n'
import { QUEST_CHROME, questXpMoves, type QuestFormId } from '../../lib/mapQuest'
import { useQuestForm, useQuestMotionPlay } from '../../lib/useQuestForm'
import { QuestMotionButton, QuestSectionSwitch } from './MapQuestChrome'
import {
  questBand,
  questCurrentIndex,
  questNodeFramed,
  questNodeProgress,
  QUEST_LABEL_WIDTH_RATIO,
  questPathLayout,
  type QuestBandId,
  type QuestNodeProgress,
} from '../../lib/questPathLayout'
import { LessonPlayer } from './LessonPlayer'
import { QuestPathArt } from './QuestPathArt'
import { QuestTraining } from './QuestTraining'
import { QuestionTypeChips } from './QuestionTypeChips'

const BAND_LABEL: Record<QuestBandId, MessageKey> = {
  garden: 'map.band.garden',
  studio: 'map.band.studio',
  classroom: 'map.band.classroom',
  frames: 'map.band.frames',
  exam: 'map.band.exam',
}

const EMPTY_UNITS: Unit[] = []

export function MapQuest({ art = EMPTY_UNITS, media = EMPTY_UNITS }: { art?: Unit[]; media?: Unit[] }) {
  const { locale, t } = useT()
  const [form, choose] = useQuestForm()
  const motion = useQuestMotionPlay()
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [seenForm, setSeenForm] = useState(form)
  if (seenForm !== form) {
    setSeenForm(form)
    setOpenUnitId(null)
    setLessonId(null)
  }
  const chrome = QUEST_CHROME[locale]
  const yearUnits = form === 's5' ? getF5Units() : form === 's6' ? getF6Units() : getF4Units()
  const openYear = yearUnits.find((unit) => unit.id === openUnitId)
  const layout = questPathLayout(yearUnits.length)
  const currentIndex = questCurrentIndex(0, yearUnits.length)
  const bands = Array.from({ length: yearUnits.length }, (_, index) => {
    const id = questBand(index)
    return { id, label: t(BAND_LABEL[id]) }
  })
  const pathFaces = yearUnits.map((unit) => ({ id: unit.id, title: unit.title, subtitle: '' }))

  function chooseForm(next: QuestFormId) {
    choose(next)
    setOpenUnitId(null)
    setLessonId(null)
  }

  return (
    <section data-quest-map data-quest-form={form} data-quest-motion={motion ? 'on' : 'off'} className="relative pb-32">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <QuestSectionSwitch form={form} onChoose={chooseForm} />
        <QuestMotionButton />
      </div>
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
        <div data-quest-path="illustrated" data-quest-entry="path" className="relative mx-auto mt-3 w-full max-w-[24rem]">
          <QuestPathArt layout={layout} bands={bands} motion={motion} />
          <ol className="absolute inset-0 m-0 list-none p-0">
            {pathFaces.map((face, index) => {
              const point = layout.points[index]
              const progress = questNodeProgress(index, currentIndex)
              if (!point) return null
              return (
                <li
                  key={face.id}
                  className="absolute -translate-x-1/2 -translate-y-6 text-center"
                  style={{
                    left: `${(point.x / layout.width) * 100}%`,
                    top: `${(point.y / layout.height) * 100}%`,
                    width: `${QUEST_LABEL_WIDTH_RATIO * 100}%`,
                  }}
                >
                  <PathNode
                    unitId={face.id}
                    progress={progress}
                    framed={questNodeFramed(index)}
                    motion={motion}
                    label={face.title}
                    onOpen={() => setOpenUnitId(face.id)}
                  />
                  <span className="mt-2 block rounded-xl bg-white/95 px-2 py-1 shadow-sm ring-1 ring-[#d7efe9]">
                    <span className="block text-balance text-xs font-bold leading-snug text-slate-900">{face.title}</span>
                    {face.subtitle ? (
                      <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{face.subtitle}</span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}

function PathNode({
  unitId,
  progress,
  framed,
  motion,
  label,
  onOpen,
}: {
  unitId: string
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
      aria-current={current ? 'step' : undefined}
      aria-label={label}
      onClick={onOpen}
      className="relative mx-auto flex h-16 w-16 items-center justify-center"
    >
      {current && motion ? (
        <span className="quest-ring-pulse absolute h-16 w-16 rounded-full border-2 border-[#0D9488]" aria-hidden />
      ) : null}
      {current ? (
        <span
          data-quest-xp="static"
          data-quest-xp-moves={moves ? 'on' : 'off'}
          className="absolute h-[4.6rem] w-[4.6rem] rounded-full border-2 border-[#0D9488]"
          aria-hidden
        />
      ) : null}
      {current ? <span className="absolute h-14 w-14 rounded-full border-2 border-[#0D9488]" aria-hidden /> : null}
      {framed ? (
        <span
          className={`relative flex h-12 w-12 items-center justify-center rounded-xl border-2 bg-white ${
            locked ? 'border-[#0D9488]/45' : 'border-[#0D9488]'
          }`}
          aria-hidden
        >
          {done ? (
            <Check className="h-5 w-5 text-[#0D9488]" strokeWidth={2.6} />
          ) : (
            <span className={`h-5 w-5 rounded-md border-2 ${locked ? 'border-[#0D9488]/40' : 'border-[#0D9488]'}`} />
          )}
        </span>
      ) : done ? (
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0D9488] bg-white" aria-hidden>
          <Check className="h-5 w-5 text-[#0D9488]" strokeWidth={2.6} />
        </span>
      ) : (
        <span
          className={`relative h-11 w-11 rounded-full border-2 bg-white ${locked ? 'border-[#0D9488]/35' : 'border-[#0D9488]'}`}
          aria-hidden
        />
      )}
    </button>
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
  const lesson = unit.nodes.find((node) => node.id === lessonId)
  return (
    <div data-quest-unit={unit.id} className="mt-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-[#0D9488]">
        {backLabel}
      </button>
      <h2 className="mt-3 text-xl font-bold text-slate-900">{unit.title}</h2>
      <ul className="mt-4 space-y-2">
        {unit.nodes.map((node) => {
          const shown = node.id === lessonId
          return (
            <li key={node.id} data-f4-lesson={node.id} className="rounded-2xl bg-white px-3 py-2 ring-1 ring-[#b7e4df]">
              <button
                type="button"
                aria-expanded={shown}
                onClick={() => onLesson(shown ? null : node.id)}
                className="block w-full text-left text-sm font-bold text-slate-900"
              >
                {node.title}
              </button>
              <span className="mt-1 block">
                <QuestionTypeChips types={node.questions.map((question) => question.type)} />
              </span>
              {shown && lesson ? (
                <div className="mt-3">
                  <LessonPlayer lesson={lesson} kind="lesson" exitLabel={backLabel} onExit={() => onLesson(null)} />
                </div>
              ) : null}
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
