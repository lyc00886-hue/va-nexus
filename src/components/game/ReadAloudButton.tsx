import { Square, Volume2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useSenSupport } from '../../context/SenSupportContext'
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
  const lastAuto = useRef<string | undefined>(undefined)
  const { speak, supported } = tts

  useEffect(() => {
    if (!auto || !supported || !autoKey || lastAuto.current === autoKey) return
    const id = window.setTimeout(() => {
      lastAuto.current = autoKey
      speak(text)
    }, 250)
    return () => window.clearTimeout(id)
  }, [auto, autoKey, text, speak, supported])

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
        onClick={() => {
          if (!supported) return
          if (tts.speaking) {
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
    <button type="button" onClick={tts.stop} className={cls} aria-label={t('tts.stopAria')}>
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
