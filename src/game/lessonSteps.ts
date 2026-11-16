/**
 * One-card lesson order. Existing cards and questions only.
 * While both remain: at most two cards, then one question.
 * After questions run out, one remaining card per step.
 * After cards run out, one remaining question per step.
 * A rest step is optional and only for lessons longer than the 13-step reference.
 */
import { OFFICIAL_VIDEO_IDS } from './communityCases.ts'

export type LessonStep =
  | { kind: 'media' }
  | { kind: 'card'; cardIndex: number }
  | { kind: 'question'; questionIndex: number }
  | { kind: 'rest' }

const OFFICIAL_IDS = new Set<string>(OFFICIAL_VIDEO_IDS)

const OFFICIAL_FILM_URL = /https:\/\/www\.youtube\.com\/(?:watch\?v=|embed\/)([A-Za-z0-9_-]+)/g

export function interleaveCardsAndQuestions(
  cardCount: number,
  questionCount: number,
): Array<Extract<LessonStep, { kind: 'card' | 'question' }>> {
  const steps: Array<Extract<LessonStep, { kind: 'card' | 'question' }>> = []
  let cardIndex = 0
  let questionIndex = 0
  while (cardIndex < cardCount || questionIndex < questionCount) {
    if (questionIndex >= questionCount) {
      steps.push({ kind: 'card', cardIndex })
      cardIndex += 1
      continue
    }
    if (cardIndex >= cardCount) {
      steps.push({ kind: 'question', questionIndex })
      questionIndex += 1
      continue
    }
    const take = Math.min(2, cardCount - cardIndex)
    for (let i = 0; i < take; i += 1) {
      steps.push({ kind: 'card', cardIndex })
      cardIndex += 1
    }
    if (questionIndex < questionCount) {
      steps.push({ kind: 'question', questionIndex })
      questionIndex += 1
    }
  }
  return steps
}

/** Longer than the November reference (13). The rest is skippable and has no lives cost. */
export function withOptionalRest(steps: LessonStep[]): LessonStep[] {
  if (steps.length <= 13 || steps.some((step) => step.kind === 'rest')) return steps
  const at = Math.ceil(steps.length / 2)
  return [...steps.slice(0, at), { kind: 'rest' }, ...steps.slice(at)]
}

export function buildLessonSteps(input: {
  cardCount: number
  questionCount: number
  media: boolean
}): LessonStep[] {
  const body = interleaveCardsAndQuestions(input.cardCount, input.questionCount)
  const steps: LessonStep[] = input.media ? [{ kind: 'media' }, ...body] : [...body]
  return withOptionalRest(steps)
}

/** Official classroom-playable film ids already written in a card. Order preserved, no extras. */
export function officialFilmIdsIn(text: string): string[] {
  const ids: string[] = []
  for (const match of text.matchAll(OFFICIAL_FILM_URL)) {
    const id = match[1]
    if (!id || !OFFICIAL_IDS.has(id) || ids.includes(id)) continue
    ids.push(id)
  }
  return ids
}

export function splitOfficialFilmText(text: string): Array<{ kind: 'text'; text: string } | { kind: 'film'; id: string }> {
  const parts: Array<{ kind: 'text'; text: string } | { kind: 'film'; id: string }> = []
  let last = 0
  for (const match of text.matchAll(OFFICIAL_FILM_URL)) {
    const id = match[1]
    const start = match.index ?? 0
    if (!id || !OFFICIAL_IDS.has(id)) continue
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) })
    parts.push({ kind: 'film', id })
    last = start + match[0].length
  }
  if (parts.length === 0) return [{ kind: 'text', text }]
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}
