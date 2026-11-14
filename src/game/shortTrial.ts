/**
 * Slice ③ short trial on the F4-U3-L4 making card.
 * Local traces only: no upload, no score, no request.
 */

export const TRIAL_LOCALE_KEYS = [
  'trial.title',
  'trial.when',
  'trial.do',
  'trial.trace.label',
  'trial.trace.hint',
  'trial.talk.label',
  'trial.disclaimer',
  'trial.noUpload',
] as const

/** The making card already carries the near-at-hand criteria. The trial sits with it. */
export function showsShortTrial(lessonId: string, index: number): boolean {
  return lessonId === 'F4-U3-L4' && index === 0
}
