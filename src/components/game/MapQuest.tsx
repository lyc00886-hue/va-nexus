import { useState } from 'react'
import { getF4Units } from '../../game/f4Demo'
import { getF5Units } from '../../game/f5Demo'
import { getF6Units } from '../../game/f6Demo'
import type { Unit } from '../../game/types'
import { useT } from '../../i18n'
import { QUEST_CHROME, type QuestFormId } from '../../lib/mapQuest'
import { useQuestForm, useQuestMotionPlay } from '../../lib/useQuestForm'
import { QuestMotionButton, QuestSectionSwitch } from './MapQuestChrome'
import {
  questCurrentIndex,
  questNodeFramed,
  questNodeProgress,
  QUEST_LABEL_WIDTH_RATIO,
} from '../../lib/questPathLayout'
import { HomeworkMapEntry } from '../HomeworkStudent'
import { InspectMapEntry } from '../InspectMapEntry'
import { BiSpan } from './BilingualText'
import { LessonTrail, TrailCard, TrailIndex } from './ClassroomTrail'
import { F4SlidesEntry } from './F4SlidesEntry'
import { LessonPlayer } from './LessonPlayer'
import { OfficialUnitHeader } from './OfficialFormat'
import { QuestTraining } from './QuestTraining'

const EMPTY_UNITS: Unit[] = []

export function MapQuest({ art = EMPTY_UNITS, media = EMPTY_UNITS }: { art?: Unit[]; media?: Unit[] }) {
  const { locale } = useT()
  const [form, choose] = useQuestForm()
  const motion = useQuestMotionPlay()
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [pathUnitId, setPathUnitId] = useState<string | null>(null)
  const [pathLessonId, setPathLessonId] = useState<string | null>(null)
  const [seenForm, setSeenForm] = useState(form)
  if (seenForm !== form) {
    setSeenForm(form)
    setOpenUnitId(null)
    setLessonId(null)
    setPathUnitId(null)
    setPathLessonId(null)
  }
  const chrome = QUEST_CHROME[locale]
  const yearUnits = form === 's5' ? getF5Units() : form === 's6' ? getF6Units() : getF4Units()
  const openYear = yearUnits.find((unit) => unit.id === openUnitId)
  const pathUnit = yearUnits.find((unit) => unit.id === pathUnitId) ?? yearUnits[0] ?? null
  const pathLesson = pathUnit?.nodes.find((node) => node.id === pathLessonId) ?? null
  const currentIndex = questCurrentIndex(0, yearUnits.length)

  function chooseForm(next: QuestFormId) {
    choose(next)
    setOpenUnitId(null)
    setLessonId(null)
    setPathUnitId(null)
    setPathLessonId(null)
  }

  return (
    <section
      data-quest-map
      data-quest-form={form}
      data-quest-motion={motion ? 'on' : 'off'}
      className="relative rounded-[1.75rem] border-2 border-[#0D9488] bg-white px-3 pt-3 pb-32 sm:px-4 sm:pt-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <QuestSectionSwitch form={form} onChoose={chooseForm} />
        <QuestMotionButton />
      </div>
      {form === 's4' && !openYear ? (
        <div className="mt-4">
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
          data-quest-path="illustrated"
          data-quest-entry="path"
          data-quest-xp="static"
          data-classroom-units
          className="relative mx-auto mt-3 w-full max-w-[24rem] space-y-3 sm:max-w-none"
          style={{ ['--quest-label-ratio' as string]: QUEST_LABEL_WIDTH_RATIO }}
        >
          {pathUnit ? <OfficialUnitHeader unitId={pathUnit.id} /> : null}
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {yearUnits.map((unit, index) => {
              const selected = unit.id === pathUnit?.id
              const progress = questNodeProgress(index, currentIndex)
              const framed = questNodeFramed(index)
              return (
                <li key={unit.id} className="min-w-0">
                  <TrailCard
                    data-quest-node={unit.id}
                    data-quest-active={progress === 'current' ? 'true' : 'false'}
                    data-quest-progress={progress}
                    data-quest-state={framed ? 'checkpoint' : progress}
                    data-quest-shape={framed ? 'frame' : 'ring'}
                    aria-current={progress === 'current' ? 'step' : undefined}
                    aria-pressed={selected}
                    selected={selected}
                    onClick={() => {
                      setPathUnitId(unit.id)
                      setPathLessonId(null)
                    }}
                  >
                    <TrailIndex n={index + 1} selected={selected} />
                    <span className="min-w-0 text-sm font-bold leading-snug">
                      <BiSpan text={unit.title} />
                    </span>
                  </TrailCard>
                </li>
              )
            })}
          </ol>
          {pathUnit ? (
            <LessonTrail
              lessons={pathUnit.nodes}
              focusId={pathLessonId}
              onOpen={(id) => setPathLessonId(id)}
            />
          ) : null}
          {pathLesson ? (
            <LessonPlayer
              lesson={pathLesson}
              kind="lesson"
              exitLabel={chrome.back}
              onExit={() => setPathLessonId(null)}
            />
          ) : null}
          {pathUnit?.id === 'F4-U1-ORIENT' ? <QuestTraining art={art} media={media} /> : null}
        </div>
      )}
      <div className="mt-4 space-y-3">
        <InspectMapEntry grade={form === 's5' ? 'f5' : form === 's6' ? 'f6' : 'f4'} />
        <HomeworkMapEntry />
      </div>
    </section>
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
    <div data-quest-unit={unit.id} className="mt-4 w-full max-w-none">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-[#0D9488]">
        {backLabel}
      </button>
      <h2 className="mt-3 text-xl font-bold text-slate-900">
        <BiSpan text={unit.title} />
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
                className="block w-full text-left text-sm font-bold text-slate-900"
              >
                <BiSpan text={node.title} />
              </button>
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
