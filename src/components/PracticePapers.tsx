import { Lock, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSen } from '../context/SenContext'
import { useT, type MessageKey } from '../i18n'
import { useAuth } from '../lib/auth'
import {
  DAIE_LAYERS,
  loadPaper1,
  loadPaper2,
  plateFor,
  type DaieLayer,
  type Paper2File,
  type PracticeArtwork,
  type PracticePart,
  type PracticePlate,
  type PracticeQuestion,
  type PracticeSelfCheck,
} from '../lib/practiceContent'
import {
  adoptGuestPracticeDraft,
  loadPracticeDraft,
  practiceResponseKey,
  practiceTextCount,
  savePracticeDraft,
  type PracticeDraftV1,
} from '../lib/practiceDraft'
import { isPracticeQuestionOpen } from '../lib/practiceLock'
import { validateImage } from '../lib/sbaEvidence'

/**
 * School mock practice papers (Set 3).
 * Only Question 1 is answerable. Questions 2–5 are locked "coming soon" cards.
 * Drafts stay in localStorage. This module never calls /api/feedback or any AI marker.
 */

const LAYER_KEY: Record<DaieLayer, MessageKey> = {
  D: 'practice.layer.D',
  A: 'practice.layer.A',
  I: 'practice.layer.I',
  E: 'practice.layer.E',
}

type DraftBundle = { owner: string | null; draft: PracticeDraftV1 }

function uploadLabel(key: string, t: (key: MessageKey, vars?: Record<string, string | number | null | undefined>) => string): string {
  if (key === 'artwork_image') return t('practice.upload.artwork_image')
  if (key === 'sketch_notes_image') return t('practice.upload.sketch_notes_image')
  if (key === 'artist_statement_text') return t('practice.upload.artist_statement_text')
  return key
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
            className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2"
          >
            {t('practice.source')}
          </a>
          {' · '}
          <a
            href={plate.src}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2"
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

export function PracticePapers() {
  const { t, locale } = useT()
  const { cardPadding } = useSen()
  const { ready, user } = useAuth()
  const paper1 = loadPaper1()
  const paper2 = loadPaper2()
  const [which, setWhich] = useState<'1' | '2'>('1')
  const [bundle, setBundle] = useState<DraftBundle | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const bundleRef = useRef<DraftBundle | null>(null)

  useEffect(() => {
    bundleRef.current = bundle
  }, [bundle])

  useEffect(() => {
    if (!ready) return
    const uid = user?.id ?? null
    const current = bundleRef.current
    if (current && current.owner !== uid) savePracticeDraft(current.owner, current.draft)
    const draft = uid ? adoptGuestPracticeDraft(uid) : loadPracticeDraft(null)
    const next = { owner: uid, draft }
    bundleRef.current = next
    setBundle(next)
  }, [ready, user?.id])

  useEffect(() => {
    if (!bundle) return
    const handle = window.setTimeout(() => savePracticeDraft(bundle.owner, bundle.draft), 300)
    return () => window.clearTimeout(handle)
  }, [bundle])

  useEffect(() => {
    const flush = () => {
      const current = bundleRef.current
      if (current) savePracticeDraft(current.owner, current.draft)
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  function patch(update: (draft: PracticeDraftV1) => PracticeDraftV1) {
    const current = bundleRef.current
    if (!current) return
    const next = { ...current, draft: update(current.draft) }
    bundleRef.current = next
    setBundle(next)
  }

  const openQuestions = paper1.questions.filter((q) => isPracticeQuestionOpen(q, paper1.primaryQuestionId))
  const lockedQuestions = paper1.questions.filter((q) => !isPracticeQuestionOpen(q, paper1.primaryQuestionId))
  const draft = bundle?.draft ?? null

  return (
    <div className="space-y-4" data-practice-root>
      <div>
        <p className="text-xs font-semibold text-teal-700">
          {t('practice.setLabel', { set: paper1.set, label: paper1.label })}
        </p>
        <h2 className="text-2xl font-bold text-slate-900">{t('tab.practice')}</h2>
        <p className="text-sm text-slate-500">{t('app.practice.subtitle')}</p>
      </div>

      <div
        role="note"
        data-practice-banner
        className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-950"
      >
        {paper1.examNote}
      </div>

      <div role="tablist" aria-label={t('practice.papers')} className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {(
          [
            ['1', 'practice.paper1'],
            ['2', 'practice.paper2'],
          ] as const
        ).map(([id, key]) => {
          const on = which === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`practice-tab-${id}`}
              aria-selected={on}
              aria-controls="practice-panel"
              onClick={() => setWhich(id)}
              className={
                on
                  ? 'min-h-11 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm'
                  : 'min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white/70'
              }
            >
              {t(key)}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id="practice-panel" aria-labelledby={`practice-tab-${which}`} className="space-y-4">
        {which === '1' ? (
          <PaperOne
            paperLabel={paper1.paperLabel}
            totalMarks={paper1.totalMarks}
            timeLimitMinutes={paper1.timeLimitMinutes}
            instructions={paper1.instructions}
            aiNote={paper1.aiPolicy.note}
            openQuestions={openQuestions}
            lockedQuestions={lockedQuestions}
            draft={draft}
            cardPadding={cardPadding}
            locale={locale}
            onPatch={patch}
            onOpenPaper2={() => setWhich('2')}
          />
        ) : (
          <PaperTwo
            paper2={paper2}
            lockedQuestions={lockedQuestions}
            draft={draft}
            cardPadding={cardPadding}
            locale={locale}
            uploadError={uploadError}
            onPatch={patch}
            onUploadError={setUploadError}
          />
        )}
      </div>
    </div>
  )
}

function PaperOne({
  paperLabel,
  totalMarks,
  timeLimitMinutes,
  instructions,
  aiNote,
  openQuestions,
  lockedQuestions,
  draft,
  cardPadding,
  locale,
  onPatch,
  onOpenPaper2,
}: {
  paperLabel: string
  totalMarks: number
  timeLimitMinutes: number
  instructions: string[]
  aiNote: string
  openQuestions: PracticeQuestion[]
  lockedQuestions: PracticeQuestion[]
  draft: PracticeDraftV1 | null
  cardPadding: string
  locale: 'en' | 'zh-Hant' | 'zh-Hans'
  onPatch: (update: (draft: PracticeDraftV1) => PracticeDraftV1) => void
  onOpenPaper2: () => void
}) {
  const { t } = useT()
  return (
    <div className="space-y-4">
      <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${cardPadding}`}>
        <h3 className="text-lg font-bold text-slate-900">{paperLabel}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {t('practice.total', { marks: totalMarks, minutes: timeLimitMinutes })}
        </p>
        <h4 className="mt-4 text-sm font-bold text-slate-900">{t('practice.instructions')}</h4>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          {instructions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm font-medium text-slate-800">{aiNote}</p>
      </section>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">{t('practice.questions')}</h3>
        {openQuestions.map((question) => (
          <OpenQuestion
            key={question.id}
            question={question}
            draft={draft}
            cardPadding={cardPadding}
            locale={locale}
            aiNote={aiNote}
            onPatch={onPatch}
            onOpenPaper2={onOpenPaper2}
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
  draft,
  cardPadding,
  locale,
  aiNote,
  onPatch,
  onOpenPaper2,
}: {
  question: PracticeQuestion
  draft: PracticeDraftV1 | null
  cardPadding: string
  locale: 'en' | 'zh-Hant' | 'zh-Hans'
  aiNote: string
  onPatch: (update: (draft: PracticeDraftV1) => PracticeDraftV1) => void
  onOpenPaper2: () => void
}) {
  const { t } = useT()
  const criticism = question.parts.find((part) => part.key === 'criticism')
  const creation = question.parts.find((part) => part.key === 'creation')
  const ready = draft !== null

  return (
    <article
      data-question-open={question.number}
      className={`rounded-3xl border border-teal-200 bg-white shadow-sm ${cardPadding}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-semibold text-white">
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
        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
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
            <h4 id={`practice-${question.id}-part-a`} className="text-base font-bold text-slate-900">
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

          {DAIE_LAYERS.map((layer) => {
            const items = criticism.selfCheck ? checksFor(criticism, layer) : []
            const responseKey = practiceResponseKey(layer)
            const value = draft?.responses[responseKey] ?? ''
            return (
              <div key={layer} className="rounded-2xl border border-slate-200 p-3">
                <label className="block text-sm font-semibold text-slate-900" htmlFor={`practice-${question.id}-${layer}`}>
                  {t(LAYER_KEY[layer])}
                </label>
                <textarea
                  id={`practice-${question.id}-${layer}`}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base leading-relaxed text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50"
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
                    <legend className="text-xs font-bold text-slate-500">
                      {t('practice.selfCheck')}
                    </legend>
                    {items.map((item) => (
                      <label key={item.id} className="flex min-h-11 items-start gap-3 rounded-xl bg-slate-50 px-2 py-2 text-sm text-slate-800">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                          checked={Boolean(draft?.checks[item.id])}
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
          })}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!ready}
              onClick={() => onPatch((current) => ({ ...current, revealed: !current.revealed }))}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              {draft?.revealed ? t('practice.hide') : t('practice.reveal')}
            </button>
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
              className="min-h-11 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {t('practice.submit')}
            </button>
          </div>
          <p role="status" className="text-sm text-slate-600">
            {!draft ? t('practice.loading') : draft.submittedAt ? t('practice.submitted') : t('practice.draftSaved')}
          </p>

          {draft?.revealed && criticism.markGuideSummary && (
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
                      {draft.checks[item.id] ? t('practice.checked') : t('practice.unchecked')}
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
        <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3" aria-labelledby={`practice-${question.id}-part-b`}>
          <h4 id={`practice-${question.id}-part-b`} className="text-base font-bold text-slate-900">
            {creation.label ?? t('practice.paper2')}
            {creation.marks ? ` · ${t('practice.marks', { n: creation.marks })}` : ''}
          </h4>
          {creation.prompt && <p className="mt-2 text-sm text-slate-800">{creation.prompt}</p>}
          {creation.hint && (
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">{t('practice.hint')}: </span>
              {creation.hint}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-600">{t('practice.partBNote')}</p>
          <button
            type="button"
            onClick={onOpenPaper2}
            className="mt-3 min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t('practice.openPartB')}
          </button>
          <p className="mt-3 text-xs text-slate-500">{aiNote}</p>
        </section>
      )}
    </article>
  )
}

function PaperTwo({
  paper2,
  lockedQuestions,
  draft,
  cardPadding,
  locale,
  uploadError,
  onPatch,
  onUploadError,
}: {
  paper2: Paper2File
  lockedQuestions: PracticeQuestion[]
  draft: PracticeDraftV1 | null
  cardPadding: string
  locale: 'en' | 'zh-Hant' | 'zh-Hans'
  uploadError: string | null
  onPatch: (update: (draft: PracticeDraftV1) => PracticeDraftV1) => void
  onUploadError: (message: string | null) => void
}) {
  const { t } = useT()
  const ready = draft !== null
  const statement = draft?.statement ?? ''

  return (
    <div className="space-y-4">
      <section className={`space-y-4 rounded-3xl border border-teal-200 bg-white shadow-sm ${cardPadding}`} data-paper2-open>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-semibold text-white">{t('practice.qOpen')}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{t('practice.noAi')}</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{paper2.title}</h3>
        <p className="text-sm text-slate-600">
          {t('practice.total', { marks: paper2.marks, minutes: paper2.timeBoxMinutes })}
        </p>
        <p className="text-sm font-semibold text-slate-900">
          {t('practice.theme')}: {paper2.themeTitle}
        </p>
        <p className="text-sm leading-relaxed text-slate-800">{paper2.themePrompt}</p>

        <div>
          <h4 className="text-sm font-bold text-slate-900">{t('practice.constraints')}</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {paper2.mediaConstraints.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <Plates artworks={paper2.referenceArtworks} questionNumber={1} />

        <fieldset className="space-y-2" disabled={!ready}>
          <legend className="text-sm font-bold text-slate-900">{t('practice.checklist')}</legend>
          {paper2.checklist.map((item) => (
            <label key={item.id} className="flex min-h-11 items-start gap-3 rounded-xl bg-slate-50 px-2 py-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                checked={Boolean(draft?.paper2Checks[item.id])}
                onChange={(event) => {
                  const on = event.target.checked
                  onPatch((current) => ({
                    ...current,
                    paper2Checks: { ...current.paper2Checks, [item.id]: on },
                  }))
                }}
              />
              <span>{item.text}</span>
            </label>
          ))}
        </fieldset>

        <label className="block text-sm font-semibold text-slate-900" htmlFor="practice-artist-statement">
          {t('practice.statement')}
          <span className="mt-1 block text-xs font-normal text-slate-500">{t('practice.statementHint')}</span>
          <textarea
            id="practice-artist-statement"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base leading-relaxed text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50"
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

        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900">{t('practice.uploads')}</h4>
          <p className="text-sm leading-relaxed text-slate-600">{t('practice.upload.note')}</p>
          <ul className="space-y-3">
            {paper2.uploadKeys.map((key) => (
              <li key={key} className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-3">
                <p className="text-sm font-semibold text-teal-950">{uploadLabel(key, t)}</p>
                {key === 'artist_statement_text' ? (
                  <p className="mt-1 text-xs text-teal-900">{t('practice.upload.statementSlot')}</p>
                ) : key === 'artwork_image' || key === 'sketch_notes_image' ? (
                  <div className="mt-2">
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-900">
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
                    {draft?.uploadNames[key] && (
                      <p className="mt-2 text-xs text-teal-900">{t('practice.upload.chosen', { name: draft.uploadNames[key] })}</p>
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

        <p className="text-sm text-slate-600">{paper2.aiPolicy.note}</p>
        <p role="status" className="text-sm text-slate-600">
          {draft ? t('practice.draftSaved') : t('practice.loading')}
        </p>
      </section>

      {lockedQuestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">{t('practice.questions')}</h3>
          {lockedQuestions.map((question) => (
            <LockedQuestion key={question.id} question={question} />
          ))}
        </div>
      )}
    </div>
  )
}
