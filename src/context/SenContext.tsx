import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SenMode } from '../types'

export type FontSizeLevel = 'md' | 'lg' | 'xl'

export type SenSettings = {
  fontSize: FontSizeLevel
  highContrast: boolean
  dyslexia: boolean
  reduceMotion: boolean
  /** Opt-in celebrate sound and motion. Default off. Separate from reduceMotion. */
  soundMotion: boolean
  focusTunnel: boolean
  /** Auto read-aloud lesson cards (TTS) */
  readAloud: boolean
}

export const FONT_SCALES: Record<FontSizeLevel, number> = { md: 1, lg: 1.15, xl: 1.3 }

const DEFAULTS: SenSettings = {
  fontSize: 'md',
  highContrast: false,
  dyslexia: false,
  reduceMotion: false,
  soundMotion: false,
  focusTunnel: false,
  readAloud: false,
}

export const PRESETS: Record<SenMode, SenSettings> = {
  standard: DEFAULTS,
  spld: { ...DEFAULTS, fontSize: 'lg', dyslexia: true },
  adhd: { ...DEFAULTS, reduceMotion: true, focusTunnel: true },
}

type SenContextValue = {
  /** Matching preset, or 'custom' when settings were tweaked individually */
  mode: SenMode | 'custom'
  setMode: (m: SenMode) => void
  settings: SenSettings
  update: <K extends keyof SenSettings>(key: K, value: SenSettings[K]) => void
  reset: () => void
  fontScale: number
  cardPadding: string
  focusTunnel: boolean
  /** true when any support beyond the standard defaults is on */
  supportsOn: boolean
  /** Easy-read text (讀寫友善) */
  easyRead: boolean
  applyMany: (patch: Partial<SenSettings>) => void
}

const STORAGE_KEY = 'va-nexus:sen-settings'

function loadSettings(): SenSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SenSettings>) }
  } catch {
    /* ignore */
  }
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const prefersContrast =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-contrast: more)').matches
  return { ...DEFAULTS, reduceMotion: Boolean(prefersReduced), highContrast: Boolean(prefersContrast) }
}

function samePreset(a: SenSettings, b: SenSettings) {
  return (Object.keys(a) as (keyof SenSettings)[]).every((k) => a[k] === b[k])
}

const SenContext = createContext<SenContextValue | null>(null)

export function SenProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SenSettings>(loadSettings)

  // persist + apply to <html> so every tab benefits
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
    const root = document.documentElement
    root.style.setProperty('--sen-font-scale', String(FONT_SCALES[settings.fontSize]))
    root.dataset.senFont = settings.fontSize
    root.classList.toggle('sen-contrast', settings.highContrast)
    root.classList.toggle('sen-dyslexia', settings.dyslexia)
    root.classList.toggle('sen-reduce-motion', settings.reduceMotion)
    root.dataset.soundMotion = settings.soundMotion ? 'on' : 'off'
    root.classList.toggle('sen-focus', settings.focusTunnel)
    root.classList.toggle('sen-read-aloud', settings.readAloud)
  }, [settings])

  const update = useCallback(<K extends keyof SenSettings>(key: K, value: SenSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])
  const setMode = useCallback((m: SenMode) => setSettings(PRESETS[m]), [])
  const applyMany = useCallback((patch: Partial<SenSettings>) => setSettings((s) => ({ ...s, ...patch })), [])
  const reset = useCallback(() => setSettings(DEFAULTS), [])

  const value = useMemo<SenContextValue>(() => {
    const mode =
      (Object.keys(PRESETS) as SenMode[]).find((m) => samePreset(PRESETS[m], settings)) ?? 'custom'
    return {
      mode,
      setMode,
      settings,
      update,
      reset,
      fontScale: FONT_SCALES[settings.fontSize],
      cardPadding: settings.dyslexia || settings.fontSize !== 'md' ? 'p-5' : 'p-4',
      focusTunnel: settings.focusTunnel,
      supportsOn: !samePreset(DEFAULTS, settings),
      easyRead: settings.dyslexia,
      applyMany,
    }
  }, [settings, setMode, update, reset, applyMany])

  return <SenContext.Provider value={value}>{children}</SenContext.Provider>
}

export function useSen() {
  const ctx = useContext(SenContext)
  if (!ctx) throw new Error('useSen must be used within SenProvider')
  return ctx
}
