/**
 * Display and reading settings.
 * Internal preset ids stay as keys. Student-facing names live in the locale table.
 * Cream is the existing canvas: selecting it must not paint a second layer.
 * High contrast and the decorative tints do not stack.
 */

export type FontSizeLevel = 'md' | 'lg' | 'xl'
export type ReadingTint = 'cream' | 'green' | 'blue'
export type FocusMinutes = 5 | 10 | 15 | 25
export type ReadingPresetId = 'standard' | 'spld' | 'adhd' | 'lowSensory'

export type ReadingSettings = {
  fontSize: FontSizeLevel
  highContrast: boolean
  dyslexia: boolean
  reduceMotion: boolean
  soundMotion: boolean
  focusTunnel: boolean
  readAloud: boolean
  tint: ReadingTint
  ruler: boolean
  focusMinutes: FocusMinutes
  hideTimer: boolean
}

export const READING_TINT_HEX: Record<ReadingTint, string> = {
  cream: '#FFF9E9',
  green: '#EAF6EF',
  blue: '#EAF4F8',
}

export const FOCUS_MINUTE_CHOICES: readonly FocusMinutes[] = [5, 10, 15, 25]
export const DEFAULT_FOCUS_MINUTES: FocusMinutes = 25

const FONT_LEVELS: readonly FontSizeLevel[] = ['md', 'lg', 'xl']
const TINTS: readonly ReadingTint[] = ['cream', 'green', 'blue']

export const READING_DEFAULTS: ReadingSettings = {
  fontSize: 'md',
  highContrast: false,
  dyslexia: false,
  reduceMotion: false,
  soundMotion: false,
  focusTunnel: false,
  readAloud: false,
  tint: 'cream',
  ruler: false,
  focusMinutes: DEFAULT_FOCUS_MINUTES,
  hideTimer: false,
}

const BUNDLE_KEYS = [
  'fontSize',
  'highContrast',
  'dyslexia',
  'reduceMotion',
  'soundMotion',
  'focusTunnel',
  'readAloud',
  'tint',
] as const satisfies readonly (keyof ReadingSettings)[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function sanitizeReadingSettings(raw: unknown): ReadingSettings {
  const row = isRecord(raw) ? raw : {}
  const fontSize = FONT_LEVELS.includes(row.fontSize as FontSizeLevel) ? (row.fontSize as FontSizeLevel) : 'md'
  const tint = TINTS.includes(row.tint as ReadingTint) ? (row.tint as ReadingTint) : 'cream'
  const focusMinutes = FOCUS_MINUTE_CHOICES.includes(row.focusMinutes as FocusMinutes)
    ? (row.focusMinutes as FocusMinutes)
    : DEFAULT_FOCUS_MINUTES
  return {
    fontSize,
    highContrast: row.highContrast === true,
    dyslexia: row.dyslexia === true,
    reduceMotion: row.reduceMotion === true,
    soundMotion: row.soundMotion === true,
    focusTunnel: row.focusTunnel === true,
    readAloud: row.readAloud === true,
    tint,
    ruler: row.ruler === true,
    focusMinutes,
    hideTimer: row.hideTimer === true,
  }
}

function bundle(id: Exclude<ReadingPresetId, 'standard'>): ReadingSettings {
  if (id === 'spld') {
    return {
      ...READING_DEFAULTS,
      fontSize: 'lg',
      dyslexia: true,
      highContrast: false,
      tint: 'cream',
      readAloud: true,
    }
  }
  if (id === 'adhd') {
    return {
      ...READING_DEFAULTS,
      reduceMotion: true,
      focusTunnel: true,
      soundMotion: false,
      highContrast: false,
    }
  }
  return {
    ...READING_DEFAULTS,
    tint: 'cream',
    highContrast: false,
    reduceMotion: true,
    soundMotion: false,
    readAloud: false,
    focusTunnel: false,
  }
}

/** One-tap set. Ruler, focus duration, and hide-countdown stay as the student left them, except restore-defaults. */
export function applyReadingPreset(current: ReadingSettings, id: ReadingPresetId): ReadingSettings {
  if (id === 'standard') return { ...READING_DEFAULTS }
  return {
    ...bundle(id),
    ruler: current.ruler,
    focusMinutes: current.focusMinutes,
    hideTimer: current.hideTimer,
  }
}

function sameSettings(a: ReadingSettings, b: ReadingSettings): boolean {
  return (Object.keys(READING_DEFAULTS) as (keyof ReadingSettings)[]).every((key) => a[key] === b[key])
}

function sameBundle(a: ReadingSettings, b: ReadingSettings): boolean {
  return BUNDLE_KEYS.every((key) => a[key] === b[key])
}

export function matchReadingPreset(settings: ReadingSettings): ReadingPresetId | 'custom' {
  if (sameSettings(settings, READING_DEFAULTS)) return 'standard'
  for (const id of ['spld', 'adhd', 'lowSensory'] as const) {
    if (sameBundle(settings, bundle(id))) return id
  }
  return 'custom'
}

/** Decorative tint to paint. Cream and high contrast paint nothing. */
export function paintedReadingTint(settings: Pick<ReadingSettings, 'tint' | 'highContrast'>): string | null {
  if (settings.highContrast) return null
  if (settings.tint === 'cream') return null
  return READING_TINT_HEX[settings.tint]
}

export function focusClock(leftSeconds: number, hide: boolean): string | null {
  if (hide) return null
  const safe = Math.max(0, Math.floor(leftSeconds))
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
