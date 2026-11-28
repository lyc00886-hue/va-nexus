import { useCallback, useEffect, useRef, useState } from 'react'
import { getLocale, SPEECH_LANG, type Locale } from '../i18n'
import { releaseOwnsSpeech, speechNeedsCancel } from './lessonStepReading'

/** Voice language preferences per UI locale (first match wins). */
const LANG_PREFS: Record<Locale, string[]> = {
  'zh-Hant': ['zh-HK', 'yue-HK', 'yue', 'zh-TW'],
  'zh-Hans': ['zh-CN', 'cmn-CN', 'zh-SG', 'zh'],
  en: ['en-GB', 'en-HK', 'en-US', 'en'],
}

function pickVoice(voices: SpeechSynthesisVoice[], locale: Locale) {
  for (const pref of LANG_PREFS[locale]) {
    const v = voices.find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(pref.toLowerCase()))
    if (v) return v
  }
  return undefined
}

/** Newer readers increment this so an unmounted reader does not cancel them. */
let speechOwner = 0

export type SpeechHooks = {
  onstart?: () => void
  onerror?: () => void
}

/** Minimal Web Speech API wrapper; voice language follows the UI locale (zh-HK / zh-CN / en-GB). */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const locale = getLocale()
  const pending = useRef(0)

  useEffect(() => {
    if (!supported) return
    const mine = ++speechOwner
    const synth = window.speechSynthesis
    const load = () => setVoices(synth.getVoices())
    load()
    synth.addEventListener('voiceschanged', load)
    return () => {
      synth.removeEventListener('voiceschanged', load)
      window.clearTimeout(pending.current)
      if (releaseOwnsSpeech(speechOwner, mine)) {
        speechOwner += 1
        synth.cancel()
      }
    }
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    window.clearTimeout(pending.current)
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string, hooks?: SpeechHooks) => {
      if (!supported || !text.trim()) return
      const synth = window.speechSynthesis
      window.clearTimeout(pending.current)
      const busy = speechNeedsCancel({ speaking: synth.speaking, pending: Boolean(synth.pending) })
      if (busy) synth.cancel()
      const voice = pickVoice(voices.length ? voices : synth.getVoices(), locale)
      const u = new SpeechSynthesisUtterance(text)
      u.lang = voice?.lang ?? SPEECH_LANG[locale]
      if (voice) u.voice = voice
      u.rate = 0.9
      u.onstart = () => {
        setSpeaking(true)
        hooks?.onstart?.()
      }
      u.onend = () => setSpeaking(false)
      u.onerror = () => {
        setSpeaking(false)
        hooks?.onerror?.()
      }
      const run = () => synth.speak(u)
      // Chrome drops speak() in the same turn as cancel(). An idle synth can speak immediately.
      if (busy) pending.current = window.setTimeout(run, 50)
      else run()
    },
    [supported, voices, locale],
  )

  const voiceLang = pickVoice(voices, locale)?.lang ?? null

  return { supported, speaking, speak, stop, voiceLang }
}
