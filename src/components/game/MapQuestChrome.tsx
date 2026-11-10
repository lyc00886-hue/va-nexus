import { Settings } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { t, useT, type MessageKey } from '../../i18n'
import { QUEST_CHROME, questMotionPlay, type QuestFormId } from '../../lib/mapQuest'
import { usePrefersReducedMotion, useQuestCalm, useQuestMotion } from '../../lib/useQuestForm'

const OTTER = '/content/learning-map-illustrations/moods/motion-v2/otter-map-idle.png'

export function QuestOtterMark({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src={OTTER} alt="" width={64} height={64} decoding="async" className={`${className} rounded-full object-cover`} />
}

const QUEST_GRADE_OPTIONS: readonly { id: QuestFormId; label: MessageKey; grade: 'f4' | 'f5' | 'f6' }[] = [
  { id: 's4', label: 'map.grade.f4', grade: 'f4' },
  { id: 's5', label: 'map.grade.f5', grade: 'f5' },
  { id: 's6', label: 'map.grade.f6', grade: 'f6' },
]

const GRADE_CHIP =
  'rounded-full border font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

export function QuestSectionSwitch({ form, onChoose }: { form: QuestFormId; onChoose: (id: QuestFormId) => void }) {
  return (
    <div data-quest-grades data-quest-grade={form}>
      <p className="text-xs font-semibold text-teal-800">{t('map.gradeLabel')}</p>
      <div role="radiogroup" aria-label={t('map.gradeLabel')} className="mt-2 flex flex-wrap gap-1.5">
        {QUEST_GRADE_OPTIONS.map((item) => {
          const selected = item.id === form
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-quest-section={item.id}
              data-map-grade={item.grade}
              data-selected={selected ? 'true' : 'false'}
              onClick={() => onChoose(item.id)}
              className={
                selected
                  ? `${GRADE_CHIP} min-h-9 border-[#0D9488] bg-[#0D9488] px-3 py-1 text-sm text-[#FFF9E9]`
                  : `${GRADE_CHIP} min-h-9 border-[#0D9488] bg-white px-3 py-1 text-sm text-[#0D9488]`
              }
            >
              {t(item.label)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Student path-motion switch. Off until chosen. Reduce-motion keeps the label off. */
export function QuestMotionButton() {
  const [pref, setPref] = useQuestMotion()
  const { settings } = useSen()
  const prefersReducedMotion = usePrefersReducedMotion()
  const play = questMotionPlay({ pref, reduceMotion: settings.reduceMotion, prefersReducedMotion })
  return (
    <button
      type="button"
      data-quest-motion={play ? 'on' : 'off'}
      aria-pressed={pref}
      onClick={() => setPref(!pref)}
      className="mb-0.5 shrink-0 rounded-full border border-[#0D9488] bg-white px-3 py-1 text-xs font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
    >
      {t(play ? 'map.motion.on' : 'map.motion.off')}
    </button>
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

