import { Square, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSenSupport } from '../../context/SenSupportContext'
import { planAutoRead } from '../../lib/lessonStepReading'
import { useSpeech } from '../../lib/useSpeech'
import { t } from '../../i18n'

/** TTS button for lesson cards. `autoKey` change triggers auto read-aloud when `auto` is true. */
export function ReadAloudButton({
  text,
  auto = false,
  autoKey,
  small = false,
  tucked = false,
  pill = false,
}: {
  text: string
  auto?: boolean
  autoKey?: string
  small?: boolean
  /** Reading setting: 「閱讀設定 · 朗讀」, not a mid-card chip. */
  tucked?: boolean
  /** Pill beside the presentation choice. */
  pill?: boolean
}) {
  const tts = useSpeech()
  const { reportSignal } = useSenSupport()
  const armed = useRef<string | undefined>(undefined)
  const stopped = useRef<string | undefined>(undefined)
  const tries = useRef(0)
  const [retry, setRetry] = useState(0)
  const { speak, supported, voicesReady } = tts
  const speakRef = useRef(speak)

  useEffect(() => {
    speakRef.current = speak
  })

  useEffect(() => {
    tries.current = 0
  }, [autoKey])

  useEffect(() => {
    const plan = planAutoRead({
      auto,
      autoKey,
      text,
      armedKey: armed.current,
      stoppedKey: stopped.current,
    })
    // Wait for the voice list. A start that never reaches onstart stays unarmed and can try again.
    if (!plan.start || !supported || !voicesReady || !plan.arm) return
    const arm = plan.arm
    if (stopped.current === arm) return
    speakRef.current(text, {
      onstart: () => {
        armed.current = arm
      },
      onerror: () => {
        if (stopped.current === arm || armed.current === arm) return
        if (tries.current >= 2) return
        tries.current += 1
        window.setTimeout(() => setRetry((n) => n + 1), 80)
      },
    })
  }, [auto, autoKey, text, supported, voicesReady, retry])

  if (!supported && !tucked && !pill) return null
  const tuckedLabel = `${t('settings.reading')} · ${tts.speaking ? t('tts.stop') : t('tts.read')}`
  const cls = tucked
    ? 'inline-flex shrink-0 items-center text-sm font-bold text-[#0D9488]'
    : pill
      ? `inline-flex shrink-0 items-center rounded-full border border-[#0D9488] px-3 py-1.5 text-base font-semibold ${
          tts.speaking ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'
        }`
    : small
      ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488]'
      : 'inline-flex items-center gap-1.5 rounded-full border border-[#0D9488] bg-white px-3 py-1.5 text-xs font-semibold text-[#0D9488]'
  if (tucked || pill) {
    return (
      <button
        type="button"
        data-reading-settings=""
        data-auto-read={auto ? 'on' : 'off'}
        data-read-key={autoKey ?? ''}
        onClick={() => {
          if (!supported) return
          if (tts.speaking) {
            if (autoKey) stopped.current = autoKey
            tts.stop()
            return
          }
          reportSignal({ kind: 'tts' })
          speak(text)
        }}
        className={cls}
        aria-label={pill ? (tts.speaking ? t('tts.stop') : t('tts.read')) : tuckedLabel}
      >
        {pill ? (tts.speaking ? t('tts.stop') : t('tts.read')) : tuckedLabel}
      </button>
    )
  }
  return tts.speaking ? (
    <button
      type="button"
      onClick={() => {
        if (autoKey) stopped.current = autoKey
        tts.stop()
      }}
      className={cls}
      aria-label={t('tts.stopAria')}
    >
      <Square className="h-3.5 w-3.5" aria-hidden /> {t('tts.stop')}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        reportSignal({ kind: 'tts' })
        speak(text)
      }}
      className={cls}
      aria-label={t('tts.read')}
    >
      <Volume2 className="h-3.5 w-3.5" aria-hidden /> {t('tts.read')}
    </button>
  )
}
