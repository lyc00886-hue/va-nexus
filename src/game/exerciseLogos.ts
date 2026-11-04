/**
 * Soft GO exercise marks (PEANUTS §F / duo-ux-soft-v2 §E).
 * READY logos only. order / speak / listen stay deferred — no files, no ids.
 * ex.step is an icon-only badge. It does not open the SBA six-step flow.
 */

export const MOOD_PATH_SOFT =
  '/content/learning-map-illustrations/moods/path-soft/mood-path-map-soft.png'

export const EXERCISE_LOGO_DIR = '/content/learning-map-illustrations/moods/exercise-logos'

export const EXERCISE_DOC_IDS = [
  'ex.choice',
  'ex.match',
  'ex.fill',
  'ex.image',
  'ex.feldman',
  'ex.reflect',
  'ex.step',
] as const

export type ExerciseDocId = (typeof EXERCISE_DOC_IDS)[number]

/** Doc ids that must not ship in this pass. */
export const DEFERRED_EXERCISE_IDS = ['order', 'speak', 'listen', 'ex.order', 'ex.speak', 'ex.listen'] as const

type ExerciseSpec = {
  id: ExerciseDocId
  file: string
  /** ex.fill shares its drawing with ex-short.png */
  aliasFile?: string
  shortKey:
    | 'ex.choice.short'
    | 'ex.match.short'
    | 'ex.fill.short'
    | 'ex.image.short'
    | 'ex.feldman.short'
    | 'ex.reflect.short'
    | 'ex.step.short'
  /** Icon plus accessible name. No visible short-name text. */
  iconOnly?: boolean
}

export const EXERCISE_SPECS: readonly ExerciseSpec[] = [
  { id: 'ex.choice', file: 'ex-mc.png', shortKey: 'ex.choice.short' },
  { id: 'ex.match', file: 'ex-match.png', shortKey: 'ex.match.short' },
  { id: 'ex.fill', file: 'ex-fill.png', aliasFile: 'ex-short.png', shortKey: 'ex.fill.short' },
  { id: 'ex.image', file: 'ex-image.png', shortKey: 'ex.image.short' },
  { id: 'ex.feldman', file: 'ex-appreciate.png', shortKey: 'ex.feldman.short' },
  { id: 'ex.reflect', file: 'ex-reflect.png', shortKey: 'ex.reflect.short' },
  { id: 'ex.step', file: 'ex-sba-step.png', shortKey: 'ex.step.short', iconOnly: true },
]

const SPEC_BY_ID = new Map(EXERCISE_SPECS.map((spec) => [spec.id, spec]))

const QUESTION_EXERCISE = {
  mcq: 'ex.choice',
  match: 'ex.match',
  fill: 'ex.fill',
} as const

export function isExerciseDocId(value: string): value is ExerciseDocId {
  return (EXERCISE_DOC_IDS as readonly string[]).includes(value)
}

export function exerciseSpec(id: ExerciseDocId): ExerciseSpec {
  const spec = SPEC_BY_ID.get(id)
  if (!spec) throw new Error(`[exercise] missing spec ${id}`)
  return spec
}

export function exerciseLogoSrc(id: ExerciseDocId): string {
  return `${EXERCISE_LOGO_DIR}/${exerciseSpec(id).file}`
}

/** Second filename for the same mark, when the doc allows an alias. */
export function exerciseLogoAliasSrc(id: ExerciseDocId): string | null {
  const alias = exerciseSpec(id).aliasFile
  return alias ? `${EXERCISE_LOGO_DIR}/${alias}` : null
}

/** ex.step stays an icon. The short name is the accessible name only. */
export function exerciseMarkIsIconOnly(id: ExerciseDocId): boolean {
  return exerciseSpec(id).iconOnly === true
}

export function exerciseIdForQuestion(type: string): ExerciseDocId | null {
  if (type === 'mcq' || type === 'match' || type === 'fill') return QUESTION_EXERCISE[type]
  return null
}

/**
 * Marks that already exist on a lesson.
 * Question types map to choice / match / fill.
 * Artwork on the lesson is 睇圖. Feldman embed is 評賞四步.
 * Callers may pass explicit READY ids (reflect, step). Deferred ids are dropped.
 */
export function lessonExerciseIds(input: {
  questions?: readonly { type: string }[]
  artists?: readonly unknown[]
  embedFeldman?: boolean
  exerciseIds?: readonly string[]
}): ExerciseDocId[] {
  const found = new Set<ExerciseDocId>()
  for (const question of input.questions ?? []) {
    const id = exerciseIdForQuestion(question.type)
    if (id) found.add(id)
  }
  if ((input.artists?.length ?? 0) > 0) found.add('ex.image')
  if (input.embedFeldman) found.add('ex.feldman')
  for (const raw of input.exerciseIds ?? []) {
    if (isExerciseDocId(raw)) found.add(raw)
  }
  return EXERCISE_DOC_IDS.filter((id) => found.has(id))
}

/** Centered spine. The stroke bows left/right; the node stays on the spine. */
export function pathBendSide(index: number): 'left' | 'right' {
  return index % 2 === 0 ? 'right' : 'left'
}
