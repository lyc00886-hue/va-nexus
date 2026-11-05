import { useState } from 'react'
import { t } from '../../i18n'
import { useSpeech } from '../../lib/useSpeech'
import { ISLAND_MICRO_QUEST, ISLAND_QUEST_ANSWER, islandQuestFeedback, type QuestIslandId } from '../../lib/softIslands'
import { QuestImage } from './QuestImage'

const LETTERS = ['A', 'B', 'C'] as const

/**
 * One micro-quest for research, critique, SBA, or exam.
 * The ＋1 line is card copy only. It does not write the learning-point tray.
 * History stays on its own quest.
 */
export function SoftIslandQuest({ island, onExit }: { island: QuestIslandId; onExit: () => void }) {
  const quest = ISLAND_MICRO_QUEST[island]
  const speech = useSpeech()
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<'ok' | 'a' | 'c' | null>(null)
  const feedbackKey =
    result === 'ok' ? islandQuestFeedback(island, ISLAND_QUEST_ANSWER) : result === 'a' ? islandQuestFeedback(island, 0) : result === 'c' ? islandQuestFeedback(island, 2) : null
  const settled = result === 'ok'
  const spoken = [t(quest.question), ...quest.options.map((key, index) => `${LETTERS[index]}. ${t(key)}`)].join(' ')

  function pick(index: number) {
    if (settled) return
    setChoice(index)
    setResult(null)
  }

  function onCheck() {
    if (choice === null || settled) return
    if (choice === ISLAND_QUEST_ANSWER) setResult('ok')
    else if (choice === 0) setResult('a')
    else setResult('c')
  }

  return (
    <section
      data-soft-plate="quest"
      data-island-quest={island}
      data-soft-motion="off"
      className="-mx-4 bg-[#FFF9E9] px-4 py-5 sm:mx-auto sm:max-w-md sm:rounded-[2rem]"
    >
      <div className="h-2.5 overflow-hidden rounded-full bg-[#e7e2d6]" aria-hidden>
        <div className="h-full rounded-full bg-[#0D9488]" style={{ width: settled ? '100%' : '34%' }} />
      </div>
      <p className="mt-3 inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]">{t(quest.tag)}</p>
      {island === 'exam' ? (
        <p data-exam-form className="mt-2 text-sm font-semibold text-[#0D9488]">
          {t('island.exam.form')}
        </p>
      ) : null}
      <h2 className="mt-3 text-2xl font-bold leading-snug text-slate-900">{t(quest.title)}</h2>
      <p className="mt-1 text-sm text-slate-500">{t(quest.sub)}</p>
      <p className="mt-1 text-sm text-slate-500">{t('island.quest.sub')}</p>
      <QuestImage id={island} />
      <div className="mt-3 rounded-2xl border border-[#f0c48a] bg-[#fde8c8] px-4 py-2.5 text-[#7a4b1a]">
        <p className="text-base font-bold">{t(quest.contextTitle)}</p>
        <p className="mt-1 text-sm leading-relaxed">{t(quest.context)}</p>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <p className="text-lg font-bold leading-snug text-slate-900">{t(quest.question)}</p>
        <button
          type="button"
          data-quest-tts
          onClick={() => (speech.speaking ? speech.stop() : speech.speak(spoken))}
          className="shrink-0 rounded-full border border-[#0D9488] bg-white px-2.5 py-1 text-xs font-semibold text-[#0D9488]"
        >
          {t('island.mq.tts')}
        </button>
      </div>
      <div role="radiogroup" aria-label={t(quest.question)} className="mt-3 grid gap-2">
        {quest.options.map((key, index) => {
          const picked = choice === index
          const letter = LETTERS[index]
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={picked}
              data-quest-option={letter}
              disabled={settled}
              onClick={() => pick(index)}
              className={`flex w-full items-center gap-3 rounded-2xl border border-[#e7eef0] bg-white px-3 py-2 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488] ${
                picked ? 'ring-2 ring-[#0D9488]' : ''
              }`}
              style={{ borderBottom: '4px solid #0D9488' }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0D9488] text-sm font-bold text-white">
                {letter}
              </span>
              <span className="text-base font-semibold leading-snug text-slate-900">{t(key)}</span>
            </button>
          )
        })}
      </div>
      {feedbackKey ? (
        <div role="status" data-quest-feedback={result ?? ''} className="mt-4 text-center">
          <p className="text-base font-semibold leading-relaxed text-slate-800">{t(feedbackKey)}</p>
          {settled ? (
            <p data-soft-gain className="mt-2 text-base font-bold text-[#0D9488]">
              {t('island.quest.gain')}
            </p>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        data-quest-check
        aria-disabled={choice === null}
        onClick={settled ? onExit : onCheck}
        className="mt-3 min-h-14 w-full rounded-2xl bg-[#0D9488] text-lg font-bold text-white hover:bg-teal-700"
      >
        {settled ? t('island.quest.continue') : t('island.mq.check')}
      </button>
      {settled ? null : (
        <button
          type="button"
          data-quest-back
          onClick={onExit}
          className="mt-3 block w-full text-center text-sm font-semibold text-slate-500 underline-offset-2 hover:underline"
        >
          {t('island.back')}
        </button>
      )}
    </section>
  )
}
