import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { signInWithGoogle, useAuth } from './auth'
import { fetchAiAgeGate, loadCachedCanUseAi, revokeCanUseAi, saveBirthYearForAiGate } from './aiAgeGate'

/** Shared 18+ gate. Logged-out students cannot call feedback. */
export function useAiAgeGate() {
  const { ready, user } = useAuth()
  const userId = user?.id ?? null
  const [canUseAi, setCanUseAi] = useState(false)
  const [gateReady, setGateReady] = useState(false)
  const [birthYearInput, setBirthYearInput] = useState('')
  const [gateBusy, setGateBusy] = useState(false)
  const [gateMsg, setGateMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setCanUseAi(loadCachedCanUseAi())
    if (!ready) return
    if (!userId) {
      setCanUseAi(false)
      setGateReady(true)
      return
    }
    setGateReady(false)
    fetchAiAgeGate(userId)
      .then((g) => {
        if (cancelled) return
        setCanUseAi(g.canUseAi)
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

  function onBirthYear(value: string) {
    setBirthYearInput(value.replace(/\D/g, '').slice(0, 4))
  }

  function onEnableAi() {
    if (!userId) return
    const y = Number(birthYearInput)
    setGateBusy(true)
    setGateMsg(null)
    setBirthYearInput('')
    void saveBirthYearForAiGate(userId, y)
      .then((g) => {
        setCanUseAi(g.canUseAi)
        setGateMsg(g.canUseAi ? null : t('fw.ai.under18Saved'))
      })
      .catch(() => setGateMsg(t('fw.ai.birthYear.err')))
      .finally(() => setGateBusy(false))
  }

  function onDisableAi() {
    void revokeCanUseAi(userId).then(() => setCanUseAi(false))
  }

  function onSignIn() {
    signInWithGoogle().catch((e) => console.warn('[auth] sign-in failed', e))
  }

  return {
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
  }
}
