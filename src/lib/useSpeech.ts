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
/** Only the instance that last called speak may cancel on unmount. */
let speechSpeaker = 0
let speechTicket = 0
/** Chrome drops speak() in the same turn as cancel(). */
let lastSpeechCancel = 0

export type SpeechHooks = {
  onstart?: () => void
  onerror?: () => void
}

/** Minimal Web Speech API wrapper; voice language follows the UI locale (zh-HK / zh-CN / en-GB). */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  /** False until the voice list arrives, or a short wait so a browser with no list can still speak. */
  const [voicesReady, setVoicesReady] = useState(false)
  const locale = getLocale()
  const pending = useRef(0)
  const ticket = useRef(0)

  useEffect(() => {
    if (!supported) return
    speechOwner += 1
    const synth = window.speechSynthesis
    const load = () => {
      const next = synth.getVoices()
      setVoices(next)
      if (next.length > 0) setVoicesReady(true)
    }
    load()
    synth.addEventListener('voiceschanged', load)
    const fallback = window.setTimeout(() => setVoicesReady(true), 400)
    return () => {
      synth.removeEventListener('voiceschanged', load)
      window.clearTimeout(fallback)
      window.clearTimeout(pending.current)
      if (releaseOwnsSpeech(speechSpeaker, ticket.current)) {
        speechSpeaker = 0
        speechOwner += 1
        lastSpeechCancel = Date.now()
        synth.cancel()
      }
    }
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    window.clearTimeout(pending.current)
    lastSpeechCancel = Date.now()
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string, hooks?: SpeechHooks) => {
      if (!supported || !text.trim()) return
      const synth = window.speechSynthesis
      window.clearTimeout(pending.current)
      const busy = speechNeedsCancel({ speaking: synth.speaking, pending: Boolean(synth.pending) })
      if (busy) {
        lastSpeechCancel = Date.now()
        synth.cancel()
      }
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
      // A fresh page can leave the synth paused. speak() then never reaches onstart.
      const run = () => {
        synth.resume()
        synth.speak(u)
        synth.resume()
      }
      ticket.current = ++speechTicket
      speechSpeaker = ticket.current
      // Chrome drops speak() in the same turn as cancel(). An idle synth can speak immediately.
      const sinceCancel = Date.now() - lastSpeechCancel
      const delay = busy ? 80 : sinceCancel < 80 ? 80 - sinceCancel : 0
      if (delay > 0) pending.current = window.setTimeout(run, delay)
      else run()
    },
    [supported, voices, locale],
  )

  const voiceLang = pickVoice(voices, locale)?.lang ?? null

  return { supported, speaking, speak, stop, voiceLang, voicesReady, voiceCount: voices.length }
}
