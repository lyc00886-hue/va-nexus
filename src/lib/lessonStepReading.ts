/**
 * Spoken text for an open lesson step.
 * 英中對照 reads the English line, then the active Chinese line.
 * Identical lines stay one sentence. No new product copy.
 */
export function bilingualSpeech(
  text: string,
  english: string | undefined,
  bilingual: boolean,
  sep: string,
): string {
  if (!bilingual) return text
  const current = text.trim()
  const alt = english?.trim()
  if (!current || !alt || alt === current) return text
  return `${alt}${sep}${current}`
}

export type AutoReadPlan = {
  start: boolean
  /** Set once a start is issued, so the same step does not restart. */
  arm?: string
}

/**
 * Opening a new step, including a critique step after a question, starts reading.
 * The same key does not start again. Stop on that key stays stopped.
 */
export function planAutoRead(input: {
  auto: boolean
  autoKey: string | undefined
  text: string
  armedKey: string | undefined
  stoppedKey: string | undefined
}): AutoReadPlan {
  if (!input.auto || !input.autoKey || !input.text.trim()) return { start: false }
  if (input.armedKey === input.autoKey || input.stoppedKey === input.autoKey) return { start: false }
  return { start: true, arm: input.autoKey }
}

/** A replaced reader must not cancel speech that a newer reader already owns. */
export function releaseOwnsSpeech(activeToken: number, myToken: number): boolean {
  return myToken !== 0 && activeToken === myToken
}
