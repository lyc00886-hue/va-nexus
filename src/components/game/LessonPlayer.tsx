import { Pause, Trophy, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGame, type FinishOutcome } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { useSenSupport } from '../../context/SenSupportContext'
import { getUnits } from '../../game/curriculum'
import { getF4Units } from '../../game/f4Demo'
import { getMediaUnits } from '../../game/mediaIntro'
import {
  HILL_BROCHURE_URL,
  HILL_PAGE_URL,
  HILL_VIDEO_ID,
  classroomEmbedUrl,
  classroomWatchUrl,
  isCommunityCaseLesson,
} from '../../game/communityCases'
import { critiqueObjectKey, critiqueSentenceFor } from '../../game/classroomCritique'
import { buildLessonSteps, splitOfficialFilmText, type LessonStep } from '../../game/lessonSteps'
import { verifiedAppreciationList, type AppreciationPack } from '../../game/verifiedArtworks'
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
import { getLocale, joinList, t, tIn, useT } from '../../i18n'
import { bilingualSpeech } from '../../lib/lessonStepReading'
import { englishAlt } from '../../lib/bilingualCatalog'
import { bindLessonPageScroll } from '../../lib/lessonPageScroll'
import { contentJson } from '../../i18n/content'
import { shortLessonFooterCta } from '../../lib/shortLessonCta'
import {
  DEFAULT_LESSON_FOLDS,
  type LessonFoldId,
  type LessonFoldOpen,
} from '../../lib/learningMapSections'
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
import { CommunityGoalOutcomes, CommunityLessonIntro, LessonCardCriteria } from './CommunityCases'
import { F4ThematicResearch } from './F4ThematicResearch'
import { OfficialLessonParts } from './OfficialFormat'
import { LessonShortTrial } from './LessonShortTrial'
import { LessonWorksheet } from './LessonWorksheet'
import { LearningWorksheetFile, LearningWorksheetForLesson } from './LearningWorksheetFile'
import { learningWorksheetLesson } from '../../game/learningWorksheet'
import { imageDecision, questionImageBlocked } from '../../lib/imageLicence'
import { loadPresentation, savePresentation, useTeacherPresentation, type PresentationMode } from '../../lib/lessonPresentation'
import { LessonCardArt } from './LessonCardArt'
import { MetWorkFacts } from './MetWorkFacts'
import { BiKey, BiSpan } from './BilingualText'
import { OtterChest, OtterPose } from './OtterPose'
import { PresentationBar } from './PresentationBar'
import { CritiqueFace, ImageBlockedFace, ImageRuleFace } from './ClassroomFaces'
import { QuestMotionButton } from './MapQuestChrome'
import { DualReadBoard, OrderBoard, ShortBoard, ThinPace } from './ThinPractice'

const IDLE_MS = 90_000

const FOLD_COPY: Record<LessonFoldId, { title: 'map.lesson.goal' | 'map.lesson.steps' | 'map.lesson.practice'; hint: 'map.lesson.goalHint' | 'map.lesson.stepsHint' | 'map.lesson.practiceHint' }> = {
  goal: { title: 'map.lesson.goal', hint: 'map.lesson.goalHint' },
  steps: { title: 'map.lesson.steps', hint: 'map.lesson.stepsHint' },
  practice: { title: 'map.lesson.practice', hint: 'map.lesson.practiceHint' },
}

const OUTLINE_CHIP = 'rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488]'
const STEP_CHIP = {
  mcq: 'qtype.chip.mcq',
  fill: 'qtype.chip.fill',
  match: 'qtype.chip.match',
  order: 'qtype.chip.order',
  dualRead: 'qtype.chip.dualRead',
  short: 'qtype.chip.short',
} as const
const WIZARD_BUTTON =
  'w-full rounded-2xl bg-[#0D9488] py-3.5 text-base font-bold text-white shadow-[0_4px_0_#0F766E] active:translate-y-1 active:shadow-none'

function ReadingBar(props: {
  mode: PresentationMode
  onMode: (mode: PresentationMode) => void
  readText: string
  auto?: boolean
  autoKey?: string
}) {
  return (
    <div data-reading-settings="">
      <PresentationBar {...props} />
    </div>
  )
}

type AnswerGate = { ready: boolean; check: () => void }

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

function stepsFor(lesson: Lesson): LessonStep[] {
  return buildLessonSteps({
    cardCount: lesson.cards.length,
    questionCount: lesson.questions.length,
    media: isCommunityCaseLesson(lesson.id),
  })
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
  /** Rendered under the result screen. */
  after?: ReactNode
  /** Overrides the result exit label. Default stays “Back to the research lab” / map. */
  exitLabel?: string
  /** Learning-map lessons and quests share one card-at-a-time shell. */
  presentation?: 'flow' | 'folds'
  folds?: LessonFoldOpen
  onSetFold?: (id: LessonFoldId, open: boolean) => void
}) {
  const { settings, easyRead, focusTunnel } = useSen()
  const { bilingual, zhSide } = useT()
  const shellRef = useRef<HTMLDivElement>(null)
  const teacherPresentation = useTeacherPresentation()
  const [readingMode, setReadingMode] = useState<PresentationMode>(() => teacherPresentation ?? loadPresentation())
  const [appliedOverride, setAppliedOverride] = useState(teacherPresentation)
  if (appliedOverride !== teacherPresentation) {
    setAppliedOverride(teacherPresentation)
    if (teacherPresentation) setReadingMode(teacherPresentation)
  }
  function chooseReading(mode: PresentationMode) {
    setReadingMode(mode)
    savePresentation(mode)
  }
  const readingEasy = easyRead || readingMode === 'easy'
  const { state, finishLesson, awardOnce } = useGame()
  const { reportSignal } = useSenSupport()
  const motion = !settings.reduceMotion
  const playSoft = softMotionPlay({ soundMotion: settings.soundMotion, reduceMotion: settings.reduceMotion })

  const built = stepsFor(lesson)
  const [lessonSeen, setLessonSeen] = useState(lesson.id)
  const [steps, setSteps] = useState<LessonStep[]>(built)
  const [stepIdx, setStepIdx] = useState(0)
  const [licenceStep, setLicenceStep] = useState<'rule' | 'blocked' | null>(null)
  const [finished, setFinished] = useState(false)
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
  const gateRef = useRef<AnswerGate>({ ready: false, check: () => {} })
  const [gateReady, setGateReady] = useState(false)
  const onGate = useCallback((gate: AnswerGate) => {
    gateRef.current = gate
    setGateReady((prev) => (prev === gate.ready ? prev : gate.ready))
  }, [])
  const foldOpen = folds ?? DEFAULT_LESSON_FOLDS

  if (lessonSeen !== lesson.id) {
    setLessonSeen(lesson.id)
    setSteps(built)
    setStepIdx(0)
    setLicenceStep(null)
    setFinished(false)
    setFirstTry({})
    setWrongByType({})
    setFeedback(null)
    setOutcome(null)
    setResult(null)
    setChestKey(null)
    setGateReady(false)
  }

  const step = steps[stepIdx]
  const phase: Phase = finished
    ? 'result'
    : step?.kind === 'question'
      ? 'quiz'
      : step?.kind === 'rest'
        ? 'rest'
        : 'cards'
  const cardIdx = step?.kind === 'card' ? step.cardIndex : 0
  const question = step?.kind === 'question' ? lesson.questions[step.questionIndex] : undefined
  const imageBlocked = question ? questionImageBlocked(question) : false
  const licenceFace = imageBlocked ? (licenceStep ?? 'rule') : null

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    if (phase === 'result') {
      document.documentElement.removeAttribute('data-lesson-wizard')
      document.body.style.overflow = ''
      return
    }
    document.documentElement.setAttribute('data-lesson-wizard', 'on')
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.removeAttribute('data-lesson-wizard')
      document.body.style.overflow = previous
    }
  }, [phase])

  useEffect(() => {
    const root = shellRef.current
    if (!root) return
    return bindLessonPageScroll(root)
  }, [phase])

  useEffect(() => reportSignal({ kind: 'session-reset' }), [reportSignal])

  useEffect(() => {
    const current = steps[stepIdx]
    if (!current || presentation !== 'folds') return
    const id: LessonFoldId = current.kind === 'question' ? 'practice' : 'steps'
    onSetFold?.(id, true)
    void t(FOLD_COPY[id].hint)
  }, [presentation, onSetFold, stepIdx, steps])

  useEffect(() => {
    if (phase !== 'cards') return
    if (presentation === 'folds' && !foldOpen.steps) return
    const id = window.setTimeout(() => reportSignal({ kind: 'idle' }), IDLE_MS)
    return () => window.clearTimeout(id)
  }, [phase, cardIdx, reportSignal, presentation, foldOpen.steps])

  const progress = steps.length ? ((stepIdx + 1) / steps.length) * 100 : 100

  function answer(correct: boolean, explain: string) {
    if (!question) return
    setFeedback({ correct, explain })
    if (!(question.id in firstTry)) setFirstTry((f) => ({ ...f, [question.id]: correct }))
    if (!correct) {
      setWrongByType((w) => ({ ...w, [question.type]: (w[question.type] ?? 0) + 1 }))
      reportSignal({ kind: 'wrong', qtype: question.type })
    }
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
    setFinished(true)
    if (presentation === 'folds') onSetFold?.('practice', true)
  }

  function goTo(index: number) {
    setFeedback(null)
    setLicenceStep(null)
    setGateReady(false)
    gateRef.current = { ready: false, check: () => {} }
    setStepIdx(index)
  }

  function advance() {
    if (stepIdx + 1 >= steps.length) {
      finish()
      return
    }
    goTo(stepIdx + 1)
  }

  function afterCheck() {
    if (!feedback || step?.kind !== 'question') return
    const wrong = !feedback.correct
    const questionIndex = step.questionIndex
    setFeedback(null)
    setLicenceStep(null)
    setAttemptSeed((s) => s + 1)
    setGateReady(false)
    if (wrong) {
      setSteps((list) => [...list, { kind: 'question', questionIndex }])
      setStepIdx((i) => i + 1)
      return
    }
    if (stepIdx + 1 >= steps.length) {
      finish()
      return
    }
    setLicenceStep(null)
    setStepIdx((i) => i + 1)
  }

  function restart() {
    setSteps(stepsFor(lesson))
    setStepIdx(0)
    setLicenceStep(null)
    setFinished(false)
    setFirstTry({})
    setWrongByType({})
    setFeedback(null)
    setAttemptSeed((s) => s + 1)
    setOutcome(null)
    setResult(null)
    setChestKey(null)
    setGateReady(false)
    reportSignal({ kind: 'session-reset' })
  }

  function onPrimary() {
    if (licenceFace === 'rule') {
      setLicenceStep('blocked')
      return
    }
    if (licenceFace === 'blocked') {
      advance()
      return
    }
    if (phase === 'quiz') {
      if (feedback) {
        afterCheck()
        return
      }
      if (!gateRef.current.ready) return
      gateRef.current.check()
      return
    }
    advance()
  }

  const sep = getLocale() === 'en' ? '. ' : '。'
  const card = lesson.cards[cardIdx]
  const cardBody = card ? (readingEasy ? card.easy.join(sep) : card.body) : ''
  const cardText = card
    ? bilingual
      ? [englishAlt(zhSide, card.title), englishAlt(zhSide, card.body), card.title, cardBody].filter(Boolean).join(sep)
      : `${card.title}${sep}${cardBody}`
    : ''
  const lastCard = cardIdx >= lesson.cards.length - 1
  const nextTone = shortLessonFooterCta({
    folds: presentation === 'folds',
    practiceOpen: foldOpen.practice,
    phase: phase === 'result' ? 'result' : phase,
    lastCard,
  })
  const leading =
    stepIdx === 0 ? <OfficialLessonParts lessonId={lesson.id} title={lesson.title} /> : null

  const frame = (lesson.id === 'F4-U3-L3' || lesson.id === 'F4-U3-L4') ? (
    <div hidden>
      <F4ThematicResearch
        lesson={lesson}
        fontSize={settings.fontSize}
        easyRead={easyRead}
        highContrast={settings.highContrast}
      />
    </div>
  ) : null

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

  if (phase === 'result') {
    return (
      <div className="w-full max-w-none wrap-anywhere space-y-3">
        <div className="mx-auto w-full max-w-none wrap-anywhere space-y-4 md:max-w-2xl">
          {(lesson.id === 'F4-U3-L3' || lesson.id === 'F4-U3-L4') ? (
            <div hidden>
              <F4ThematicResearch
                lesson={lesson}
                fontSize={settings.fontSize}
                easyRead={easyRead}
                highContrast={settings.highContrast}
              />
            </div>
          ) : null}
          {resultStage}
          <CommunityLessonIntro lessonId={lesson.id} subtitle={lesson.subtitle} showEmbed={false} />
          <CommunityGoalOutcomes lessonId={lesson.id} />
          <LessonWorksheet lessonId={lesson.id} />
          <LearningWorksheetForLesson lessonId={lesson.id} />
        </div>
      </div>
    )
  }

  const critiqueKey = critiqueObjectKey(lesson.id)
  const critiqueLine = critiqueKey
    ? critiqueSentenceFor(
        lesson.id,
        (key) => t(key),
        verifiedAppreciationList(contentJson<AppreciationPack>('f4-demo'), contentJson<AppreciationPack>('f5-demo')),
      )
    : ''
  const critiqueOpen = Boolean(feedback) && critiqueLine.length > 0 && question?.type === 'dualRead' && !licenceFace
  const speakAlt = (text: string) => englishAlt(zhSide, text)
  const questionRead = question ? questionSpeech(question, bilingual, speakAlt) : ''
  const critiqueRead = critiqueSpeech(critiqueLine, bilingual, speakAlt)
  const primaryLabel =
    licenceFace === 'rule'
      ? t('lp.continue')
      : licenceFace === 'blocked' || critiqueOpen || (phase === 'quiz' && !feedback)
        ? t('lp.check')
        : phase === 'cards' && !lastCard
          ? t('lp.next')
          : t('lp.continue')
  const primaryDisabled = phase === 'quiz' && !feedback && !gateReady && !licenceFace

  return (
    <div
      ref={shellRef}
      data-lesson-wizard=""
      data-focus-tunnel={focusTunnel ? 'on' : 'off'}
      className="fixed inset-0 z-50 w-full max-w-none space-y-3 overflow-y-auto wrap-anywhere bg-[#FFF9E9] p-3 sm:p-6"
    >
      <div className="mx-auto flex w-full max-w-none flex-col space-y-4 wrap-anywhere rounded-[1.75rem] border-2 border-[#0D9488] bg-white px-4 py-3 md:max-w-2xl">
        {frame}
        <div className="shrink-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <p className="text-xs font-semibold text-slate-600">{t('lp.progress')}</p>
            <p className="text-center text-sm font-bold text-[#0D9488]">
              {t('lp.step', { x: stepIdx + 1, y: Math.max(steps.length, 1) })}
            </p>
            <div className="justify-self-end">
              <QuestMotionButton />
            </div>
          </div>
          <div
            className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#E6E8F2]"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('lp.progress')}
          >
            <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            <BiSpan text={lesson.title} />
          </h2>
          <button
            type="button"
            onClick={onExit}
            aria-label={t('lp.exit')}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#0D9488]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0D9488]">
              <X className="h-4 w-4" aria-hidden />
            </span>
            {t('lp.exit')}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {step?.kind === 'rest' ? (
            <div
              data-lesson-step={stepIdx + 1}
              data-focus-step={focusTunnel ? 'current' : undefined}
            >
              <RestStage
                onReview={() => {
                  const cardAt = steps.findIndex((item) => item.kind === 'card')
                  goTo(cardAt >= 0 ? cardAt : 0)
                }}
                onContinue={advance}
              />
            </div>
          ) : (
            <article
              data-lesson-step={stepIdx + 1}
              data-focus-step={focusTunnel ? 'current' : undefined}
              data-lesson-kind={step?.kind ?? 'card'}
              data-lesson-count={steps.length}
              data-presentation={readingMode}
              data-teacher-presentation={teacherPresentation ?? 'none'}
              data-classroom-face={
                licenceFace ?? (critiqueOpen ? 'critique' : step?.kind === 'question' && question?.type === 'dualRead' ? 'dual' : step?.kind ?? 'card')
              }
              className={
                step?.kind === 'question'
                  ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                  : 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm'
              }
            >
              {step?.kind === 'media' ? (
                <MediaStage
                  leading={leading}
                  presentation={readingMode}
                  onPresentation={chooseReading}
                  autoRead={settings.readAloud}
                  autoKey={`${lesson.id}-media`}
                />
              ) : null}
              {step?.kind === 'card' && card ? (
                <CardsStage
                  lessonId={lesson.id}
                  card={card}
                  cardIdx={cardIdx}
                  easyRead={readingEasy}
                  presentation={readingMode}
                  onPresentation={chooseReading}
                  fontSize={settings.fontSize}
                  highContrast={settings.highContrast}
                  focus={focusTunnel}
                  cardText={cardText}
                  autoRead={settings.readAloud}
                  autoKey={`${lesson.id}-card-${cardIdx}`}
                  nextLabel={lastCard ? t('lp.continue') : t('lp.next')}
                  nextTone={nextTone}
                  leading={
                    <>
                      {leading}
                      {cardIdx === 0 && lesson.artists?.length ? (
                        <LessonArtistPanel artists={lesson.artists} />
                      ) : null}
                    </>
                  }
                />
              ) : null}
              {step?.kind === 'question' && question ? (
                licenceFace === 'rule' ? (
                  <ImageRuleFace />
                ) : licenceFace === 'blocked' ? (
                  <ImageBlockedFace />
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <ReadingBar
                      mode={readingMode}
                      onMode={chooseReading}
                      readText={critiqueOpen ? critiqueRead : questionRead}
                      auto={settings.readAloud}
                      autoKey={critiqueOpen ? `${lesson.id}-critique-${stepIdx}` : `${lesson.id}-q-${stepIdx}`}
                    />
                    {critiqueOpen ? (
                      <CritiqueFace lessonId={lesson.id} objectText={critiqueLine} />
                    ) : (
                      <QuizStage
                        lessonId={lesson.id}
                        question={question}
                        showRetry={question.id in firstTry && !feedback}
                        feedback={feedback}
                        attemptSeed={attemptSeed}
                        easyRead={readingEasy}
                        presentation={readingMode}
                        otterOn={otterOn}
                        reduceMotion={!motion}
                        onAnswer={answer}
                        onGate={onGate}
                        leading={leading}
                      />
                    )}
                  </div>
                )
              ) : null}
            </article>
          )}
          {step?.kind === 'rest' ? null : (
            <div className="z-10 shrink-0 bg-[#FFF9E9] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                aria-disabled={primaryDisabled}
                onClick={() => {
                  if (primaryDisabled) return
                  onPrimary()
                }}
                autoFocus={Boolean(feedback)}
                className={WIZARD_BUTTON}
              >
                {primaryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
      {learningWorksheetLesson(lesson.id) ? (
        <div data-lesson-extra="" className="mx-auto mt-4 w-full md:max-w-2xl">
          <LearningWorksheetFile />
        </div>
      ) : null}
    </div>
  )
}

function LessonCopy({ text }: { text: string }) {
  const parts = splitOfficialFilmText(text)
  if (parts.length === 1 && parts[0]?.kind === 'text') return <BiSpan text={parts[0].text} />
  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'text' ? (
          <span key={index}>{part.text}</span>
        ) : (
          <iframe
            key={`${part.id}-${index}`}
            data-testid="classroom-video"
            data-video-id={part.id}
            title={classroomWatchUrl(part.id)}
            src={classroomEmbedUrl(part.id)}
            className="mt-3 aspect-video w-full rounded-2xl bg-[#1B2430]"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ),
      )}
    </>
  )
}

export function LessonGoal({ lesson, easyRead }: { lesson: Lesson; easyRead: boolean }) {
  const { state } = useGame()
  const mastery = masteryFor(state.nodes[lesson.id])
  return (
    <div className="space-y-3">
      <CommunityGoalOutcomes lessonId={lesson.id} />
      {lesson.demo ? <DemoBadge quiet /> : null}
      {lesson.subtitle ? <p className="text-xs leading-snug text-slate-500">{lesson.subtitle}</p> : null}
      {mastery !== 'none' ? <p className="text-xs font-semibold text-slate-600">{masteryLabel(mastery)}</p> : null}
      {lesson.artists?.length ? <LessonArtistPanel artists={lesson.artists} /> : null}
      <ul className="space-y-3">
        {lesson.cards.map((item, index) => (
          <li key={`${item.title}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className={`font-semibold text-slate-900 ${easyRead ? 'text-lg' : 'text-base'}`}>{item.title}</p>
            <LessonCardArt image={item.image} credit={item.imageCredit} />
            <MetWorkFacts image={item.image} />
            {easyRead ? (
              <ul className="mt-2 space-y-1 text-base text-slate-800">
                {item.easy.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{item.body}</p>
            )}
            <LessonCardCriteria lessonId={lesson.id} index={index} />
            <LessonShortTrial lessonId={lesson.id} index={index} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CardsStage({
  lessonId,
  card,
  cardIdx,
  easyRead,
  presentation,
  onPresentation,
  fontSize,
  highContrast,
  focus,
  cardText,
  autoRead,
  autoKey,
  nextLabel,
  nextTone,
  leading,
}: {
  lessonId: string
  card: Lesson['cards'][number]
  cardIdx: number
  easyRead: boolean
  presentation: PresentationMode
  onPresentation: (mode: PresentationMode) => void
  fontSize: 'md' | 'lg' | 'xl'
  highContrast: boolean
  focus: boolean
  cardText: string
  autoRead: boolean
  autoKey: string
  nextLabel: string
  nextTone: 'primary' | 'quiet' | 'hidden'
  leading?: ReactNode
}) {
  const visibleLines = lessonCardVisibleLines(card, easyRead)
  const bodyStyle = lessonCardBodyStyle({ fontSize, dyslexia: easyRead, highContrast })
  const quietFooter = nextTone === 'hidden' ? null : nextTone === 'quiet' ? nextLabel : null
  const showCardArt = Boolean(card.image && imageDecision({ image: card.image, role: 'teaching' }) === 'show')
  return (
    <div
      {...lessonCardReadingAttrs({ fontSize, dyslexia: easyRead, highContrast })}
      data-focus-card={focus ? 'on' : 'off'}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ReadingBar mode={presentation} onMode={onPresentation} readText={cardText} auto={autoRead} autoKey={autoKey} />
      {showCardArt ? (
        <div
          data-art-slot
          data-lesson-scroll={presentation === 'easy' ? 'art' : undefined}
          className={
            presentation === 'easy'
              ? 'min-h-[16rem] flex-[5] overflow-y-auto px-4'
              : 'min-h-[16rem] flex-[3] overflow-hidden px-4'
          }
        >
          <LessonCardArt image={card.image} credit={card.imageCredit} />
          <MetWorkFacts image={card.image} />
        </div>
      ) : null}
      <div data-lesson-scroll="body" className={`min-h-0 overflow-y-auto px-4 pb-4 ${showCardArt ? 'flex-[2]' : 'flex-1'}`}>
        {leading}
        <h3 className={`font-bold text-slate-900 ${easyRead ? 'text-2xl' : 'text-xl'}`}>
          <BiSpan text={card.title} />
        </h3>
        {easyRead ? (
          <ul data-lesson-body className="mt-3 space-y-2 text-xl leading-relaxed text-slate-800" style={bodyStyle}>
            {visibleLines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[#0D9488]" aria-hidden />
                <span>
                  <LessonCopy text={line} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p data-lesson-body className="mt-3 text-xl leading-relaxed text-slate-900" style={bodyStyle}>
            <LessonCopy text={visibleLines[0] ?? ''} />
          </p>
        )}
        <LessonCardCriteria lessonId={lessonId} index={cardIdx} />
        <LessonShortTrial lessonId={lessonId} index={cardIdx} />
        {quietFooter ? <span className="sr-only">{quietFooter}</span> : null}
      </div>
    </div>
  )
}

function QuizStage({
  lessonId,
  question,
  showRetry,
  feedback,
  attemptSeed,
  easyRead,
  presentation,
  otterOn,
  reduceMotion,
  onAnswer,
  onGate,
  leading,
}: {
  lessonId: string
  question: Question
  showRetry: boolean
  feedback: Feedback
  attemptSeed: number
  easyRead: boolean
  presentation: PresentationMode
  otterOn: boolean
  reduceMotion: boolean
  onAnswer: (correct: boolean, explain: string) => void
  onGate: (gate: AnswerGate) => void
  leading?: ReactNode
}) {
  const { settings } = useSen()
  const mark = exerciseIdForQuestion(question.type)
  const staged = question.type === 'dualRead' || question.type === 'order' || question.type === 'short'
  const gentle = presentation === 'easy' && Boolean(feedback && !feedback.correct)
  return (
    <div
      {...lessonCardReadingAttrs({
        fontSize: settings.fontSize,
        dyslexia: settings.dyslexia,
        highContrast: settings.highContrast,
      })}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="px-4 pt-3">
        <ThinPace clear />
        <p className="mt-2">
          <span
            data-qtype-current={question.type}
            className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-bold text-[#FFF9E9]"
          >
            {t(STEP_CHIP[question.type])}
          </span>
        </p>
      </div>
      {mark ? (
        <span className="sr-only">
          <ExerciseMark id={mark} />
          {showRetry ? t('lp.retry') : ''}
        </span>
      ) : null}
      <div
        data-lesson-scroll={staged ? undefined : 'body'}
        className={staged ? 'flex min-h-0 flex-1 flex-col' : 'min-h-0 flex-1 overflow-y-auto px-4 pb-2'}
      >
        {leading}
        <QuestionView
          key={`${question.id}-${attemptSeed}`}
          q={question}
          seed={attemptSeed}
          locked={Boolean(feedback)}
          easyRead={easyRead}
          presentation={presentation}
          lessonId={lessonId}
          onAnswer={onAnswer}
          onGate={onGate}
        />
      </div>
      {feedback ? (
        <div
          role="status"
          className={`mx-4 mb-4 shrink-0 rounded-2xl border px-4 py-3 ${
            feedback.correct
              ? 'border-[#0D9488] bg-[#E7F6F3] text-slate-900'
              : gentle
                ? 'border-[#E7C98A] bg-[#FFF9E9] text-slate-900'
                : 'border-[#E38B82] bg-[#FDECEA] text-slate-900'
          }`}
        >
          {otterOn && feedback.correct ? (
            <div className="hidden">
              <OtterPose
                pose="encourage"
                label={t('mascot.encourage')}
                reduceMotion={reduceMotion}
                size="sm"
                testId="otter-pose-encourage"
              />
            </div>
          ) : null}
          <p className={`font-bold ${feedback.correct ? 'text-[#0D9488]' : gentle ? 'text-lg text-slate-800' : 'text-[#9A3412]'}`}>
            {feedback.correct ? t('lp.correct') : gentle ? t('lp.retry') : t('lp.wrong')}
          </p>
          {feedback.correct ? (
            <p className="mt-1 text-sm font-semibold text-[#0D9488]">{t('lp.gain', { n: 1 })}</p>
          ) : gentle ? null : (
            <p className="mt-1 text-sm font-semibold text-[#9A3412]">{t('lp.retry')}</p>
          )}
          {feedback.explain ? (
            <p className="mt-1 text-sm text-slate-700">
              <BiSpan text={feedback.explain} />
            </p>
          ) : null}
        </div>
      ) : null}
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

function MediaStage({
  leading,
  presentation,
  onPresentation,
  autoRead,
  autoKey,
}: {
  leading?: ReactNode
  presentation: PresentationMode
  onPresentation: (mode: PresentationMode) => void
  autoRead: boolean
  autoKey: string
}) {
  const { bilingual } = useT()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const watchUrl = classroomWatchUrl(HILL_VIDEO_ID)
  const sep = getLocale() === 'en' ? '. ' : '。'
  const readText = (['case.hill.title', 'video.hillTitle', 'video.classroomOnly'] as const)
    .map((key) => bilingualSpeech(t(key), tIn('en', key), bilingual, sep))
    .join(sep)
  const { settings } = useSen()
  return (
    <div
      {...lessonCardReadingAttrs({
        fontSize: settings.fontSize,
        dyslexia: settings.dyslexia,
        highContrast: settings.highContrast,
      })}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ReadingBar mode={presentation} onMode={onPresentation} readText={readText} auto={autoRead} autoKey={autoKey} />
      <h3 data-lesson-body className="shrink-0 px-4 pt-4 text-xl font-bold text-slate-900">
        <BiKey name="case.hill.title" />
      </h3>
      <div data-lesson-scroll="body" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {leading}
        <iframe
          data-testid="classroom-video"
          data-video-id={HILL_VIDEO_ID}
          title={t('video.hillTitle')}
          src={classroomEmbedUrl(HILL_VIDEO_ID)}
          className="mt-3 aspect-video w-full rounded-2xl bg-[#1B2430]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <p data-lesson-body className="mt-3 text-sm leading-relaxed text-slate-700">
          <BiKey name="video.hillTitle" />
        </p>
        <p data-lesson-body className="mt-2 text-sm font-semibold text-[#0D9488]">
          <BiKey name="video.classroomOnly" />
        </p>
        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
          className={`mt-3 ${OUTLINE_CHIP}`}
        >
          {detailsOpen ? t('lp.hideDetails') : t('lp.showDetails')}
        </button>
        {detailsOpen ? (
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
            <p>
              <BiKey name="case.hill.source" />
            </p>
            <p>
              <BiKey name="video.noDownload" />
            </p>
            <a href={HILL_PAGE_URL} className="block break-all font-semibold text-[#0D9488]" target="_blank" rel="noopener noreferrer">
              {HILL_PAGE_URL}
            </a>
            <a href={HILL_BROCHURE_URL} className="block break-all font-semibold text-[#0D9488]" target="_blank" rel="noopener noreferrer">
              {HILL_BROCHURE_URL}
            </a>
            <a href={watchUrl} className="block break-all font-semibold text-[#0D9488]" target="_blank" rel="noopener noreferrer">
              {watchUrl}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function questionSpeech(q: Question, bilingual: boolean, alt: (text: string) => string | undefined) {
  const sep = getLocale() === 'en' ? '. ' : '。'
  const line = (text: string) => bilingualSpeech(text, alt(text), bilingual, sep)
  if (q.type === 'mcq')
    return `${line(q.prompt)} ${q.options.map((o, i) => t('lp.speech.option', { n: i + 1, text: line(o) })).join(sep)}`
  if (q.type === 'fill') {
    const blanked = q.prompt.replace('＿＿', t('lp.speech.blank'))
    const english = alt(q.prompt)?.replace('＿＿', tIn('en', 'lp.speech.blank'))
    return `${bilingualSpeech(blanked, english, bilingual, sep)} ${t('lp.speech.choices', { list: joinList(q.bank.map((item) => line(item))) })}`
  }
  if (q.type === 'match') return `${line(q.prompt)} ${joinList(q.pairs.map((p) => line(p.left)))}`
  if (q.type === 'order') return `${line(q.prompt)} ${joinList(q.items.map((item) => line(item)))}`
  if (q.type === 'dualRead') return `${line(q.prompt)} ${joinList(q.labels.map((label) => line(label)))}`
  return line(q.prompt)
}

function critiqueSpeech(objectLine: string, bilingual: boolean, alt: (text: string) => string | undefined) {
  const sep = getLocale() === 'en' ? '. ' : '。'
  const lines = [
    bilingualSpeech(t('critique.title'), tIn('en', 'critique.title'), bilingual, sep),
    bilingualSpeech(t('critique.lead'), tIn('en', 'critique.lead'), bilingual, sep),
    bilingualSpeech(t('critique.flex'), tIn('en', 'critique.flex'), bilingual, sep),
    bilingualSpeech(objectLine, alt(objectLine), bilingual, sep),
    bilingualSpeech(t('critique.nudge'), tIn('en', 'critique.nudge'), bilingual, sep),
  ]
  return lines.filter(Boolean).join('\n')
}

type QProps<T> = {
  q: T
  seed: number
  locked: boolean
  easyRead: boolean
  presentation?: PresentationMode
  lessonId?: string
  onAnswer: (correct: boolean, explain: string) => void
  onGate: (gate: AnswerGate) => void
}

function useAnswerGate(ready: boolean, submit: () => void, onGate: (gate: AnswerGate) => void) {
  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
    onGate({
      ready,
      check: () => submitRef.current(),
    })
  }, [onGate, ready, submit])
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

const optCls = (state: 'idle' | 'selected' | 'right' | 'wrong', gentle = false) =>
  ({
    idle: 'border-slate-200 bg-[#FFF9E9]',
    selected: 'border-[#0D9488] bg-white',
    right: 'border-[#0D9488] bg-[#E7F6F3]',
    wrong: gentle ? 'border-[#E7C98A] bg-[#FFF4DE]' : 'border-[#E38B82] bg-[#FDECEA]',
  })[state]

function Mcq({ q, locked, easyRead, presentation = 'standard', onAnswer, onGate }: QProps<McqQuestion>) {
  const [sel, setSel] = useState<number | null>(null)
  useAnswerGate(sel !== null && !locked, () => {
    if (sel !== null) onAnswer(sel === q.answer, q.explain)
  }, onGate)
  return (
    <div>
      <LessonCardArt image={q.image} credit={q.imageCredit} />
      <MetWorkFacts image={q.image} />
      <p data-lesson-body className={`mt-3 font-semibold leading-relaxed text-slate-900 ${easyRead || presentation === 'easy' ? 'text-2xl leading-loose' : 'text-xl'}`}>
        <BiSpan text={q.prompt} />
      </p>
      <div className={`mt-4 grid gap-3 ${presentation === 'easy' && q.options.length === 2 ? 'grid-cols-2' : ''}`}>
        {q.options.map((o, i) => {
          const st = locked ? (sel === i ? (i === q.answer ? 'right' : 'wrong') : 'idle') : sel === i ? 'selected' : 'idle'
          return (
            <button
              key={o}
              type="button"
              disabled={locked}
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
              className={`min-h-14 rounded-2xl border-2 px-4 text-left ${presentation === 'easy' ? 'min-h-16 py-4 text-xl leading-relaxed' : 'py-3 text-base'} ${optCls(st, presentation === 'easy')}`}
            >
              <BiSpan text={o} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Fill({ q, seed, locked, easyRead, presentation = 'standard', onAnswer, onGate }: QProps<FillQuestion>) {
  const [sel, setSel] = useState<string | null>(null)
  const bank = useMemo(() => shuffle(q.bank, seed + q.id.length), [q, seed])
  const [before, after] = q.prompt.split('＿＿')
  useAnswerGate(Boolean(sel) && !locked, () => {
    if (sel) onAnswer(sel === q.answer, q.explain)
  }, onGate)
  return (
    <div>
      <LessonCardArt image={q.image} credit={q.imageCredit} />
      <MetWorkFacts image={q.image} />
      <div data-lesson-body className={`mt-3 font-semibold leading-relaxed text-slate-900 ${easyRead ? 'text-2xl' : 'text-xl'}`}>
        <BiSpan text={q.prompt} englishOnly />
        <p className="mt-2">
        {before}
        <span
          className={`mx-1 inline-block min-w-16 border-b-2 px-2 text-center ${
            locked ? (sel === q.answer ? 'border-[#0D9488] text-[#0D9488]' : 'border-[#E7C98A] text-[#9A3412]') : 'border-[#0D9488] text-[#0D9488]'
          }`}
        >
          {sel ?? '\u00a0'}
        </span>
        {after}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {bank.map((w) => (
          <button
            key={w}
            type="button"
            disabled={locked}
            aria-pressed={sel === w}
            onClick={() => setSel(w)}
            className={`min-h-12 rounded-2xl border-2 px-4 font-semibold ${presentation === 'easy' ? 'min-h-14 py-3 text-xl' : 'py-2 text-base'} ${optCls(
              locked ? (sel === w ? (w === q.answer ? 'right' : 'wrong') : 'idle') : sel === w ? 'selected' : 'idle',
              presentation === 'easy',
            )}`}
          >
            <BiSpan text={w} />
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderQ({ q, locked, easyRead, presentation = 'standard', onAnswer, onGate }: QProps<OrderQuestion>) {
  const [order, setOrder] = useState<string[] | null>(null)
  useAnswerGate(Boolean(order && order.length === q.items.length) && !locked, () => {
    if (order) onAnswer(orderMatches(order, q.items), q.explain)
  }, onGate)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OrderBoard q={q} order={order} revealed={locked} easyRead={easyRead} presentation={presentation} stage onChange={setOrder} />
    </div>
  )
}

function DualReadQ({ q, locked, easyRead, presentation = 'standard', lessonId = '', onAnswer, onGate }: QProps<DualReadQuestion>) {
  const [lines, setLines] = useState<string[]>(['', ''])
  useAnswerGate(!locked && linesReady(lines, 2), () => onAnswer(true, q.explain), onGate)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DualReadBoard
        q={q}
        lines={lines}
        revealed={locked}
        easyRead={easyRead}
        presentation={presentation}
        lessonId={lessonId}
        stage
        onChange={setLines}
      />
    </div>
  )
}

function ShortQ({ q, locked, easyRead, presentation = 'standard', lessonId = '', onAnswer, onGate }: QProps<ShortQuestion>) {
  const [lines, setLines] = useState<string[]>([''])
  useAnswerGate(!locked && linesReady(lines, 1), () => onAnswer(true, q.explain), onGate)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShortBoard
        q={q}
        line={lines[0] ?? ''}
        revealed={locked}
        easyRead={easyRead}
        presentation={presentation}
        lessonId={lessonId}
        stage
        onChange={setLines}
      />
    </div>
  )
}

function Match({ q, seed, locked, easyRead, onAnswer, onGate }: QProps<MatchQuestion>) {
  const lefts = useMemo(() => shuffle(q.pairs.map((p) => p.left), seed + 3), [q, seed])
  const rights = useMemo(() => shuffle(q.pairs.map((p) => p.right), seed + 7), [q, seed])
  const [pickL, setPickL] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<string | null>(null)
  const mistakes = useRef(0)
  useAnswerGate(matched.size === q.pairs.length && !locked, () => onAnswer(mistakes.current === 0, q.explain), onGate)

  function tapRight(r: string) {
    if (!pickL || locked) return
    const pair = q.pairs.find((p) => p.left === pickL)
    if (pair?.right === r) {
      const next = new Set(matched).add(pickL)
      setMatched(next)
      setPickL(null)
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
      <LessonCardArt image={q.image} credit={q.imageCredit} />
      <MetWorkFacts image={q.image} />
      <p data-lesson-body className={`mt-3 font-semibold leading-relaxed text-slate-900 ${easyRead ? 'text-2xl' : 'text-xl'}`}>
        <BiSpan text={q.prompt} />
      </p>
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
              className={`min-h-12 rounded-2xl border-2 px-3 py-3 text-sm font-semibold ${
                matched.has(l) ? optCls('right') + ' opacity-60' : optCls(pickL === l ? 'selected' : 'idle', easyRead)
              }`}
            >
              <BiSpan text={l} />
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
              className={`min-h-12 rounded-2xl border-2 px-3 py-3 text-sm ${
                rightMatched.has(r) ? optCls('right') + ' opacity-60' : optCls(flash === r ? 'wrong' : 'idle', easyRead)
              }`}
            >
              <BiSpan text={r} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
