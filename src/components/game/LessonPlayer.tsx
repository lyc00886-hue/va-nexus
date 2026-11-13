import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pause,
  RotateCcw,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useGame, type FinishOutcome } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { useSenSupport } from '../../context/SenSupportContext'
import { getUnits } from '../../game/curriculum'
import { getF4Units } from '../../game/f4Demo'
import { getMediaUnits } from '../../game/mediaIntro'
import {
  OTTER_CHEST_XP,
  OTTER_STORAGE_KEY,
  chestOffer,
  otterChestAwardKey,
  queryOtterFlag,
  resolveOtterMascotEnabled,
  unitSliceFor,
} from '../../game/otterMascot'
import { PASS_ACCURACY, getBadgeById, masteryFor, masteryHint, masteryLabel } from '../../game/rewards'
import { softMotionPlay } from '../../game/softMotion'
import { getLocale, joinList, t } from '../../i18n'
import { shortLessonFooterCta } from '../../lib/shortLessonCta'
import {
  DEFAULT_LESSON_FOLDS,
  LESSON_FOLD_IDS,
  type LessonFoldId,
  type LessonFoldOpen,
} from '../../lib/learningMapSections'
import { MapFold } from './MapFold'
import { LessonCompleteFrame } from './SoftMotion'
import type {
  DualReadQuestion,
  FillQuestion,
  Lesson,
  MatchQuestion,
  McqQuestion,
  OrderQuestion,
  Question,
  QuestionType,
  SessionResult,
  ShortQuestion,
} from '../../game/types'
import { linesReady, orderMatches } from '../../game/thinPractice'
import { exerciseIdForQuestion } from '../../game/exerciseLogos'
import { DemoBadge } from './DemoBadge'
import { ExerciseMark } from './ExerciseMark'
import { LessonArtistPanel } from './LessonArtists'
import { lessonCardBodyStyle, lessonCardReadingAttrs, lessonCardVisibleLines } from '../../lib/lessonReadingSurface'
import { CommunityLessonIntro } from './CommunityCases'
import { LessonCardArt } from './LessonCardArt'
import { OtterChest, OtterPose } from './OtterPose'
import { ReadAloudButton } from './ReadAloudButton'
import { QuestionTypeChips } from './QuestionTypeChips'
import { DualReadBoard, OrderBoard, ShortBoard } from './ThinPractice'

const IDLE_MS = 90_000

const FOLD_COPY: Record<LessonFoldId, { title: 'map.lesson.goal' | 'map.lesson.steps' | 'map.lesson.practice'; hint: 'map.lesson.goalHint' | 'map.lesson.stepsHint' | 'map.lesson.practiceHint' }> = {
  goal: { title: 'map.lesson.goal', hint: 'map.lesson.goalHint' },
  steps: { title: 'map.lesson.steps', hint: 'map.lesson.stepsHint' },
  practice: { title: 'map.lesson.practice', hint: 'map.lesson.practiceHint' },
}

function mapUnitSlice(lessonId: string) {
  const units = [...getUnits(), ...getF4Units(), ...getMediaUnits()]
  return unitSliceFor(
    lessonId,
    units.map((unit) => ({ id: unit.id, nodeIds: unit.nodes.map((node) => node.id) })),
  )
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
  exitLabel,
  presentation = 'flow',
  folds,
  onSetFold,
}: {
  lesson: Lesson
  kind: 'lesson' | 'quest'
  onExit: () => void
  /** Rendered under the result screen (e.g. embedded Feldman writer) */
  after?: ReactNode
  /** Overrides the result exit label. Default stays “Back to the research lab” / map. */
  exitLabel?: string
  /** Learning-map lessons fold Goal / Steps / Practice. Quests keep the linear flow. */
  presentation?: 'flow' | 'folds'
  folds?: LessonFoldOpen
  onSetFold?: (id: LessonFoldId, open: boolean) => void
}) {
  const { settings, easyRead, focusTunnel } = useSen()
  const { state, finishLesson, awardOnce } = useGame()
  const { reportSignal } = useSenSupport()
  const motion = !settings.reduceMotion
  const playSoft = softMotionPlay({ soundMotion: settings.soundMotion, reduceMotion: settings.reduceMotion })

  const [phase, setPhase] = useState<Phase>('cards')
  const [cardIdx, setCardIdx] = useState(0)
  const [queue, setQueue] = useState<number[]>(() => lesson.questions.map((_, i) => i))
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({})
  const [wrongByType, setWrongByType] = useState<Partial<Record<QuestionType, number>>>({})
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [attemptSeed, setAttemptSeed] = useState(1)
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [chestKey, setChestKey] = useState<string | null>(null)
  const [otterOn] = useState(() => {
    if (typeof window === 'undefined') return true
    const flag = queryOtterFlag(window.location.search)
    try {
      if (flag === 'off') localStorage.setItem(OTTER_STORAGE_KEY, '0')
      else if (flag === 'on') localStorage.setItem(OTTER_STORAGE_KEY, '1')
      return resolveOtterMascotEnabled(window.location.search, localStorage.getItem(OTTER_STORAGE_KEY))
    } catch {
      return flag !== 'off'
    }
  })
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
  }

  function finish() {
    const total = lesson.questions.length
    const ft = lesson.questions.filter((q) => firstTry[q.id]).length
    const r: SessionResult = { total, firstTryCorrect: ft, accuracy: total ? ft / total : 1, wrongByType }
    const passed = r.accuracy >= PASS_ACCURACY
    const offer = otterOn
      ? chestOffer({
          kind,
          passed,
          id: lesson.id,
          unit: kind === 'lesson' ? mapUnitSlice(lesson.id) : null,
          completedBefore: (id) =>
            kind === 'quest' ? Boolean(state.quests[id]?.completed) : Boolean(state.nodes[id]?.completed),
        })
      : { offer: false as const, key: null }
    if (otterOn && offer.offer) {
      awardOnce(otterChestAwardKey(offer.key), OTTER_CHEST_XP, t('mascot.chest.reward'), kind)
    }
    setResult(r)
    setOutcome(finishLesson(lesson.id, lesson.title, r, kind))
    setChestKey(offer.key)
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
    setOutcome(null)
    setResult(null)
    setChestKey(null)
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

  const lastCard = cardIdx >= lesson.cards.length - 1
  const nextTone = shortLessonFooterCta({
    folds: presentation === 'folds',
    practiceOpen: foldOpen.practice,
    phase,
    lastCard,
  })

  const cardsStage = card ? (
    <CardsStage
      card={card}
      cardIdx={cardIdx}
      cardCount={lesson.cards.length}
      easyRead={easyRead}
      fontSize={settings.fontSize}
      highContrast={settings.highContrast}
      focus={focusTunnel}
      cardText={cardText}
      autoRead={settings.readAloud}
      autoKey={`${lesson.id}-${cardIdx}`}
      nextLabel={lastCard ? (phase === 'cards' ? t('lp.startQuiz') : t('lp.continue')) : t('lp.next')}
      nextTone={nextTone}
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
      otterOn={otterOn}
      reduceMotion={!motion}
      onAnswer={answer}
      onNext={next}
    />
  ) : null

  const restStage = (
    <RestStage
      onReview={() => {
        setCardIdx(0)
        setPhase('cards')
        openFold('steps')
      }}
      onContinue={() => {
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
        playSoft={playSoft}
        otterOn={otterOn}
        chestKey={chestKey}
        onExit={onExit}
        onRestart={restart}
        exitLabel={exitLabel}
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
          {lesson.demo ? <DemoBadge quiet /> : null}
        </div>
        <CommunityLessonIntro lessonId={lesson.id} subtitle={lesson.subtitle} />
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">{lesson.title}</h2>
        {lesson.demo && <DemoBadge quiet />}
        <span className="text-xs text-slate-500">{t('common.aboutMin', { n: lesson.minutes })}</span>
      </div>

      <CommunityLessonIntro lessonId={lesson.id} subtitle={lesson.subtitle} />

      {lesson.artists?.length ? <LessonArtistPanel artists={lesson.artists} /> : null}

      {phase === 'cards' ? cardsStage : null}
      {phase === 'quiz' ? quizStage : null}
      {phase === 'rest' ? restStage : null}
      {phase === 'result' ? resultStage : null}
    </div>
  )
}

function LessonGoal({ lesson, easyRead }: { lesson: Lesson; easyRead: boolean }) {
  const { state } = useGame()
  const mastery = masteryFor(state.nodes[lesson.id])
  return (
    <div className="space-y-3">
      {lesson.subtitle ? <p className="text-xs leading-snug text-slate-500">{lesson.subtitle}</p> : null}
      {mastery !== 'none' ? <p className="text-xs font-semibold text-slate-600">{masteryLabel(mastery)}</p> : null}
      {lesson.artists?.length ? <LessonArtistPanel artists={lesson.artists} /> : null}
      <ul className="space-y-3">
        {lesson.cards.map((item, index) => (
          <li key={`${item.title}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className={`font-semibold text-slate-900 ${easyRead ? 'text-lg' : 'text-base'}`}>{item.title}</p>
            <LessonCardArt image={item.image} credit={item.imageCredit} />
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
  fontSize,
  highContrast,
  focus,
  cardText,
  autoRead,
  autoKey,
  nextLabel,
  nextTone,
  onPrev,
  onNext,
}: {
  card: Lesson['cards'][number]
  cardIdx: number
  cardCount: number
  easyRead: boolean
  fontSize: 'md' | 'lg' | 'xl'
  highContrast: boolean
  focus: boolean
  cardText: string
  autoRead: boolean
  autoKey: string
  nextLabel: string
  nextTone: 'primary' | 'quiet' | 'hidden'
  onPrev: () => void
  onNext: () => void
}) {
  const visibleLines = lessonCardVisibleLines(card, easyRead)
  const bodyStyle = lessonCardBodyStyle({ fontSize, dyslexia: easyRead, highContrast })
  return (
    <div className="space-y-4">
      <article
        {...lessonCardReadingAttrs({ fontSize, dyslexia: easyRead, highContrast })}
        className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${focus ? 'ring-4 ring-amber-200' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold text-blue-600">{t('lp.card', { i: cardIdx + 1, n: cardCount })}</p>
          <ReadAloudButton text={cardText} auto={autoRead} autoKey={autoKey} small />
        </div>
        <h3 className={`mt-2 font-bold text-slate-900 ${easyRead ? 'text-2xl' : 'text-xl'}`}>{card.title}</h3>
        <LessonCardArt image={card.image} credit={card.imageCredit} />
        {easyRead ? (
          <ul data-lesson-body className="mt-3 space-y-2 text-lg text-slate-800" style={bodyStyle}>
            {visibleLines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p data-lesson-body className="mt-3 text-base leading-relaxed text-slate-700" style={bodyStyle}>{visibleLines[0]}</p>
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
        {nextTone === 'hidden' ? null : (
          <button
            type="button"
            onClick={onNext}
            className={
              nextTone === 'quiet'
                ? 'inline-flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100'
                : 'inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_#1d4ed8] hover:bg-blue-500 active:translate-y-0.5 active:shadow-none'
            }
          >
            {nextLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
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
  otterOn,
  reduceMotion,
  onAnswer,
  onNext,
}: {
  question: Question
  showRetry: boolean
  feedback: Feedback
  attemptSeed: number
  easyRead: boolean
  otterOn: boolean
  reduceMotion: boolean
  onAnswer: (correct: boolean, explain: string) => void
  onNext: () => void
}) {
  const mark = exerciseIdForQuestion(question.type)
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-violet-600">
              {t('lp.quiz')}
              {showRetry ? t('lp.retry') : ''}
            </p>
            <QuestionTypeChips types={[question.type]} />
            {mark ? <ExerciseMark id={mark} /> : null}
          </div>
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
            {otterOn && feedback.correct ? (
              <OtterPose
                pose="encourage"
                label={t('mascot.encourage')}
                reduceMotion={reduceMotion}
                size="sm"
                testId="otter-pose-encourage"
              />
            ) : null}
            {feedback.correct ? (
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
            )}
            <div>
              <p className="font-bold">{feedback.correct ? t('tray.correct.title') : t('tray.wrong.title')}</p>
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
            {t(feedback.correct ? 'tray.correct.cta' : 'tray.wrong.cta')}
          </button>
        </div>
      )}
    </div>
  )
}

function RestStage({ onReview, onContinue }: { onReview: () => void; onContinue: () => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <Pause className="mx-auto h-6 w-6 text-slate-400" aria-hidden />
      <h3 className="mt-2 text-lg font-bold text-slate-900">{t('lp.rest.title')}</h3>
      <p className="mt-1 text-sm text-slate-600">{t('lp.rest.text')}</p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500"
        >
          {t('lp.rest.continue')}
        </button>
        <button
          type="button"
          onClick={onReview}
          className="text-sm font-semibold text-slate-600 underline-offset-2 hover:underline"
        >
          {t('lp.rest.review')}
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
  playSoft,
  otterOn,
  chestKey,
  onExit,
  onRestart,
  exitLabel,
  after,
}: {
  outcome: FinishOutcome
  result: SessionResult
  kind: 'lesson' | 'quest'
  motion: boolean
  playSoft: boolean
  otterOn: boolean
  chestKey: string | null
  onExit: () => void
  onRestart: () => void
  exitLabel?: string
  after?: ReactNode
}) {
  const [chestPhase, setChestPhase] = useState<'offer' | 'open' | 'skip'>('offer')
  const celebrate = kind === 'lesson' && outcome.passed
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-teal-100 bg-[#FFF9E9] px-5 py-8 text-center">
        {celebrate ? (
          <LessonCompleteFrame play={playSoft} />
        ) : otterOn ? (
          <OtterPose
            pose="complete"
            label={t('mascot.complete')}
            reduceMotion={!playSoft}
            testId="otter-pose-complete"
          />
        ) : (
          <Trophy className="mx-auto h-12 w-12 text-amber-500" aria-hidden />
        )}
        <h3 className="mt-4 text-2xl font-bold text-slate-900">
          {outcome.passed ? (kind === 'lesson' ? t('tray.complete.title') : t('lp.res.quest')) : t('lp.res.practice')}
        </h3>
        <p className="mt-3 text-base font-bold text-[#0D9488]">{t('lp.gain', { n: outcome.xpGained })}</p>
        <p className="mt-1 text-sm text-slate-600">{t('lp.tip')}</p>
        <p className="mt-1 text-sm text-slate-600">
          {t('lp.res.firstTry', { n: Math.round(result.accuracy * 100) })}
          {' · '}
          {masteryLabel(outcome.mastery)}
        </p>
        {kind === 'lesson' && <p className="mt-2 text-sm text-slate-500">{masteryHint(outcome.mastery)}</p>}
        {!outcome.passed && <p className="mt-2 text-sm text-slate-600">{t('lp.res.unlockHint')}</p>}
        {outcome.newBadges.length > 0 && (
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-bold">{t('lp.res.newBadge')}</span>{' '}
            {joinList(outcome.newBadges.map((b) => `${getBadgeById().get(b)?.emoji ?? ''} ${getBadgeById().get(b)?.title ?? b}`))}
          </p>
        )}
        <button
          type="button"
          onClick={onExit}
          className="mt-6 w-full rounded-2xl bg-[#0D9488] py-3.5 text-base font-bold text-white hover:bg-[#0f766e]"
        >
          {exitLabel ?? (kind === 'lesson' ? t('lp.backMap') : t('lp.backResearch'))}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="mt-3 min-h-11 text-sm font-semibold text-slate-500 underline-offset-2 hover:underline"
        >
          {t('lp.again')}
        </button>
        {otterOn && chestKey && chestPhase !== 'skip' ? (
          <OtterChest
            reduceMotion={!motion}
            play={playSoft}
            opened={chestPhase === 'open'}
            badgeIds={outcome.newBadges}
            onOpen={() => setChestPhase('open')}
            onSkip={() => setChestPhase('skip')}
          />
        ) : null}
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
  if (q.type === 'match') return `${q.prompt} ${joinList(q.pairs.map((p) => p.left))}`
  if (q.type === 'order') return `${q.prompt} ${joinList(q.items)}`
  if (q.type === 'dualRead') return `${q.prompt} ${joinList(q.labels)}`
  return q.prompt
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
  if (q.type === 'order') return <OrderQ {...props} q={q} />
  if (q.type === 'dualRead') return <DualReadQ {...props} q={q} />
  if (q.type === 'short') return <ShortQ {...props} q={q} />
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
      <LessonCardArt image={q.image} credit={q.imageCredit} />
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
      <LessonCardArt image={q.image} credit={q.imageCredit} />
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

function OrderQ({ q, locked, easyRead, onAnswer }: QProps<OrderQuestion>) {
  const [order, setOrder] = useState<string[] | null>(null)
  return (
    <div>
      <OrderBoard q={q} order={order} revealed={locked} easyRead={easyRead} onChange={setOrder} />
      {!locked && (
        <CheckButton
          disabled={!order || order.length !== q.items.length}
          onClick={() => order && onAnswer(orderMatches(order, q.items), q.explain)}
        />
      )}
    </div>
  )
}

function DualReadQ({ q, locked, easyRead, onAnswer }: QProps<DualReadQuestion>) {
  const [lines, setLines] = useState<string[]>(['', ''])
  return (
    <div>
      <DualReadBoard q={q} lines={lines} revealed={locked} easyRead={easyRead} onChange={setLines} />
      {!locked && <CheckButton disabled={!linesReady(lines, 2)} onClick={() => onAnswer(true, q.explain)} />}
    </div>
  )
}

function ShortQ({ q, locked, easyRead, onAnswer }: QProps<ShortQuestion>) {
  const [lines, setLines] = useState<string[]>([''])
  return (
    <div>
      <ShortBoard q={q} line={lines[0] ?? ''} revealed={locked} easyRead={easyRead} onChange={setLines} />
      {!locked && <CheckButton disabled={!linesReady(lines, 1)} onClick={() => onAnswer(true, q.explain)} />}
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
      <LessonCardArt image={q.image} credit={q.imageCredit} />
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
