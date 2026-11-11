/**
 * One device-local Feldman four-step draft.
 * Look closely can write a section into a step only after the student asks.
 * This draft is learning text. It is not a practice band or a school score.
 */

export const FELDMAN_DRAFT_KEY = 'va-nexus:feldman-draft:v1'

export const FELDMAN_STEPS = ['describe', 'analyse', 'interpret', 'judge'] as const

export type FeldmanStepId = (typeof FELDMAN_STEPS)[number]

export type CropSectionId = 'seen' | 'understood' | 'evidence'

/** Default step, then the steps a student may choose instead. */
export const BRING_CHOICES: Record<CropSectionId, readonly FeldmanStepId[]> = {
  seen: ['describe'],
  understood: ['analyse', 'interpret'],
  evidence: ['judge', 'describe', 'analyse', 'interpret'],
}

export type FeldmanDraft = {
  version: 1
  artwork: string
  steps: Record<FeldmanStepId, string>
}

export type BringResult = 'empty' | 'needConfirm' | 'written'

const STEP_MAX = 2000
const ARTWORK_MAX = 200

export function emptyFeldmanDraft(): FeldmanDraft {
  return {
    version: 1,
    artwork: '',
    steps: { describe: '', analyse: '', interpret: '', judge: '' },
  }
}

function stepText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.slice(0, STEP_MAX)
}

export function sanitizeFeldmanDraft(raw: unknown): FeldmanDraft {
  if (!raw || typeof raw !== 'object') return emptyFeldmanDraft()
  const record = raw as { version?: unknown; artwork?: unknown; steps?: unknown }
  if ('version' in record && record.version !== 1) return emptyFeldmanDraft()
  const steps = record.steps && typeof record.steps === 'object' ? (record.steps as Record<string, unknown>) : {}
  return {
    version: 1,
    artwork: typeof record.artwork === 'string' ? record.artwork.slice(0, ARTWORK_MAX) : '',
    steps: {
      describe: stepText(steps.describe),
      analyse: stepText(steps.analyse),
      interpret: stepText(steps.interpret),
      judge: stepText(steps.judge),
    },
  }
}

export function withFeldmanArtwork(draft: FeldmanDraft, artwork: string): FeldmanDraft {
  const next = artwork.slice(0, ARTWORK_MAX)
  if (next === draft.artwork) return draft
  return { ...draft, artwork: next }
}

export function withFeldmanStep(draft: FeldmanDraft, step: FeldmanStepId, text: string): FeldmanDraft {
  const next = text.slice(0, STEP_MAX)
  if (next === draft.steps[step]) return draft
  return { ...draft, steps: { ...draft.steps, [step]: next } }
}

/**
 * Writes one Look closely section into one Feldman step.
 * An empty section is refused. A step that already has text waits for confirm.
 */
export function bringSectionIntoStep(
  draft: FeldmanDraft,
  step: FeldmanStepId,
  sectionText: string,
  confirm: boolean,
): { draft: FeldmanDraft; result: BringResult } {
  const text = sectionText.replace(/\s+/g, ' ').trim().slice(0, STEP_MAX)
  if (!text) return { draft, result: 'empty' }
  if (draft.steps[step].trim() && !confirm) return { draft, result: 'needConfirm' }
  return { draft: withFeldmanStep(draft, step, text), result: 'written' }
}
