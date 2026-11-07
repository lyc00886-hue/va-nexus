import { Bot, CheckSquare, Loader2, Lock, LogIn, Plus, Sparkles, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { useSen } from '../context/SenContext'
import { XP } from '../game/rewards'
import { PrivacyLink } from './PrivacyModal'
import { postFeldmanFeedback } from '../lib/feldmanAiRequest'
import { socraticZh } from '../lib/socraticCopy'
import { useAiAgeGate } from '../lib/useAiAgeGate'
import {
  boostOralText,
  getFeldmanStages,
  inlineTerm,
  termEnglish,
  vocabForStage,
} from '../lib/content'
import type { FeldmanStageId, FeldmanVocabEntry } from '../types'
import { getLocale, joinList, t } from '../i18n'
import { ExerciseMark } from './game/ExerciseMark'
import { LearningProgressRef } from './LearningProgressRef'
import { ResearchStepShell } from './game/ResearchStepShell'

type StepKey = FeldmanStageId

type AiState = { status: 'idle' | 'loading' | 'done' | 'error' | 'notice'; text: string }

const STAGE_API: Record<StepKey, 'describe' | 'analyze' | 'interpret' | 'judge'> = {
  describe: 'describe',
  analyse: 'analyze',
  interpret: 'interpret',
  judge: 'judge',
}

const AI_IDLE: AiState = { status: 'idle', text: '' }

function buildSteps() {
  const en = getLocale() === 'en'
  return getFeldmanStages().map((s, i) => ({
    ...s,
    key: s.id,
    /** stage name in the active language */
    name: en ? s.en : s.zh,
    title: en ? `${i + 1}. ${s.en}` : `${i + 1}. ${s.zh} ${s.en}`,
  }))
}

function emptyRecord<T>(v: () => T): Record<StepKey, T> {
  return { describe: v(), analyse: v(), interpret: v(), judge: v() }
}

export function FeldmanWriter({ shell, onLater }: { shell?: 'steps'; onLater?: () => void }) {
  const { cardPadding } = useSen()
  const { awardOnce } = useGame()
  const {
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
  } = useAiAgeGate()
  const STEPS = useMemo(buildSteps, [])
  const [texts, setTexts] = useState<Record<StepKey, string>>(() => emptyRecord(() => ''))
  const [checked, setChecked] = useState<Record<StepKey, string[]>>(() => emptyRecord(() => []))
  const [active, setActive] = useState<StepKey>('describe')
  const [boostRan, setBoostRan] = useState(false)
  const [hits, setHits] = useState<FeldmanVocabEntry[]>([])
  const [artwork, setArtwork] = useState('')
  const [ai, setAi] = useState<Record<StepKey, AiState>>(() => emptyRecord(() => AI_IDLE))

  const draft = useMemo(
    () => STEPS.map((s) => `【${s.title}】\n${texts[s.key] || t('fw.unwritten')}`).join('\n\n'),
    [texts, STEPS],
  )

  function runBooster() {
    const result = boostOralText(texts[active])
    setBoostRan(true)
    setHits(result.hits)
    if (result.hits.length) {
      setTexts((prev) => ({ ...prev, [active]: result.boosted }))
    }
  }

  function insertFrame(key: StepKey, frame: string) {
    setTexts((prev) => {
      const cur = prev[key]
      return { ...prev, [key]: (cur && !cur.endsWith('\n') ? `${cur}\n` : cur) + frame }
    })
  }

  function toggleCheck(key: StepKey, item: string) {
    setChecked((c) => ({
      ...c,
      [key]: c[key].includes(item) ? c[key].filter((x) => x !== item) : [...c[key], item],
    }))
  }

  async function requestAiFeedback(key: StepKey) {
    if (!canUseAi) {
      setAi((a) => ({ ...a, [key]: { status: 'error', text: t('fw.ai.gated') } }))
      return
    }
    const text = texts[key].trim()
    if (!text) {
      setAi((a) => ({ ...a, [key]: { status: 'error', text: socraticZh('research.socratic.empty') ?? t('fw.err.empty') } }))
      return
    }
    setAi((a) => ({ ...a, [key]: { status: 'loading', text: '' } }))
    const outcome = await postFeldmanFeedback({
      stage: STAGE_API[key],
      text,
      artwork: artwork.trim() || undefined,
      locale: getLocale(),
    })
    if (outcome.status === 'notice') {
      setAi((a) => ({ ...a, [key]: { status: 'notice', text: t('fw.ai.paused') } }))
      return
    }
    if (outcome.status === 'error') {
      setAi((a) => ({ ...a, [key]: { status: 'error', text: outcome.text } }))
      return
    }
    setAi((a) => ({ ...a, [key]: { status: 'done', text: outcome.text } }))
    awardOnce(`feldman-ai-${key}`, XP.feldmanAi, t('fw.award', { title: STEPS.find((s) => s.key === key)?.title ?? key }), 'feldman')
  }

  if (shell === 'steps') {
    return (
      <div className="space-y-3">
        <ExerciseMark id="ex.feldman" />
      <ResearchStepShell
        stages={STEPS}
        active={active}
        onActive={(key) => {
          setActive(key)
          setBoostRan(false)
          setHits([])
        }}
        text={texts[active]}
        onText={(value) => setTexts((prev) => ({ ...prev, [active]: value }))}
        artwork={artwork}
        onArtwork={setArtwork}
        checked={checked[active]}
        onToggle={(item) => toggleCheck(active, item)}
        ai={ai[active]}
        onRequestAi={() => void requestAiFeedback(active)}
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
        onLater={onLater}
      />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <ExerciseMark id="ex.feldman" />
        <h2 className="mt-2 text-xl font-bold text-teal-950">{t('fw.title')}</h2>
        <p className="text-sm text-teal-800/70">{t('fw.subtitle.noAi')}</p>
        {!canUseAi ? (
          <div className="mt-2 space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {socraticZh('research.socratic.gateTitle') ? (
              <p className="text-sm font-bold">
                {socraticZh('research.socratic.gateTitle')}
                <span className="ml-2 font-semibold">{socraticZh('research.socratic.ageGate')}</span>
              </p>
            ) : null}
            <p>{t('fw.ai.gated')}</p>
            {!userId ? (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden />
                {t('fw.ai.signIn')}
              </button>
            ) : (
              <>
                <p>{t('fw.ai.birthYear.help')}</p>
                <label className="block">
                  <span className="font-medium">{t('fw.ai.birthYear')}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={new Date().getFullYear()}
                    autoComplete="bday-year"
                    value={birthYearInput}
                    onChange={(e) => onBirthYear(e.target.value)}
                    placeholder={t('fw.ai.birthYear.ph')}
                    className="mt-1 w-28 rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm text-amber-950"
                    aria-describedby="fw-ai-birth-year-note"
                  />
                </label>
                <p id="fw-ai-birth-year-note" className="text-[11px] text-amber-800/80">
                  {t('fw.ai.birthYear.privacy')}
                </p>
                <button
                  type="button"
                  disabled={gateBusy || birthYearInput.length !== 4 || !gateReady}
                  onClick={onEnableAi}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {gateBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                  {t('fw.ai.enable')}
                </button>
                {gateMsg && <p className="text-[11px] font-medium text-amber-900">{gateMsg}</p>}
              </>
            )}
            <p className="text-[11px] text-amber-800/80">
              {t('fw.geminiNote')} <PrivacyLink />
            </p>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <span className="flex-1">
              {t('fw.geminiNote')} <PrivacyLink />
            </span>
            <button
              type="button"
              onClick={onDisableAi}
              className="rounded-lg border border-sky-200 bg-white px-2 py-1 text-[11px] font-semibold text-sky-900 hover:bg-sky-100"
            >
              {t('fw.ai.disable')}
            </button>
          </div>
        )}
      </div>

      <label className="block text-sm">
        <span className="font-medium text-teal-900">{t('fw.artwork')}</span>
        <input
          type="text"
          value={artwork}
          maxLength={200}
          onChange={(e) => setArtwork(e.target.value)}
          placeholder={t('fw.artwork.ph')}
          className="mt-1 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
      </label>

      <LearningProgressRef compact />

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setActive(s.key)
              setBoostRan(false)
              setHits([])
            }}
            className={
              active === s.key
                ? 'rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-100'
            }
          >
            {s.title}
            {checked[s.key].length > 0 && (
              <span className="ml-1 opacity-80">
                ({checked[s.key].length}/{s.checklist.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {STEPS.filter((s) => s.key === active).map((s) => {
        const stageVocab = vocabForStage(s.key)
        return (
          <section
            key={s.key}
            className={`rounded-2xl border border-teal-100 bg-white shadow-sm ${cardPadding}`}
          >
            <h3 className="text-lg font-bold text-teal-950">{s.title}</h3>
            <p className="mt-1 text-sm text-teal-800/70">{t('fw.goal', { goal: s.goal })}</p>

            <div className="mt-3">
              <p className="text-xs font-semibold text-teal-700">{t('fw.frames')}</p>
              <ul className="mt-1.5 space-y-1.5">
                {s.frames.map((f) => (
                  <li key={f}>
                    <button
                      type="button"
                      onClick={() => insertFrame(s.key, f)}
                      className="inline-flex w-full items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2 text-left text-sm text-teal-950 hover:bg-teal-100"
                    >
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                      <span>{f}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <textarea
              className="mt-3 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              rows={5}
              value={texts[s.key]}
              onChange={(e) => setTexts((prev) => ({ ...prev, [s.key]: e.target.value }))}
              placeholder={t('fw.textarea.ph')}
              maxLength={2000}
            />

            <fieldset className="mt-3">
              <legend className="text-xs font-semibold text-teal-700">{t('fw.checklist')}</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {s.checklist.map((item) => {
                  const on = checked[s.key].includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleCheck(s.key, item)}
                      className={
                        on
                          ? 'inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-900 hover:bg-teal-50'
                      }
                    >
                      {on ? (
                        <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Square className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {item}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runBooster}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {t('fw.boost')}
              </button>
              {canUseAi ? (
                <button
                  type="button"
                  onClick={() => requestAiFeedback(s.key)}
                  disabled={ai[s.key].status === 'loading'}
                  className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {ai[s.key].status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Bot className="h-4 w-4" aria-hidden />
                  )}
                  {ai[s.key].status === 'loading' ? (socraticZh('research.socratic.loading') ?? t('fw.ai.loading')) : t('fw.ai')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title={t('fw.ai.gated')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500"
                >
                  <Lock className="h-4 w-4" aria-hidden />
                  {t('fw.ai.locked')}
                </button>
              )}
            </div>
            {boostRan && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {hits.length === 0 ? (
                  <p>
                    {t('fw.boost.none')}
                    {joinList(stageVocab.slice(0, 4).map((v) => t('fw.quote', { text: v.colloquial })))}
                    …
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {hits.map((h) => (
                      <li key={h.colloquial}>
                        {t('fw.quote', { text: h.colloquial })} → <span className="font-semibold">{inlineTerm(h.term)}</span>
                        {h.term !== inlineTerm(h.term) && (
                          <span className="text-amber-800/70">{t('fw.alsoWrite', { term: h.term })}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {ai[s.key].status === 'done' && (
              <div
                className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950"
                aria-live="polite"
              >
                <p className="mb-1 font-semibold">{t('fw.ai.title')}</p>
                <p className="whitespace-pre-wrap">{ai[s.key].text}</p>
                <p className="mt-2 text-xs text-teal-800/60">{socraticZh('research.socratic.disclaimer') ?? t('fw.ai.disclaimer')}</p>
              </div>
            )}
            {ai[s.key].status === 'notice' && (
              <p
                className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950"
                role="status"
              >
                {ai[s.key].text}
              </p>
            )}
            {ai[s.key].status === 'error' && (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
                {ai[s.key].text}
              </p>
            )}

            <details className="mt-3 rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-teal-900">
                {t('fw.stageVocab', { stage: s.name, n: stageVocab.length })}
              </summary>
              <ul className="mt-2 space-y-1.5">
                {stageVocab.map((v) => (
                  <li key={v.colloquial}>
                    <span className="font-semibold">{v.colloquial}</span> → {v.term}
                    {getLocale() !== 'en' && termEnglish(v.term) && (
                      <span className="text-xs text-teal-700/70"> · {termEnglish(v.term)}</span>
                    )}
                    <p className="text-xs text-teal-700/60">{t('fw.example', { text: v.example })}</p>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )
      })}

      <details className="rounded-2xl border border-teal-100 bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-semibold text-teal-950">{t('fw.draft')}</summary>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-teal-900/90">{draft}</pre>
      </details>
    </div>
  )
}
