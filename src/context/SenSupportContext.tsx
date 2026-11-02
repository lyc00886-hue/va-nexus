import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getLocale, perLocale, t, type MessageKey } from '../i18n'
import { contentJson, contentLocale } from '../i18n/content'
import type { QuestionType } from '../game/types'
import { useSen, type SenSettings } from './SenContext'

/**
 * Optional, non-diagnostic learning supports.
 * Everything here stays in localStorage on this device — nothing is sent to any server.
 */
const STORAGE_KEY = 'va-nexus:sen-support:v1'

export type SupportKey = 'easyRead' | 'largeText' | 'focus' | 'readAloud' | 'reduceMotion' | 'contrast'

type SupportDef = { label: string; desc: string; patch: Partial<SenSettings>; isOn: (s: SenSettings) => boolean }

const SUPPORT_BASE: Record<SupportKey, Pick<SupportDef, 'patch' | 'isOn'>> = {
  easyRead: { patch: { dyslexia: true, fontSize: 'lg' }, isOn: (s) => s.dyslexia },
  largeText: { patch: { fontSize: 'lg' }, isOn: (s) => s.fontSize !== 'md' },
  focus: { patch: { focusTunnel: true }, isOn: (s) => s.focusTunnel },
  readAloud: { patch: { readAloud: true }, isOn: (s) => s.readAloud },
  reduceMotion: { patch: { reduceMotion: true }, isOn: (s) => s.reduceMotion },
  contrast: { patch: { highContrast: true }, isOn: (s) => s.highContrast },
}

/* ---------- 自選支援問卷 — content from src/content/sen-checkin[.<locale>].json (DICK) ---------- */

type SenCheckInJson = {
  title: string
  intro: string
  disclaimer: string
  result_text: string
  supports: Record<string, string>
  questions: { id: string; question: string; options: { label: string; suggest: string[] }[] }[]
}

/** Keys used in the content JSON → our SupportKey */
const CONTENT_SUPPORT_MAP: Record<string, SupportKey> = {
  easy_read: 'easyRead',
  read_aloud: 'readAloud',
  focus_tunnel: 'focus',
  large_text: 'largeText',
  reduce_motion: 'reduceMotion',
  contrast: 'contrast',
}

/** Support labels / descriptions for the active locale. */
export const getSupports = perLocale<Record<SupportKey, SupportDef>>((locale) => {
  const out = {} as Record<SupportKey, SupportDef>
  for (const k of Object.keys(SUPPORT_BASE) as SupportKey[]) {
    out[k] = { ...SUPPORT_BASE[k], label: t(`support.${k}` as MessageKey), desc: t(`support.${k}.desc` as MessageKey) }
  }
  // Use DICK's wording where the check-in content exists in this locale (not the zh-Hant fallback)
  if (contentLocale('sen-checkin', locale) === locale) {
    const json = contentJson<SenCheckInJson>('sen-checkin', locale)
    for (const [k, desc] of Object.entries(json.supports ?? {})) {
      const key = CONTENT_SUPPORT_MAP[k]
      if (!key) continue
      const m = desc.match(/^([^：:]+)[：:]\s*(.*)$/)
      out[key] = { ...out[key], label: m?.[1] || out[key].label, desc: m ? m[2] : desc }
    }
  }
  return out
})

export type CheckInQuestion = {
  id: string
  question: string
  options: { label: string; suggest: SupportKey[] }[]
}

export const getCheckIn = perLocale(() => {
  const json = contentJson<SenCheckInJson>('sen-checkin')
  return {
    title: json.title,
    intro: json.intro,
    disclaimer: json.disclaimer,
    resultText: json.result_text,
    /** true when this locale has no translated check-in yet (showing zh-Hant original) */
    fallback: contentLocale('sen-checkin') !== getLocale(),
    questions: json.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.map((o) => ({
        label: o.label,
        suggest: o.suggest.map((k) => CONTENT_SUPPORT_MAP[k]).filter((k): k is SupportKey => Boolean(k)),
      })),
    })) as CheckInQuestion[],
  }
})

/** Answers = chosen option index per question id */
export type CheckInAnswers = Record<string, number>

export function recommendFromAnswers(answers: CheckInAnswers): SupportKey[] {
  const out: SupportKey[] = []
  for (const q of getCheckIn().questions) {
    const idx = answers[q.id]
    const opt = idx === undefined ? undefined : q.options[idx]
    for (const k of opt?.suggest ?? []) if (!out.includes(k)) out.push(k)
  }
  return out
}

type Stored = {
  checkIn: { answers: CheckInAnswers; respondent: 'student' | 'adult'; ts: number } | null
  nudges: { optOut: boolean; lastShown: number; dismissed: Partial<Record<SupportKey, number>> }
}

const INITIAL: Stored = { checkIn: null, nudges: { optOut: false, lastShown: 0, dismissed: {} } }

const NUDGE_GAP_MS = 10 * 60 * 1000
const DISMISS_COOLDOWN_MS = 3 * 24 * 3600 * 1000
const WRONG_SAME_TYPE = 3
const TTS_REPEAT = 3

export type LearningSignal =
  | { kind: 'wrong'; qtype: QuestionType }
  | { kind: 'idle' }
  | { kind: 'tts' }
  | { kind: 'session-reset' }

export type Nudge = { support: SupportKey; reason: string }

type Ctx = {
  stored: Stored
  checkInOpen: boolean
  privacyOpen: boolean
  openPrivacy: () => void
  closePrivacy: () => void
  openCheckIn: () => void
  closeCheckIn: () => void
  saveCheckIn: (answers: CheckInAnswers, respondent: 'student' | 'adult') => void
  clearSupportData: () => void
  reportSignal: (s: LearningSignal) => void
  nudge: Nudge | null
  acceptNudge: () => void
  dismissNudge: (never?: boolean) => void
  setNudgesEnabled: (on: boolean) => void
}

const SenSupportContext = createContext<Ctx | null>(null)

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Stored>
      const ci = p.checkIn
      const validCheckIn =
        ci && ci.answers && Object.values(ci.answers).every((v) => typeof v === 'number') ? ci : null
      return { ...INITIAL, ...p, checkIn: validCheckIn, nudges: { ...INITIAL.nudges, ...p.nudges } }
    }
  } catch {
    /* ignore */
  }
  return INITIAL
}

export function SenSupportProvider({ children }: { children: ReactNode }) {
  const { settings, applyMany } = useSen()
  const [stored, setStored] = useState<Stored>(load)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [nudge, setNudge] = useState<Nudge | null>(null)
  const counters = useRef({ wrong: {} as Partial<Record<QuestionType, number>>, tts: 0 })
  const storedRef = useRef(stored)
  storedRef.current = stored
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      /* ignore */
    }
  }, [stored])

  const tryNudge = useCallback((candidates: SupportKey[], reason: string) => {
    const st = storedRef.current
    if (st.nudges.optOut || nudgeRef.current) return
    const now = Date.now()
    if (now - st.nudges.lastShown < NUDGE_GAP_MS) return
    const pick = candidates.find(
      (k) =>
        !SUPPORT_BASE[k].isOn(settingsRef.current) &&
        now - (st.nudges.dismissed[k] ?? 0) > DISMISS_COOLDOWN_MS,
    )
    if (!pick) return
    setNudge({ support: pick, reason })
    setStored((s) => ({ ...s, nudges: { ...s.nudges, lastShown: now } }))
  }, [])

  const reportSignal = useCallback(
    (sig: LearningSignal) => {
      const c = counters.current
      if (sig.kind === 'session-reset') {
        c.wrong = {}
        return
      }
      if (sig.kind === 'wrong') {
        const n = (c.wrong[sig.qtype] ?? 0) + 1
        c.wrong[sig.qtype] = n
        if (n >= WRONG_SAME_TYPE) {
          c.wrong[sig.qtype] = 0
          tryNudge(['easyRead', 'readAloud', 'focus'], t('nudge.reason.wrong'))
        }
      } else if (sig.kind === 'idle') {
        tryNudge(['focus', 'readAloud', 'easyRead'], t('nudge.reason.idle'))
      } else if (sig.kind === 'tts') {
        c.tts += 1
        if (c.tts >= TTS_REPEAT) {
          c.tts = 0
          tryNudge(['readAloud'], t('nudge.reason.tts'))
        }
      }
    },
    [tryNudge],
  )

  const acceptNudge = useCallback(() => {
    const n = nudgeRef.current
    if (n) applyMany(SUPPORT_BASE[n.support].patch)
    setNudge(null)
  }, [applyMany])

  const dismissNudge = useCallback((never?: boolean) => {
    const n = nudgeRef.current
    setNudge(null)
    setStored((s) => ({
      ...s,
      nudges: {
        ...s.nudges,
        optOut: never ? true : s.nudges.optOut,
        dismissed: n ? { ...s.nudges.dismissed, [n.support]: Date.now() } : s.nudges.dismissed,
      },
    }))
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      stored,
      checkInOpen,
      privacyOpen,
      openPrivacy: () => setPrivacyOpen(true),
      closePrivacy: () => setPrivacyOpen(false),
      openCheckIn: () => setCheckInOpen(true),
      closeCheckIn: () => setCheckInOpen(false),
      saveCheckIn: (answers, respondent) =>
        setStored((s) => ({ ...s, checkIn: { answers, respondent, ts: Date.now() } })),
      clearSupportData: () => setStored(INITIAL),
      reportSignal,
      nudge,
      acceptNudge,
      dismissNudge,
      setNudgesEnabled: (on) => setStored((s) => ({ ...s, nudges: { ...s.nudges, optOut: !on } })),
    }),
    [stored, checkInOpen, privacyOpen, reportSignal, nudge, acceptNudge, dismissNudge],
  )

  return <SenSupportContext.Provider value={value}>{children}</SenSupportContext.Provider>
}

export function useSenSupport() {
  const ctx = useContext(SenSupportContext)
  if (!ctx) throw new Error('useSenSupport must be used within SenSupportProvider')
  return ctx
}
