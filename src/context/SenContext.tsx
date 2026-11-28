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
  applyReadingPreset,
  matchReadingPreset,
  paintedReadingTint,
  READING_DEFAULTS,
  sanitizeReadingSettings,
  type FontSizeLevel,
  type ReadingPresetId,
  type ReadingSettings,
} from '../lib/readingSettings'
import type { SenMode } from '../types'

export type { FontSizeLevel }
export type SenSettings = ReadingSettings

export const FONT_SCALES: Record<FontSizeLevel, number> = { md: 1, lg: 1.15, xl: 1.3 }

type SenContextValue = {
  /** Matching preset, or 'custom' when the bundle was tweaked */
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
    if (raw) return sanitizeReadingSettings(JSON.parse(raw) as unknown)
  } catch {
    /* ignore */
  }
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const prefersContrast =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-contrast: more)').matches
  return sanitizeReadingSettings({
    ...READING_DEFAULTS,
    reduceMotion: Boolean(prefersReduced),
    highContrast: Boolean(prefersContrast),
  })
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
    const paint = paintedReadingTint(settings)
    root.style.setProperty('--sen-font-scale', String(FONT_SCALES[settings.fontSize]))
    root.dataset.senFont = settings.fontSize
    root.dataset.readingTint = settings.tint
    root.dataset.readingPaint = paint ?? 'none'
    root.dataset.readingRuler = settings.ruler ? 'on' : 'off'
    root.dataset.focusMinutes = String(settings.focusMinutes)
    root.dataset.hideTimer = settings.hideTimer ? 'on' : 'off'
    root.classList.toggle('sen-contrast', settings.highContrast)
    root.classList.toggle('sen-dyslexia', settings.dyslexia)
    root.classList.toggle('sen-reduce-motion', settings.reduceMotion)
    root.dataset.soundMotion = settings.soundMotion ? 'on' : 'off'
    root.classList.toggle('sen-focus', settings.focusTunnel)
    root.classList.toggle('sen-read-aloud', settings.readAloud)
  }, [settings])

  const update = useCallback(<K extends keyof SenSettings>(key: K, value: SenSettings[K]) => {
    setSettings((s) => sanitizeReadingSettings({ ...s, [key]: value }))
  }, [])
  const setMode = useCallback((m: ReadingPresetId) => {
    setSettings((current) => applyReadingPreset(current, m))
  }, [])
  const applyMany = useCallback((patch: Partial<SenSettings>) => {
    setSettings((s) => sanitizeReadingSettings({ ...s, ...patch }))
  }, [])
  const reset = useCallback(() => setSettings({ ...READING_DEFAULTS }), [])

  const value = useMemo<SenContextValue>(() => {
    return {
      mode: matchReadingPreset(settings),
      setMode,
      settings,
      update,
      reset,
      fontScale: FONT_SCALES[settings.fontSize],
      cardPadding: settings.dyslexia || settings.fontSize !== 'md' ? 'p-5' : 'p-4',
      focusTunnel: settings.focusTunnel,
      supportsOn: matchReadingPreset(settings) !== 'standard',
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
