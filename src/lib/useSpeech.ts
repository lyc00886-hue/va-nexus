import { useCallback, useEffect, useState } from 'react'
import { getLocale, SPEECH_LANG, type Locale } from '../i18n'

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

/** Minimal Web Speech API wrapper; voice language follows the UI locale (zh-HK / zh-CN / en-GB). */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const locale = getLocale()

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const load = () => setVoices(synth.getVoices())
    load()
    synth.addEventListener('voiceschanged', load)
    return () => {
      synth.removeEventListener('voiceschanged', load)
      synth.cancel()
    }
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return
      const synth = window.speechSynthesis
      synth.cancel()
      const voice = pickVoice(voices.length ? voices : synth.getVoices(), locale)
      const u = new SpeechSynthesisUtterance(text)
      u.lang = voice?.lang ?? SPEECH_LANG[locale]
      if (voice) u.voice = voice
      u.rate = 0.9
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      synth.speak(u)
    },
    [supported, voices, locale],
  )

  const voiceLang = pickVoice(voices, locale)?.lang ?? null

  return { supported, speaking, speak, stop, voiceLang }
}
