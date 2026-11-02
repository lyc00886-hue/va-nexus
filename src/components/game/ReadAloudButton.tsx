import { Square, Volume2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useSenSupport } from '../../context/SenSupportContext'
import { useSpeech } from '../../lib/useSpeech'

/** TTS button for lesson cards. `autoKey` change triggers auto read-aloud when `auto` is true. */
export function ReadAloudButton({
  text,
  auto = false,
  autoKey,
  small = false,
}: {
  text: string
  auto?: boolean
  autoKey?: string
  small?: boolean
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

  if (!supported) return null
  const cls = small
    ? 'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50'
    : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'
  return tts.speaking ? (
    <button type="button" onClick={tts.stop} className={cls} aria-label="停止朗讀">
      <Square className="h-3.5 w-3.5" aria-hidden /> 停止
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        reportSignal({ kind: 'tts' })
        speak(text)
      }}
      className={cls}
      aria-label="朗讀"
    >
      <Volume2 className="h-3.5 w-3.5" aria-hidden /> 朗讀
    </button>
  )
}
