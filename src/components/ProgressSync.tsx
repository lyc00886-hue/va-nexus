import { useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext'
import { useAuth } from '../lib/auth'
import { fetchServerGame, getLocalOwner, mergeGame, saveServerGame, setLocalOwner } from '../lib/progressSync'

/**
 * Headless: syncs game progress for the signed-in user.
 * - On sign-in: merge local guest progress with the server copy (or adopt the
 *   server copy if this device's progress belongs to a different account).
 * - Then saves on change (debounced).
 * - On sign-out: local progress is cleared so the next person on a shared
 *   device starts fresh (their copy is safe on the server).
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
        setLocalOwner(null)
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
        const owner = getLocalOwner()
        const local = latest.current
        let next = local
        if (server) next = owner && owner !== uid ? server : mergeGame(local, server)
        replaceState(next)
        setLocalOwner(uid)
        syncedFor.current = uid
        await saveServerGame(uid, next)
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
    const id = window.setTimeout(() => {
      saveServerGame(uid, state).catch((e) => console.warn('[progress] save failed', e))
    }, 1500)
    return () => window.clearTimeout(id)
  }, [state, uid])

  return null
}
