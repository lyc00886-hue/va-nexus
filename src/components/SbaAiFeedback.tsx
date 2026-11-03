import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { contentJson } from '../i18n/content'
import { useT } from '../i18n'
import {
  fetchAiAgeGate,
  loadCachedCanUseAi,
  saveBirthYearForAiGate,
} from '../lib/aiAgeGate'
import { signInWithGoogle, useAuth } from '../lib/auth'
import { feedbackLocaleHeaders } from '../lib/feedbackLocale'
import { supabase } from '../lib/supabase'
import {
  sbaAiCallAllowed,
  sbaFeedbackMaterial,
  sbaFeedbackPayloadIsFormative,
  sbaFeedbackRequestBody,
} from '../lib/sbaAiFeedback'
import { PrivacyLink } from './PrivacyModal'

type SbaAiFeedbackCopy = {
  buttonOpenFeedback: string
  ageGateTitle: string
  ageGateBody: string
  ageGateConfirm: string
  ageGateDeny: string
  loading: string
  resultTitle: string
  disclaimer: string
  emptyState: string
  errorGeneric: string
  tipUseOwnWords: string
}

type Phase = 'idle' | 'empty' | 'gate' | 'loading' | 'done' | 'error'

const BIRTH_YEAR_MAX = new Date().getFullYear()

type Props = {
  stepLabel: string
  note: string
  savedNotes: Array<string | null | undefined>
  photoCount: number
}

/**
 * Manual formative comments on the evidence already on this step.
 * The open button never calls the model. Confirm calls `/api/feedback` only
 * when the account is already marked 18+ and there is a note or a photo count.
 * Image files are not sent. The panel has no score, grade, or level.
 */
export function SbaAiFeedback({ stepLabel, note, savedNotes, photoCount }: Props) {
  const { locale, t } = useT()
  const { ready, user } = useAuth()
  const userId = user?.id ?? null
  const copy = contentJson<SbaAiFeedbackCopy>('sba-ai-feedback-copy', locale)
  const gateTitleId = useId()
  const material = sbaFeedbackMaterial({ note, savedNotes, photoCount })
  const materialKey = `${stepLabel}\0${material.text}\0${material.photoCount}`

  const [phase, setPhase] = useState<Phase>('idle')
  const [feedback, setFeedback] = useState('')
  const [canUseAi, setCanUseAi] = useState(false)
  const [gateReady, setGateReady] = useState(false)
  const [birthYearInput, setBirthYearInput] = useState('')
  const [gateBusy, setGateBusy] = useState(false)
  const [gateMsg, setGateMsg] = useState<string | null>(null)
  const [trackedMaterial, setTrackedMaterial] = useState(materialKey)
  const [gateUserId, setGateUserId] = useState(userId)
  const materialKeyRef = useRef(materialKey)
  const confirmLock = useRef(false)

  // A new note or photo clears a visible result. It never starts a request.
  if (trackedMaterial !== materialKey) {
    setTrackedMaterial(materialKey)
    setFeedback('')
    setPhase('idle')
  }

  const userChanged = userId !== gateUserId
  if (userChanged) {
    setGateUserId(userId)
    setCanUseAi(false)
    setGateReady(false)
    setGateMsg(null)
  }

  const aiAllowed = !userChanged && Boolean(userId) && canUseAi
  const ageGateReady = !userChanged && ((ready && !userId) || (Boolean(userId) && gateReady))

  useEffect(() => {
    materialKeyRef.current = materialKey
  }, [materialKey])

  useEffect(() => {
    if (!ready || !userId) return
    let cancelled = false
    fetchAiAgeGate(userId)
      .then((gate) => {
        if (cancelled) return
        setCanUseAi(gate.canUseAi)
        setGateReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setCanUseAi(loadCachedCanUseAi())
        setGateReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [ready, userId])

  useEffect(() => {
    if (phase !== 'gate') return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setPhase(feedback ? 'done' : 'idle')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, feedback])

  function onOpen() {
    if (!material.hasMaterial) {
      setFeedback('')
      setPhase('empty')
      return
    }
    setGateMsg(null)
    setPhase('gate')
  }

  function onDeny() {
    setPhase(feedback ? 'done' : 'idle')
  }

  async function onConfirm() {
    if (confirmLock.current || !ageGateReady || gateBusy) return
    confirmLock.current = true
    try {
      if (!material.hasMaterial) {
        setFeedback('')
        setPhase('empty')
        return
      }
      if (!userId) {
        try {
          await signInWithGoogle()
        } catch (err) {
          console.warn('[auth] sign-in failed', err)
        }
        return
      }
      if (!aiAllowed) {
        if (birthYearInput.length !== 4) return
        const year = Number(birthYearInput)
        setBirthYearInput('')
        setGateBusy(true)
        setGateMsg(null)
        try {
          const gate = await saveBirthYearForAiGate(userId, year)
          setCanUseAi(gate.canUseAi)
          setGateMsg(gate.canUseAi ? null : t('fw.ai.under18Saved'))
        } catch {
          setGateMsg(t('fw.ai.birthYear.err'))
        } finally {
          setGateBusy(false)
        }
        return
      }
      if (!sbaAiCallAllowed({ manualConfirm: true, canUseAi: aiAllowed, hasMaterial: true })) return

      const keyAtStart = materialKey
      setPhase('loading')
      try {
        if (!supabase) throw new Error('no_supabase')
        const { data: sess } = await supabase.auth.getSession()
        const accessToken = sess.session?.access_token
        if (materialKeyRef.current !== keyAtStart) return
        if (!accessToken) {
          setCanUseAi(false)
          setFeedback('')
          setPhase('gate')
          return
        }
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            ...feedbackLocaleHeaders(locale),
          },
          body: JSON.stringify(
            sbaFeedbackRequestBody({
              locale,
              text: material.text,
              photoCount: material.photoCount,
              step: stepLabel,
            }),
          ),
        })
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
        if (materialKeyRef.current !== keyAtStart) return
        if (res.status === 401 || res.status === 403) {
          setCanUseAi(false)
          setFeedback('')
          setPhase('gate')
          return
        }
        if (!res.ok || !sbaFeedbackPayloadIsFormative(data)) {
          setFeedback('')
          setPhase('error')
          return
        }
        setFeedback(data.feedback)
        setPhase('done')
      } catch {
        if (materialKeyRef.current !== keyAtStart) return
        setFeedback('')
        setPhase('error')
      }
    } finally {
      confirmLock.current = false
    }
  }

  const showEmpty = !material.hasMaterial || phase === 'empty'

  return (
    <div className="mt-5 border-t border-teal-100 pt-4" data-testid="sba-ai-feedback" data-ai-marks="false">
      <button
        type="button"
        onClick={onOpen}
        disabled={phase === 'loading'}
        aria-busy={phase === 'loading'}
        aria-haspopup="dialog"
        data-testid="sba-ai-open"
        className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm hover:bg-teal-50 disabled:cursor-wait disabled:opacity-70"
      >
        {phase === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden />
        )}
        {phase === 'loading' ? copy.loading : copy.buttonOpenFeedback}
      </button>
      <p className="mt-2 text-xs text-teal-800/80">{copy.tipUseOwnWords}</p>

      {showEmpty && (
        <p className="mt-3 text-sm text-teal-800" role="status" data-testid="sba-ai-empty">
          {copy.emptyState}
        </p>
      )}

      {phase === 'error' && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert" data-testid="sba-ai-error">
          {copy.errorGeneric}
        </p>
      )}

      {phase === 'done' && feedback && (
        <div
          className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950"
          aria-live="polite"
          data-testid="sba-ai-result"
          data-ai-marks="false"
        >
          <p className="font-semibold">{copy.resultTitle}</p>
          <p className="mt-1 whitespace-pre-wrap">{feedback}</p>
          <p
            className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950"
            role="note"
            data-testid="sba-ai-disclaimer"
          >
            {copy.disclaimer}
          </p>
        </div>
      )}

      {phase === 'gate' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={gateTitleId}
          data-testid="sba-ai-gate"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onDeny}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={gateTitleId} className="text-sm font-bold text-teal-950">
              {copy.ageGateTitle}
            </h3>
            <p className="mt-2 text-sm text-teal-900">{copy.ageGateBody}</p>
            {userId && !aiAllowed && (
              <div className="mt-3 space-y-2 text-xs text-teal-900">
                <p>{t('fw.ai.birthYear.help')}</p>
                <label className="block">
                  <span className="font-medium">{t('fw.ai.birthYear')}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={BIRTH_YEAR_MAX}
                    autoComplete="bday-year"
                    value={birthYearInput}
                    onChange={(event) => setBirthYearInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder={t('fw.ai.birthYear.ph')}
                    className="mt-1 w-28 rounded-lg border border-teal-300 bg-white px-2 py-1 text-sm text-teal-950"
                  />
                </label>
                <p className="text-[11px] text-teal-800/80">{t('fw.ai.birthYear.privacy')}</p>
              </div>
            )}
            <p className="mt-3 text-[11px] text-teal-800/80">
              {t('fw.geminiNote')} <PrivacyLink />
            </p>
            {gateMsg && <p className="mt-2 text-xs font-medium text-amber-900">{gateMsg}</p>}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={!ageGateReady || gateBusy || (Boolean(userId) && !aiAllowed && birthYearInput.length !== 4)}
                data-testid="sba-ai-confirm"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {gateBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {copy.ageGateConfirm}
              </button>
              <button
                type="button"
                onClick={onDeny}
                data-testid="sba-ai-deny"
                className="rounded-xl px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
              >
                {copy.ageGateDeny}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
