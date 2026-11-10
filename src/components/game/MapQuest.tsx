import { useEffect, useId, useState } from 'react'
import { Check } from 'lucide-react'
import type { Unit } from '../../game/types'
import { useT, type MessageKey } from '../../i18n'
import {
  QUEST_CHROME,
  questNode,
  questSection,
  questUnitFace,
  questXpMoves,
  type QuestFormId,
  type QuestNode,
  type QuestUnit,
} from '../../lib/mapQuest'
import { useQuestCalm, useQuestForm, useQuestMotionPlay } from '../../lib/useQuestForm'
import { QuestMotionButton, QuestSectionSwitch } from './MapQuestChrome'
import {
  questBand,
  questCurrentIndex,
  questNodeFramed,
  questNodeProgress,
  questPathLayout,
  type QuestBandId,
  type QuestNodeProgress,
} from '../../lib/questPathLayout'
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

export function MapQuest({ art = EMPTY_UNITS, media = EMPTY_UNITS }: { art?: Unit[]; media?: Unit[] }) {
  const { locale, t } = useT()
  const [form, choose] = useQuestForm()
  const [calm] = useQuestCalm()
  const motion = useQuestMotionPlay()
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const [popoverId, setPopoverId] = useState<string | null>(null)
  const [enteredId, setEnteredId] = useState<string | null>(null)
  const [seenForm, setSeenForm] = useState(form)
  if (seenForm !== form) {
    setSeenForm(form)
    setOpenUnitId(null)
    setPopoverId(null)
    setEnteredId(null)
  }
  const titleId = useId()
  const chrome = QUEST_CHROME[locale]
  const section = questSection(form)
  const openUnit = section.units.find((unit) => unit.id === openUnitId)
  const popover = popoverId ? questNode(popoverId) : undefined
  const entered = enteredId ? questNode(enteredId) : undefined
  const layout = questPathLayout(section.units.length)
  const currentIndex = questCurrentIndex(0, section.units.length)
  const bands = section.units.map((_, index) => {
    const id = questBand(index)
    return { id, label: t(BAND_LABEL[id]) }
  })

  useEffect(() => {
    if (!popover) return
    const node = document.querySelector<HTMLElement>('[data-quest-start]')
    node?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopoverId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [popover])

  function chooseForm(next: QuestFormId) {
    choose(next)
    setOpenUnitId(null)
    setPopoverId(null)
    setEnteredId(null)
  }

  if (entered) {
    return (
      <section data-quest-stage={entered.id} className="rounded-[2rem] bg-[#FFF9E9] px-4 py-6 pb-32">
        <button type="button" onClick={() => setEnteredId(null)} className="text-sm font-semibold text-[#0D9488]">
          {chrome.back}
        </button>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">{entered.name[locale]}</h2>
        <p className="mt-2 text-sm text-slate-600">{entered.line[locale]}</p>
      </section>
    )
  }

  return (
    <section data-quest-map data-quest-form={form} data-quest-motion={motion ? 'on' : 'off'} className="relative pb-32">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <QuestSectionSwitch form={form} onChoose={chooseForm} />
        <QuestMotionButton />
      </div>
      {openUnit ? (
        <UnitPanel
          unit={openUnit}
          art={art}
          media={media}
          locale={locale}
          backLabel={chrome.back}
          startLabel={chrome.start}
          onBack={() => setOpenUnitId(null)}
          onOpen={setPopoverId}
        />
      ) : (
        <div data-quest-path="illustrated" data-quest-entry="path" className="relative mx-auto mt-3 w-full max-w-[24rem]">
          <QuestPathArt layout={layout} bands={bands} motion={motion} />
          <ol className="absolute inset-0 m-0 list-none p-0">
            {section.units.map((unit, index) => {
              const point = layout.points[index]
              const face = questUnitFace(unit, locale)
              const progress = questNodeProgress(index, currentIndex)
              if (!point) return null
              return (
                <li
                  key={unit.id}
                  className="absolute w-40 -translate-x-1/2 -translate-y-6 text-center"
                  style={{
                    left: `${(point.x / layout.width) * 100}%`,
                    top: `${(point.y / layout.height) * 100}%`,
                  }}
                >
                  <PathNode
                    unitId={unit.id}
                    progress={progress}
                    framed={questNodeFramed(index)}
                    motion={motion}
                    label={face.title}
                    onOpen={() => setOpenUnitId(unit.id)}
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
      {popover ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4" onClick={() => setPopoverId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-quest-popover={popover.id}
            className="w-full max-w-sm rounded-3xl bg-white px-5 py-6 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-2xl font-bold text-slate-900">
              {popover.name[locale]}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{popover.line[locale]}</p>
            <p className="mx-auto mt-4 inline-flex rounded-full bg-[#d9f3ef] px-4 py-2 text-sm font-bold text-[#0D9488]">
              {popover.chest ? popover.name[locale] : chrome.startXp}
            </p>
            <button
              type="button"
              data-quest-start
              onClick={() => {
                setEnteredId(popover.id)
                setPopoverId(null)
              }}
              className="mt-4 min-h-12 w-full rounded-full bg-[#0D9488] text-lg font-bold text-white"
            >
              {popover.chest ? chrome.look : chrome.start}
            </button>
            {calm ? <p className="mt-3 text-xs text-slate-500">{chrome.calmNote}</p> : null}
          </div>
        </div>
      ) : null}
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

function UnitPanel({
  unit,
  art,
  media,
  locale,
  backLabel,
  startLabel,
  onBack,
  onOpen,
}: {
  unit: QuestUnit
  art: Unit[]
  media: Unit[]
  locale: 'zh-Hant' | 'zh-Hans' | 'en'
  backLabel: string
  startLabel: string
  onBack: () => void
  onOpen: (id: string) => void
}) {
  const face = questUnitFace(unit, locale)
  const showTraining = unit.id === 's4-u1' && (art.length > 0 || media.length > 0)
  return (
    <div data-quest-unit={unit.id} className="mt-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-[#0D9488]">
        {backLabel}
      </button>
      <h2 className="mt-3 text-xl font-bold text-slate-900">{face.title}</h2>
      {face.subtitle ? <p className="mt-1 text-sm text-slate-500">{face.subtitle}</p> : null}
      <ul className="mt-4 space-y-2">
        {unit.nodes.map((node) => (
          <li key={node.id}>
            <StepButton node={node} locale={locale} startLabel={startLabel} onOpen={onOpen} />
          </li>
        ))}
      </ul>
      {showTraining ? (
        <div className="mt-5">
          <QuestTraining art={art} media={media} />
        </div>
      ) : null}
    </div>
  )
}

function StepButton({
  node,
  locale,
  startLabel,
  onOpen,
}: {
  node: QuestNode
  locale: 'zh-Hant' | 'zh-Hans' | 'en'
  startLabel: string
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      data-quest-node={node.id}
      data-quest-chest={node.chest ? 'true' : 'false'}
      onClick={() => onOpen(node.id)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-left ring-1 ring-[#b7e4df]"
    >
      <span className="text-sm font-bold text-slate-900">{node.name[locale]}</span>
      <span className="text-xs font-semibold text-[#0D9488]">{startLabel}</span>
    </button>
  )
}
