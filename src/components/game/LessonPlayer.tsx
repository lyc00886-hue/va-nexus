import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  HeartOff,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useGame, type FinishOutcome } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { useSenSupport } from '../../context/SenSupportContext'
import { getBadgeById, masteryHint, masteryLabel } from '../../game/rewards'
import { getLocale, joinList, t } from '../../i18n'
import {
  DEFAULT_LESSON_FOLDS,
  LESSON_FOLD_IDS,
  type LessonFoldId,
  type LessonFoldOpen,
} from '../../lib/learningMapSections'
import { MapFold } from './MapFold'
import type {
  FillQuestion,
  Lesson,
  MatchQuestion,
  McqQuestion,
  Question,
  QuestionType,
  SessionResult,
} from '../../game/types'
import { DemoBadge } from './DemoBadge'
import { LessonArtistPanel } from './LessonArtists'
import { ReadAloudButton } from './ReadAloudButton'

const IDLE_MS = 90_000
const MAX_HEARTS = 5

const FOLD_COPY: Record<LessonFoldId, { title: 'map.lesson.goal' | 'map.lesson.steps' | 'map.lesson.practice'; hint: 'map.lesson.goalHint' | 'map.lesson.stepsHint' | 'map.lesson.practiceHint' }> = {
  goal: { title: 'map.lesson.goal', hint: 'map.lesson.goalHint' },
  steps: { title: 'map.lesson.steps', hint: 'map.lesson.stepsHint' },
  practice: { title: 'map.lesson.practice', hint: 'map.lesson.practiceHint' },
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Phase = 'cards' | 'quiz' | 'rest' | 'result'
type Feedback = { correct: boolean; explain: string } | null

export function LessonPlayer({
  lesson,
  kind,
  onExit,
  after,
  presentation = 'flow',
  folds,
  onSetFold,
}: {
  lesson: Lesson
  kind: 'lesson' | 'quest'
  onExit: () => void
  /** Rendered under the result screen (e.g. embedded Feldman writer) */
  after?: ReactNode
  /** Learning-map lessons fold Goal / Steps / Practice. Quests keep the linear flow. */
  presentation?: 'flow' | 'folds'
  folds?: LessonFoldOpen
  onSetFold?: (id: LessonFoldId, open: boolean) => void
}) {
  const { settings, easyRead, supportsOn, focusTunnel } = useSen()
  const { state, finishLesson } = useGame()
  const { reportSignal } = useSenSupport()
  const heartsOn = state.prefs.hearts && !supportsOn
  const motion = !settings.reduceMotion

  const [phase, setPhase] = useState<Phase>('cards')
  const [cardIdx, setCardIdx] = useState(0)
  const [queue, setQueue] = useState<number[]>(() => lesson.questions.map((_, i) => i))
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({})
  const [wrongByType, setWrongByType] = useState<Partial<Record<QuestionType, number>>>({})
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [hearts, setHearts] = useState(MAX_HEARTS)
  const [attemptSeed, setAttemptSeed] = useState(1)
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null)
  const [result, setResult] = useState<SessionResult | null>(null)
  const foldButtonRefs = useRef<Partial<Record<LessonFoldId, HTMLButtonElement | null>>>({})
  const foldOpen = folds ?? DEFAULT_LESSON_FOLDS

  function openFold(id: LessonFoldId) {
    if (presentation === 'folds') onSetFold?.(id, true)
  }

  useEffect(() => reportSignal({ kind: 'session-reset' }), [reportSignal])

  // idle detection on lesson cards (one gentle signal per card)
  useEffect(() => {
    if (phase !== 'cards') return
    if (presentation === 'folds' && !foldOpen.steps) return
    const id = window.setTimeout(() => reportSignal({ kind: 'idle' }), IDLE_MS)
    return () => window.clearTimeout(id)
  }, [phase, cardIdx, reportSignal, presentation, foldOpen.steps])

  const card = lesson.cards[cardIdx]
  const qIdx = queue[0]
  const question = qIdx !== undefined ? lesson.questions[qIdx] : undefined
  const answeredCount = lesson.questions.length - new Set(queue).size
  const progress =
    phase === 'cards'
      ? ((cardIdx + 1) / (lesson.cards.length + lesson.questions.length)) * 100
      : ((lesson.cards.length + answeredCount) / (lesson.cards.length + lesson.questions.length)) * 100

  function answer(correct: boolean, explain: string) {
    if (!question) return
    setFeedback({ correct, explain })
    if (!(question.id in firstTry)) setFirstTry((f) => ({ ...f, [question.id]: correct }))
    if (!correct) {
      setWrongByType((w) => ({ ...w, [question.type]: (w[question.type] ?? 0) + 1 }))
      reportSignal({ kind: 'wrong', qtype: question.type })
      if (heartsOn) setHearts((h) => Math.max(0, h - 1))
    }
  }

  function next() {
    if (!feedback || qIdx === undefined) return
    const rest = queue.slice(1)
    const nq = feedback.correct ? rest : [...rest, qIdx] // wrong answers re-queued
    setFeedback(null)
    setAttemptSeed((s) => s + 1)
    if (nq.length === 0) {
      finish()
      return
    }
    setQueue(nq)
    if (heartsOn && hearts === 0) {
      setPhase('rest')
      openFold('practice')
    }
  }

  function finish() {
    const total = lesson.questions.length
    const ft = lesson.questions.filter((q) => firstTry[q.id]).length
    const r: SessionResult = { total, firstTryCorrect: ft, accuracy: total ? ft / total : 1, wrongByType }
    setResult(r)
    setOutcome(finishLesson(lesson.id, lesson.title, r, kind))
    setQueue([])
    setPhase('result')
    openFold('practice')
  }

  function restart() {
    setPhase('cards')
    setCardIdx(0)
    setQueue(lesson.questions.map((_, i) => i))
    setFirstTry({})
    setWrongByType({})
    setFeedback(null)
    setHearts(MAX_HEARTS)
    setOutcome(null)
    setResult(null)
    reportSignal({ kind: 'session-reset' })
  }

  const sep = getLocale() === 'en' ? '. ' : '。'
  const cardText = card ? `${card.title}${sep}${easyRead ? card.easy.join(sep) : card.body}` : ''

  function onFoldKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = LESSON_FOLD_IDS.length - 1
    let nextIndex = index
    if (event.key === 'ArrowDown') nextIndex = index === last ? 0 : index + 1
    else if (event.key === 'ArrowUp') nextIndex = index === 0 ? last : index - 1
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = last
    else return
    event.preventDefault()
    foldButtonRefs.current[LESSON_FOLD_IDS[nextIndex]]?.focus()
  }

  const cardsStage = card ? (
    <CardsStage
      card={card}
      cardIdx={cardIdx}
      cardCount={lesson.cards.length}
      easyRead={easyRead}
      focus={focusTunnel}
      cardText={cardText}
      autoRead={settings.readAloud}
      autoKey={`${lesson.id}-${cardIdx}`}
      nextLabel={
        cardIdx < lesson.cards.length - 1 ? t('lp.next') : phase === 'cards' ? t('lp.startQuiz') : t('lp.continue')
      }
      onPrev={() => setCardIdx((i) => i - 1)}
      onNext={() => {
        if (cardIdx < lesson.cards.length - 1) {
          setCardIdx((i) => i + 1)
          return
        }
        if (phase === 'cards') setPhase('quiz')
        openFold('practice')
      }}
    />
  ) : null

  const quizStage = question ? (
    <QuizStage
      question={question}
      showRetry={question.id in firstTry && !feedback}
      feedback={feedback}
      attemptSeed={attemptSeed}
      easyRead={easyRead}
      onAnswer={answer}
      onNext={next}
    />
  ) : null

  const restStage = (
    <RestStage
      onReview={() => {
        setHearts(MAX_HEARTS)
        setCardIdx(0)
        setPhase('cards')
        openFold('steps')
      }}
      onContinue={() => {
        setHearts(MAX_HEARTS)
        setPhase('quiz')
        openFold('practice')
      }}
    />
  )

  const resultStage =
    result && outcome ? (
      <ResultStage
        outcome={outcome}
        result={result}
        kind={kind}
        motion={motion}
        onExit={onExit}
        onRestart={restart}
        after={after}
      />
    ) : null

  const practiceStage =
    phase === 'quiz' ? (
      quizStage
    ) : phase === 'rest' ? (
      restStage
    ) : phase === 'result' ? (
      resultStage
    ) : (
      <button
        type="button"
        onClick={() => {
          setPhase('quiz')
          openFold('practice')
        }}
        className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_#1d4ed8] hover:bg-blue-500"
      >
        {t('lp.startQuiz')}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    )

  if (presentation === 'folds') {
    return (
      <div className={`space-y-3 ${easyRead ? 'leading-loose' : ''}`}>
        <div className="flex items-center gap-3">
          <div
            className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('lp.progress')}
          >
            <div
              className={`h-full rounded-full bg-emerald-500 ${motion ? 'transition-all duration-500' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {lesson.demo ? <DemoBadge /> : null}
          {heartsOn ? (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-rose-500" aria-label={t('lp.hearts', { n: hearts })}>
              <Heart className="h-5 w-5 fill-rose-500" aria-hidden /> {hearts}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-xs text-slate-400"
              title={supportsOn ? t('lp.heartsOffSupport') : t('lp.heartsOff')}
            >
              <HeartOff className="h-4 w-4" aria-hidden /> {t('lp.unlimited')}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {LESSON_FOLD_IDS.map((id, index) => (
            <MapFold
              key={id}
              level="h5"
              testId={`map-lesson-fold-${lesson.id}-${id}`}
              title={t(FOLD_COPY[id].title)}
              hint={t(FOLD_COPY[id].hint)}
              open={foldOpen[id]}
              onToggle={() => onSetFold?.(id, !foldOpen[id])}
              onKeyDown={(event) => onFoldKeyDown(event, index)}
              buttonRef={(node) => {
                foldButtonRefs.current[id] = node
              }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {id === 'goal' ? <LessonGoal lesson={lesson} easyRead={easyRead} /> : null}
              {id === 'steps' ? cardsStage : null}
              {id === 'practice' ? practiceStage : null}
            </MapFold>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`mx-auto max-w-2xl space-y-4 ${easyRead ? 'leading-loose' : ''}`}>
      {/* top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label={t('lp.exit')}
        >
          <X className="h-5 w-5" />
        </button>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('lp.progress')}
        >
          <div
            className={`h-full rounded-full bg-emerald-500 ${motion ? 'transition-all duration-500' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {heartsOn ? (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-rose-500" aria-label={t('lp.hearts', { n: hearts })}>
            <Heart className="h-5 w-5 fill-rose-500" aria-hidden /> {hearts}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs text-slate-400"
            title={supportsOn ? t('lp.heartsOffSupport') : t('lp.heartsOff')}
          >
            <HeartOff className="h-4 w-4" aria-hidden /> {t('lp.unlimited')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">{lesson.title}</h2>
        {lesson.demo && <DemoBadge />}
        <span className="text-xs text-slate-500">{t('common.aboutMin', { n: lesson.minutes })}</span>
      </div>

      {lesson.artists?.length ? <LessonArtistPanel artists={lesson.artists} /> : null}

      {phase === 'cards' ? cardsStage : null}
      {phase === 'quiz' ? quizStage : null}
      {phase === 'rest' ? restStage : null}
      {phase === 'result' ? resultStage : null}
    </div>
  )
}

function LessonGoal({ lesson, easyRead }: { lesson: Lesson; easyRead: boolean }) {
  return (
    <div className="space-y-3">
      {lesson.subtitle ? <p className="text-sm text-slate-600">{lesson.subtitle}</p> : null}
      {lesson.artists?.length ? <LessonArtistPanel artists={lesson.artists} /> : null}
      <ul className="space-y-3">
        {lesson.cards.map((item, index) => (
          <li key={`${item.title}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className={`font-semibold text-slate-900 ${easyRead ? 'text-lg' : 'text-base'}`}>{item.title}</p>
            {easyRead ? (
              <ul className="mt-2 space-y-1 text-base text-slate-800">
                {item.easy.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{item.body}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CardsStage({
  card,
  cardIdx,
  cardCount,
  easyRead,
  focus,
  cardText,
  autoRead,
  autoKey,
  nextLabel,
  onPrev,
  onNext,
}: {
  card: Lesson['cards'][number]
  cardIdx: number
  cardCount: number
  easyRead: boolean
  focus: boolean
  cardText: string
  autoRead: boolean
  autoKey: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <article className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${focus ? 'ring-4 ring-amber-200' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold text-blue-600">{t('lp.card', { i: cardIdx + 1, n: cardCount })}</p>
          <ReadAloudButton text={cardText} auto={autoRead} autoKey={autoKey} small />
        </div>
        <h3 className={`mt-2 font-bold text-slate-900 ${easyRead ? 'text-2xl' : 'text-xl'}`}>{card.title}</h3>
        {easyRead ? (
          <ul className="mt-3 space-y-2 text-lg text-slate-800">
            {card.easy.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-base leading-relaxed text-slate-700">{card.body}</p>
        )}
      </article>
      <div className="flex justify-between">
        <button
          type="button"
          disabled={cardIdx === 0}
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t('lp.prev')}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_#1d4ed8] hover:bg-blue-500 active:translate-y-0.5 active:shadow-none"
        >
          {nextLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

function QuizStage({
  question,
  showRetry,
  feedback,
  attemptSeed,
  easyRead,
  onAnswer,
  onNext,
}: {
  question: Question
  showRetry: boolean
  feedback: Feedback
  attemptSeed: number
  easyRead: boolean
  onAnswer: (correct: boolean, explain: string) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold text-violet-600">
            {t('lp.quiz')} · {t(question.type === 'mcq' ? 'lp.mcq' : question.type === 'fill' ? 'lp.fill' : 'lp.match')}
            {showRetry ? t('lp.retry') : ''}
          </p>
          <ReadAloudButton text={questionSpeech(question)} small />
        </div>
        <QuestionView
          key={`${question.id}-${attemptSeed}`}
          q={question}
          seed={attemptSeed}
          locked={Boolean(feedback)}
          easyRead={easyRead}
          onAnswer={onAnswer}
        />
      </div>
      {feedback && (
        <div
          role="status"
          className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4 ${
            feedback.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.correct ? (
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
            )}
            <div>
              <p className="font-bold">{feedback.correct ? t('lp.correct') : t('lp.wrong')}</p>
              <p className="text-sm">{feedback.explain}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className={`rounded-2xl px-6 py-3 text-sm font-bold text-white ${
              feedback.correct ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {t('lp.continue')}
          </button>
        </div>
      )}
    </div>
  )
}

function RestStage({ onReview, onContinue }: { onReview: () => void; onContinue: () => void }) {
  return (
    <div className="rounded-3xl border border-rose-100 bg-white p-6 text-center shadow-sm">
      <Heart className="mx-auto h-10 w-10 text-rose-400" aria-hidden />
      <h3 className="mt-2 text-lg font-bold text-slate-900">{t('lp.rest.title')}</h3>
      <p className="mt-1 text-sm text-slate-600">{t('lp.rest.text')}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onReview} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500">
          {t('lp.rest.review')}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('lp.rest.continue')}
        </button>
      </div>
    </div>
  )
}

function ResultStage({
  outcome,
  result,
  kind,
  motion,
  onExit,
  onRestart,
  after,
}: {
  outcome: FinishOutcome
  result: SessionResult
  kind: 'lesson' | 'quest'
  motion: boolean
  onExit: () => void
  onRestart: () => void
  after?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <Trophy className={`mx-auto h-12 w-12 text-amber-500 ${motion ? 'animate-bounce' : ''}`} aria-hidden />
        <h3 className="mt-2 text-xl font-bold text-slate-900">
          {outcome.passed ? (kind === 'lesson' ? t('lp.res.lesson') : t('lp.res.quest')) : t('lp.res.practice')}
        </h3>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-2xl bg-amber-50 p-3">
            <Star className="mx-auto h-5 w-5 fill-amber-400 text-amber-400" aria-hidden />
            <p className="mt-1 font-bold text-amber-700">+{outcome.xpGained} XP</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <Check className="mx-auto h-5 w-5 text-emerald-600" aria-hidden />
            <p className="mt-1 font-bold text-emerald-700">{t('lp.res.firstTry', { n: Math.round(result.accuracy * 100) })}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3">
            <Sparkles className="mx-auto h-5 w-5 text-blue-600" aria-hidden />
            <p className="mt-1 font-bold text-blue-700">{masteryLabel(outcome.mastery)}</p>
          </div>
        </div>
        {kind === 'lesson' && <p className="mt-3 text-xs text-slate-500">{masteryHint(outcome.mastery)}</p>}
        {!outcome.passed && <p className="mt-2 text-sm text-slate-600">{t('lp.res.unlockHint')}</p>}
        {outcome.newBadges.length > 0 && (
          <div className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
            <p className="font-bold">{t('lp.res.newBadge')}</p>
            <p>
              {joinList(outcome.newBadges.map((b) => `${getBadgeById().get(b)?.emoji ?? ''} ${getBadgeById().get(b)?.title ?? b}`))}
            </p>
          </div>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onExit} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500">
            {kind === 'lesson' ? t('lp.backMap') : t('lp.backResearch')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> {t('lp.again')}
          </button>
        </div>
      </div>
      {after}
    </div>
  )
}

function questionSpeech(q: Question) {
  const sep = getLocale() === 'en' ? '. ' : '。'
  if (q.type === 'mcq')
    return `${q.prompt} ${q.options.map((o, i) => t('lp.speech.option', { n: i + 1, text: o })).join(sep)}`
  if (q.type === 'fill')
    return `${q.prompt.replace('＿＿', t('lp.speech.blank'))} ${t('lp.speech.choices', { list: joinList(q.bank) })}`
  return `${q.prompt} ${joinList(q.pairs.map((p) => p.left))}`
}

type QProps<T> = {
  q: T
  seed: number
  locked: boolean
  easyRead: boolean
  onAnswer: (correct: boolean, explain: string) => void
}

function QuestionView(props: QProps<Question>) {
  const { q } = props
  if (q.type === 'mcq') return <Mcq {...props} q={q} />
  if (q.type === 'fill') return <Fill {...props} q={q} />
  return <Match {...props} q={q} />
}

const optCls = (state: 'idle' | 'selected' | 'right' | 'wrong') =>
  ({
    idle: 'border-slate-200 bg-white hover:bg-slate-50',
    selected: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',
    right: 'border-emerald-500 bg-emerald-50',
    wrong: 'border-rose-400 bg-rose-50',
  })[state]

function CheckButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-[0_4px_0_#047857] hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
    >
      {t('lp.check')}
    </button>
  )
}

function Mcq({ q, locked, easyRead, onAnswer }: QProps<McqQuestion>) {
  const [sel, setSel] = useState<number | null>(null)
  return (
    <div>
      <p className={`mt-2 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>{q.prompt}</p>
      <div className="mt-4 grid gap-2">
        {q.options.map((o, i) => {
          const st = locked ? (i === q.answer ? 'right' : i === sel ? 'wrong' : 'idle') : sel === i ? 'selected' : 'idle'
          return (
            <button
              key={o}
              type="button"
              disabled={locked}
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base ${optCls(st)}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-xs font-bold text-slate-500">
                {i + 1}
              </span>
              {o}
            </button>
          )
        })}
      </div>
      {!locked && <CheckButton disabled={sel === null} onClick={() => sel !== null && onAnswer(sel === q.answer, q.explain)} />}
    </div>
  )
}

function Fill({ q, seed, locked, easyRead, onAnswer }: QProps<FillQuestion>) {
  const [sel, setSel] = useState<string | null>(null)
  const bank = useMemo(() => shuffle(q.bank, seed + q.id.length), [q, seed])
  const [before, after] = q.prompt.split('＿＿')
  return (
    <div>
      <p className={`mt-2 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>
        {before}
        <span
          className={`mx-1 inline-block min-w-16 border-b-2 px-2 text-center ${
            locked ? (sel === q.answer ? 'border-emerald-500 text-emerald-700' : 'border-rose-400 text-rose-700') : 'border-blue-400 text-blue-700'
          }`}
        >
          {sel ?? '\u00a0'}
        </span>
        {after}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {bank.map((w) => (
          <button
            key={w}
            type="button"
            disabled={locked}
            aria-pressed={sel === w}
            onClick={() => setSel(w)}
            className={`rounded-2xl border-2 px-4 py-2 text-base font-semibold ${optCls(
              locked ? (w === q.answer ? 'right' : w === sel ? 'wrong' : 'idle') : sel === w ? 'selected' : 'idle',
            )}`}
          >
            {w}
          </button>
        ))}
      </div>
      {!locked && <CheckButton disabled={!sel} onClick={() => sel && onAnswer(sel === q.answer, q.explain)} />}
    </div>
  )
}

function Match({ q, seed, locked, easyRead, onAnswer }: QProps<MatchQuestion>) {
  const lefts = useMemo(() => shuffle(q.pairs.map((p) => p.left), seed + 3), [q, seed])
  const rights = useMemo(() => shuffle(q.pairs.map((p) => p.right), seed + 7), [q, seed])
  const [pickL, setPickL] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<string | null>(null)
  const mistakes = useRef(0)
  const done = useRef(false)

  function tapRight(r: string) {
    if (!pickL || locked) return
    const pair = q.pairs.find((p) => p.left === pickL)
    if (pair?.right === r) {
      const m = new Set(matched).add(pickL)
      setMatched(m)
      setPickL(null)
      if (m.size === q.pairs.length && !done.current) {
        done.current = true
        onAnswer(mistakes.current === 0, q.explain)
      }
    } else {
      mistakes.current += 1
      setFlash(r)
      window.setTimeout(() => setFlash(null), 600)
      setPickL(null)
    }
  }

  const rightMatched = new Set(q.pairs.filter((p) => matched.has(p.left)).map((p) => p.right))

  return (
    <div>
      <p className={`mt-2 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>{q.prompt}</p>
      <p className="text-xs text-slate-500">{t('lp.matchHint')}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          {lefts.map((l) => (
            <button
              key={l}
              type="button"
              disabled={locked || matched.has(l)}
              aria-pressed={pickL === l}
              onClick={() => setPickL(l)}
              className={`rounded-2xl border-2 px-3 py-3 text-sm font-semibold ${
                matched.has(l) ? optCls('right') + ' opacity-60' : optCls(pickL === l ? 'selected' : 'idle')
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {rights.map((r) => (
            <button
              key={r}
              type="button"
              disabled={locked || rightMatched.has(r)}
              onClick={() => tapRight(r)}
              className={`rounded-2xl border-2 px-3 py-3 text-sm ${
                rightMatched.has(r) ? optCls('right') + ' opacity-60' : optCls(flash === r ? 'wrong' : 'idle')
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
