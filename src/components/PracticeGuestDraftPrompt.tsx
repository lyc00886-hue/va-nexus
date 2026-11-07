import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useAuth } from '../lib/auth'
import {
  applyGuestDraftChoice,
  hasUnclaimedGuestDraft,
  isPracticeDraftBlank,
  loadPracticeDraft,
} from '../lib/practiceDraft'

const SKIP_KEY = 'va-nexus:practice-guest-prompt-skip'

function readSkip(): string | null {
  try {
    return sessionStorage.getItem(SKIP_KEY)
  } catch {
    return null
  }
}

function writeSkip(uid: string | null) {
  try {
    if (uid) sessionStorage.setItem(SKIP_KEY, uid)
    else sessionStorage.removeItem(SKIP_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Shared-tablet guard. A draft written while signed out is not copied onto the
 * next signed-in account unless that student presses Keep. Discard deletes it.
 * Not now, Escape, and the backdrop leave it unmerged.
 */
export function PracticeGuestDraftPrompt() {
  const { t } = useT()
  const { ready, user } = useAuth()
  const uid = user?.id ?? null
  const [open, setOpen] = useState(false)
  const [replaces, setReplaces] = useState(false)
  const discardRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!ready) return
    if (!uid) {
      writeSkip(null)
      setOpen(false)
      setReplaces(false)
      return
    }
    if (readSkip() === uid || !hasUnclaimedGuestDraft()) {
      setOpen(false)
      return
    }
    setReplaces(!isPracticeDraftBlank(loadPracticeDraft(uid)))
    setOpen(true)
  }, [ready, uid])

  useEffect(() => {
    if (open) discardRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      writeSkip(uid)
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, uid])

  if (!open || !uid) return null

  function later() {
    writeSkip(uid)
    setOpen(false)
  }

  function choose(choice: 'keep' | 'discard') {
    applyGuestDraftChoice(uid!, choice)
    writeSkip(null)
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-guest-title"
      data-practice-guest-prompt
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={later}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="practice-guest-title" className="text-base font-bold text-slate-900">
          {t('practice.guest.title')}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('practice.guest.body')}</p>
        {replaces && <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('practice.guest.replace')}</p>}
        <div className="mt-4 flex flex-col gap-2">
          <button
            ref={discardRef}
            type="button"
            onClick={() => choose('discard')}
            className="min-h-11 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t('practice.guest.discard')}
          </button>
          <button
            type="button"
            onClick={() => choose('keep')}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            {t('practice.guest.keep')}
          </button>
          <button
            type="button"
            onClick={later}
            className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t('practice.guest.later')}
          </button>
        </div>
      </div>
    </div>
  )
}
