import { Settings } from 'lucide-react'
import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import { useT } from '../../i18n'
import { QUEST_CHROME, QUEST_SECTIONS, type QuestFormId } from '../../lib/mapQuest'
import { useQuestCalm, useQuestForm } from '../../lib/useQuestForm'

const OTTER = '/content/learning-map-illustrations/moods/motion-v2/otter-map-idle.png'

export function QuestOtterMark({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src={OTTER} alt="" width={64} height={64} decoding="async" className={`${className} rounded-full object-cover`} />
}

export function QuestGradeSwitch() {
  const { locale } = useT()
  const [form, choose] = useQuestForm()
  const [open, setOpen] = useState(false)
  const chrome = QUEST_CHROME[locale]
  const current = QUEST_SECTIONS.find((item) => item.id === form) ?? QUEST_SECTIONS[0]
  return (
    <div className="relative">
      <button
        type="button"
        data-quest-grade={form}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${chrome.grade} ${current.chip} ${current.name[locale]}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-bold text-[#0D9488] ring-1 ring-[#0D9488]"
      >
        <span className="sm:hidden">{current.short[locale]}</span>
        <span className="hidden sm:inline">
          {current.chip} {current.name[locale]}
        </span>
        <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={chrome.grade}
          data-quest-grade-menu
          className="absolute left-0 z-50 mt-1 min-w-44 rounded-2xl bg-white p-1 shadow-lg ring-1 ring-[#b7e4df]"
        >
          {QUEST_SECTIONS.map((item) => {
            const selected = item.id === form
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-quest-grade-option={item.id}
                  onClick={() => {
                    choose(item.id)
                    setOpen(false)
                  }}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                    selected ? 'bg-[#0D9488] text-[#FFF9E9]' : 'text-slate-800 hover:bg-teal-50'
                  }`}
                >
                  {item.chip} {item.name[locale]}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export function QuestStats() {
  const { locale } = useT()
  const { streak, state } = useGame()
  const [calm] = useQuestCalm()
  const chrome = QUEST_CHROME[locale]
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-quest-stats>
      <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-2.5 text-xs font-semibold text-slate-800 ring-1 ring-teal-100">
        <span>{chrome.streak}</span>
        <span data-quest-days={streak}>{streak}</span>
      </span>
      <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-2.5 text-xs font-semibold text-slate-800 ring-1 ring-teal-100">
        <span aria-hidden className="text-[#0D9488]">
          ◆
        </span>
        <span>{chrome.inspiration}</span>
        <span data-quest-ideas={state.xp}>{state.xp}</span>
      </span>
      <span
        data-quest-slot="empty"
        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-[#FFF4DE] px-2.5 text-sm text-slate-400 ring-1 ring-[#f3e6c4]"
      >
        —
      </span>
      {calm ? (
        <span
          data-quest-calm="on"
          className="inline-flex min-h-9 items-center rounded-full bg-white px-2.5 text-xs font-semibold text-[#0D9488] ring-1 ring-[#0D9488]"
        >
          {chrome.calm}
        </span>
      ) : null}
    </div>
  )
}

export function QuestGearButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const { locale } = useT()
  return (
    <button
      type="button"
      data-quest-gear
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={QUEST_CHROME[locale].settings}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ${
        open ? 'bg-[#0D9488] text-white ring-[#0D9488]' : 'bg-white text-[#0D9488] ring-[#0D9488]'
      }`}
    >
      <Settings className="h-4 w-4" aria-hidden />
    </button>
  )
}

export function QuestSectionSwitch({ form, onChoose }: { form: QuestFormId; onChoose: (id: QuestFormId) => void }) {
  const { locale } = useT()
  const chrome = QUEST_CHROME[locale]
  return (
    <div role="radiogroup" aria-label={chrome.sections} data-quest-sections className="flex flex-wrap gap-2">
      {QUEST_SECTIONS.map((item) => {
        const selected = item.id === form
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-quest-section={item.id}
            aria-label={`${item.chip} ${item.name[locale]}`}
            onClick={() => onChoose(item.id)}
            className={`min-h-9 rounded-full px-4 py-1 text-sm font-bold ${
              selected ? 'bg-[#0D9488] text-[#FFF9E9]' : 'bg-white text-[#0D9488] ring-1 ring-[#0D9488]'
            }`}
          >
            {item.chip}
          </button>
        )
      })}
    </div>
  )
}
