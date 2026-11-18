import { useState } from 'react'
import { getLocale, SPEECH_LANG, t, type MessageKey } from '../../i18n'
import { DIRECTION_KEYS, sentenceChipKeys } from '../../lib/lessonPresentation'
import { ReadAloudButton } from './ReadAloudButton'

const CHIP = 'rounded-full border border-[#0D9488] px-3 py-1.5 text-base font-semibold'

type SpeechRec = {
  lang: string
  start: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
}

function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function sentenceFrom(lessonId: string, picked: readonly MessageKey[]): string {
  if (picked.length === 0) return ''
  if (lessonId === 'F4-U3-L2') return t('builder.assembled')
  return picked.map((key) => t(key)).join('，')
}

/** Easier-reading appreciation helper. Standard presentation keeps ordinary writing fields. */
export function SentenceBuilder({ lessonId, onUse }: { lessonId: string; onUse: (text: string) => void }) {
  const pieces = sentenceChipKeys(lessonId)
  const directionsArePieces =
    pieces.length > 0 && pieces.every((key) => (DIRECTION_KEYS as readonly string[]).includes(key))
  const [direction, setDirection] = useState<MessageKey | null>(null)
  const [picked, setPicked] = useState<MessageKey[]>([])
  const assembled = sentenceFrom(lessonId, picked)

  function toggle(key: MessageKey) {
    const next = picked.includes(key) ? picked.filter((item) => item !== key) : [...picked, key]
    setPicked(next)
    const sentence = sentenceFrom(lessonId, next)
    if (sentence) onUse(sentence)
  }

  function listen() {
    const Ctor = speechCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = SPEECH_LANG[getLocale()]
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim()
      if (text) onUse(text)
    }
    rec.start()
  }

  return (
    <section data-sentence-builder="" className="mt-4">
      <h3 className="text-xl font-bold leading-relaxed text-slate-900">{t('builder.title')}</h3>
      <p className="mt-2 text-lg leading-loose text-slate-900">{t('builder.lead')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(directionsArePieces ? pieces : DIRECTION_KEYS).map((key) => {
          const on = directionsArePieces ? picked.includes(key) : direction === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => (directionsArePieces ? toggle(key) : setDirection(on ? null : key))}
              className={`${CHIP} ${on ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'}`}
            >
              {t(key)}
            </button>
          )
        })}
      </div>
      {directionsArePieces ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          {pieces.map((key) => {
            const on = picked.includes(key)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(key)}
                className={`${CHIP} ${on ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'}`}
              >
                {t(key)}
              </button>
            )
          })}
        </div>
      )}
      <p
        data-assembled=""
        className="mt-3 rounded-2xl border border-[#b7e4df] bg-[#E7F6F3] px-3 py-3 text-lg leading-loose text-slate-900"
      >
        {assembled}
      </p>
      <p className="mt-3 text-lg leading-loose text-slate-900">{t('builder.read')}</p>
      <div className="mt-2">
        <ReadAloudButton text={assembled} pill />
      </div>
      <p className="mt-3 text-lg leading-loose text-slate-800">{t('builder.hint')}</p>
      {speechCtor() ? (
        <button type="button" onClick={listen} className="mt-3 block text-left text-lg leading-loose text-slate-800">
          {t('builder.voice')}
        </button>
      ) : (
        <p className="mt-3 text-lg leading-loose text-slate-800">{t('builder.voice')}</p>
      )}
    </section>
  )
}

/** Ordinary writing fields stay with this note in standard presentation. */
export function StandardWritingNote() {
  return (
    <section data-standard-writing="" className="mt-4">
      <h3 className="text-xl font-bold leading-relaxed text-slate-900">{t('write.title')}</h3>
      <p className="mt-2 text-lg leading-relaxed text-slate-900">{t('builder.lead')}</p>
      <p className="mt-2 text-lg leading-relaxed text-slate-900">{t('builder.hint')}</p>
    </section>
  )
}
