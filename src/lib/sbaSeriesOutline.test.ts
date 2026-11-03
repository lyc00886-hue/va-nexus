import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  SBA_SERIES_OUTLINE_KEY,
  emptyOutline,
  fillProgressionPrompt,
  loadSbaSeriesOutline,
  pieceHasOutlineWork,
  reconcilePieceTypes,
  saveSbaSeriesOutline,
  withChecklistToggle,
  withPieceText,
  withPieceType,
  withPortfolio,
  withRwbPrompt,
} from './sbaSeriesOutline.ts'
import {
  OUTLINE_MEDIA_ROW_IDS,
  OUTLINE_PROGRESS_IDS,
  outlineAbilityAnswers,
  outlineStepFillCounts,
} from './sbaSeriesOutlineProgress.ts'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

function shape(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) return { kind: 'strings', length: value.length }
    return value.map((item) => shape(item))
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, shape(record[key])]))
  }
  return typeof value
}

describe('sba series outline store', () => {
  it('starts empty for the portfolio and every piece', () => {
    const state = loadSbaSeriesOutline(memoryStorage())
    assert.deepEqual(state, emptyOutline())
    assert.equal(pieceHasOutlineWork(state, 1), false)
  })

  it('keeps the portfolio theme shared and isolates piece text', () => {
    const storage = memoryStorage()
    let state = withPortfolio(emptyOutline(), 'themeTitle', 'Harbour light')
    state = withPieceText(state, 2, 'workingTitle', 'Pier study')
    state = withPieceText(state, 2, 'progressionFromPrev', 'Darker ink than piece 1')
    state = withChecklistToggle(state, 2, 'theme-link')
    state = withRwbPrompt(state, 'research', 0, 'A local printmaker')
    saveSbaSeriesOutline(state, storage)
    const loaded = loadSbaSeriesOutline(storage)
    assert.equal(loaded.portfolio.themeTitle, 'Harbour light')
    assert.equal(loaded.pieces[1].workingTitle, '')
    assert.equal(loaded.pieces[2].workingTitle, 'Pier study')
    assert.equal(loaded.pieces[2].progressionFromPrev, 'Darker ink than piece 1')
    assert.equal(loaded.checklist[1]['theme-link'], undefined)
    assert.equal(loaded.checklist[2]['theme-link'], true)
    assert.equal(loaded.rwb['research:0'], 'A local printmaker')
    assert.equal(pieceHasOutlineWork(loaded, 1), false)
    assert.equal(pieceHasOutlineWork(loaded, 2), true)
    assert.equal(storage.getItem(SBA_SERIES_OUTLINE_KEY)?.includes('"version":1'), true)
  })

  it('drops corrupt storage, bad enums, and unknown prompt keys', () => {
    const storage = memoryStorage({
      [SBA_SERIES_OUTLINE_KEY]: JSON.stringify({
        portfolio: { themeTitle: 'Ok', themeWhy: 4 },
        pieces: { '2': { type: 'ranking', status: 'final', workingTitle: 'Keep' }, '9': { workingTitle: 'No' } },
        rwb: { 'theme:0': 'Line', 'nope:1': 'Drop', 'media:20': 'Drop' },
        checklist: { '1': { 'theme-link': true, 'Bad Id': true }, '3': ['theme-link'] },
      }),
    })
    const state = loadSbaSeriesOutline(storage)
    assert.equal(state.portfolio.themeTitle, 'Ok')
    assert.equal(state.portfolio.themeWhy, '')
    assert.equal(state.pieces[2].type, 'unset')
    assert.equal(state.pieces[2].status, 'final')
    assert.equal(state.pieces[2].workingTitle, 'Keep')
    assert.equal(state.pieces[1].workingTitle, '')
    assert.deepEqual(state.rwb, { 'theme:0': 'Line' })
    assert.deepEqual(state.checklist[1], { 'theme-link': true })
    assert.deepEqual(state.checklist[3], {})
  })

  it('falls back when storage is not JSON', () => {
    const storage = memoryStorage({ [SBA_SERIES_OUTLINE_KEY]: '{not json' })
    assert.deepEqual(loadSbaSeriesOutline(storage), emptyOutline())
  })

  it('fills the progression prompt for piece 2 onward', () => {
    assert.equal(fillProgressionPrompt('Piece {n} vs piece {prev}: ________________', 3), 'Piece 3 vs piece 2: ________________')
    assert.equal(fillProgressionPrompt('作品 {n} 相對作品 {prev}：________________', 2), '作品 2 相對作品 1：________________')
  })

  it('lets a saved outline type win, and otherwise adopts the switcher', () => {
    const blank = emptyOutline()
    const fromSwitcher = reconcilePieceTypes(blank, { 1: 'artwork', 2: null, 3: null, 4: null })
    assert.equal(fromSwitcher.outlineChanged, true)
    assert.equal(fromSwitcher.state.pieces[1].type, 'artwork')
    assert.equal(fromSwitcher.slotsChanged, false)

    const saved = withPieceType(blank, 2, 'criticalStudy')
    const fromOutline = reconcilePieceTypes(saved, { 1: null, 2: 'artwork', 3: null, 4: null })
    assert.equal(fromOutline.slotsChanged, true)
    assert.equal(fromOutline.slotTypes[2], 'criticalStudy')
    assert.equal(fromOutline.state.pieces[2].type, 'criticalStudy')
  })
})

describe('sba series outline progress ids', () => {
  it('leaves steps 1–5 at zero until a blank is filled', () => {
    const counts = outlineStepFillCounts(emptyOutline())
    assert.deepEqual(
      counts.map((step) => step.filled),
      [0, 0, 0, 0, 0],
    )
    assert.deepEqual(
      counts.map((step) => step.key),
      ['theme', 'research', 'sketch', 'media', 'making'],
    )
    assert.equal(counts[3].required, 27)
  })

  it('counts a portfolio theme once, even when the matching workbook line is also filled', () => {
    let state = withPortfolio(emptyOutline(), 'themeTitle', 'Harbour light')
    state = withRwbPrompt(state, 'theme', 0, 'Theme and keywords line')
    const answers = outlineAbilityAnswers(state)
    assert.equal(answers.fields.theme, 'Harbour light')
    assert.equal(answers.fields.keywords, undefined)
    assert.equal(outlineStepFillCounts(state)[0].filled, 1)
  })

  it('maps each research and sketch prompt onto one required id', () => {
    let state = emptyOutline()
    state = withRwbPrompt(state, 'research', 2, 'Describe the marks')
    state = withRwbPrompt(state, 'sketch', 1, 'A, B, and C')
    const answers = outlineAbilityAnswers(state)
    assert.equal(answers.fields['feldman-describe'], 'Describe the marks')
    assert.equal(answers.fields['feldman-analyse'], undefined)
    assert.equal(answers.fields['feldman-interpret'], undefined)
    assert.equal(answers.fields['feldman-judge'], undefined)
    assert.equal(answers.fields['option-a'], 'A, B, and C')
    assert.equal(answers.fields['option-b'], undefined)
    assert.equal(outlineStepFillCounts(state)[1].filled, 1)
    assert.equal(outlineStepFillCounts(state)[2].filled, 1)
  })

  it('puts the single media trial on row 0 so step 4 can leave zero', () => {
    const state = withRwbPrompt(emptyOutline(), 'media', 0, 'Does size change the mark?')
    const answers = outlineAbilityAnswers(state)
    assert.deepEqual(answers.rowsByStep[4], [{ question: 'Does size change the mark?' }])
    assert.equal(answers.fields.question, undefined)
    const step4 = outlineStepFillCounts(state)[3]
    assert.equal(step4.filled, 1)
    assert.equal(step4.required, 27)
  })

  it('counts a piece title toward step 5 without copying it onto the other pieces', () => {
    const state = withPieceText(emptyOutline(), 3, 'workingTitle', 'Night ferry')
    const answers = outlineAbilityAnswers(state)
    assert.equal(answers.fields.title, 'Night ferry')
    assert.equal(answers.fields['piece-no'], undefined)
    assert.equal(outlineStepFillCounts(state)[4].filled, 1)
    assert.equal(state.pieces[1].workingTitle, '')
  })

  it('uses piece 2 progression for next-plan and leaves piece 1 as a starting note only', () => {
    const piece1 = withPieceText(emptyOutline(), 1, 'progressionFromPrev', 'Starting from the pier')
    assert.equal(outlineAbilityAnswers(piece1).fields['next-plan'], undefined)
    const piece2 = withPieceText(emptyOutline(), 2, 'progressionFromPrev', 'More drawn than piece 1')
    assert.equal(outlineAbilityAnswers(piece2).fields['next-plan'], 'More drawn than piece 1')
  })

  it('ignores checklist ticks, whitespace, and ids this outline does not define', () => {
    let state = withChecklistToggle(emptyOutline(), 1, 'theme-link')
    state = withPortfolio(state, 'keywords', '   ')
    state = withPortfolio(state, 'arc2', 'A second beat')
    const answers = outlineAbilityAnswers(state)
    assert.deepEqual(answers.fields, {})
    assert.deepEqual(answers.rowsByStep, {})
    assert.deepEqual(
      outlineStepFillCounts(state).map((step) => step.filled),
      [0, 0, 0, 0, 0],
    )
    for (const id of Object.keys(answers.fields)) {
      assert.equal((OUTLINE_PROGRESS_IDS as readonly string[]).includes(id), true)
    }
  })

  it('only emits known progress ids', () => {
    let state = emptyOutline()
    state = withPortfolio(state, 'themeTitle', 'A')
    state = withPortfolio(state, 'themeWhy', 'B')
    state = withPortfolio(state, 'keywords', 'C')
    state = withPortfolio(state, 'arc1', 'D')
    state = withPieceText(state, 1, 'workingTitle', 'E')
    state = withPieceText(state, 1, 'media', 'ink')
    state = withPieceText(state, 1, 'size', 'A4')
    state = withPieceText(state, 1, 'linkToTheme', 'the pier')
    for (const [step, index] of [
      ['theme', 2],
      ['theme', 4],
      ['research', 0],
      ['making', 0],
      ['making', 4],
      ['reflection', 0],
      ['media', 3],
    ] as const) {
      state = withRwbPrompt(state, step, index, `${step}-${index}`)
    }
    const answers = outlineAbilityAnswers(state)
    for (const id of Object.keys(answers.fields)) {
      assert.equal((OUTLINE_PROGRESS_IDS as readonly string[]).includes(id), true, id)
    }
    const row = answers.rowsByStep[4]?.[0] ?? {}
    for (const id of Object.keys(row)) {
      assert.equal((OUTLINE_MEDIA_ROW_IDS as readonly string[]).includes(id), true, id)
    }
    assert.equal(answers.fields['linkToTheme'], undefined)
    assert.equal(answers.fields['media-size'], 'ink / A4')
    assert.ok(outlineStepFillCounts(state).slice(0, 5).some((step) => step.filled > 0))
    assert.equal(Object.keys(answers.fields).some((id) => id.startsWith('self-')), false)
  })
})

describe('sba series outline locale parity', () => {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../content')
  const files = {
    'zh-Hant': JSON.parse(readFileSync(resolve(dir, 'sba-series-outline.json'), 'utf8')) as Record<string, unknown>,
    en: JSON.parse(readFileSync(resolve(dir, 'sba-series-outline.en.json'), 'utf8')) as Record<string, unknown>,
    'zh-Hans': JSON.parse(readFileSync(resolve(dir, 'sba-series-outline.zh-Hans.json'), 'utf8')) as Record<string, unknown>,
  }

  it('keeps the same structure, ids, and step keys in en / zh-Hant / zh-Hans', () => {
    assert.deepEqual(shape(files.en), shape(files['zh-Hant']))
    assert.deepEqual(shape(files['zh-Hans']), shape(files['zh-Hant']))
    for (const [locale, file] of Object.entries(files)) {
      const meta = file.meta as { locale: string }
      assert.equal(meta.locale, locale)
      const sections = (file.rwbOutline as { sections: { stepKey: string; prompts: string[] }[] }).sections
      assert.deepEqual(
        sections.map((section) => section.stepKey),
        ['theme', 'research', 'sketch', 'media', 'making', 'reflection'],
      )
      assert.deepEqual(
        sections.map((section) => section.prompts.length),
        [5, 5, 3, 4, 5, 5],
      )
      const items = (file.perPieceChecklist as { items: { id: string }[] }).items
      assert.deepEqual(
        items.map((item) => item.id),
        ['theme-link', 'research-note', 'sketch-choice', 'media-trial', 'making-evidence', 'type-set', 'reflect'],
      )
      const pieces = file.pieces as { pieceNo: number; type: string; status: string; workingTitle: string }[]
      assert.deepEqual(
        pieces.map((piece) => [piece.pieceNo, piece.type, piece.status, piece.workingTitle]),
        [
          [1, 'unset', 'notStarted', ''],
          [2, 'unset', 'notStarted', ''],
          [3, 'unset', 'notStarted', ''],
          [4, 'unset', 'notStarted', ''],
        ],
      )
    }
  })
})
