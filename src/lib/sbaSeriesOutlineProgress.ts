/**
 * Map blank-outline fills onto the ability-chart step_progress required ids
 * used by PR #9 (`stepCounts`). That chart is not on main; this module does
 * not draw radars. It only answers "which required ids now have text?"
 *
 * One stored blank fills at most one required id, so a combined prompt line
 * cannot mark every concept inside it. Checklist ticks are not template
 * fields and are ignored. Self-assessment ids (`self-*`) are never written
 * here — those stay on `va-nexus:sba-self-assessment:v1`.
 *
 * PR #9 can pass the result straight through:
 *   stepCounts(steps, { fields: { ...selects, ...answers.fields }, rowsByStep: answers.rowsByStep })
 * Step 4 (media) has min_rows, so its fills live on rowsByStep[4], not in fields.
 */

import { SLOT_IDS, type SlotId } from './sbaArtworkSlots.ts'
import { rwbPromptKey, type OutlineState, type PieceFields, type RwbStepKey } from './sbaSeriesOutline.ts'

/** Ids this outline can emit. Each one is already on the PR #9 required list. */
export const OUTLINE_PROGRESS_IDS = [
  'theme',
  'keywords',
  'why',
  '5w1h',
  'arc-1',
  'artists',
  'artist',
  'context',
  'feldman-describe',
  'learnt',
  'sources',
  'concept-map',
  'option-a',
  'chosen',
  'title',
  'piece-no',
  'media-size',
  'idea',
  'media-why',
  'problems',
  'ai-declaration',
  'first-vs-found',
  'success',
  'evidence-ref',
  'next-plan',
] as const

/** Step 4 row ids. The outline has one trial, so only row 0 is ever filled. */
export const OUTLINE_MEDIA_ROW_IDS = ['question', 'material', 'next-change', 'conclusion'] as const

const STEP_REQUIRED: Record<number, { key: string; required: readonly string[]; minRows: number | null }> = {
  1: {
    key: 'theme',
    required: ['theme', 'keywords', 'why', '5w1h', 'mindmap', 'arc-1', 'artists', 'primary-photos'],
    minRows: null,
  },
  2: {
    key: 'research',
    required: [
      'artist',
      'context',
      'works',
      'work-image',
      'feldman-describe',
      'feldman-analyse',
      'feldman-interpret',
      'feldman-judge',
      'learnt',
      'rejected',
      'try-by-myself',
      'sources',
    ],
    minRows: null,
  },
  3: {
    key: 'sketch',
    required: [
      'concept-map',
      'guiding-answers',
      'option-a',
      'option-a-notes',
      'option-b',
      'option-b-notes',
      'option-c',
      'option-c-notes',
      'chosen',
      'rejection-reasons',
      'why-chosen',
    ],
    minRows: null,
  },
  4: {
    key: 'media',
    required: ['question', 'variable', 'material', 'photo', 'effect', 'result', 'why', 'next-change', 'conclusion'],
    minRows: 3,
  },
  5: {
    key: 'making',
    required: [
      'title',
      'piece-no',
      'media-size',
      'idea',
      'visual-meaning',
      'media-why',
      'artist-link',
      'process-photos',
      'problems',
      'final-photo',
      'ai-declaration',
    ],
    minRows: null,
  },
}

export type OutlineAbilityAnswers = {
  fields: Record<string, string>
  rowsByStep: Record<number, Array<Record<string, string>>>
}

export type OutlineStepCount = {
  id: number
  key: string
  filled: number
  required: number
}

function filled(value: string | undefined): string | null {
  const text = value?.trim() ?? ''
  return text ? text : null
}

function prompt(state: OutlineState, step: RwbStepKey, index: number): string | null {
  return filled(state.rwb[rwbPromptKey(step, index)])
}

function firstPieceValue(state: OutlineState, pick: (piece: PieceFields) => string | null, slots: readonly SlotId[] = SLOT_IDS): string | null {
  for (const id of slots) {
    const value = pick(state.pieces[id])
    if (value) return value
  }
  return null
}

function mediaSize(piece: PieceFields): string | null {
  const media = piece.media.trim()
  const size = piece.size.trim()
  if (media && size) return `${media} / ${size}`
  return media || size || null
}

export function outlineAbilityAnswers(state: OutlineState): OutlineAbilityAnswers {
  const fields: Record<string, string> = {}
  const put = (id: string, value: string | null) => {
    if (value) fields[id] = value
  }

  put('theme', filled(state.portfolio.themeTitle) ?? prompt(state, 'theme', 0))
  put('keywords', filled(state.portfolio.keywords))
  put('why', filled(state.portfolio.themeWhy) ?? prompt(state, 'theme', 1))
  put('5w1h', prompt(state, 'theme', 2))
  put('arc-1', filled(state.portfolio.arc1) ?? prompt(state, 'theme', 3))
  put('artists', prompt(state, 'theme', 4))

  put('artist', prompt(state, 'research', 0))
  put('context', prompt(state, 'research', 1))
  put('feldman-describe', prompt(state, 'research', 2))
  put('learnt', prompt(state, 'research', 3))
  put('sources', prompt(state, 'research', 4))

  put('concept-map', prompt(state, 'sketch', 0))
  put('option-a', prompt(state, 'sketch', 1))
  put('chosen', prompt(state, 'sketch', 2))

  const workingTitle = firstPieceValue(state, (piece) => filled(piece.workingTitle))
  const makingLead = prompt(state, 'making', 0)
  if (workingTitle) {
    put('title', workingTitle)
    put('piece-no', makingLead)
  } else {
    put('title', makingLead)
  }
  put('media-size', firstPieceValue(state, mediaSize))
  put('idea', prompt(state, 'making', 1))
  put('media-why', prompt(state, 'making', 2))
  put('problems', prompt(state, 'making', 3))
  put('ai-declaration', prompt(state, 'making', 4))

  put('first-vs-found', prompt(state, 'reflection', 0))
  put('success', prompt(state, 'reflection', 1))
  put('evidence-ref', prompt(state, 'reflection', 3))
  put(
    'next-plan',
    prompt(state, 'reflection', 4) ??
      firstPieceValue(state, (piece) => filled(piece.progressionFromPrev), [2, 3, 4]),
  )

  const row: Record<string, string> = {}
  const question = prompt(state, 'media', 0)
  const material = prompt(state, 'media', 1)
  const nextChange = prompt(state, 'media', 2)
  const conclusion = prompt(state, 'media', 3)
  if (question) row.question = question
  if (material) row.material = material
  if (nextChange) row['next-change'] = nextChange
  if (conclusion) row.conclusion = conclusion

  return {
    fields,
    rowsByStep: Object.keys(row).length > 0 ? { 4: [row] } : {},
  }
}

/** Steps 1–5 only. Same ratio rule as PR #9 `stepCounts` (step 4 = fields × 3 rows). */
export function outlineStepFillCounts(state: OutlineState): OutlineStepCount[] {
  const answers = outlineAbilityAnswers(state)
  return [1, 2, 3, 4, 5].map((id) => {
    const spec = STEP_REQUIRED[id]
    if (spec.minRows != null && spec.minRows > 0) {
      const rows = answers.rowsByStep[id] ?? []
      const required = spec.required.length * spec.minRows
      let count = 0
      for (let i = 0; i < spec.minRows; i++) {
        const row = rows[i] ?? {}
        for (const field of spec.required) {
          if (row[field]?.trim()) count++
        }
      }
      return { id, key: spec.key, filled: count, required }
    }
    let count = 0
    for (const field of spec.required) {
      if (answers.fields[field]?.trim()) count++
    }
    return { id, key: spec.key, filled: count, required: spec.required.length }
  })
}
