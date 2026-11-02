import { useCallback, useEffect, useState } from 'react'

const LANG_PREFS = ['zh-HK', 'yue-HK', 'zh-TW', 'zh-CN', 'zh']

function pickVoice(voices: SpeechSynthesisVoice[]) {
  for (const pref of LANG_PREFS) {
    const v = voices.find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(pref.toLowerCase()))
    if (v) return v
  }
  return undefined
}

/** Minimal Web Speech API wrapper (zh-HK, fallback zh-TW). */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

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
      const voice = pickVoice(voices.length ? voices : synth.getVoices())
      const u = new SpeechSynthesisUtterance(text)
      u.lang = voice?.lang ?? 'zh-HK'
      if (voice) u.voice = voice
      u.rate = 0.9
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      synth.speak(u)
    },
    [supported, voices],
  )

  const voiceLang = pickVoice(voices)?.lang ?? null

  return { supported, speaking, speak, stop, voiceLang }
}
