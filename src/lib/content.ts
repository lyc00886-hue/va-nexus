import { perLocale } from '../i18n'
import { contentJson } from '../i18n/content'
import type {
  FeldmanContent,
  FeldmanStageId,
  FeldmanVocabEntry,
  PairCompareContent,
  PairCompareEntry,
} from '../types'

/** Locale-aware content (falls back to the zh-Hant originals when a variant is missing). */
export const getFeldman = perLocale(() => contentJson<FeldmanContent>('feldman'))
export const getFeldmanStages = () => getFeldman().stages
export const getFeldmanVocab = perLocale(() => contentJson<FeldmanVocabEntry[]>('feldman-vocab'))
export const getPairCompare = perLocale(() => contentJson<PairCompareContent>('artist-pair-compare'))

/** term → English gloss (from feldman.json grouped vocab) */
const getTermEn = perLocale(() => new Map(getFeldman().vocab.map((v) => [v.term, v.en])))
export function termEnglish(term: string): string | undefined {
  return getTermEn().get(term)
}

export function vocabForStage(stage: FeldmanStageId): FeldmanVocabEntry[] {
  return getFeldmanVocab().filter((v) => v.stage === stage)
}

/** Inline replacement uses the first alternative of 「A／B」 / "A / B" terms so sentences stay readable. */
export function inlineTerm(term: string): string {
  return term.split(/／|\s\/\s/)[0].trim()
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const getBooster = perLocale((locale) => {
  const en = locale === 'en'
  const norm = (s: string) => (en ? s.toLowerCase() : s)
  const byColloquial = new Map(getFeldmanVocab().map((v) => [norm(v.colloquial), v]))
  const alternatives = [...byColloquial.keys()]
    .sort((a, b) => b.length - a.length)
    .map((k) => (en ? `\\b${escapeRe(k)}\\b` : escapeRe(k)))
  const re = new RegExp(alternatives.join('|') || '(?!)', en ? 'gi' : 'g')
  return { byColloquial, re, norm }
})

/** Single-pass colloquial → DSE term replacement (longest match first, never re-replaces output). */
export function boostOralText(input: string): { boosted: string; hits: FeldmanVocabEntry[] } {
  const { byColloquial, re, norm } = getBooster()
  const hits: FeldmanVocabEntry[] = []
  const boosted = input.replace(re, (m) => {
    const entry = byColloquial.get(norm(m))
    if (!entry) return m
    if (!hits.includes(entry)) hits.push(entry)
    return inlineTerm(entry.term)
  })
  return { boosted, hits }
}

/**
 * Curated compare content for a live/mock pair. Joined by pair_id; artist ids must
 * also match (a = west, b = east) or the curated entry is ignored.
 */
export function curatedCompare(
  pairId: string,
  westId: string,
  eastId: string,
): PairCompareEntry | undefined {
  const c = getPairCompare().pairs.find((p) => p.pair_id === pairId)
  if (!c) return undefined
  const ok = (c.a === westId && c.b === eastId) || (c.a === eastId && c.b === westId)
  return ok ? c : undefined
}
