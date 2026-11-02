/**
 * Adapter: PEANUTS / DICK content JSON (src/content/*.json) → internal lesson types.
 *
 * Content shape (drop-in replaceable):
 *   lesson = { id, title, cards: string[], quiz: ContentQuiz[] }
 *   quest  = lesson + { badge: string }
 *   quiz   = { type: 'mcq'|'match'|'fill', question, options: string[], answer, explain }
 *     mcq   → answer = the correct option text (or index)
 *     match → options = left terms, answer = { [left]: right }
 *     fill  → question contains ＿＿ ; wordBank (preferred, curated by PEANUTS) or options = word bank
 *             (both empty → auto-generated distractors)
 */
import type { LessonCard, Question } from './types'

export type ContentQuiz = {
  type: 'mcq' | 'match' | 'fill'
  question: string
  options: string[]
  answer: string | number | Record<string, string>
  explain?: string
  /** Curated fill-in choices (incl. the answer). When present, used instead of auto distractors. */
  wordBank?: string[]
}

export type ContentLesson = {
  id: string
  title: string
  cards: (string | { title?: string; body: string; easy?: string[] })[]
  quiz: ContentQuiz[]
  subtitle?: string
  minutes?: number
}

function easyBullets(text: string): string[] {
  const parts = text
    .split(/[，。；：]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : [text]
}

export function adaptCards(cards: ContentLesson['cards']): LessonCard[] {
  return cards.map((c, i) => {
    if (typeof c === 'string') return { title: `重點 ${i + 1}`, body: c, easy: easyBullets(c) }
    return { title: c.title ?? `重點 ${i + 1}`, body: c.body, easy: c.easy?.length ? c.easy : easyBullets(c.body) }
  })
}

/** Deterministic pick so builds/renders are stable */
function pickDistractors(answer: string, pool: string[], n: number): string[] {
  const uniq = [...new Set(pool.filter((p) => p && p !== answer))]
  let h = 0
  for (const ch of answer) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const out: string[] = []
  for (let i = 0; i < uniq.length && out.length < n; i++) out.push(uniq[(h + i * 7) % uniq.length])
  return [...new Set(out)]
}

const FALLBACK_BANK = ['線條', '色彩', '構圖', '質感', '空間', '筆墨', '透視', '光影']

export function adaptQuiz(lessonId: string, quiz: ContentQuiz[], fillPool: string[]): Question[] {
  return quiz.map((q, i): Question => {
    const id = `${lessonId}-q${i + 1}`
    const explain = q.explain ?? ''
    if (q.type === 'mcq') {
      const idx = typeof q.answer === 'number' ? q.answer : q.options.indexOf(String(q.answer))
      if (idx < 0) console.warn(`[content] ${id}: mcq answer not in options`)
      return { id, type: 'mcq', prompt: q.question, options: q.options, answer: Math.max(0, idx), explain }
    }
    if (q.type === 'match') {
      const map = (typeof q.answer === 'object' ? q.answer : {}) as Record<string, string>
      const lefts = q.options.length ? q.options : Object.keys(map)
      return {
        id,
        type: 'match',
        prompt: q.question,
        pairs: lefts.filter((l) => map[l] !== undefined).map((l) => ({ left: l, right: map[l] })),
        explain,
      }
    }
    const answer = String(q.answer)
    const prompt = q.question.includes('＿＿') ? q.question : `${q.question} ＿＿`
    const curated = (q.wordBank ?? []).map((w) => String(w).trim()).filter(Boolean)
    if (curated.length) {
      const bank = [...new Set(curated)]
      if (!bank.includes(answer)) {
        console.warn(`[content] ${id}: wordBank missing answer, appended`)
        bank.push(answer)
      }
      return { id, type: 'fill', prompt, bank, answer, explain }
    }
    let bank = q.options.length ? [...q.options] : []
    if (!bank.includes(answer)) bank.push(answer)
    if (bank.length < 3) {
      bank = [...bank, ...pickDistractors(answer, [...fillPool, ...FALLBACK_BANK], 3 - bank.length + 0)]
      bank = [...new Set(bank)].slice(0, 4)
    }
    return { id, type: 'fill', prompt, bank, answer, explain }
  })
}

export function fillAnswersOf(lessons: ContentLesson[]): string[] {
  return lessons.flatMap((l) => l.quiz.filter((q) => q.type === 'fill').map((q) => String(q.answer)))
}
