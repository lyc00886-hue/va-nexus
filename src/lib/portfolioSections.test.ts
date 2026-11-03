import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_PORTFOLIO_SECTIONS,
  PORTFOLIO_SECTIONS_KEY,
  loadPortfolioSections,
  savePortfolioSections,
  type PortfolioSectionStorage,
} from './portfolioSections.ts'

function memoryStorage(initial: Record<string, string> = {}): PortfolioSectionStorage {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

describe('portfolio accordion sections', () => {
  it('starts with all three sections collapsed on the first visit', () => {
    assert.deepEqual(loadPortfolioSections(memoryStorage()), DEFAULT_PORTFOLIO_SECTIONS)
    assert.equal(DEFAULT_PORTFOLIO_SECTIONS.evidence, false)
    assert.equal(DEFAULT_PORTFOLIO_SECTIONS.outline, false)
    assert.equal(DEFAULT_PORTFOLIO_SECTIONS.ability, false)
  })

  it('remembers which sections were left open', () => {
    const storage = memoryStorage()
    const next = { evidence: false, outline: true, ability: true }
    savePortfolioSections(next, storage)
    assert.equal(storage.getItem(PORTFOLIO_SECTIONS_KEY)?.includes('"outline":true'), true)
    assert.deepEqual(loadPortfolioSections(storage), next)
  })

  it('keeps the default for any missing flag', () => {
    const storage = memoryStorage({
      [PORTFOLIO_SECTIONS_KEY]: JSON.stringify({ outline: true }),
    })
    assert.deepEqual(loadPortfolioSections(storage), {
      evidence: false,
      outline: true,
      ability: false,
    })
  })

  it('falls back to the first-visit defaults when storage is corrupt', () => {
    const storage = memoryStorage({ [PORTFOLIO_SECTIONS_KEY]: '{' })
    assert.deepEqual(loadPortfolioSections(storage), DEFAULT_PORTFOLIO_SECTIONS)
  })
})
