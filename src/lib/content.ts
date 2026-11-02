import feldmanJson from '../content/feldman.json'
import feldmanVocabJson from '../content/feldman-vocab.json'
import pairCompareJson from '../content/artist-pair-compare.json'
import type {
  FeldmanContent,
  FeldmanStageId,
  FeldmanVocabEntry,
  PairCompareContent,
  PairCompareEntry,
} from '../types'

export const FELDMAN = feldmanJson as FeldmanContent
export const FELDMAN_STAGES = FELDMAN.stages
export const FELDMAN_VOCAB = feldmanVocabJson as FeldmanVocabEntry[]
export const PAIR_COMPARE = pairCompareJson as PairCompareContent

/** term → English gloss (from feldman.json grouped vocab) */
const TERM_EN = new Map(FELDMAN.vocab.map((v) => [v.term, v.en]))
export function termEnglish(term: string): string | undefined {
  return TERM_EN.get(term)
}

export function vocabForStage(stage: FeldmanStageId): FeldmanVocabEntry[] {
  return FELDMAN_VOCAB.filter((v) => v.stage === stage)
}

/** Inline replacement uses the first alternative of 「A／B」 terms so sentences stay readable. */
export function inlineTerm(term: string): string {
  return term.split('／')[0]
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const BY_COLLOQUIAL = new Map(FELDMAN_VOCAB.map((v) => [v.colloquial, v]))
const BOOST_RE = new RegExp(
  [...BY_COLLOQUIAL.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|'),
  'g',
)

/** Single-pass colloquial → DSE term replacement (longest match first, never re-replaces output). */
export function boostOralText(input: string): { boosted: string; hits: FeldmanVocabEntry[] } {
  const hits: FeldmanVocabEntry[] = []
  const boosted = input.replace(BOOST_RE, (m) => {
    const entry = BY_COLLOQUIAL.get(m)!
    if (!hits.includes(entry)) hits.push(entry)
    return inlineTerm(entry.term)
  })
  return { boosted, hits }
}

const PAIR_BY_ID = new Map(PAIR_COMPARE.pairs.map((p) => [p.pair_id, p]))

/**
 * Curated compare content for a live/mock pair. Joined by pair_id; artist ids must
 * also match (a = west, b = east) or the curated entry is ignored.
 */
export function curatedCompare(
  pairId: string,
  westId: string,
  eastId: string,
): PairCompareEntry | undefined {
  const c = PAIR_BY_ID.get(pairId)
  if (!c) return undefined
  const ok = (c.a === westId && c.b === eastId) || (c.a === eastId && c.b === westId)
  return ok ? c : undefined
}
