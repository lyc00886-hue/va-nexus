import { Lock, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSen } from '../context/SenContext'
import { useT, type MessageKey } from '../i18n'
import { InspectPractice } from './InspectPractice'
import { useAuth } from '../lib/auth'
import {
  DAIE_LAYERS,
  loadDesignPaper,
  loadPaintPaper,
  plateFor,
  type DaieLayer,
  type PracticeArtwork,
  type PracticePaperFile,
  type PracticePart,
  type PracticePlate,
  type PracticeQuestion,
  type PracticeSelfCheck,
} from '../lib/practiceContent'
import {
  DESIGN_PAPER_ID,
  emptyQuestionDraft,
  loadPracticeDraft,
  PAINT_PAPER_ID,
  PRACTICE_DRAFT_EVENT,
  practiceResponseKey,
  practiceTextCount,
  questionDraft,
  savePracticeDraft,
  type PracticeDraftV2,
  type PracticeQuestionDraft,
} from '../lib/practiceDraft'
import { INSPECT_OPEN_EVENT, isInspectGrade, peekInspectOpen, type InspectGrade } from '../lib/inspectPractice'
import { isPracticeQuestionOpen } from '../lib/practiceLock'
import { validateImage } from '../lib/sbaEvidence'

/**
 * School mock practice papers.
 * Painting and design are separate papers. Each question keeps Part A criticism
 * and Part B creation on that same paper. Only Question 1 can be answered.
 * Drafts stay in localStorage, one record per paper. This module never calls an AI marker.
 */

const LAYER_KEY: Record<DaieLayer, MessageKey> = {
  D: 'practice.layer.D',
  A: 'practice.layer.A',
  I: 'practice.layer.I',
  E: 'practice.layer.E',
}

const TABS = [
  { id: 'paint' as const, paperId: PAINT_PAPER_ID, label: 'practice.paperPaint' as const, short: 'practice.paperPaintShort' as const },
  { id: 'design' as const, paperId: DESIGN_PAPER_ID, label: 'practice.paperDesign' as const, short: null },
]

type PaperTab = (typeof TABS)[number]['id']
type DraftBundle = { owner: string | null; papers: Record<string, PracticeDraftV2> }

function uploadLabel(key: string, t: (key: MessageKey, vars?: Record<string, string | number | null | undefined>) => string): string {
  if (key === 'artwork_image') return t('practice.upload.artwork_image')
  if (key === 'sketch_notes_image') return t('practice.upload.sketch_notes_image')
  if (key === 'artist_statement_text') return t('practice.upload.artist_statement_text')
  return key
}

function loadBundle(owner: string | null): DraftBundle {
  return {
    owner,
    papers: {
      [PAINT_PAPER_ID]: loadPracticeDraft(owner, PAINT_PAPER_ID),
      [DESIGN_PAPER_ID]: loadPracticeDraft(owner, DESIGN_PAPER_ID),
    },
  }
}

function saveBundle(bundle: DraftBundle) {
  for (const draft of Object.values(bundle.papers)) savePracticeDraft(bundle.owner, draft)
}

function ArtworkFigure({
  art,
  plate,
  label,
  eager,
}: {
  art: PracticeArtwork
  plate: PracticePlate
  label: string
  eager?: boolean
}) {
  const { t } = useT()
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white" data-artwork-plate={art.id}>
      <div className="flex justify-center bg-slate-100">
        <img
          src={plate.src}
          alt={`${art.title} — ${art.artist}`}
          width={plate.width}
          height={plate.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="h-auto max-h-[70vh] w-auto max-w-full object-contain"
        />
      </div>
      <figcaption className="space-y-1 px-3 py-3 text-xs leading-relaxed text-slate-700">
        <p className="text-sm font-semibold text-slate-900">
          {label} {art.title}
        </p>
        <p>
          {art.artist}
          {art.year ? ` · ${art.year}` : ''}
        </p>
        {(art.medium || art.dims) && (
          <p>
            {art.medium}
            {art.medium && art.dims ? ' · ' : ''}
            {art.dims}
          </p>
        )}
        {art.museum && <p>{art.museum}</p>}
        <p>
          <span className="font-semibold text-slate-900">{t('practice.credit')}: </span>
          {art.credit}
        </p>
        <p>
          <span className="font-semibold text-slate-900">{t('practice.license')}: </span>
          {art.license}
        </p>
        <p>
          <a
            href={art.source_url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#0D9488] underline decoration-teal-300 underline-offset-2"
          >
            {t('practice.source')}
          </a>
          {' · '}
          <a
            href={plate.src}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#0D9488] underline decoration-teal-300 underline-offset-2"
          >
            {t('practice.viewFull')}
          </a>
        </p>
      </figcaption>
    </figure>
  )
}

function Plates({ artworks, questionNumber }: { artworks: PracticeArtwork[]; questionNumber: number }) {
  const { t } = useT()
  const plates = artworks
    .map((art, index) => {
      const plate = plateFor(art)
      if (!plate) return null
      const letter = String.fromCharCode(97 + index)
      return { art, plate, label: `(${questionNumber}${letter})` }
    })
    .filter((item): item is { art: PracticeArtwork; plate: PracticePlate; label: string } => item !== null)
  if (plates.length === 0) return null
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-900">{t('practice.plates')}</h4>
      <div className="grid gap-4">
        {plates.map((item, index) => (
          <ArtworkFigure key={item.art.id} art={item.art} plate={item.plate} label={item.label} eager={index === 0} />
        ))}
      </div>
    </div>
  )
}

function LockedQuestion({ question }: { question: PracticeQuestion }) {
  const { t } = useT()
  const titleId = `practice-q-${question.id}-title`
  const lockId = `practice-q-${question.id}-lock`
  return (
    <article
      aria-labelledby={titleId}
      aria-describedby={lockId}
      data-practice-locked={question.number}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="text-base font-bold text-slate-800">
              {question.title}
            </h3>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {t('practice.comingSoon')}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold">{t('practice.theme')}: </span>
            {question.theme}
          </p>
          <p id={lockId} className="mt-2 text-sm text-slate-500">
            {t('practice.locked')}
          </p>
        </div>
      </div>
    </article>
  )
}

function checksFor(part: PracticePart, layer: DaieLayer): PracticeSelfCheck[] {
  return (part.selfCheck ?? []).filter((item) => item.layer === layer)
}

function isTextStub(part: PracticePart): boolean {
  return !part.selfCheck?.length && !part.framework
}

export function PracticePapers() {
  const { t, locale } = useT()
  const { cardPadding } = useSen()
  const { ready, user } = useAuth()
  const paint = loadPaintPaper()
  const design = loadDesignPaper()
  const papers: Record<string, PracticePaperFile> = {
    [PAINT_PAPER_ID]: paint,
    [DESIGN_PAPER_ID]: design,
  }
  const [which, setWhich] = useState<PaperTab>('paint')
  const [group, setGroup] = useState<'inspect' | 'papers'>('inspect')
  const [inspectGrade, setInspectGrade] = useState<InspectGrade>(() => peekInspectOpen() ?? 'f4')
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 359px)').matches,
  )
  const [bundle, setBundle] = useState<DraftBundle | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const bundleRef = useRef<DraftBundle | null>(null)
  const active = TABS.find((tab) => tab.id === which) ?? TABS[0]
  const paper = papers[active.paperId]

  useEffect(() => {
    bundleRef.current = bundle
  }, [bundle])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const grade = (event as CustomEvent<unknown>).detail
      if (isInspectGrade(grade)) setInspectGrade(grade)
      setGroup('inspect')
    }
    window.addEventListener(INSPECT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(INSPECT_OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 359px)')
    const apply = () => setNarrow(query.matches)
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!ready) return
    const uid = user?.id ?? null
    const current = bundleRef.current
    if (current && current.owner !== uid) saveBundle(current)
    const next = loadBundle(uid)
    bundleRef.current = next
    setBundle(next)
  }, [ready, user?.id])

  useEffect(() => {
    if (!bundle) return
    const handle = window.setTimeout(() => saveBundle(bundle), 300)
    return () => window.clearTimeout(handle)
  }, [bundle])

  useEffect(() => {
    const flush = () => {
      const current = bundleRef.current
      if (current) saveBundle(current)
    }
    const reload = () => {
      const uid = user?.id ?? null
      const next = loadBundle(uid)
      bundleRef.current = next
      setBundle(next)
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener(PRACTICE_DRAFT_EVENT, reload)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener(PRACTICE_DRAFT_EVENT, reload)
    }
  }, [user?.id])

  function patchQuestion(paperId: string, questionId: string, update: (draft: PracticeQuestionDraft) => PracticeQuestionDraft) {
    const current = bundleRef.current
    if (!current) return
    const stored = current.papers[paperId]
    if (!stored) return
    const slot = stored.questions[questionId] ?? emptyQuestionDraft()
    const nextPaper: PracticeDraftV2 = {
      ...stored,
      questions: { ...stored.questions, [questionId]: update(slot) },
    }
    const next = { ...current, papers: { ...current.papers, [paperId]: nextPaper } }
    bundleRef.current = next
    setBundle(next)
  }

  const paperDraft = bundle?.papers[paper.id] ?? null

  return (
    <div className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-6" data-practice-root data-soft-motion="off">
      {group === 'inspect' ? (
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('inspect.practice.title')}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('inspect.practice.intro')}</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-[#0D9488]">
            {t('practice.setLabel', { set: paper.set, label: paper.label })}
          </p>
          <h2 className="text-2xl font-bold text-slate-900">{t('tab.practice')}</h2>
          <p className="text-sm text-slate-500">{t('app.practice.subtitle')}</p>
        </div>
      )}

      {group === 'papers' ? (
        <div
          role="note"
          data-practice-banner
          className="rounded-2xl border border-[#0D9488]/40 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-slate-800"
        >
          {paper.examNote}
        </div>
      ) : null}

      <div role="tablist" aria-label={t('practice.papers')} className="flex flex-wrap gap-2">
        <button
          type="button"
          role="tab"
          id="practice-tab-inspect"
          aria-selected={group === 'inspect'}
          aria-controls="practice-panel"
          onClick={() => setGroup('inspect')}
          className={
            group === 'inspect'
              ? 'min-h-11 rounded-full bg-[#0D9488] px-3 py-2 text-sm font-semibold leading-snug text-white shadow-sm'
              : 'min-h-11 rounded-full bg-white px-3 py-2 text-sm font-semibold leading-snug text-[#0D9488] ring-1 ring-[#0D9488] hover:bg-teal-50'
          }
        >
          {t('inspect.practice.label')}
        </button>
        {TABS.map((tab) => {
          const on = group === 'papers' && which === tab.id
          const full = t(tab.label)
          const label = tab.short && narrow ? t(tab.short) : full
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`practice-tab-${tab.id}`}
              aria-selected={on}
              aria-controls="practice-panel"
              onClick={() => {
                setGroup('papers')
                setWhich(tab.id)
                setUploadError(null)
                document.querySelector('[data-practice-root]')?.scrollIntoView({ block: 'start' })
              }}
              className={
                on
                  ? 'min-h-11 rounded-full bg-[#0D9488] px-3 py-2 text-sm font-semibold leading-snug text-white shadow-sm'
                  : 'min-h-11 rounded-full bg-white px-3 py-2 text-sm font-semibold leading-snug text-[#0D9488] ring-1 ring-[#0D9488] hover:bg-teal-50'
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id="practice-panel" aria-labelledby={group === 'inspect' ? 'practice-tab-inspect' : `practice-tab-${which}`} className="space-y-4">
        {group === 'inspect' ? (
          <InspectPractice key={inspectGrade} initialGrade={inspectGrade} />
        ) : (
        <PaperPanel
          paper={paper}
          draft={paperDraft}
          cardPadding={cardPadding}
          locale={locale}
          uploadError={uploadError}
          onPatch={(questionId, update) => patchQuestion(paper.id, questionId, update)}
          onUploadError={setUploadError}
        />
        )}
      </div>
    </div>
  )
}

function PaperPanel({
  paper,
  draft,
  cardPadding,
  locale,
  uploadError,
  onPatch,
  onUploadError,
}: {
  paper: PracticePaperFile
  draft: PracticeDraftV2 | null
  cardPadding: string
  locale: 'en' | 'zh-Hant' | 'zh-Hans'
  uploadError: string | null
  onPatch: (questionId: string, update: (draft: PracticeQuestionDraft) => PracticeQuestionDraft) => void
  onUploadError: (message: string | null) => void
}) {
  const { t } = useT()
  const openQuestions = paper.questions.filter((q) => isPracticeQuestionOpen(q, paper.primaryQuestionId))
  const lockedQuestions = paper.questions.filter((q) => !isPracticeQuestionOpen(q, paper.primaryQuestionId))
  return (
    <div className="space-y-4">
      {paper.id === DESIGN_PAPER_ID && (
        <div
          role="note"
          data-practice-design-stub
          className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-950"
        >
          {t('practice.designStubNote')}
        </div>
      )}
      <section className={`rounded-3xl border border-[#0D9488]/30 bg-white shadow-sm ${cardPadding}`}>
        <h3 className="text-lg font-bold text-slate-900">{paper.paperLabel}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {t('practice.total', { marks: paper.totalMarks, minutes: paper.timeLimitMinutes })}
        </p>
        <h4 className="mt-4 text-sm font-bold text-slate-900">{t('practice.instructions')}</h4>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          {paper.instructions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm font-medium text-slate-800">{paper.aiPolicy.note}</p>
      </section>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">{t('practice.questions')}</h3>
        {openQuestions.map((question) => (
          <OpenQuestion
            key={question.id}
            question={question}
            slot={draft ? questionDraft(draft, question.id) : null}
            cardPadding={cardPadding}
            locale={locale}
            aiNote={paper.aiPolicy.note}
            uploadError={uploadError}
            onPatch={(update) => onPatch(question.id, update)}
            onUploadError={onUploadError}
          />
        ))}
        {lockedQuestions.map((question) => (
          <LockedQuestion key={question.id} question={question} />
        ))}
      </div>
    </div>
  )
}

function OpenQuestion({
  question,
  slot,
  cardPadding,
  locale,
  aiNote,
  uploadError,
  onPatch,
  onUploadError,
}: {
  question: PracticeQuestion
  slot: PracticeQuestionDraft | null
  cardPadding: string
  locale: 'en' | 'zh-Hant' | 'zh-Hans'
  aiNote: string
  uploadError: string | null
  onPatch: (update: (draft: PracticeQuestionDraft) => PracticeQuestionDraft) => void
  onUploadError: (message: string | null) => void
}) {
  const { t } = useT()
  const criticism = question.parts.find((part) => part.key === 'criticism')
  const creation = question.parts.find((part) => part.key === 'creation')
  const ready = slot !== null
  const textStub = criticism ? isTextStub(criticism) : false
  const textKey = practiceResponseKey('text')
  const textValue = slot?.responses[textKey] ?? ''

  function openPartB() {
    const node = document.querySelector<HTMLElement>(`[data-part-b-open="${question.id}"]`)
    if (!node) return
    node.scrollIntoView({ block: 'start' })
    node.focus()
  }

  return (
    <article
      data-question-open={question.number}
      className={`rounded-3xl border border-[#0D9488]/40 bg-white shadow-sm ${cardPadding}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#0D9488] px-2.5 py-0.5 text-xs font-semibold text-white">
          {t('practice.qOpen')}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {t('practice.noAi')}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-900">{question.title}</h3>
      <p className="mt-1 text-sm text-slate-700">
        <span className="font-semibold">{t('practice.theme')}: </span>
        {question.theme}
      </p>
      {question.compareFocus && (
        <p className="mt-3 rounded-2xl bg-[#FFF9E9] px-3 py-2 text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">{t('practice.compare')}: </span>
          {question.compareFocus}
        </p>
      )}

      <div className="mt-4">
        <Plates artworks={question.artworks} questionNumber={question.number} />
      </div>

      {criticism && (
        <section className="mt-5 space-y-4" aria-labelledby={`practice-${question.id}-part-a`}>
          <div>
            <h4 id={`practice-${question.id}-part-a`} className="text-base font-bold text-[#0D9488]">
              {criticism.label ?? t('practice.partA')}
              {criticism.marks ? ` · ${t('practice.marks', { n: criticism.marks })}` : ''}
            </h4>
            {criticism.timeLimitMinutes ? (
              <p className="text-xs text-slate-500">{t('practice.minutes', { n: criticism.timeLimitMinutes })}</p>
            ) : null}
            {criticism.prompt && <p className="mt-2 text-sm leading-relaxed text-slate-800">{criticism.prompt}</p>}
            {criticism.framework && (
              <p className="mt-1 text-xs font-medium text-slate-600">
                {t('practice.framework')}: {criticism.framework}
              </p>
            )}
          </div>

          {textStub ? (
            <div className="rounded-2xl border border-slate-200 p-3">
              <textarea
                id={`practice-${question.id}-text`}
                aria-labelledby={`practice-${question.id}-part-a`}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base leading-relaxed text-slate-900 shadow-sm focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50"
                rows={6}
                maxLength={4000}
                disabled={!ready}
                value={textValue}
                placeholder={t('practice.responsePh')}
                onChange={(event) => {
                  const next = event.target.value
                  onPatch((current) => ({
                    ...current,
                    responses: { ...current.responses, [textKey]: next },
                  }))
                }}
              />
              <p className="mt-1 text-xs text-slate-500">{t('practice.count', { n: practiceTextCount(textValue, locale) })}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{t('practice.notAiMarking')}</p>
            </div>
          ) : (
            DAIE_LAYERS.map((layer) => {
              const items = criticism.selfCheck ? checksFor(criticism, layer) : []
              const responseKey = practiceResponseKey(layer)
              const value = slot?.responses[responseKey] ?? ''
              return (
                <div key={layer} className="rounded-2xl border border-slate-200 p-3">
                  <label className="block text-sm font-semibold text-slate-900" htmlFor={`practice-${question.id}-${layer}`}>
                    {t(LAYER_KEY[layer])}
                  </label>
                  <textarea
                    id={`practice-${question.id}-${layer}`}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base leading-relaxed text-slate-900 shadow-sm focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50"
                    rows={5}
                    maxLength={4000}
                    disabled={!ready}
                    value={value}
                    placeholder={t('practice.responsePh')}
                    onChange={(event) => {
                      const next = event.target.value
                      onPatch((current) => ({
                        ...current,
                        responses: { ...current.responses, [responseKey]: next },
                      }))
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {t('practice.count', { n: practiceTextCount(value, locale) })}
                  </p>
                  {items.length > 0 && (
                    <fieldset className="mt-3 space-y-2" disabled={!ready}>
                      <legend className="text-xs font-bold text-slate-500">{t('practice.selfCheck')}</legend>
                      {items.map((item) => (
                        <label key={item.id} className="flex min-h-11 items-start gap-3 rounded-xl bg-[#FFF9E9] px-2 py-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            className="mt-1 h-5 w-5 shrink-0 accent-[#0D9488]"
                            checked={Boolean(slot?.checks[item.id])}
                            onChange={(event) => {
                              const on = event.target.checked
                              onPatch((current) => ({
                                ...current,
                                checks: { ...current.checks, [item.id]: on },
                              }))
                            }}
                          />
                          <span>{item.text}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </div>
              )
            })
          )}

          <div className="flex flex-wrap gap-2">
            {!textStub && (
              <button
                type="button"
                disabled={!ready}
                onClick={() => onPatch((current) => ({ ...current, revealed: !current.revealed }))}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                {slot?.revealed ? t('practice.hide') : t('practice.reveal')}
              </button>
            )}
            <button
              type="button"
              disabled={!ready}
              onClick={() =>
                onPatch((current) => ({
                  ...current,
                  revealed: true,
                  submittedAt: new Date().toISOString(),
                }))
              }
              className="min-h-11 rounded-xl bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {t('practice.submit')}
            </button>
          </div>
          <p role="status" className="text-sm text-slate-600">
            {!slot ? t('practice.loading') : slot.submittedAt ? t('practice.submitted') : t('practice.draftSaved')}
          </p>

          {slot?.revealed && criticism.markGuideSummary && (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <h5 className="text-sm font-bold text-amber-950">{t('practice.markGuide')}</h5>
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950">
                {criticism.markGuideSummary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <h5 className="text-sm font-bold text-amber-950">{t('practice.selfReview')}</h5>
              <ul className="space-y-1.5 text-sm text-amber-950">
                {(criticism.selfCheck ?? []).map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold">
                      {slot.checks[item.id] ? t('practice.checked') : t('practice.unchecked')}
                      {': '}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-medium text-amber-950">{t('practice.notAiMarking')}</p>
            </div>
          )}
        </section>
      )}

      {creation && (
        <>
          <div className="mt-5 space-y-3">
            <p className="text-sm text-slate-600">{t('practice.partBNote')}</p>
            <button
              type="button"
              onClick={openPartB}
              className="min-h-11 w-full rounded-xl bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {t('practice.openPartB')}
            </button>
          </div>
          <PartB
            questionId={question.id}
            creation={creation}
            slot={slot}
            ready={ready}
            locale={locale}
            aiNote={aiNote}
            uploadError={uploadError}
            onPatch={onPatch}
            onUploadError={onUploadError}
          />
        </>
      )}
    </article>
  )
}

function PartB({
  questionId,
  creation,
  slot,
  ready,
  locale,
  aiNote,
  uploadError,
  onPatch,
  onUploadError,
}: {
  questionId: string
  creation: PracticePart
  slot: PracticeQuestionDraft | null
  ready: boolean
  locale: 'en' | 'zh-Hant' | 'zh-Hans'
  aiNote: string
  uploadError: string | null
  onPatch: (update: (draft: PracticeQuestionDraft) => PracticeQuestionDraft) => void
  onUploadError: (message: string | null) => void
}) {
  const { t } = useT()
  const statement = slot?.statement ?? ''
  const brief = creation.themePrompt || creation.prompt
  const minutes = creation.timeBoxMinutes ?? creation.timeLimitMinutes

  return (
    <section
      id={`practice-${questionId}-part-b`}
      tabIndex={-1}
      data-part-b-open={questionId}
      aria-labelledby={`practice-${questionId}-part-b-title`}
      className="mt-5 scroll-mt-4 space-y-4 rounded-3xl border border-[#0D9488]/40 bg-white p-3 outline-none"
    >
      <div>
        <h4 id={`practice-${questionId}-part-b-title`} className="text-base font-bold text-[#0D9488]">
          {creation.label ?? t('practice.partB')}
          {creation.marks ? ` · ${t('practice.marks', { n: creation.marks })}` : ''}
        </h4>
        {minutes ? <p className="text-xs text-slate-500">{t('practice.minutes', { n: minutes })}</p> : null}
      </div>
      {creation.theme && (
        <p className="text-sm font-semibold text-slate-900">
          {t('practice.theme')}: {creation.theme}
        </p>
      )}
      {brief && <p className="text-sm leading-relaxed text-slate-800">{brief}</p>}
      {creation.hint && (
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{t('practice.hint')}: </span>
          {creation.hint}
        </p>
      )}
      {creation.mediaConstraints && creation.mediaConstraints.length > 0 && (
        <div>
          <h5 className="text-sm font-bold text-slate-900">{t('practice.constraints')}</h5>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {creation.mediaConstraints.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {creation.checklist && creation.checklist.length > 0 && (
        <fieldset className="space-y-2" disabled={!ready}>
          <legend className="text-sm font-bold text-slate-900">{t('practice.checklist')}</legend>
          {creation.checklist.map((item) => (
            <label key={item.id} className="flex min-h-11 items-start gap-3 rounded-xl bg-[#FFF9E9] px-2 py-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-[#0D9488]"
                checked={Boolean(slot?.partBChecks[item.id])}
                onChange={(event) => {
                  const on = event.target.checked
                  onPatch((current) => ({
                    ...current,
                    partBChecks: { ...current.partBChecks, [item.id]: on },
                  }))
                }}
              />
              <span>{item.text}</span>
            </label>
          ))}
        </fieldset>
      )}
      <label className="block text-sm font-semibold text-slate-900" htmlFor={`practice-${questionId}-statement`}>
        {t('practice.statement')}
        <span className="mt-1 block text-xs font-normal text-slate-500">{t('practice.statementHint')}</span>
        <textarea
          id={`practice-${questionId}-statement`}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base leading-relaxed text-slate-900 shadow-sm focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50"
          rows={4}
          maxLength={1200}
          disabled={!ready}
          value={statement}
          placeholder={t('practice.statementPh')}
          onChange={(event) => {
            const next = event.target.value
            onPatch((current) => ({ ...current, statement: next }))
          }}
        />
      </label>
      <p className="text-xs text-slate-500">{t('practice.count', { n: practiceTextCount(statement, locale) })}</p>
      {creation.uploadKeys && creation.uploadKeys.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-bold text-slate-900">{t('practice.uploads')}</h5>
          <p className="text-sm leading-relaxed text-slate-600">{t('practice.upload.note')}</p>
          <ul className="space-y-3">
            {creation.uploadKeys.map((key) => (
              <li key={key} className="rounded-2xl border border-dashed border-[#0D9488]/40 bg-[#e7f7f5] p-3">
                <p className="text-sm font-semibold text-teal-950">{uploadLabel(key, t)}</p>
                {key === 'artist_statement_text' ? (
                  <p className="mt-1 text-xs text-teal-900">{t('practice.upload.statementSlot')}</p>
                ) : key === 'artwork_image' || key === 'sketch_notes_image' ? (
                  <div className="mt-2">
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#0D9488]/50 bg-white px-4 py-2 text-sm font-semibold text-teal-900">
                      <Upload className="h-4 w-4" aria-hidden />
                      {t('practice.upload.pick')}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={!ready}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          if (!file) return
                          const err = validateImage(file)
                          if (err) {
                            onUploadError(err)
                            return
                          }
                          onUploadError(null)
                          onPatch((current) => ({
                            ...current,
                            uploadNames: { ...current.uploadNames, [key]: file.name },
                          }))
                        }}
                      />
                    </label>
                    {slot?.uploadNames[key] && (
                      <p className="mt-2 text-xs text-teal-900">{t('practice.upload.chosen', { name: slot.uploadNames[key] })}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">{t('practice.comingSoon')}</p>
                )}
              </li>
            ))}
          </ul>
          {uploadError && (
            <p role="alert" className="text-sm text-rose-700">
              {uploadError}
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-slate-600">{aiNote}</p>
    </section>
  )
}
