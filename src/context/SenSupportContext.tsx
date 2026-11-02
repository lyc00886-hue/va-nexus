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
import senCheckIn from '../content/sen-checkin.json'
import type { QuestionType } from '../game/types'
import { useSen, type SenSettings } from './SenContext'

/**
 * Optional, non-diagnostic learning supports.
 * Everything here stays in localStorage on this device — nothing is sent to any server.
 */
const STORAGE_KEY = 'va-nexus:sen-support:v1'

export type SupportKey = 'easyRead' | 'largeText' | 'focus' | 'readAloud' | 'reduceMotion' | 'contrast'

export const SUPPORTS: Record<
  SupportKey,
  { label: string; desc: string; patch: Partial<SenSettings>; isOn: (s: SenSettings) => boolean }
> = {
  easyRead: {
    label: '易讀模式',
    desc: '短句重點、加大字距行距',
    patch: { dyslexia: true, fontSize: 'lg' },
    isOn: (s) => s.dyslexia,
  },
  largeText: {
    label: '大字',
    desc: '全站字體放大',
    patch: { fontSize: 'lg' },
    isOn: (s) => s.fontSize !== 'md',
  },
  focus: {
    label: '專注隧道',
    desc: '一次只顯示一張卡，附專注計時',
    patch: { focusTunnel: true },
    isOn: (s) => s.focusTunnel,
  },
  readAloud: {
    label: '自動朗讀',
    desc: '短課卡自動讀出（廣東話／中文語音）',
    patch: { readAloud: true },
    isOn: (s) => s.readAloud,
  },
  reduceMotion: {
    label: '減少動畫',
    desc: '關閉閃動同過場效果',
    patch: { reduceMotion: true },
    isOn: (s) => s.reduceMotion,
  },
  contrast: {
    label: '高對比',
    desc: '深色文字、清晰邊框',
    patch: { highContrast: true },
    isOn: (s) => s.highContrast,
  },
}

// Use DICK's wording for support descriptions where provided
for (const [k, desc] of Object.entries(senCheckIn.supports as Record<string, string>)) {
  const key = ({ easy_read: 'easyRead', read_aloud: 'readAloud', focus_tunnel: 'focus', large_text: 'largeText', reduce_motion: 'reduceMotion' } as Record<string, SupportKey>)[k]
  if (key) {
    const [label, rest] = desc.split('：')
    SUPPORTS[key] = { ...SUPPORTS[key], label: label || SUPPORTS[key].label, desc: rest ?? desc }
  }
}

/* ---------- 自選支援問卷 — content from src/content/sen-checkin.json (DICK) ---------- */

/** Keys used in the content JSON → our SupportKey */
const CONTENT_SUPPORT_MAP: Record<string, SupportKey> = {
  easy_read: 'easyRead',
  read_aloud: 'readAloud',
  focus_tunnel: 'focus',
  large_text: 'largeText',
  reduce_motion: 'reduceMotion',
  contrast: 'contrast',
}

export type CheckInQuestion = {
  id: string
  question: string
  options: { label: string; suggest: SupportKey[] }[]
}

export const CHECK_IN = {
  title: senCheckIn.title,
  intro: senCheckIn.intro,
  disclaimer: senCheckIn.disclaimer,
  resultText: senCheckIn.result_text,
  questions: senCheckIn.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options.map((o) => ({
      label: o.label,
      suggest: o.suggest.map((k) => CONTENT_SUPPORT_MAP[k]).filter((k): k is SupportKey => Boolean(k)),
    })),
  })) as CheckInQuestion[],
}

/** Answers = chosen option index per question id */
export type CheckInAnswers = Record<string, number>

export function recommendFromAnswers(answers: CheckInAnswers): SupportKey[] {
  const out: SupportKey[] = []
  for (const q of CHECK_IN.questions) {
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
        !SUPPORTS[k].isOn(settingsRef.current) &&
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
          tryNudge(['easyRead', 'readAloud', 'focus'], '同一類題目試咗幾次都未中，可能係題目字太多。')
        }
      } else if (sig.kind === 'idle') {
        tryNudge(['focus', 'readAloud', 'easyRead'], '呢張卡停留咗一段時間。')
      } else if (sig.kind === 'tts') {
        c.tts += 1
        if (c.tts >= TTS_REPEAT) {
          c.tts = 0
          tryNudge(['readAloud'], '你經常用朗讀功能。')
        }
      }
    },
    [tryNudge],
  )

  const acceptNudge = useCallback(() => {
    const n = nudgeRef.current
    if (n) applyMany(SUPPORTS[n.support].patch)
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
