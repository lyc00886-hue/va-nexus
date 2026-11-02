import { useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext'
import { useAuth } from '../lib/auth'
import {
  clearPerUserLocalData,
  fetchServerGame,
  flushProgressSave,
  getLocalOwner,
  resolveSignInState,
  scheduleProgressSave,
  setLocalOwner,
} from '../lib/progressSync'

/**
 * Headless: syncs game progress for the signed-in user.
 * - On sign-in: merge unowned guest / same-user local progress with the server copy.
 *   If local progress belongs to a *different* account, adopt that account's cloud
 *   row (or a fresh empty state) — never write account A's XP into account B.
 * - Saves on change (debounced) and flushes on tab hide / before sign-out.
 * - On sign-out: clear per-user local keys (game, owner, SBA local notes). SEN + locale stay.
 * SEN data is never synced.
 */
export function ProgressSync() {
  const { user, ready } = useAuth()
  const { state, replaceState, resetGame } = useGame()
  const uid = user?.id ?? null
  const syncedFor = useRef<string | null>(null)
  const prevUid = useRef<string | null>(null)
  const latest = useRef(state)
  latest.current = state

  // sign-in merge / sign-out reset
  useEffect(() => {
    if (!ready) return
    const was = prevUid.current
    prevUid.current = uid
    if (!uid) {
      syncedFor.current = null
      if (was || getLocalOwner()) {
        clearPerUserLocalData()
        resetGame()
      }
      return
    }
    if (syncedFor.current === uid) return
    let cancelled = false
    ;(async () => {
      try {
        const server = await fetchServerGame(uid)
        if (cancelled) return
        const next = resolveSignInState(uid, latest.current, getLocalOwner(), server)
        replaceState(next)
        setLocalOwner(uid)
        syncedFor.current = uid
        await flushProgressSave() // drop any stale guest debounce
        scheduleProgressSave(uid, next, 0) // persist resolved state immediately
        await flushProgressSave()
      } catch (e) {
        console.warn('[progress] sync failed — staying local', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, ready, replaceState, resetGame])

  // debounced save on change
  useEffect(() => {
    if (!uid || syncedFor.current !== uid) return
    scheduleProgressSave(uid, state)
  }, [state, uid])

  // flush pending save when the tab hides / page unloads
  useEffect(() => {
    const flush = () => {
      void flushProgressSave()
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  return null
}

/** Call from the sign-out button *before* supabase.auth.signOut(). */
export { flushProgressSave }
