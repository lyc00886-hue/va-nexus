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
