/**
 * Preview-only switch for the Research writing shell.
 * The current Feldman writer stays the default. `?ux=steps` opts in
 * (and is remembered). `?ux=classic` or `?ux=off` turns the shell off.
 */
import type { MessageKey } from '../i18n'

export const RESEARCH_UX_STORAGE_KEY = 'va-nexus:research-ux:v1'
export const RESEARCH_UX_STEPS_VALUE = 'steps'

export const RESEARCH_STEP_PHASES = ['write', 'list', 'ai'] as const
export type ResearchStepPhase = (typeof RESEARCH_STEP_PHASES)[number]

export const RESEARCH_STEP_COPY: Record<ResearchStepPhase, { title: MessageKey; cta: MessageKey }> = {
  write: { title: 'rs.step.write', cta: 'rs.cta.continue' },
  list: { title: 'rs.step.list', cta: 'rs.cta.next' },
  ai: { title: 'rs.step.ai', cta: 'rs.cta.tip' },
}

export type ResearchUxQuery = 'steps' | 'classic' | 'off' | null

function searchParams(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q)
}

/** Known `ux` values only. Anything else leaves the stored choice alone. */
export function researchUxQuery(search: string): ResearchUxQuery {
  const raw = searchParams(search).get('ux')
  if (raw === 'steps' || raw === 'classic' || raw === 'off') return raw
  return null
}

/** True only for an explicit steps opt-in. Default (no query, no stored flag) is false. */
export function researchStepsEnabled(search: string, stored: string | null | undefined): boolean {
  const query = researchUxQuery(search)
  if (query === 'steps') return true
  if (query === 'classic' || query === 'off') return false
  return stored === RESEARCH_UX_STEPS_VALUE
}

export function researchUxPersist(search: string): 'set' | 'clear' | 'keep' {
  const query = researchUxQuery(search)
  if (query === 'steps') return 'set'
  if (query === 'classic' || query === 'off') return 'clear'
  return 'keep'
}

/** Next checklist item, or `done` when the short list step is finished. */
export function advanceChecklist(index: number, count: number): { index: number; done: boolean } {
  if (count <= 0 || index >= count - 1) return { index: 0, done: true }
  return { index: index + 1, done: false }
}

/**
 * One visible lead tip. Longer model text stays behind “show more”.
 * Does not change the feedback request — display only.
 */
export function splitLearningTip(text: string): { lead: string; rest: string } {
  const trimmed = text.trim()
  if (!trimmed) return { lead: '', rest: '' }
  const paragraphs = trimmed.split(/\n\s*\n/)
  if (paragraphs.length > 1) {
    return { lead: paragraphs[0].trim(), rest: paragraphs.slice(1).join('\n\n').trim() }
  }
  const lines = trimmed.split('\n')
  if (lines.length > 1) {
    return { lead: lines[0].trim(), rest: lines.slice(1).join('\n').trim() }
  }
  const chars = [...trimmed]
  if (chars.length > 80) {
    return {
      lead: `${chars.slice(0, 80).join('').trimEnd()}…`,
      rest: chars.slice(80).join('').trimStart(),
    }
  }
  return { lead: trimmed, rest: '' }
}
