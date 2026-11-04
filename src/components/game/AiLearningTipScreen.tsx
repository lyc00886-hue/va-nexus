import { ChevronLeft, Loader2, LogIn } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { t } from '../../i18n'
import { splitLearningTip } from '../../lib/researchUx'
import { socraticZh } from '../../lib/socraticCopy'
import { holdSoftScreen } from '../../lib/softScreen'
import { PrivacyLink } from '../PrivacyModal'

const BIRTH_YEAR_MAX = new Date().getFullYear()

export type AiTipState = { status: 'idle' | 'loading' | 'done' | 'error' | 'notice'; text: string }

type Props = {
  ai: AiTipState
  /** Shown when feedback is busy or fails, so the screen is never blank. */
  checklist: readonly string[]
  onRequestAi: () => void
  onBack: () => void
  /** After a tip is on screen. */
  onContinue: () => void
  /** Busy / error: leave this screen and use the checklist. */
  onFallback: () => void
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
  /** zh-HK Feldman short name, when the Socratic chrome is on. */
  stageName?: string | null
}

/**
 * Standalone AI learning-tip screen.
 * Research step 3 and the one-lesson Map shell both mount this.
 * The parent asks for formative feedback after the 18+ gate. This screen only displays it.
 */
export function AiLearningTipScreen(props: Props) {
  const [tipOpen, setTipOpen] = useState(false)
  const tip = splitLearningTip(props.ai.status === 'done' ? props.ai.text : '')
  const showList = props.ai.status === 'notice' || props.ai.status === 'error'
  const ask = socraticZh('research.socratic.ctaAsk')
  const again = socraticZh('research.socratic.ctaAgain')
  const skip = socraticZh('research.socratic.ctaSkipStage')
  const done = socraticZh('research.socratic.ctaDone')
  const loading = socraticZh('research.socratic.loading')
  const empty = socraticZh('research.socratic.empty')
  const disclaimer = socraticZh('research.socratic.disclaimer')

  useEffect(() => holdSoftScreen(), [])

  return (
    <div
      data-ai-screen="tip"
      className="fixed inset-x-0 bottom-0 top-16 z-[36] overflow-y-auto bg-slate-50 px-4 py-5"
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4">
        <button
          type="button"
          data-ai-back
          onClick={props.onBack}
          className="inline-flex items-center gap-1 self-start text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('rs.back')}
        </button>

        <h2 className="text-2xl font-bold text-slate-900">{socraticZh('research.socratic.tipTitle') ?? t('ai.title')}</h2>
        {props.stageName ? (
          <p className="text-xs text-slate-500">{t('research.socratic.progressHint', { stage: props.stageName })}</p>
        ) : null}

        <div className="flex-1 space-y-3">
          {props.ai.status === 'done' && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3" aria-live="polite">
              <p className="text-xs font-semibold text-teal-800">{t('rs.ai.summary')}</p>
              <p className="mt-1 whitespace-pre-wrap text-base text-teal-950">{tip.lead}</p>
              {tip.rest && tipOpen && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-teal-950">{tip.rest}</p>
              )}
              {tip.rest && (
                <button
                  type="button"
                  aria-expanded={tipOpen}
                  onClick={() => setTipOpen((open) => !open)}
                  className="mt-2 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
                >
                  {tipOpen ? t('ai.fold.less') : t('ai.fold.more')}
                </button>
              )}
            </div>
          )}

          {(props.ai.status === 'loading' || props.ai.status === 'notice') && (
            <p className="text-base font-semibold text-teal-900" role="status">
              {props.ai.status === 'loading' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {loading ?? t('ai.busy')}
                </span>
              ) : (
                t('ai.busy')
              )}
            </p>
          )}

          {props.ai.status === 'error' && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
              {props.ai.text}
            </p>
          )}

          {props.canUseAi && props.ai.status === 'idle' && empty ? (
            <p className="text-sm text-slate-600">{empty}</p>
          ) : null}

          {showList && props.checklist.length > 0 && (
            <ul className="space-y-2" aria-label={t('ai.busy.fallback')}>
              {props.checklist.map((item) => (
                <li key={item} className="rounded-2xl border border-teal-200 bg-white px-4 py-3 text-base font-semibold text-teal-950">
                  {item}
                </li>
              ))}
            </ul>
          )}

          {!props.canUseAi && (
            <AgeGate
              userId={props.userId}
              gateReady={props.gateReady}
              gateBusy={props.gateBusy}
              gateMsg={props.gateMsg}
              birthYearInput={props.birthYearInput}
              onBirthYear={props.onBirthYear}
              onEnableAi={props.onEnableAi}
              onSignIn={props.onSignIn}
            />
          )}
        </div>

        <p className="text-xs text-teal-800/70">
          {disclaimer ?? t('rs.ai.footer')} <PrivacyLink />
        </p>
        {props.canUseAi && (
          <button
            type="button"
            onClick={props.onDisableAi}
            className="self-start text-xs font-semibold text-teal-800 underline-offset-2 hover:underline"
          >
            {t('fw.ai.disable')}
          </button>
        )}

        {props.canUseAi && props.ai.status === 'done' && (
          <>
            <Primary onClick={props.onContinue}>{done ?? t('map.chunk.cta')}</Primary>
            {again ? (
              <button
                type="button"
                onClick={props.onRequestAi}
                className="self-center text-sm font-semibold text-slate-600 underline-offset-2 hover:underline"
              >
                {again}
              </button>
            ) : null}
          </>
        )}
        {props.canUseAi && (props.ai.status === 'notice' || props.ai.status === 'error') && (
          <Primary onClick={props.onFallback}>{t('ai.busy.fallback')}</Primary>
        )}
        {props.canUseAi && props.ai.status === 'idle' && (
          <>
            <Primary onClick={props.onRequestAi}>{ask ?? t('rs.cta.tip')}</Primary>
            {skip ? (
              <button
                type="button"
                onClick={props.onFallback}
                className="self-center text-sm font-semibold text-slate-600 underline-offset-2 hover:underline"
              >
                {skip}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function Primary({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      data-ai-cta="primary"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-teal-700 py-3.5 text-base font-bold text-white hover:bg-teal-600 disabled:cursor-wait disabled:bg-slate-200 disabled:text-slate-400"
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
      <p className="text-base font-bold">{socraticZh('research.socratic.gateTitle') ?? t('rs.ai.age')}</p>
      {socraticZh('research.socratic.ageGate') ? (
        <p className="text-sm font-semibold">{socraticZh('research.socratic.ageGate')}</p>
      ) : null}
      {socraticZh('research.socratic.ageBody') ? (
        <p className="text-sm">{socraticZh('research.socratic.ageBody')}</p>
      ) : null}
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
