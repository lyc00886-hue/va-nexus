import { useEffect, useState } from 'react'
import { useSen } from '../context/SenContext'
import {
  QUEST_CALM_EVENT,
  QUEST_CALM_KEY,
  QUEST_FORM_EVENT,
  QUEST_MOTION_KEY,
  questCalmFromStored,
  questFormFromSearch,
  questMotionPlay,
  questMotionPrefFromStored,
  withQuestForm,
  type QuestFormId,
} from './mapQuest'

export const QUEST_MOTION_EVENT = 'va-nexus:quest-motion'

function readForm(): QuestFormId {
  if (typeof window === 'undefined') return 's4'
  return questFormFromSearch(window.location.search)
}

function readCalm(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return questCalmFromStored(localStorage.getItem(QUEST_CALM_KEY))
  } catch {
    return true
  }
}

export function useQuestForm(): [QuestFormId, (next: QuestFormId) => void] {
  const [form, setForm] = useState<QuestFormId>(readForm)

  useEffect(() => {
    const sync = () => setForm(readForm())
    window.addEventListener('popstate', sync)
    window.addEventListener(QUEST_FORM_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(QUEST_FORM_EVENT, sync)
    }
  }, [])

  function choose(next: QuestFormId) {
    if (typeof window === 'undefined') return
    const search = withQuestForm(window.location.search, next)
    const url = `${window.location.pathname}${search}${window.location.hash}`
    window.history.replaceState(window.history.state, '', url)
    window.dispatchEvent(new Event(QUEST_FORM_EVENT))
  }

  return [form, choose]
}

export function useQuestCalm(): [boolean, (next: boolean) => void] {
  const [calm, setCalm] = useState(readCalm)

  useEffect(() => {
    const sync = () => setCalm(readCalm())
    window.addEventListener(QUEST_CALM_EVENT, sync)
    return () => window.removeEventListener(QUEST_CALM_EVENT, sync)
  }, [])

  function choose(next: boolean) {
    try {
      localStorage.setItem(QUEST_CALM_KEY, next ? '1' : '0')
    } catch {
      /* the in-memory flag still applies for this view */
    }
    setCalm(next)
    window.dispatchEvent(new Event(QUEST_CALM_EVENT))
  }

  return [calm, choose]
}

function readMotion(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return questMotionPrefFromStored(localStorage.getItem(QUEST_MOTION_KEY))
  } catch {
    return false
  }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** Path-motion opt-in. Default off. Synced across the map and its switch. */
export function useQuestMotion(): [boolean, (next: boolean) => void] {
  const [pref, setPref] = useState(readMotion)

  useEffect(() => {
    const sync = () => setPref(readMotion())
    window.addEventListener(QUEST_MOTION_EVENT, sync)
    return () => window.removeEventListener(QUEST_MOTION_EVENT, sync)
  }, [])

  function choose(next: boolean) {
    try {
      localStorage.setItem(QUEST_MOTION_KEY, next ? '1' : '0')
    } catch {
      /* the in-memory flag still applies for this view */
    }
    setPref(next)
    window.dispatchEvent(new Event(QUEST_MOTION_EVENT))
  }

  return [pref, choose]
}

export function useQuestMotionPlay(): boolean {
  const [pref] = useQuestMotion()
  const { settings } = useSen()
  const prefersReducedMotion = usePrefersReducedMotion()
  return questMotionPlay({ pref, reduceMotion: settings.reduceMotion, prefersReducedMotion })
}
