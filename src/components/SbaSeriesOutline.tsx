import type { ReactNode } from 'react'
import { contentJson } from '../i18n/content'
import type { SlotId } from '../lib/sbaArtworkSlots'
import {
  fillProgressionPrompt,
  isOutlinePieceStatus,
  isRwbStepKey,
  type OutlinePieceStatus,
  type OutlinePieceType,
  type OutlineState,
  type PieceTextKey,
  type PortfolioKey,
  type RwbStepKey,
} from '../lib/sbaSeriesOutline'

type OutlineCopy = {
  labels: {
    portfolio: string
    researchWorkbook: string
    pieces: string
    typeArtwork: string
    typeCriticalStudy: string
    typeUnset: string
    statusNotStarted: string
    statusInProgress: string
    statusDraftDone: string
    statusFinal: string
    pieceShort: Record<string, string>
  }
  portfolio: {
    themeTitle: { label: string }
    themeWhy: { label: string }
    keywords: { label: string }
    plannedArc: { label: string; hint: string }
    atLeastOneArtworkReminder: string
  }
  pieceFieldLabels: Record<PieceTextKey | 'type' | 'status', string>
  rwbOutline: {
    intro: string
    sections: { stepKey: string; stepRef: number; title: string; prompts: string[] }[]
  }
  perPieceChecklist: { intro: string; items: { id: string; label: string }[] }
  progressionNote: { hint: string; promptTemplate: string; piece1Note: string }
}

const FIELD =
  'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-200'

const TYPES = [
  ['unset', 'typeUnset'],
  ['artwork', 'typeArtwork'],
  ['criticalStudy', 'typeCriticalStudy'],
] as const

const STATUSES = [
  ['notStarted', 'statusNotStarted'],
  ['inProgress', 'statusInProgress'],
  ['draftDone', 'statusDraftDone'],
  ['final', 'statusFinal'],
] as const

type Props = {
  active: SlotId
  state: OutlineState
  onPortfolio: (key: PortfolioKey, value: string) => void
  onPieceText: (slot: SlotId, key: PieceTextKey, value: string) => void
  onPieceType: (slot: SlotId, type: OutlinePieceType) => void
  onPieceStatus: (slot: SlotId, status: OutlinePieceStatus) => void
  onRwb: (step: RwbStepKey, index: number, value: string) => void
  onToggleCheck: (slot: SlotId, itemId: string) => void
  children?: ReactNode
}

export function SbaSeriesOutline({
  active,
  state,
  onPortfolio,
  onPieceText,
  onPieceType,
  onPieceStatus,
  onRwb,
  onToggleCheck,
  children,
}: Props) {
  const copy = contentJson<OutlineCopy>('sba-series-outline')
  const piece = state.pieces[active]
  const short = copy.labels.pieceShort[String(active)] ?? String(active)
  const hasArtwork = ([1, 2, 3, 4] as const).some((id) => state.pieces[id].type === 'artwork')

  return (
    <div className="space-y-4" data-testid="sba-series-outline">
      <section
        data-testid="sba-outline-portfolio"
        data-scope="portfolio"
        aria-labelledby="sba-outline-portfolio-title"
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
      >
        <h3 id="sba-outline-portfolio-title" className="text-base font-bold text-slate-900">
          {copy.labels.portfolio}
        </h3>
        <div className="mt-3 space-y-3">
          <Field label={copy.portfolio.themeTitle.label} testId="sba-outline-theme-title">
            <input
              className={FIELD}
              value={state.portfolio.themeTitle}
              autoComplete="off"
              onChange={(event) => onPortfolio('themeTitle', event.target.value)}
            />
          </Field>
          <Field label={copy.portfolio.themeWhy.label} testId="sba-outline-theme-why">
            <textarea
              className={FIELD}
              rows={2}
              value={state.portfolio.themeWhy}
              onChange={(event) => onPortfolio('themeWhy', event.target.value)}
            />
          </Field>
          <Field label={copy.portfolio.keywords.label} testId="sba-outline-keywords">
            <input
              className={FIELD}
              value={state.portfolio.keywords}
              autoComplete="off"
              onChange={(event) => onPortfolio('keywords', event.target.value)}
            />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">{copy.portfolio.plannedArc.label}</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.portfolio.plannedArc.hint}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([1, 2, 3, 4] as const).map((n) => {
                const key = `arc${n}` as const
                return (
                  <Field key={key} label={copy.labels.pieceShort[String(n)] ?? String(n)} testId={`sba-outline-arc-${n}`}>
                    <input
                      className={FIELD}
                      value={state.portfolio[key]}
                      autoComplete="off"
                      onChange={(event) => onPortfolio(key, event.target.value)}
                    />
                  </Field>
                )
              })}
            </div>
          </fieldset>
          <p
            data-testid="sba-outline-artwork-reminder"
            data-has-artwork={hasArtwork ? 'true' : 'false'}
            className={`rounded-xl px-3 py-2 text-sm ${
              hasArtwork ? 'bg-white text-slate-600' : 'bg-amber-50 text-amber-950'
            }`}
          >
            {copy.portfolio.atLeastOneArtworkReminder}
          </p>
        </div>
      </section>

      {children}

      <section
        data-testid="sba-outline-piece"
        data-scope="piece"
        data-active-piece={active}
        aria-labelledby="sba-outline-piece-title"
        className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
      >
        <h3 id="sba-outline-piece-title" className="text-base font-bold text-slate-900">
          {copy.labels.pieces}
        </h3>
        <p className="mt-1 text-sm font-semibold text-teal-900" data-testid="sba-outline-piece-short">
          {short}
        </p>
        <div className="mt-3 space-y-3">
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">{copy.pieceFieldLabels.type}</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TYPES.map(([value, labelKey]) => {
                const on = piece.type === value
                return (
                  <label
                    key={value}
                    data-testid={`sba-outline-type-${value}`}
                    data-selected={on ? 'true' : 'false'}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-800 ${
                      on ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`sba-outline-type-${active}`}
                      value={value}
                      checked={on}
                      onChange={() => onPieceType(active, value)}
                    />
                    {copy.labels[labelKey]}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <Field label={copy.pieceFieldLabels.workingTitle} testId="sba-outline-working-title">
            <input
              className={FIELD}
              value={piece.workingTitle}
              autoComplete="off"
              onChange={(event) => onPieceText(active, 'workingTitle', event.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={copy.pieceFieldLabels.media} testId="sba-outline-media">
              <input
                className={FIELD}
                value={piece.media}
                autoComplete="off"
                onChange={(event) => onPieceText(active, 'media', event.target.value)}
              />
            </Field>
            <Field label={copy.pieceFieldLabels.size} testId="sba-outline-size">
              <input
                className={FIELD}
                value={piece.size}
                autoComplete="off"
                onChange={(event) => onPieceText(active, 'size', event.target.value)}
              />
            </Field>
          </div>
          <Field label={copy.pieceFieldLabels.linkToTheme} testId="sba-outline-link">
            <textarea
              className={FIELD}
              rows={2}
              value={piece.linkToTheme}
              onChange={(event) => onPieceText(active, 'linkToTheme', event.target.value)}
            />
          </Field>
          <label className="block text-sm font-medium text-slate-800" data-testid="sba-outline-status">
            {copy.pieceFieldLabels.status}
            <select
              className={FIELD}
              value={piece.status}
              onChange={(event) => {
                if (isOutlinePieceStatus(event.target.value)) onPieceStatus(active, event.target.value)
              }}
            >
              {STATUSES.map(([value, labelKey]) => (
                <option key={value} value={value}>
                  {copy.labels[labelKey]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-800" data-testid="sba-outline-progression">
            {copy.pieceFieldLabels.progressionFromPrev}
            <span className="mt-0.5 block text-xs font-normal leading-relaxed text-slate-500">
              {active === 1 ? copy.progressionNote.piece1Note : copy.progressionNote.hint}
            </span>
            <textarea
              className={FIELD}
              rows={2}
              aria-required={active > 1}
              placeholder={active > 1 ? fillProgressionPrompt(copy.progressionNote.promptTemplate, active) : undefined}
              value={piece.progressionFromPrev}
              onChange={(event) => onPieceText(active, 'progressionFromPrev', event.target.value)}
            />
          </label>
        </div>
      </section>

      <section
        data-testid="sba-outline-checklist"
        data-scope="piece"
        data-active-piece={active}
        aria-labelledby="sba-outline-checks-title"
        className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
      >
        <h3 id="sba-outline-checks-title" className="text-sm font-semibold leading-relaxed text-slate-800">
          {copy.perPieceChecklist.intro}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {copy.perPieceChecklist.items.map((item) => {
            const on = Boolean(state.checklist[active][item.id])
            return (
              <li key={item.id}>
                <label
                  data-testid={`sba-outline-check-${item.id}`}
                  className="flex cursor-pointer items-start gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-sm text-slate-900 hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-teal-700"
                    checked={on}
                    onChange={() => onToggleCheck(active, item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        data-testid="sba-outline-rwb"
        data-scope="portfolio"
        aria-labelledby="sba-outline-rwb-title"
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
      >
        <h3 id="sba-outline-rwb-title" className="text-base font-bold text-slate-900">
          {copy.labels.researchWorkbook}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{copy.rwbOutline.intro}</p>
        <div className="mt-3 space-y-4">
          {copy.rwbOutline.sections.map((section) => {
            if (!isRwbStepKey(section.stepKey)) return null
            const step = section.stepKey
            return (
              <fieldset key={step} data-testid={`sba-outline-rwb-${step}`}>
                <legend className="text-sm font-semibold text-slate-900">
                  {section.stepRef}. {section.title}
                </legend>
                <div className="mt-2 space-y-2">
                  {section.prompts.map((prompt, index) => (
                    <Field key={`${step}:${index}`} label={prompt} testId={`sba-outline-rwb-${step}-${index}`}>
                      <textarea
                        className={FIELD}
                        rows={2}
                        value={state.rwb[`${step}:${index}`] ?? ''}
                        onChange={(event) => onRwb(step, index, event.target.value)}
                      />
                    </Field>
                  ))}
                </div>
              </fieldset>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Field({ label, testId, children }: { label: string; testId: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-800" data-testid={testId}>
      {label}
      {children}
    </label>
  )
}
