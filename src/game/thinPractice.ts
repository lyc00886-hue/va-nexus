/**
 * Open practice for order / compare works / short answer.
 * Order is graded against the listed sequence. The two writing types
 * are structure practice: a line counts when it is not blank.
 */

export function shuffledItems(items: readonly string[], seed: string): string[] {
  const next = [...items]
  let h = 0
  for (const ch of seed) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  for (let i = next.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0
    const j = h % (i + 1)
    const swap = next[i]
    next[i] = next[j]
    next[j] = swap
  }
  if (next.length > 1 && next.every((item, index) => item === items[index])) {
    const swap = next[0]
    next[0] = next[1]
    next[1] = swap
  }
  return next
}

export function moveItem(items: readonly string[], index: number, dir: -1 | 1): string[] {
  const nextIndex = index + dir
  if (nextIndex < 0 || nextIndex >= items.length) return [...items]
  const next = [...items]
  const swap = next[index]
  next[index] = next[nextIndex]
  next[nextIndex] = swap
  return next
}

export function orderMatches(current: readonly string[], answer: readonly string[]): boolean {
  return current.length === answer.length && current.every((item, index) => item === answer[index])
}

export function linesReady(value: unknown, count: number): value is string[] {
  if (!Array.isArray(value) || value.length < count) return false
  return value.slice(0, count).every((line) => typeof line === 'string' && line.trim().length > 0)
}

export type DraftChoice = number | string | string[] | null

/** True while the map primary action should stay disabled. Match solves itself. */
export function practiceNeedsDraft(type: string, choice: DraftChoice, size = 0): boolean {
  if (type === 'match') return true
  if (type === 'order') return !Array.isArray(choice) || choice.length !== size
  if (type === 'dualRead') return !linesReady(choice, 2)
  if (type === 'short') return !linesReady(choice, 1)
  return choice == null
}
