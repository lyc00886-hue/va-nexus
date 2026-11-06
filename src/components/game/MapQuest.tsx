import { useEffect, useId, useState } from 'react'
import { useT } from '../../i18n'
import {
  QUEST_CHROME,
  QUEST_EDGE,
  questActiveId,
  questLane,
  questNode,
  questSection,
  questXpMoves,
  type QuestNode,
  type QuestUnit,
} from '../../lib/mapQuest'
import { useQuestCalm, useQuestForm } from '../../lib/useQuestForm'
import { QuestSectionSwitch } from './MapQuestChrome'

const OTTER = '/content/learning-map-illustrations/moods/motion-v2/otter-map-idle.png'

function faceStyle(unit: QuestUnit, node: QuestNode, active: boolean): { background: string; color: string; borderColor: string } {
  if (node.chest) {
    return { background: '#FFF4E5', color: '#B45309', borderColor: '#B45309' }
  }
  if (active) {
    return { background: unit.color, color: '#FFF9E9', borderColor: QUEST_EDGE[unit.color] ?? unit.color }
  }
  return { background: '#ffffff', color: unit.color, borderColor: unit.color }
}

function UnitPath({ unit }: { unit: QuestUnit }) {
  const points = unit.nodes.map((_, index) => `${index === 0 ? 'M' : 'L'} ${questLane(index)} ${12 + index * 25}`)
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <path d={points.join(' ')} fill="none" stroke="#99f6e4" strokeWidth="0.7" strokeDasharray="1.6 1.8" strokeLinecap="round" />
    </svg>
  )
}

function QuestNodeButton({
  unit,
  node,
  index,
  active,
  label,
  name,
  chestReady,
  onOpen,
}: {
  unit: QuestUnit
  node: QuestNode
  index: number
  active: boolean
  label: string
  name: string
  chestReady: string
  onOpen: (id: string) => void
}) {
  const face = faceStyle(unit, node, active)
  const moves = questXpMoves()
  return (
    <div className="absolute top-0 w-28 -translate-x-1/2 text-center" style={{ left: `${questLane(index)}%` }}>
      {active ? (
        <span
          data-quest-xp="static"
          data-quest-xp-moves={moves ? 'on' : 'off'}
          className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0D9488] px-3 py-1 text-xs font-bold text-white"
        >
          {label}
        </span>
      ) : null}
      <button
        type="button"
        data-quest-node={node.id}
        data-quest-chest={node.chest ? 'true' : 'false'}
        data-quest-active={active ? 'true' : 'false'}
        aria-label={name}
        onClick={() => onOpen(node.id)}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-b-[7px] text-lg font-bold active:translate-y-1 active:border-b-[2px]"
        style={{ background: face.background, color: face.color, borderColor: face.borderColor }}
      >
        {node.chest ? '寶' : active ? '' : String(index + 1)}
        {active && !node.chest ? <span className="h-3 w-3 rounded-full bg-white" aria-hidden /> : null}
      </button>
      <span className="mt-1 block text-sm font-bold leading-tight text-slate-800">{name}</span>
      {node.chest ? <span className="block text-xs text-[#B45309]">{chestReady}</span> : null}
    </div>
  )
}

export function MapQuest() {
  const { locale } = useT()
  const [form, choose] = useQuestForm()
  const [calm] = useQuestCalm()
  const [focusId, setFocusId] = useState<string | null>(null)
  const [popoverId, setPopoverId] = useState<string | null>(null)
  const [enteredId, setEnteredId] = useState<string | null>(null)
  const titleId = useId()
  const chrome = QUEST_CHROME[locale]
  const section = questSection(form)
  const activeId = questActiveId(section)
  const popover = popoverId ? questNode(popoverId) : undefined
  const entered = enteredId ? questNode(enteredId) : undefined

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

  function openNode(id: string) {
    setPopoverId(id)
  }

  if (entered) {
    return (
      <section data-quest-stage={entered.id} className="rounded-[2rem] bg-[#FFF9E9] px-4 py-6 pb-32">
        <button type="button" onClick={() => setEnteredId(null)} className="text-sm font-semibold text-[#0D9488]">
          {chrome.back}
        </button>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">{entered.name[locale]}</h2>
        <p className="mt-2 text-sm text-slate-600">{entered.line[locale]}</p>
        {entered.chest ? <p className="mt-4 text-sm font-semibold text-[#B45309]">{chrome.chestReady}</p> : null}
      </section>
    )
  }

  return (
    <section data-quest-map data-quest-form={form} className="relative rounded-[2rem] bg-[#FFF9E9] px-3 py-4 pb-32 sm:px-5">
      <QuestSectionSwitch
        form={form}
        onChoose={(next) => {
          choose(next)
          setFocusId(null)
          setPopoverId(null)
        }}
      />
      <div className="mt-4 space-y-8">
        {section.units.map((unit, unitIndex) => (
          <article key={unit.id} data-quest-unit={unit.id} className="relative">
            <header className="rounded-2xl px-4 py-3 text-white" style={{ background: unit.color }}>
              <p className="text-xs font-semibold text-white/80">{unit.code}</p>
              <h2 className="text-lg font-bold leading-snug">{unit.title[locale]}</h2>
              <button
                type="button"
                data-quest-focus={unit.id}
                aria-expanded={focusId === unit.id}
                onClick={() => setFocusId((current) => (current === unit.id ? null : unit.id))}
                className="mt-2 inline-flex min-h-8 items-center rounded-full bg-white/95 px-3 text-xs font-bold text-slate-800"
              >
                {chrome.focus}
              </button>
              {focusId === unit.id ? <p className="mt-2 text-sm text-white/95">{unit.focus[locale]}</p> : null}
            </header>
            <ol className="relative mt-8">
              <UnitPath unit={unit} />
              {unitIndex === 0 ? (
                <img
                  src={OTTER}
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                  className="pointer-events-none absolute left-1 top-28 h-14 w-14 object-contain"
                />
              ) : null}
              {unit.nodes.map((node, index) => (
                <li key={node.id} className="relative h-28">
                  <QuestNodeButton
                    unit={unit}
                    node={node}
                    index={index}
                    active={node.id === activeId}
                    label={chrome.startXp}
                    name={node.name[locale]}
                    chestReady={chrome.chestReady}
                    onOpen={openNode}
                  />
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
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
