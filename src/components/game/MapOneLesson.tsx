import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { ListenButton } from '../easy-read/ListenButton'
import { getNodeById, getUnits } from '../../game/curriculum'
import type { FillQuestion, Lesson, MatchQuestion, McqQuestion, Question } from '../../game/types'
import { getLocale, t } from '../../i18n'
import { readLines, readPlace, writePlace } from '../../lib/easyReadMode'
import { postFeldmanFeedback } from '../../lib/feldmanAiRequest'
import { socraticZh } from '../../lib/socraticCopy'
import { exerciseIdForQuestion } from '../../game/exerciseLogos'
import { lessonChunks, nextLessonId, stepChunk } from '../../lib/mapUx'
import { requestOpenTab } from '../../lib/openTab'
import { useAiAgeGate } from '../../lib/useAiAgeGate'
import { MOOD_EMPTY_MAP } from '../../game/softMotion'
import { useSoftMotion } from '../../lib/useSoftMotion'
import { AiLearningTipScreen, type AiTipState } from './AiLearningTipScreen'
import { ExerciseMark } from './ExerciseMark'
import { LessonCardArt } from './LessonCardArt'
import { LessonCompleteFrame, StepAdvanceMark } from './SoftMotion'
import { SoftScreen } from './SoftScreen'

const AI_IDLE: AiTipState = { status: 'idle', text: '' }

/**
 * One lesson, one chunk, one primary action.
 * Lesson-complete motion stays off until the gear sound-and-motion switch is on.
 */
export function MapOneLesson({
  lesson,
  onExit,
  onOpenLesson,
  step = false,
  kind = 'lesson',
  exitLabel,
  following,
}: {
  lesson: Lesson
  onExit: () => void
  onOpenLesson: (id: string) => void
  /** Step-by-step chrome. The map1 preview leaves this off. */
  step?: boolean
  kind?: 'lesson' | 'quest'
  exitLabel?: string
  /** When set, replaces curriculum “next lesson”. `null` id means there is no next. */
  following?: { id: string | null; open: boolean }
}) {
  const { finishLesson, isUnlocked } = useGame()
  const { settings, easyRead } = useSen()
  const gate = useAiAgeGate()
  const chunks = useMemo(
    () => lessonChunks(lesson.cards.length, lesson.questions.length),
    [lesson],
  )
  const [index, setIndex] = useState(() => {
    if (!step) return 0
    const saved = readPlace(localStorage, lesson.id)
    const count = lesson.cards.length + lesson.questions.length
    if (count <= 0) return 0
    return Math.min(saved, count - 1)
  })
  const [view, setView] = useState<'lesson' | 'celebrate' | 'ai'>('lesson')
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<number | string | null>(null)
  const [hits, setHits] = useState(0)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ai, setAi] = useState<AiTipState>(AI_IDLE)
  const [gained, setGained] = useState(0)
  const finished = useRef(false)
  const motion = !settings.reduceMotion
  const playSoft = useSoftMotion()
  const stepCursor = useRef({ id: lesson.id, index })
  const [stepMark, setStepMark] = useState(0)
  const backLabel = exitLabel ?? (step ? t('er.map.back') : t('empty.nextLesson.cta'))

  useEffect(() => {
    const before = stepCursor.current
    stepCursor.current = { id: lesson.id, index }
    if (!step || before.id !== lesson.id || index <= before.index) return
    setStepMark((n) => n + 1)
  }, [lesson.id, index, step])

  const curriculumNext = nextLessonId(getUnits(), lesson.id)
  const nextId = following ? following.id : curriculumNext
  const nextOpen = following ? Boolean(following.open && following.id) : Boolean(nextId && isUnlocked(nextId))

  useEffect(() => {
    if (!step) return
    writePlace(localStorage, lesson.id, index)
  }, [step, lesson.id, index])
  const chunk = chunks[index]
  const last = chunks.length > 0 && index >= chunks.length - 1
  const practice = chunk?.kind === 'practice' ? lesson.questions[chunk.index] : undefined
  const waiting = Boolean(practice && !revealed && (practice.type === 'match' || choice === null))
  const sectionEnd = Boolean(chunk?.kind === 'read' && chunk.index === lesson.cards.length - 1 && lesson.questions.length > 0)
  const feedbackCta = t(lastCorrect ? 'tray.correct.cta' : 'tray.wrong.cta')
  const cta = step
    ? practice && !revealed
      ? t('er.quiz.check')
      : sectionEnd
        ? t('er.lesson.sectionDone')
        : last && (!practice || revealed)
          ? t('er.cta.done')
          : practice && revealed
            ? feedbackCta
            : t('er.lesson.continue')
    : practice && revealed && !last
      ? feedbackCta
      : last && (!practice || revealed)
        ? t('map.chunk.done')
        : t('map.chunk.cta')
  const checklist = lesson.cards.map((card) => card.title)

  function mark(correct: boolean) {
    setRevealed(true)
    setLastCorrect(correct)
    if (correct) setHits((n) => n + 1)
  }

  function requestExit() {
    if (step && view === 'lesson' && index > 0) {
      setLeaving(true)
      return
    }
    onExit()
  }

  function complete() {
    if (finished.current) {
      setView('celebrate')
      return
    }
    finished.current = true
    const total = lesson.questions.length
    const outcome = finishLesson(
      lesson.id,
      lesson.title,
      {
        total,
        firstTryCorrect: hits,
        accuracy: total ? hits / total : 1,
        wrongByType: {},
      },
      kind,
    )
    setGained(outcome.xpGained)
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
    setLastCorrect(null)
    setChoice(null)
    if (step) setSaved(true)
  }

  async function requestTip() {
    if (!gate.canUseAi) return
    const text = chunkText(lesson, chunk, easyRead)
    if (!text.trim()) {
      setAi({ status: 'error', text: socraticZh('research.socratic.empty') ?? t('fw.err.empty') })
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
        <img
          src={MOOD_EMPTY_MAP}
          alt=""
          width={1152}
          height={864}
          className="mx-auto w-full max-w-md rounded-3xl object-contain"
          decoding="async"
        />
        <h2 className="text-center text-2xl font-bold text-slate-900">{lesson.title}</h2>
        <p className="text-center text-base font-semibold text-slate-800">{t('empty.noContent')}</p>
        <Primary tall={step} onClick={() => requestOpenTab('research')}>{t('empty.noContent.cta')}</Primary>
        <Back onClick={onExit} label={backLabel} />
      </SoftScreen>
    )
  }

  if (view === 'celebrate') {
    return (
      <SoftScreen marker="map-celebrate">
        <div data-map-celebrate className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
          <LessonCompleteFrame play={playSoft} />
          <h2 className="text-2xl font-bold text-slate-900">{t('tray.complete.title')}</h2>
          <p className="text-base text-slate-700">{t('lp.tip')}</p>
          {gained > 0 ? <p className="text-base font-bold text-[#0D9488]">{t('lp.gain', { n: gained })}</p> : null}
        </div>
        {nextOpen && nextId ? (
          <>
            <Primary tall={step} onClick={() => onOpenLesson(nextId)}>{t('tray.complete.cta')}</Primary>
            <Back onClick={onExit} label={backLabel} />
          </>
        ) : (
          <>
            <p className="text-center text-base font-semibold text-slate-800">{t('empty.nextLesson')}</p>
            <Primary tall={step} onClick={onExit}>{step ? backLabel : t('empty.nextLesson.cta')}</Primary>
          </>
        )}
      </SoftScreen>
    )
  }

  const pct = Math.round(((index + (revealed || chunk.kind === 'read' ? 1 : 0.35)) / chunks.length) * 100)

  return (
    <SoftScreen marker="map-lesson">
      {leaving ? (
        <div data-testid="easy-read-leave" className="rounded-3xl border border-teal-100 bg-[#FFF9E9] p-4">
          <p className="text-lg font-bold text-teal-950">{t('er.leave.confirm')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onExit} className="min-h-11 rounded-2xl bg-teal-700 px-4 text-base font-bold text-white">
              {t('er.lesson.leave')}
            </button>
            <button type="button" onClick={() => setLeaving(false)} className="min-h-11 rounded-2xl border border-teal-200 bg-white px-4 text-base font-semibold text-teal-900">
              {t('er.cta.back')}
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Back onClick={requestExit} label={backLabel} />
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
        <span className="text-xs font-medium tabular-nums text-slate-400">
          {step ? t('er.progress.of', { n: index + 1, t: chunks.length }) : `${index + 1}/${chunks.length}`}
        </span>
      </div>
      {step ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-teal-800">
            <p>{t('er.lesson.oneTask')}</p>
            <p>{t('er.progress.left', { n: Math.max(0, chunks.length - index - 1) })}</p>
          </div>
          <ListenButton text={chunkText(lesson, chunk, easyRead)} />
          {saved ? (
            <p className="text-sm font-semibold text-teal-800" role="status">
              {t('er.cta.saved')}
            </p>
          ) : null}
        </div>
      ) : null}
      {step ? (
        <ol aria-label={t('er.map.progress')} className="flex flex-wrap gap-2">
          {chunks.map((item, tick) => (
            <li key={`${item.kind}-${item.index}`}>
              <span
                aria-current={tick === index ? 'step' : undefined}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                  tick < index ? 'bg-teal-700 text-white' : tick === index ? 'bg-[#FFF9E9] text-teal-950 ring-2 ring-teal-700' : 'bg-slate-100 text-slate-500'
                } ${tick === index && playSoft && stepMark > 0 ? 'soft-step-cell' : ''}`}
              >
                {tick < index ? '✓' : tick + 1}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {step ? <StepAdvanceMark play={playSoft} tick={stepMark} /> : null}
      <div key={`${lesson.id}-${index}`} className={`flex-1 ${motion ? 'map-one-in' : ''}`}>
        <h2
        className={
          chunk.kind === 'read'
            ? 'text-sm font-medium text-slate-500'
            : 'text-2xl font-bold text-slate-900'
        }
      >
        {lesson.title}
      </h2>
        {step && practice && !revealed && practice.type !== 'match' ? (
          <p className="mt-2 text-sm font-semibold text-teal-800">{t('er.quiz.pickOne')}</p>
        ) : null}
        {chunk.kind === 'read' ? (
          <ReadChunk card={lesson.cards[chunk.index]} easy={easyRead} step={step && easyRead} />
        ) : (
          <PracticeChunk
            question={lesson.questions[chunk.index]}
            revealed={revealed}
            choice={choice}
            onChoice={setChoice}
            onSolved={mark}
          />
        )}
        {revealed && lastCorrect !== null ? (
          <p className="mt-3 text-base font-bold text-teal-900" role="status">
            {lastCorrect ? t('tray.correct.title') : t('tray.wrong.title')}
          </p>
        ) : null}
        {revealed && practice && (
          <p className="mt-3 text-sm text-slate-700" role="status">
            {practice.explain}
          </p>
        )}
      </div>

      <Primary tall={step} disabled={waiting} onClick={onPrimary}>
        {cta}
      </Primary>
      <button
        type="button"
        data-map-tip
        onClick={() => setView('ai')}
        className="self-center min-h-11 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
      >
        {t('rs.cta.tip')}
      </button>
      {step ? (
        <button
          type="button"
          data-testid="easy-read-skip"
          onClick={onExit}
          className="self-center min-h-11 text-sm font-semibold text-slate-600 underline-offset-2 hover:underline"
        >
          {t('tray.softSkip')}
        </button>
      ) : null}
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
      <div data-map-empty="next" className="rounded-3xl border border-teal-100 bg-[#FFF9E9] px-6 py-8 text-center">
        <img
          src={MOOD_EMPTY_MAP}
          alt=""
          width={1152}
          height={864}
          className="mx-auto w-full max-w-sm rounded-3xl object-contain"
          decoding="async"
        />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">{t('tab.map')}</h2>
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
          <span className="relative block">
            <img
              src={unit.coverImage}
              alt=""
              width={1280}
              height={720}
              className={
                unit.coverImage.includes('/map-covers/')
                  ? 'aspect-video w-full object-cover object-center'
                  : 'h-40 w-full object-cover object-center'
              }
              decoding="async"
            />
            {unit.coverImage.includes('/map-covers/') ? (
              <span className="pointer-events-none absolute inset-x-[6%] top-[7%] flex h-[27%] items-center justify-center px-1 text-center text-sm font-bold leading-tight text-[#164e4c]">
                {unit.title}
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="block p-5">
          <span className="block text-lg font-bold text-slate-900">{lesson.title}</span>
          {lesson.subtitle ? (
            <span className="mt-0.5 block text-xs font-normal text-slate-400">{lesson.subtitle}</span>
          ) : null}
          <span className="mt-3 block w-full rounded-2xl bg-teal-700 py-3.5 text-center text-base font-bold text-white">
            {t('map.chunk.cta')}
          </span>
          <span className="sr-only" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            {pct}%
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

function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      data-map-back
      onClick={onClick}
      className="inline-flex min-h-11 shrink-0 items-center self-center text-sm font-semibold text-slate-500 underline-offset-2 hover:underline"
    >
      {label}
    </button>
  )
}

function Primary({
  children,
  onClick,
  disabled,
  tall = false,
}: {
  children: string
  onClick: () => void
  disabled?: boolean
  tall?: boolean
}) {
  return (
    <button
      type="button"
      data-map-cta="primary"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl bg-teal-700 py-3.5 text-base font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${
        tall ? 'min-h-11' : ''
      }`}
    >
      {children}
    </button>
  )
}

function ReadChunk({ card, easy, step = false }: { card: Lesson['cards'][number]; easy: boolean; step?: boolean }) {
  const lines = readLines(card, easy)
  const chunked = easy
  return (
    <article className={`mt-4 ${step ? 'rounded-3xl bg-[#FFF9E9] p-4' : ''}`}>
      <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
      <LessonCardArt image={card.image} credit={card.imageCredit} />
      {chunked ? (
        <ul className="mt-3 space-y-2 text-lg text-slate-800">
          {lines.map((line) => (
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
  const mark = exerciseIdForQuestion(question.type)
  const body =
    question.type === 'mcq' ? (
      <McqChunk q={question} revealed={revealed} choice={typeof choice === 'number' ? choice : null} onChoice={onChoice} />
    ) : question.type === 'fill' ? (
      <FillChunk q={question} revealed={revealed} choice={typeof choice === 'string' ? choice : null} onChoice={onChoice} />
    ) : (
      <MatchChunk q={question} onSolved={onSolved} />
    )
  return (
    <div>
      {mark ? (
        <div className="mt-4">
          <ExerciseMark id={mark} />
        </div>
      ) : null}
      {body}
    </div>
  )
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
