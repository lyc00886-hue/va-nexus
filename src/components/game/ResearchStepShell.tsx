import { Loader2, LogIn } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { t } from '../../i18n'
import { PrivacyLink } from '../PrivacyModal'
import {
  advanceChecklist,
  RESEARCH_STEP_COPY,
  RESEARCH_STEP_PHASES,
  splitLearningTip,
  type ResearchStepPhase,
} from '../../lib/researchUx'
import type { FeldmanStageId } from '../../types'

const BIRTH_YEAR_MAX = new Date().getFullYear()

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
  const [tipOpen, setTipOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  const stage = stages.find((s) => s.key === active) ?? stages[0]
  const items = stage?.checklist ?? []
  const item = items[listIndex]
  const itemOn = item ? checked.includes(item) : false
  const allDone = items.length > 0 && items.every((entry) => checked.includes(entry))
  const phaseIndex = RESEARCH_STEP_PHASES.indexOf(phase)
  const heading = phase === 'ai' ? t('rs.ai.title') : t(RESEARCH_STEP_COPY[phase].title)
  const tip = splitLearningTip(ai.status === 'done' ? ai.text : '')

  function chooseStage(key: FeldmanStageId) {
    if (key === active) return
    setPhase('write')
    setListIndex(0)
    setTipOpen(false)
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
    setTipOpen(false)
    if (phase === 'ai') {
      setPhase('list')
      setListIndex(items.length > 0 ? items.length - 1 : 0)
      return
    }
    setPhase('write')
  }

  return (
    <div data-research-shell="steps" data-research-phase={phase} className="space-y-4">
      {phase !== 'write' && (
        <button
          type="button"
          onClick={back}
          className="text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
        >
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

      {phase === 'ai' && (
        <div className="space-y-3">
          {ai.status === 'done' && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3" aria-live="polite">
              <p className="text-xs font-semibold text-teal-800">{t('rs.ai.summary')}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-teal-950">{tip.lead}</p>
              {tip.rest && tipOpen && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-teal-950">{tip.rest}</p>
              )}
              {tip.rest && (
                <button
                  type="button"
                  onClick={() => setTipOpen((open) => !open)}
                  className="mt-2 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
                >
                  {tipOpen ? t('rs.ai.less') : t('rs.ai.more')}
                </button>
              )}
            </div>
          )}
          {ai.status === 'notice' && (
            <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950" role="status">
              {t('rs.ai.busy')}
            </p>
          )}
          {ai.status === 'error' && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
              {ai.text}
            </p>
          )}
          {!canUseAi && (
            <AgeGate
              userId={userId}
              gateReady={gateReady}
              gateBusy={gateBusy}
              gateMsg={gateMsg}
              birthYearInput={birthYearInput}
              onBirthYear={onBirthYear}
              onEnableAi={onEnableAi}
              onSignIn={onSignIn}
            />
          )}
          <p className="text-xs text-teal-800/70">{t('rs.ai.footer')}</p>
          <div>
            <button
              type="button"
              onClick={() => setNoteOpen((open) => !open)}
              className="text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
              aria-expanded={noteOpen}
            >
              {noteOpen ? t('rs.ai.less') : t('rs.ai.more')}
            </button>
            {noteOpen && (
              <div className="mt-2 space-y-2 text-xs leading-relaxed text-teal-900/80">
                <p>
                  {t('fw.geminiNote')} <PrivacyLink />
                </p>
                <p>{t('fw.ai.gated')}</p>
                {canUseAi && (
                  <button
                    type="button"
                    onClick={onDisableAi}
                    className="font-semibold text-teal-900 underline-offset-2 hover:underline"
                  >
                    {t('fw.ai.disable')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'write' && <Primary onClick={continueWrite}>{t('rs.cta.continue')}</Primary>}
      {phase === 'list' && <Primary onClick={advanceList}>{t('rs.cta.next')}</Primary>}
      {phase === 'ai' && canUseAi && (
        <Primary onClick={onRequestAi} disabled={ai.status === 'loading'}>
          {ai.status === 'loading' ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('fw.ai.loading')}
            </span>
          ) : (
            t('rs.cta.tip')
          )}
        </Primary>
      )}

      {phase === 'list' && (
        <TextLink onClick={advanceList}>{t('rs.list.skip')}</TextLink>
      )}
      {phase !== 'list' && onLater && <TextLink onClick={onLater}>{t('rs.later')}</TextLink>}
    </div>
  )
}

function Primary({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      data-research-cta="primary"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-teal-700 py-3.5 text-base font-bold text-white shadow-[0_4px_0_#115e59] hover:bg-teal-600 disabled:cursor-wait disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
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

function AgeGate({
  userId,
  gateReady,
  gateBusy,
  gateMsg,
  birthYearInput,
  onBirthYear,
  onEnableAi,
  onSignIn,
}: {
  userId: string | null
  gateReady: boolean
  gateBusy: boolean
  gateMsg: string | null
  birthYearInput: string
  onBirthYear: (value: string) => void
  onEnableAi: () => void
  onSignIn: () => void
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <p className="text-base font-bold">{t('rs.ai.age')}</p>
      {!userId ? (
        <Primary onClick={onSignIn}>
          <span className="inline-flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" aria-hidden />
            {t('fw.ai.signIn')}
          </span>
        </Primary>
      ) : (
        <>
          <label className="block text-sm">
            <span className="font-medium">{t('fw.ai.birthYear')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1900}
              max={BIRTH_YEAR_MAX}
              autoComplete="bday-year"
              value={birthYearInput}
              onChange={(e) => onBirthYear(e.target.value)}
              placeholder={t('fw.ai.birthYear.ph')}
              className="mt-1 w-28 rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm text-amber-950"
            />
          </label>
          <Primary onClick={onEnableAi} disabled={gateBusy || birthYearInput.length !== 4 || !gateReady}>
            {gateBusy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t('fw.ai.enable')}
              </span>
            ) : (
              t('fw.ai.enable')
            )}
          </Primary>
          {gateMsg && <p className="text-xs font-medium">{gateMsg}</p>}
        </>
      )}
    </div>
  )
}
