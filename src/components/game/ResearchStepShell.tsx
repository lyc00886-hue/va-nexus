import { ChevronLeft } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { t } from '../../i18n'
import {
  advanceChecklist,
  RESEARCH_STEP_COPY,
  RESEARCH_STEP_PHASES,
  type ResearchStepPhase,
} from '../../lib/researchUx'
import type { FeldmanStageId } from '../../types'
import { AiLearningTipScreen } from './AiLearningTipScreen'

type AiStatus = 'idle' | 'loading' | 'done' | 'error' | 'notice'

export type ResearchShellStage = {
  key: FeldmanStageId
  name: string
  checklist: readonly string[]
}

type Props = {
  stages: readonly ResearchShellStage[]
  active: FeldmanStageId
  onActive: (key: FeldmanStageId) => void
  text: string
  onText: (value: string) => void
  artwork: string
  onArtwork: (value: string) => void
  checked: readonly string[]
  onToggle: (item: string) => void
  ai: { status: AiStatus; text: string }
  onRequestAi: () => void
  canUseAi: boolean
  userId: string | null
  gateReady: boolean
  gateBusy: boolean
  gateMsg: string | null
  birthYearInput: string
  onBirthYear: (value: string) => void
  onEnableAi: () => void
  onDisableAi: () => void
  onSignIn: () => void
  onLater?: () => void
}

/**
 * Preview shell: one job per screen (write → checklist → AI learning tip).
 * Mounted only when the research ux flag is on. Same feedback handler as FeldmanWriter.
 */
export function ResearchStepShell({
  stages,
  active,
  onActive,
  text,
  onText,
  artwork,
  onArtwork,
  checked,
  onToggle,
  ai,
  onRequestAi,
  canUseAi,
  userId,
  gateReady,
  gateBusy,
  gateMsg,
  birthYearInput,
  onBirthYear,
  onEnableAi,
  onDisableAi,
  onSignIn,
  onLater,
}: Props) {
  const [phase, setPhase] = useState<ResearchStepPhase>('write')
  const [listIndex, setListIndex] = useState(0)

  const stage = stages.find((s) => s.key === active) ?? stages[0]
  const items = stage?.checklist ?? []
  const item = items[listIndex]
  const itemOn = item ? checked.includes(item) : false
  const allDone = items.length > 0 && items.every((entry) => checked.includes(entry))
  const phaseIndex = RESEARCH_STEP_PHASES.indexOf(phase)

  function chooseStage(key: FeldmanStageId) {
    if (key === active) return
    setPhase('write')
    setListIndex(0)
    onActive(key)
  }

  function continueWrite() {
    setListIndex(0)
    setPhase('list')
  }

  function advanceList() {
    const next = advanceChecklist(listIndex, items.length)
    if (next.done) {
      setPhase('ai')
      return
    }
    setListIndex(next.index)
  }

  function back() {
    if (phase === 'list' && listIndex > 0) {
      setListIndex((i) => i - 1)
      return
    }
    if (phase === 'ai') {
      setPhase('list')
      setListIndex(items.length > 0 ? items.length - 1 : 0)
      return
    }
    setPhase('write')
  }

  if (phase === 'ai') {
    return (
      <AiLearningTipScreen
        ai={ai}
        checklist={items}
        onRequestAi={onRequestAi}
        onBack={back}
        onContinue={() => {
          if (onLater) onLater()
          else back()
        }}
        onFallback={back}
        canUseAi={canUseAi}
        userId={userId}
        gateReady={gateReady}
        gateBusy={gateBusy}
        gateMsg={gateMsg}
        birthYearInput={birthYearInput}
        onBirthYear={onBirthYear}
        onEnableAi={onEnableAi}
        onDisableAi={onDisableAi}
        onSignIn={onSignIn}
      />
    )
  }

  const heading = t(RESEARCH_STEP_COPY[phase].title)

  return (
    <div data-research-shell="steps" data-research-phase={phase} className="space-y-4">
      {phase !== 'write' && (
        <button
          type="button"
          data-research-back
          onClick={back}
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('rs.back')}
        </button>
      )}

      <ol className="flex gap-1.5">
        {RESEARCH_STEP_PHASES.map((p, i) => (
          <li key={p} aria-current={p === phase ? 'step' : undefined} className="min-w-0 flex-1">
            <span className="sr-only">{t(RESEARCH_STEP_COPY[p].title)}</span>
            <span
              aria-hidden
              className={`block h-1.5 rounded-full ${
                i < phaseIndex ? 'bg-teal-300' : i === phaseIndex ? 'bg-teal-700' : 'bg-slate-200'
              }`}
            />
          </li>
        ))}
      </ol>

      {stages.length > 1 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {stages.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => chooseStage(s.key)}
              aria-current={s.key === active ? 'true' : undefined}
              className={
                s.key === active
                  ? 'text-sm font-bold text-teal-950'
                  : 'text-sm font-semibold text-teal-700 underline-offset-2 hover:underline'
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <h3 id="rs-step-title" className="text-2xl font-bold text-slate-900">
        {heading}
      </h3>

      {phase === 'write' && stage && (
        <div className="space-y-3">
          <textarea
            aria-labelledby="rs-step-title"
            className="w-full rounded-2xl border border-teal-200 px-3 py-3 text-base shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            rows={4}
            value={text}
            maxLength={2000}
            onChange={(e) => onText(e.target.value)}
          />
          <label className="block text-sm">
            <span className="font-medium text-teal-900">{t('fw.artwork')}</span>
            <input
              type="text"
              value={artwork}
              maxLength={200}
              onChange={(e) => onArtwork(e.target.value)}
              placeholder={t('fw.artwork.ph')}
              className="mt-1 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </label>
        </div>
      )}

      {phase === 'list' && item && (
        <button
          type="button"
          aria-pressed={itemOn}
          onClick={() => onToggle(item)}
          className={
            itemOn
              ? 'w-full rounded-2xl bg-teal-700 px-4 py-4 text-left text-lg font-bold text-white'
              : 'w-full rounded-2xl border border-teal-200 bg-white px-4 py-4 text-left text-lg font-bold text-teal-950 hover:bg-teal-50'
          }
        >
          {item}
        </button>
      )}

      {phase === 'list' && (
        <p className="min-h-6 text-center text-base font-bold text-teal-800" aria-live="polite">
          {allDone ? t('rs.list.done') : itemOn ? t('rs.list.good') : '\u00a0'}
        </p>
      )}

      {phase === 'write' && <Primary onClick={continueWrite}>{t('rs.cta.continue')}</Primary>}
      {phase === 'list' && <Primary onClick={advanceList}>{t('rs.cta.next')}</Primary>}

      {phase === 'list' && (
        <TextLink onClick={advanceList}>{t('rs.list.skip')}</TextLink>
      )}
      {phase !== 'list' && onLater && <TextLink onClick={onLater}>{t('rs.later')}</TextLink>}
    </div>
  )
}

function Primary({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      data-research-cta="primary"
      onClick={onClick}
      className="w-full rounded-2xl bg-teal-700 py-3.5 text-base font-bold text-white shadow-[0_4px_0_#115e59] hover:bg-teal-600"
    >
      {children}
    </button>
  )
}

function TextLink({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-research-cta="secondary"
      onClick={onClick}
      className="mx-auto block text-sm font-semibold text-slate-500 underline-offset-2 hover:underline"
    >
      {children}
    </button>
  )
}
