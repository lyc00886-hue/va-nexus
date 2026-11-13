/**
 * Marks a lesson card so display / reading preferences reach the art and the body.
 * Font steps match SenContext FONT_SCALES. Root `--sen-font-scale` does the enlarging;
 * these flags do not multiply that scale a second time.
 */

export type LessonFontStep = 'md' | 'lg' | 'xl'

export const LESSON_FONT_SCALE: Record<LessonFontStep, number> = { md: 1, lg: 1.15, xl: 1.3 }

export type LessonCardReadingPrefs = {
  fontSize: LessonFontStep
  /** Existing 寬鬆間距 switch. Also turns on the short reading lines. */
  dyslexia: boolean
  highContrast: boolean
}

export type LessonCardReadingAttrs = {
  'data-lesson-card': ''
  'data-reading-support': 'on' | 'off'
  'data-loose-spacing': 'on' | 'off'
  'data-high-contrast': 'on' | 'off'
  'data-font-size': LessonFontStep
}

export function lessonCardReadingAttrs(prefs: LessonCardReadingPrefs): LessonCardReadingAttrs {
  const reading = prefs.dyslexia
  return {
    'data-lesson-card': '',
    'data-reading-support': reading ? 'on' : 'off',
    'data-loose-spacing': reading ? 'on' : 'off',
    'data-high-contrast': prefs.highContrast ? 'on' : 'off',
    'data-font-size': prefs.fontSize,
  }
}

/** Spacing and contrast on the card body. Large type stays on the root rem scale. */
export function lessonCardBodyStyle(prefs: LessonCardReadingPrefs): {
  letterSpacing?: string
  wordSpacing?: string
  lineHeight?: string
  color?: string
} {
  return {
    ...(prefs.dyslexia ? { letterSpacing: '0.04em', wordSpacing: '0.16em', lineHeight: '1.85' } : {}),
    ...(prefs.highContrast ? { color: '#000000' } : {}),
  }
}

/** Short reading lines. Same split the lesson cards already used. */
export function easyReadLines(text: string): string[] {
  const parts = text
    .split(/[，。；：]|(?<=[.;:])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
  return parts.length ? parts : [text]
}

/** Words the student sees. Reading support uses the short lines; otherwise the body. */
export function lessonCardVisibleLines(card: { body: string; easy: readonly string[] }, readingSupport: boolean): string[] {
  if (!readingSupport) return [card.body]
  const lines = card.easy.map((line) => line.trim()).filter(Boolean)
  return lines.length > 0 ? lines : [card.body]
}
