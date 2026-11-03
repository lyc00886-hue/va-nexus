import { useMemo, useRef, useState } from 'react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { getNodeById, getUnits } from '../../game/curriculum'
import type { FillQuestion, Lesson, MatchQuestion, McqQuestion, Question } from '../../game/types'
import { getLocale, t } from '../../i18n'
import { postFeldmanFeedback } from '../../lib/feldmanAiRequest'
import { lessonChunks, nextLessonId, stepChunk } from '../../lib/mapUx'
import { requestOpenTab } from '../../lib/openTab'
import { useAiAgeGate } from '../../lib/useAiAgeGate'
import { AiLearningTipScreen, type AiTipState } from './AiLearningTipScreen'
import { SoftScreen } from './SoftScreen'

const AI_IDLE: AiTipState = { status: 'idle', text: '' }

/**
 * One lesson, one chunk, one primary action.
 * Otter pose is a static stub — otter-complete motion is not wired.
 */
export function MapOneLesson({
  lesson,
  onExit,
  onOpenLesson,
}: {
  lesson: Lesson
  onExit: () => void
  onOpenLesson: (id: string) => void
}) {
  const { finishLesson, isUnlocked } = useGame()
  const { settings, easyRead } = useSen()
  const gate = useAiAgeGate()
  const chunks = useMemo(
    () => lessonChunks(lesson.cards.length, lesson.questions.length),
    [lesson],
  )
  const [index, setIndex] = useState(0)
  const [view, setView] = useState<'lesson' | 'celebrate' | 'ai'>('lesson')
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<number | string | null>(null)
  const [hits, setHits] = useState(0)
  const [ai, setAi] = useState<AiTipState>(AI_IDLE)
  const finished = useRef(false)
  const motion = !settings.reduceMotion

  const nextId = nextLessonId(getUnits(), lesson.id)
  const nextOpen = Boolean(nextId && isUnlocked(nextId))
  const chunk = chunks[index]
  const last = chunks.length > 0 && index >= chunks.length - 1
  const practice = chunk?.kind === 'practice' ? lesson.questions[chunk.index] : undefined
  const waiting = Boolean(practice && !revealed && (practice.type === 'match' || choice === null))
  const cta = last && (!practice || revealed) ? t('map.chunk.done') : t('map.chunk.cta')
  const checklist = lesson.cards.map((card) => card.title)

  function mark(correct: boolean) {
    setRevealed(true)
    if (correct) setHits((n) => n + 1)
  }

  function complete() {
    if (finished.current) {
      setView('celebrate')
      return
    }
    finished.current = true
    const total = lesson.questions.length
    finishLesson(
      lesson.id,
      lesson.title,
      {
        total,
        firstTryCorrect: hits,
        accuracy: total ? hits / total : 1,
        wrongByType: {},
      },
      'lesson',
    )
    setView('celebrate')
  }

  function onPrimary() {
    if (!chunk || waiting) return
    if (practice && !revealed) {
      if (practice.type === 'mcq') mark(choice === practice.answer)
      else if (practice.type === 'fill') mark(choice === practice.answer)
      return
    }
    const next = stepChunk(index, chunks.length)
    if (next.done) {
      complete()
      return
    }
    setIndex(next.index)
    setRevealed(false)
    setChoice(null)
  }

  async function requestTip() {
    if (!gate.canUseAi) return
    const text = chunkText(lesson, chunk, easyRead)
    if (!text.trim()) {
      setAi({ status: 'error', text: t('fw.err.empty') })
      return
    }
    setAi({ status: 'loading', text: '' })
    const outcome = await postFeldmanFeedback({
      stage: 'describe',
      text,
      artwork: lesson.title,
      locale: getLocale(),
    })
    if (outcome.status === 'done') setAi({ status: 'done', text: outcome.text })
    else if (outcome.status === 'notice') setAi({ status: 'notice', text: '' })
    else setAi({ status: 'error', text: outcome.text })
  }

  if (view === 'ai') {
    return (
      <AiLearningTipScreen
        ai={ai}
        checklist={checklist}
        onRequestAi={() => void requestTip()}
        onBack={() => setView('lesson')}
        onContinue={() => setView('lesson')}
        onFallback={() => setView('lesson')}
        {...gate}
      />
    )
  }

  if (chunks.length === 0 || !chunk) {
    return (
      <SoftScreen marker="map-empty">
        <Back onClick={onExit} />
        <h2 className="text-2xl font-bold text-slate-900">{lesson.title}</h2>
        <p className="text-base font-semibold text-slate-800">{t('empty.noContent')}</p>
        <Primary onClick={() => requestOpenTab('research')}>{t('empty.noContent.cta')}</Primary>
      </SoftScreen>
    )
  }

  if (view === 'celebrate') {
    return (
      <SoftScreen marker="map-celebrate">
        <Back onClick={onExit} />
        <div data-map-celebrate className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <img
            src="/o2-otter.png"
            alt=""
            width={96}
            height={96}
            data-otter="stub"
            className="h-20 w-20 object-contain"
            decoding="async"
          />
          <h2 className="text-2xl font-bold text-slate-900">{t('celebrate.soft')}</h2>
          <p className="text-base text-slate-700">{t('celebrate.soft.sub')}</p>
        </div>
        {nextOpen && nextId ? (
          <Primary onClick={() => onOpenLesson(nextId)}>{t('celebrate.soft.cta')}</Primary>
        ) : (
          <>
            <p className="text-center text-base font-semibold text-slate-800">{t('empty.nextLesson')}</p>
            <Primary onClick={onExit}>{t('empty.nextLesson.cta')}</Primary>
          </>
        )}
      </SoftScreen>
    )
  }

  const pct = Math.round(((index + (revealed || chunk.kind === 'read' ? 1 : 0.35)) / chunks.length) * 100)

  return (
    <SoftScreen marker="map-lesson">
      <div className="flex items-center gap-3">
        <Back onClick={onExit} />
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={chunks.length}
          aria-valuenow={index + 1}
          aria-valuetext={`${index + 1}/${chunks.length}`}
        >
          <div
            className={`h-full rounded-full bg-teal-700 ${motion ? 'transition-[width] duration-150' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-slate-600">
          {index + 1}/{chunks.length}
        </span>
      </div>

      <div key={`${lesson.id}-${index}`} className={`flex-1 ${motion ? 'map-one-in' : ''}`}>
        <h2 className="text-2xl font-bold text-slate-900">{lesson.title}</h2>
        {chunk.kind === 'read' ? (
          <ReadChunk card={lesson.cards[chunk.index]} easy={easyRead} />
        ) : (
          <PracticeChunk
            question={lesson.questions[chunk.index]}
            revealed={revealed}
            choice={choice}
            onChoice={setChoice}
            onSolved={mark}
          />
        )}
        {revealed && practice && (
          <p className="mt-3 text-sm text-slate-700" role="status">
            {practice.explain}
          </p>
        )}
      </div>

      <Primary disabled={waiting} onClick={onPrimary}>
        {cta}
      </Primary>
      <button
        type="button"
        data-map-tip
        onClick={() => setView('ai')}
        className="self-center text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
      >
        {t('rs.cta.tip')}
      </button>
    </SoftScreen>
  )
}

/** One current lesson card. No other units, tracks, or locks. */
export function MapOneCard({ onOpen }: { onOpen: (id: string) => void }) {
  const { currentNodeId, state } = useGame()
  const lesson = currentNodeId ? getNodeById().get(currentNodeId) : undefined
  const unit = lesson ? getUnits().find((item) => item.nodes.some((node) => node.id === lesson.id)) : undefined

  if (!lesson || !unit) {
    return (
      <div data-map-empty="next" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">{t('tab.map')}</h2>
        <p className="mt-3 text-base font-semibold text-slate-800">{t('empty.nextLesson')}</p>
      </div>
    )
  }

  const done = unit.nodes.filter((node) => state.nodes[node.id]?.completed).length
  const total = unit.nodes.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-slate-900">{t('tab.map')}</h2>
      <button
        type="button"
        data-map-card={lesson.id}
        onClick={() => onOpen(lesson.id)}
        className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm hover:border-teal-300"
      >
        {unit.coverImage ? (
          <img src={unit.coverImage} alt="" className="h-40 w-full object-cover" decoding="async" />
        ) : null}
        <span className="block p-5">
          <span className="block text-lg font-bold text-slate-900">{lesson.title}</span>
          {lesson.subtitle ? <span className="mt-1 block text-sm text-slate-600">{lesson.subtitle}</span> : null}
          <span
            className="mt-4 block h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <span className="block h-full rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-4 block w-full rounded-2xl bg-teal-700 py-3.5 text-center text-base font-bold text-white">
            {t('map.chunk.cta')}
          </span>
        </span>
      </button>
    </div>
  )
}

function chunkText(lesson: Lesson, chunk: ReturnType<typeof lessonChunks>[number] | undefined, easy: boolean): string {
  if (!chunk) return lesson.title
  if (chunk.kind === 'read') {
    const card = lesson.cards[chunk.index]
    if (!card) return lesson.title
    return easy ? card.easy.join('\n') : `${card.title}\n${card.body}`
  }
  return lesson.questions[chunk.index]?.prompt ?? lesson.title
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-map-back
      onClick={onClick}
      className="shrink-0 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
    >
      {t('empty.nextLesson.cta')}
    </button>
  )
}

function Primary({
  children,
  onClick,
  disabled,
}: {
  children: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      data-map-cta="primary"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-teal-700 py-3.5 text-base font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
    >
      {children}
    </button>
  )
}

function ReadChunk({ card, easy }: { card: Lesson['cards'][number]; easy: boolean }) {
  return (
    <article className="mt-4">
      <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
      {easy ? (
        <ul className="mt-3 space-y-2 text-lg text-slate-800">
          {card.easy.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-base leading-relaxed text-slate-700">{card.body}</p>
      )}
    </article>
  )
}

function PracticeChunk({
  question,
  revealed,
  choice,
  onChoice,
  onSolved,
}: {
  question: Question
  revealed: boolean
  choice: number | string | null
  onChoice: (value: number | string) => void
  onSolved: (correct: boolean) => void
}) {
  if (question.type === 'mcq') {
    return <McqChunk q={question} revealed={revealed} choice={typeof choice === 'number' ? choice : null} onChoice={onChoice} />
  }
  if (question.type === 'fill') {
    return <FillChunk q={question} revealed={revealed} choice={typeof choice === 'string' ? choice : null} onChoice={onChoice} />
  }
  return <MatchChunk q={question} onSolved={onSolved} />
}

function McqChunk({
  q,
  revealed,
  choice,
  onChoice,
}: {
  q: McqQuestion
  revealed: boolean
  choice: number | null
  onChoice: (value: number) => void
}) {
  return (
    <div className="mt-4">
      <p className="text-lg font-semibold text-slate-900">{q.prompt}</p>
      <div className="mt-3 grid gap-2">
        {q.options.map((option, i) => {
          const picked = choice === i
          const tone = revealed
            ? i === q.answer
              ? 'border-teal-600 bg-teal-50'
              : picked
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-white'
            : picked
              ? 'border-teal-600 bg-teal-50'
              : 'border-slate-200 bg-white'
          return (
            <button
              key={`${i}-${option}`}
              type="button"
              disabled={revealed}
              aria-pressed={picked}
              onClick={() => onChoice(i)}
              className={`rounded-2xl border-2 px-4 py-3 text-left text-base ${tone}`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FillChunk({
  q,
  revealed,
  choice,
  onChoice,
}: {
  q: FillQuestion
  revealed: boolean
  choice: string | null
  onChoice: (value: string) => void
}) {
  const [before, after] = q.prompt.split('＿＿')
  return (
    <div className="mt-4">
      <p className="text-lg font-semibold text-slate-900">
        {before}
        <span className="mx-1 inline-block min-w-16 border-b-2 border-teal-500 px-2 text-center">{choice ?? '\u00a0'}</span>
        {after}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {q.bank.map((word) => (
          <button
            key={word}
            type="button"
            disabled={revealed}
            aria-pressed={choice === word}
            onClick={() => onChoice(word)}
            className={`rounded-2xl border-2 px-4 py-2 text-base font-semibold ${
              revealed && word === q.answer
                ? 'border-teal-600 bg-teal-50'
                : choice === word
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  )
}

function MatchChunk({ q, onSolved }: { q: MatchQuestion; onSolved: (correct: boolean) => void }) {
  const [pick, setPick] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [flash, setFlash] = useState<string | null>(null)
  const mistakes = useRef(0)
  const done = useRef(false)
  const rightOf = useMemo(() => new Map(q.pairs.map((pair) => [pair.left, pair.right])), [q])
  const rights = useMemo(() => [...q.pairs].map((pair) => pair.right).reverse(), [q])

  function tapRight(right: string) {
    if (!pick || done.current) return
    if (rightOf.get(pick) === right) {
      const next = [...matched, pick]
      setMatched(next)
      setPick(null)
      if (next.length === q.pairs.length && !done.current) {
        done.current = true
        onSolved(mistakes.current === 0)
      }
      return
    }
    mistakes.current += 1
    setFlash(right)
    window.setTimeout(() => setFlash(null), 400)
    setPick(null)
  }

  const matchedRights = new Set(matched.map((left) => rightOf.get(left)))

  return (
    <div className="mt-4">
      <p className="text-lg font-semibold text-slate-900">{q.prompt}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          {q.pairs.map((pair) => (
            <button
              key={pair.left}
              type="button"
              disabled={matched.includes(pair.left)}
              aria-pressed={pick === pair.left}
              onClick={() => setPick(pair.left)}
              className={`rounded-2xl border-2 px-3 py-3 text-left text-sm font-semibold ${
                matched.includes(pair.left)
                  ? 'border-teal-200 bg-teal-50 text-teal-800'
                  : pick === pair.left
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              {pair.left}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {rights.map((right) => (
            <button
              key={right}
              type="button"
              disabled={matchedRights.has(right)}
              onClick={() => tapRight(right)}
              className={`rounded-2xl border-2 px-3 py-3 text-left text-sm ${
                matchedRights.has(right)
                  ? 'border-teal-200 bg-teal-50'
                  : flash === right
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              {right}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
