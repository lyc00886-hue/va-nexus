/**
 * Which portfolio accordion sections are open.
 * Separate from outline, evidence, ability-chart, and upload keys.
 */
export const PORTFOLIO_SECTIONS_KEY = 'va-nexus:portfolio-sections:v1'

export const OPEN_ABILITY_CHART_EVENT = 'va-nexus:open-ability-chart'

export const PORTFOLIO_SECTION_IDS = ['evidence', 'outline', 'ability'] as const

export type PortfolioSectionId = (typeof PORTFOLIO_SECTION_IDS)[number]

export type PortfolioSectionOpen = Record<PortfolioSectionId, boolean>

export const DEFAULT_PORTFOLIO_SECTIONS: PortfolioSectionOpen = {
  evidence: false,
  outline: false,
  ability: false,
}

export type PortfolioSectionStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function storageOr(storage?: PortfolioSectionStorage): PortfolioSectionStorage {
  return storage ?? localStorage
}

export function loadPortfolioSections(storage?: PortfolioSectionStorage): PortfolioSectionOpen {
  try {
    const raw = storageOr(storage).getItem(PORTFOLIO_SECTIONS_KEY)
    if (!raw) return { ...DEFAULT_PORTFOLIO_SECTIONS }
    const parsed = JSON.parse(raw) as Partial<PortfolioSectionOpen>
    return {
      evidence: typeof parsed.evidence === 'boolean' ? parsed.evidence : DEFAULT_PORTFOLIO_SECTIONS.evidence,
      outline: typeof parsed.outline === 'boolean' ? parsed.outline : DEFAULT_PORTFOLIO_SECTIONS.outline,
      ability: typeof parsed.ability === 'boolean' ? parsed.ability : DEFAULT_PORTFOLIO_SECTIONS.ability,
    }
  } catch {
    return { ...DEFAULT_PORTFOLIO_SECTIONS }
  }
}

export function savePortfolioSections(state: PortfolioSectionOpen, storage?: PortfolioSectionStorage): void {
  try {
    storageOr(storage).setItem(PORTFOLIO_SECTIONS_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/** Ask the portfolio accordion to open the ability-chart section and scroll to it. */
export function requestOpenAbilityChart(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_ABILITY_CHART_EVENT))
}
