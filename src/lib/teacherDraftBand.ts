/**
 * School-internal formative draft band (#33).
 * Stored only on this device, separate from student self-assessment (1–4).
 * Bands are practice ids — never official 0–5 / 5** marks.
 */

export const TEACHER_DRAFT_BAND_KEY = 'va-nexus:teacher-draft-band:v1'
export const PORTFOLIO_LABEL_MAX = 200

export const PRACTICE_BAND_IDS = [
  'practice-emerging',
  'practice-developing',
  'practice-secure',
  'practice-strong',
] as const
export type PracticeBandId = (typeof PRACTICE_BAND_IDS)[number]

export const CRITERIA_IDS = [
  'rwb-1',
  'rwb-2',
  'rwb-3',
  'rwb-4',
  'aw-1',
  'aw-2',
  'aw-3',
  'aw-4',
  'aw-5',
  'aw-6',
] as const

export const TEACHER_TIP_IDS = [
  'use_school_rubric',
  'not_hkeaa',
  'no_public_exemplars',
  'formative_only',
  'student_path_separate',
] as const

const BAND_ID_SET = new Set<string>(PRACTICE_BAND_IDS)

/** Labels must stay soft practice language. Hints may mention 5** only to refuse it. */
const OFFICIAL_BAND_LABEL = /5\*\*|level\s*5|hkeaa|考評局|考评局|官方/i

export type PracticeBand = {
  id: PracticeBandId
  label: string
  hint?: string
}

export type CriterionRow = {
  id: string
  component: 'rwb' | 'artwork'
  label: string
  focusHint?: string
}

export type TeacherTip = {
  id: string
  text: string
}

export type TeacherDraftBandCopy = {
  meta: { audience: string; locale: string }
  pageTitle: string
  pageIntro: string
  disclaimer: string
  bandPicker: {
    title: string
    help: string
    schoolMappingNote: string
    saveCta: string
    clearCta: string
    bands: PracticeBand[]
  }
  criteria: {
    sectionRwbTitle: string
    sectionArtworkTitle: string
    rowsHelp: string
    rows: CriterionRow[]
  }
  empty: { noStudent: string; noBand: string; noCriteriaNote: string }
  teacherTips: TeacherTip[]
}

export type TeacherDraftStore = {
  activePortfolio: string
  portfolios: Record<string, PracticeBandId>
}

export type CopyCheck =
  | { ok: true; copy: TeacherDraftBandCopy }
  | { ok: false; reason: string }

export function emptyTeacherDraftStore(): TeacherDraftStore {
  return { activePortfolio: '', portfolios: {} }
}

export function isPracticeBandId(value: unknown): value is PracticeBandId {
  return typeof value === 'string' && BAND_ID_SET.has(value)
}

export function portfolioKey(raw: string): string {
  return raw.trim().slice(0, PORTFOLIO_LABEL_MAX)
}

export function pickTeacherDraftBandCopy<T>(
  copies: { 'zh-Hant': T; en?: T; 'zh-Hans'?: T },
  locale: string,
): T {
  if (locale === 'en' && copies.en !== undefined) return copies.en
  if (locale === 'zh-Hans' && copies['zh-Hans'] !== undefined) return copies['zh-Hans']
  return copies['zh-Hant']
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function disclaimerCarriesSchoolLock(locale: string, disclaimer: string): boolean {
  if (locale === 'en') {
    return /not official/i.test(disclaimer) && /hkeaa/i.test(disclaimer) && /school-internal/i.test(disclaimer)
  }
  if (locale === 'zh-Hans') {
    return disclaimer.includes('非官方') && disclaimer.includes('非考评局') && disclaimer.includes('校内')
  }
  if (locale === 'zh-Hant') {
    return disclaimer.includes('非官方') && disclaimer.includes('非考評局') && disclaimer.includes('校內')
  }
  return false
}

function fail(reason: string): CopyCheck {
  return { ok: false, reason }
}

/** Refuse a pack that could render as an official mark, or without the disclaimer. */
export function checkTeacherDraftBandCopy(raw: unknown): CopyCheck {
  if (!raw || typeof raw !== 'object') return fail('shape')
  const copy = raw as TeacherDraftBandCopy
  if (copy.meta?.audience !== 'teacher-only') return fail('audience')
  const locale = copy.meta.locale
  if (locale !== 'zh-Hant' && locale !== 'zh-Hans' && locale !== 'en') return fail('locale')
  if (!text(copy.pageTitle) || !text(copy.pageIntro)) return fail('shape')
  if (!text(copy.disclaimer) || !disclaimerCarriesSchoolLock(locale, copy.disclaimer)) return fail('disclaimer')

  const picker = copy.bandPicker
  if (
    !picker ||
    !text(picker.title) ||
    !text(picker.help) ||
    !text(picker.schoolMappingNote) ||
    !text(picker.saveCta) ||
    !text(picker.clearCta) ||
    !Array.isArray(picker.bands) ||
    picker.bands.length !== PRACTICE_BAND_IDS.length
  ) {
    return fail('bands')
  }
  for (let i = 0; i < PRACTICE_BAND_IDS.length; i++) {
    const band = picker.bands[i]
    if (!band || band.id !== PRACTICE_BAND_IDS[i]) return fail('bands')
    if (!text(band.label) || OFFICIAL_BAND_LABEL.test(band.label)) return fail('bands')
    if (band.hint != null && typeof band.hint !== 'string') return fail('bands')
  }

  const criteria = copy.criteria
  if (
    !criteria ||
    !text(criteria.sectionRwbTitle) ||
    !text(criteria.sectionArtworkTitle) ||
    !text(criteria.rowsHelp) ||
    !Array.isArray(criteria.rows) ||
    criteria.rows.length !== CRITERIA_IDS.length
  ) {
    return fail('criteria')
  }
  for (let i = 0; i < CRITERIA_IDS.length; i++) {
    const id = CRITERIA_IDS[i]
    const row = criteria.rows[i]
    const component = id.startsWith('rwb-') ? 'rwb' : 'artwork'
    if (!row || row.id !== id || row.component !== component || !text(row.label)) return fail('criteria')
    if (row.focusHint != null && typeof row.focusHint !== 'string') return fail('criteria')
  }

  const empty = copy.empty
  if (!empty || !text(empty.noStudent) || !text(empty.noBand) || !text(empty.noCriteriaNote)) return fail('empty')

  if (!Array.isArray(copy.teacherTips) || copy.teacherTips.length !== TEACHER_TIP_IDS.length) return fail('tips')
  for (let i = 0; i < TEACHER_TIP_IDS.length; i++) {
    const tip = copy.teacherTips[i]
    if (!tip || tip.id !== TEACHER_TIP_IDS[i] || !text(tip.text)) return fail('tips')
  }

  return { ok: true, copy }
}

export function sanitizeTeacherDraftStore(raw: unknown): TeacherDraftStore {
  const empty = emptyTeacherDraftStore()
  if (!raw || typeof raw !== 'object') return empty
  const record = raw as { version?: unknown; activePortfolio?: unknown; portfolios?: unknown }
  if ('version' in record && record.version !== 1) return empty
  const activePortfolio = typeof record.activePortfolio === 'string' ? record.activePortfolio.slice(0, PORTFOLIO_LABEL_MAX) : ''
  const portfolios: Record<string, PracticeBandId> = {}
  if (record.portfolios && typeof record.portfolios === 'object') {
    for (const [rawKey, value] of Object.entries(record.portfolios as Record<string, unknown>)) {
      const key = portfolioKey(rawKey)
      if (!key || key.startsWith('self-')) continue
      if (!isPracticeBandId(value)) continue
      portfolios[key] = value
    }
  }
  return { activePortfolio, portfolios }
}

export function bandForPortfolio(store: TeacherDraftStore, portfolio: string): PracticeBandId | null {
  const key = portfolioKey(portfolio)
  if (!key) return null
  return store.portfolios[key] ?? null
}

export function withActivePortfolio(store: TeacherDraftStore, portfolio: string): TeacherDraftStore {
  const activePortfolio = portfolio.slice(0, PORTFOLIO_LABEL_MAX)
  if (store.activePortfolio === activePortfolio) return store
  return { ...store, activePortfolio }
}

export function withSavedBand(
  store: TeacherDraftStore,
  portfolio: string,
  bandId: PracticeBandId,
): TeacherDraftStore {
  const key = portfolioKey(portfolio)
  if (!key || !isPracticeBandId(bandId)) return store
  const activePortfolio = portfolio.slice(0, PORTFOLIO_LABEL_MAX)
  if (store.portfolios[key] === bandId && store.activePortfolio === activePortfolio) return store
  return {
    activePortfolio,
    portfolios: { ...store.portfolios, [key]: bandId },
  }
}

export function withClearedBand(store: TeacherDraftStore, portfolio: string): TeacherDraftStore {
  const key = portfolioKey(portfolio)
  if (!key) return store
  const activePortfolio = portfolio.slice(0, PORTFOLIO_LABEL_MAX)
  if (!(key in store.portfolios) && store.activePortfolio === activePortfolio) return store
  const portfolios = { ...store.portfolios }
  delete portfolios[key]
  return { activePortfolio, portfolios }
}
