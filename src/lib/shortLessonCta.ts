export type ShortLessonFooterCta = 'primary' | 'quiet' | 'hidden'

/**
 * Inline short lessons mount the card footer and the practice fold together.
 * An open practice fold already shows the filled primary (開始小測, 檢查答案,
 * rest continue, or the result exit). Earlier cards keep 下一張 as a quiet
 * control. The last-card footer is hidden so it cannot repeat 開始小測 or add
 * a second 繼續.
 */
export function shortLessonFooterCta(input: {
  folds: boolean
  practiceOpen: boolean
  phase: 'cards' | 'quiz' | 'rest' | 'result'
  lastCard: boolean
}): ShortLessonFooterCta {
  if (!input.folds || !input.practiceOpen) return 'primary'
  // Last-card footer repeats 開始小測, or turns into 繼續 that only
  // re-opens the practice fold already showing the real primary.
  if (input.lastCard) return 'hidden'
  return 'quiet'
}
