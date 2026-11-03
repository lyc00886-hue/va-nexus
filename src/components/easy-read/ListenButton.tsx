import { useState } from 'react'
import { t } from '../../i18n'
import { useSpeech } from '../../lib/useSpeech'

/** Manual read-aloud. Never speaks on mount. */
export function ListenButton({ text }: { text: string }) {
  const tts = useSpeech()
  const [played, setPlayed] = useState(false)
  if (!tts.supported || !text.trim()) return null
  const label = tts.speaking ? t('er.tts.stop') : played ? t('er.tts.replay') : t('er.tts.listen')
  return (
    <button
      type="button"
      data-easy-read-listen
      aria-pressed={tts.speaking}
      onClick={() => {
        if (tts.speaking) {
          tts.stop()
          return
        }
        setPlayed(true)
        tts.speak(text)
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-teal-200 bg-white px-4 text-base font-semibold text-teal-900 hover:bg-teal-50"
    >
      {label}
    </button>
  )
}
