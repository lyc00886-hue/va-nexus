/**
 * School scoring reference v1 (single-school LOCK).
 * Practice bands stay on the teacher-draft store, under one school slot.
 * Student self-assessment (`va-nexus:sba-self-assessment:v1`) is not written here.
 * CL sample path and hash stay unlocked until SAMPLES.md — do not invent either.
 */
import type { MessageKey } from '../i18n'
import {
  bandForPortfolio,
  PRACTICE_BAND_IDS,
  type PracticeBandId,
  type TeacherDraftStore,
} from './teacherDraftBand.ts'

export const SCHOOL_SCORE_SLOT = 'school-score-v1'

/** Lesson / chrome illustration tree. Illustration shells ⑤ / ⑤b / ⑤c stay untouched. */
export const SCHOOL_SCORE_SCOUT_DIR = '/content/learning-map-illustrations/soft-scout/school-score-v1'

export const SCHOOL_SCORE_PLATES = {
  staff: `${SCHOOL_SCORE_SCOUT_DIR}/01-staff-score-ref.png`,
  student: `${SCHOOL_SCORE_SCOUT_DIR}/02-student-progress-ref.png`,
  replace: `${SCHOOL_SCORE_SCOUT_DIR}/03-replace-self-before-after.png`,
  strip: `${SCHOOL_SCORE_SCOUT_DIR}/preview-strip.png`,
} as const

/** sha256 of the scout plates. Prefixes: 01 cc62494dc901 · 02 437c3de0e4f4 · 03 6bdacc6a2ccd · strip 621082208425. */
export const SCHOOL_SCORE_SHA256 = {
  '01-staff-score-ref.png': 'cc62494dc9010fe37ad21a020e74d0021a98277997979e2e4669fd48678a6b09',
  '02-student-progress-ref.png': '437c3de0e4f4bc74eaedeef8809a021f8f2f7754647175d38e50851040738dc3',
  '03-replace-self-before-after.png': '6bdacc6a2ccdc49ba80d74b15bbccd8f45a473bc60abc270debd9512017fddbd',
  'preview-strip.png': '62108220842518b7ca4052a7dbba1664d302f090ad4d98df4cbff1a4204cef66',
} as const

const BAND_COPY: Record<PracticeBandId, { label: MessageKey; hint: MessageKey }> = {
  'practice-emerging': { label: 'score.v1.band.emerging', hint: 'score.v1.band.emerging.hint' },
  'practice-developing': { label: 'score.v1.band.developing', hint: 'score.v1.band.developing.hint' },
  'practice-secure': { label: 'score.v1.band.secure', hint: 'score.v1.band.secure.hint' },
  'practice-strong': { label: 'score.v1.band.strong', hint: 'score.v1.band.strong.hint' },
}

export function schoolReferenceBand(store: TeacherDraftStore): PracticeBandId | null {
  return bandForPortfolio(store, SCHOOL_SCORE_SLOT)
}

export function schoolBandRows(): { id: PracticeBandId; label: MessageKey; hint: MessageKey }[] {
  return PRACTICE_BAND_IDS.map((id) => ({ id, ...BAND_COPY[id] }))
}
