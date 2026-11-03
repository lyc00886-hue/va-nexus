import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyEasyReadQuery,
  effectiveStepByStep,
  loadStepByStep,
  publishStepByStepOn,
  saveStepByStep,
  type PriorSupports,
  type StepByStepStored,
  type StepStorage,
} from '../lib/easyReadMode'
import { useSen } from './SenContext'

type Boot = { stored: StepByStepStored; restore: PriorSupports | null }

type EasyReadValue = {
  preview: boolean
  on: boolean
  setOn: (on: boolean) => void
  teacherPreset: boolean
  setTeacherPreset: (on: boolean) => void
  literacy: boolean
  setLiteracy: (on: boolean) => void
  focus: boolean
  setFocus: (on: boolean) => void
  suggestLargeText: boolean
  acceptLargeText: () => void
}

const EasyReadContext = createContext<EasyReadValue | null>(null)

function browserStorage(): StepStorage {
  return localStorage
}

function bootState(): Boot {
  let loaded: StepByStepStored
  try {
    loaded = loadStepByStep(browserStorage())
  } catch {
    loaded = loadStepByStep({ getItem: () => null, setItem: () => {} })
  }
  if (typeof window === 'undefined') return { stored: loaded, restore: null }
  return applyEasyReadQuery(window.location.search, loaded)
}

export function EasyReadProvider({ children }: { children: ReactNode }) {
  const { settings, applyMany, update } = useSen()
  const [boot] = useState(bootState)
  const [stored, setStored] = useState(boot.stored)
  const [restore, setRestore] = useState<PriorSupports | null>(boot.restore)
  const [armSupports, setArmSupports] = useState(false)
  const on = effectiveStepByStep(stored)

  if (on && !stored.priorSupports) {
    const prior = { focusTunnel: settings.focusTunnel, easyRead: settings.dyslexia }
    setStored((prev) => (prev.priorSupports ? prev : { ...prev, priorSupports: prior }))
    setArmSupports(true)
  } else if (!on && stored.priorSupports) {
    const prior = stored.priorSupports
    setStored((prev) => (prev.priorSupports ? { ...prev, priorSupports: undefined } : prev))
    setRestore(prior)
  }
  if (!on && armSupports) setArmSupports(false)
  if (armSupports && settings.focusTunnel && settings.dyslexia) setArmSupports(false)
  if (
    restore &&
    settings.focusTunnel === restore.focusTunnel &&
    settings.dyslexia === restore.easyRead
  ) {
    setRestore(null)
  }

  useEffect(() => {
    try {
      saveStepByStep(browserStorage(), stored)
    } catch {
      /* private mode */
    }
    document.documentElement.dataset.stepByStep = on ? 'on' : 'off'
    document.documentElement.dataset.easyReadMode = stored.preview || on ? 'preview' : 'off'
  }, [stored, on])

  useEffect(() => {
    if (restore) {
      applyMany({ focusTunnel: restore.focusTunnel, dyslexia: restore.easyRead })
      return
    }
    if (armSupports) applyMany({ focusTunnel: true, dyslexia: true })
  }, [armSupports, restore, applyMany])

  const setOn = useCallback((next: boolean) => {
    setStored((prev) => ({ ...prev, on: next, studentSet: true, preview: true }))
    if (next) publishStepByStepOn()
  }, [])

  const setTeacherPreset = useCallback((next: boolean) => {
    setStored((prev) => ({ ...prev, teacherPreset: next, preview: next ? true : prev.preview }))
  }, [])

  const value = useMemo<EasyReadValue>(
    () => ({
      preview: stored.preview || on,
      on,
      setOn,
      teacherPreset: stored.teacherPreset,
      setTeacherPreset,
      literacy: settings.dyslexia,
      setLiteracy: (next) => update('dyslexia', next),
      focus: settings.focusTunnel,
      setFocus: (next) => update('focusTunnel', next),
      suggestLargeText: on && settings.fontSize === 'md',
      acceptLargeText: () => update('fontSize', 'lg'),
    }),
    [stored.preview, stored.teacherPreset, on, setOn, setTeacherPreset, settings.dyslexia, settings.focusTunnel, settings.fontSize, update],
  )

  return <EasyReadContext.Provider value={value}>{children}</EasyReadContext.Provider>
}

export function useEasyRead() {
  const ctx = useContext(EasyReadContext)
  if (!ctx) throw new Error('useEasyRead must be used within EasyReadProvider')
  return ctx
}
