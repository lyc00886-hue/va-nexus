/** Scout plates for formative AI reference comments and an approximate band.
 * Prefixes: 01 924e32a98d0f · 02 54f7475b1d39 · 03 3acb04c2d4e4 · strip dbb9e3fd3849.
 * Plate 03 is a process and locale board, not a student screen.
 * Bytes stay under the lesson illustration tree.
 */
export const FORMATIVE_AI_COMMENT_SCOUT_DIR =
  '/content/learning-map-illustrations/soft-scout/formative-ai-comment-band-thin-2611'

export const FORMATIVE_AI_COMMENT_PLATES = {
  staff: `${FORMATIVE_AI_COMMENT_SCOUT_DIR}/01-staff-request-ai-comment-band.png`,
  student: `${FORMATIVE_AI_COMMENT_SCOUT_DIR}/02-student-comment-band-readonly.png`,
  flow: `${FORMATIVE_AI_COMMENT_SCOUT_DIR}/03-fallback-locale-soft-never.png`,
  strip: `${FORMATIVE_AI_COMMENT_SCOUT_DIR}/preview-strip.png`,
} as const

export const FORMATIVE_AI_COMMENT_SHA256 = {
  '01-staff-request-ai-comment-band.png': '924e32a98d0fc2406afa5d85262443e4c0233cdb4872ad8b84d696c9c419412d',
  '02-student-comment-band-readonly.png': '54f7475b1d397623eb8e5e3df6547f76b4f1a231d2773aca45e7fef5d9bd9bc9',
  '03-fallback-locale-soft-never.png': '3acb04c2d4e4f9b71735ab20e1fa8ee04330e7e739eadd3f3820e6c9b2189d57',
  'preview-strip.png': 'dbb9e3fd3849db64f34310ec243dbb5a3be5debfe26d052760bb318ca7ed8a66',
} as const
