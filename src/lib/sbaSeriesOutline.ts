/**
 * Blank SBA series outline: one shared portfolio theme, four pieces, and
 * research-workbook prompt lines. Values stay on this device
 * (`va-nexus:sba-series-outline:v1`), same family as the SBA checklist and
 * the piece switcher. Nothing here is written to Supabase.
 *
 * The research workbook is one workbook for the portfolio, so its prompt
 * lines are shared. Piece fields and the per-piece checklist are keyed by
 * piece 1–4.
 */

import { SLOT_IDS, type SlotId } from './sbaArtworkSlots.ts'

export const SBA_SERIES_OUTLINE_KEY = 'va-nexus:sba-series-outline:v1'
export const MAX_OUTLINE_TEXT = 4000

export const RWB_STEP_KEYS = ['theme', 'research', 'sketch', 'media', 'making', 'reflection'] as const
export type RwbStepKey = (typeof RWB_STEP_KEYS)[number]

export type OutlinePieceType = 'artwork' | 'criticalStudy' | 'unset'
export type OutlinePieceStatus = 'notStarted' | 'inProgress' | 'draftDone' | 'final'

export const PORTFOLIO_KEYS = ['themeTitle', 'themeWhy', 'keywords', 'arc1', 'arc2', 'arc3', 'arc4'] as const
export type PortfolioKey = (typeof PORTFOLIO_KEYS)[number]

export const PIECE_TEXT_KEYS = ['workingTitle', 'media', 'size', 'linkToTheme', 'progressionFromPrev'] as const
export type PieceTextKey = (typeof PIECE_TEXT_KEYS)[number]

export type PortfolioFields = Record<PortfolioKey, string>

export type PieceFields = {
  type: OutlinePieceType
  workingTitle: string
  media: string
  size: string
  linkToTheme: string
  status: OutlinePieceStatus
  progressionFromPrev: string
}

export type OutlineState = {
  portfolio: PortfolioFields
  pieces: Record<SlotId, PieceFields>
  /** `${stepKey}:${index}` → student line. Shared across the four pieces. */
  rwb: Record<string, string>
  checklist: Record<SlotId, Record<string, boolean>>
}

export type SlotPieceType = 'artwork' | 'criticalStudy' | null

type OutlineStorage = Pick<Storage, 'getItem' | 'setItem'>

const RWB_KEY = /^(theme|research|sketch|media|making|reflection):(\d{1,2})$/
const CHECK_ID = /^[a-z0-9-]{1,40}$/

export function isRwbStepKey(value: string): value is RwbStepKey {
  return (RWB_STEP_KEYS as readonly string[]).includes(value)
}

export function rwbPromptKey(step: RwbStepKey, index: number): string {
  return `${step}:${index}`
}

export function isOutlinePieceType(value: unknown): value is OutlinePieceType {
  return value === 'artwork' || value === 'criticalStudy' || value === 'unset'
}

export function isOutlinePieceStatus(value: unknown): value is OutlinePieceStatus {
  return value === 'notStarted' || value === 'inProgress' || value === 'draftDone' || value === 'final'
}

export function emptyPortfolio(): PortfolioFields {
  return { themeTitle: '', themeWhy: '', keywords: '', arc1: '', arc2: '', arc3: '', arc4: '' }
}

export function emptyPiece(): PieceFields {
  return {
    type: 'unset',
    workingTitle: '',
    media: '',
    size: '',
    linkToTheme: '',
    status: 'notStarted',
    progressionFromPrev: '',
  }
}

export function emptyOutline(): OutlineState {
  return {
    portfolio: emptyPortfolio(),
    pieces: { 1: emptyPiece(), 2: emptyPiece(), 3: emptyPiece(), 4: emptyPiece() },
    rwb: {},
    checklist: { 1: {}, 2: {}, 3: {}, 4: {} },
  }
}

function clip(value: string): string {
  return value.length > MAX_OUTLINE_TEXT ? value.slice(0, MAX_OUTLINE_TEXT) : value
}

function parsePortfolio(raw: unknown): PortfolioFields {
  const portfolio = emptyPortfolio()
  if (!raw || typeof raw !== 'object') return portfolio
  const record = raw as Record<string, unknown>
  for (const key of PORTFOLIO_KEYS) {
    if (typeof record[key] === 'string') portfolio[key] = clip(record[key])
  }
  return portfolio
}

function parsePiece(raw: unknown): PieceFields {
  const piece = emptyPiece()
  if (!raw || typeof raw !== 'object') return piece
  const record = raw as Record<string, unknown>
  if (isOutlinePieceType(record.type)) piece.type = record.type
  if (isOutlinePieceStatus(record.status)) piece.status = record.status
  for (const key of PIECE_TEXT_KEYS) {
    if (typeof record[key] === 'string') piece[key] = clip(record[key])
  }
  return piece
}

function parseRwb(raw: unknown): Record<string, string> {
  const rwb: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return rwb
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'string' || value.length === 0) continue
    const match = RWB_KEY.exec(key)
    if (!match) continue
    const index = Number(match[2])
    if (index > 15) continue
    rwb[key] = clip(value)
  }
  return rwb
}

function parseChecklist(raw: unknown): Record<SlotId, Record<string, boolean>> {
  const checklist: Record<SlotId, Record<string, boolean>> = { 1: {}, 2: {}, 3: {}, 4: {} }
  if (!raw || typeof raw !== 'object') return checklist
  const record = raw as Record<string, unknown>
  for (const id of SLOT_IDS) {
    const slot = record[String(id)]
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) continue
    const ticks: Record<string, boolean> = {}
    for (const [itemId, checked] of Object.entries(slot as Record<string, unknown>)) {
      if (checked === true && CHECK_ID.test(itemId)) ticks[itemId] = true
    }
    checklist[id] = ticks
  }
  return checklist
}

export function loadSbaSeriesOutline(storage: OutlineStorage = localStorage): OutlineState {
  try {
    const raw = storage.getItem(SBA_SERIES_OUTLINE_KEY)
    if (!raw) return emptyOutline()
    const parsed = JSON.parse(raw) as { portfolio?: unknown; pieces?: unknown; rwb?: unknown; checklist?: unknown }
    const pieces = emptyOutline().pieces
    const pieceRaw = parsed.pieces
    if (pieceRaw && typeof pieceRaw === 'object') {
      const record = pieceRaw as Record<string, unknown>
      for (const id of SLOT_IDS) pieces[id] = parsePiece(record[String(id)])
    }
    return {
      portfolio: parsePortfolio(parsed.portfolio),
      pieces,
      rwb: parseRwb(parsed.rwb),
      checklist: parseChecklist(parsed.checklist),
    }
  } catch {
    return emptyOutline()
  }
}

function compactPiece(piece: PieceFields): Partial<PieceFields> | undefined {
  const out: Partial<PieceFields> = {}
  if (piece.type !== 'unset') out.type = piece.type
  if (piece.status !== 'notStarted') out.status = piece.status
  for (const key of PIECE_TEXT_KEYS) {
    if (piece[key]) out[key] = piece[key]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function saveSbaSeriesOutline(state: OutlineState, storage: OutlineStorage = localStorage): void {
  try {
    const portfolio: Partial<PortfolioFields> = {}
    for (const key of PORTFOLIO_KEYS) {
      if (state.portfolio[key]) portfolio[key] = state.portfolio[key]
    }
    const pieces: Partial<Record<string, Partial<PieceFields>>> = {}
    for (const id of SLOT_IDS) {
      const compact = compactPiece(state.pieces[id])
      if (compact) pieces[String(id)] = compact
    }
    const checklist: Record<string, Record<string, true>> = {}
    for (const id of SLOT_IDS) {
      const ticks: Record<string, true> = {}
      for (const [itemId, checked] of Object.entries(state.checklist[id])) {
        if (checked) ticks[itemId] = true
      }
      if (Object.keys(ticks).length > 0) checklist[String(id)] = ticks
    }
    storage.setItem(
      SBA_SERIES_OUTLINE_KEY,
      JSON.stringify({ version: 1, portfolio, pieces, rwb: state.rwb, checklist }),
    )
  } catch {
    /* storage full / disabled */
  }
}

export function pieceHasOutlineWork(state: OutlineState, slot: SlotId): boolean {
  const piece = state.pieces[slot]
  if (piece.type !== 'unset' || piece.status !== 'notStarted') return true
  if (PIECE_TEXT_KEYS.some((key) => piece[key].trim().length > 0)) return true
  return Object.values(state.checklist[slot]).some(Boolean)
}

export function withPortfolio(state: OutlineState, key: PortfolioKey, value: string): OutlineState {
  if (state.portfolio[key] === value) return state
  return { ...state, portfolio: { ...state.portfolio, [key]: clip(value) } }
}

export function withPieceText(state: OutlineState, slot: SlotId, key: PieceTextKey, value: string): OutlineState {
  const piece = state.pieces[slot]
  if (piece[key] === value) return state
  return { ...state, pieces: { ...state.pieces, [slot]: { ...piece, [key]: clip(value) } } }
}

export function withPieceType(state: OutlineState, slot: SlotId, type: OutlinePieceType): OutlineState {
  const piece = state.pieces[slot]
  if (piece.type === type) return state
  return { ...state, pieces: { ...state.pieces, [slot]: { ...piece, type } } }
}

export function withPieceStatus(state: OutlineState, slot: SlotId, status: OutlinePieceStatus): OutlineState {
  const piece = state.pieces[slot]
  if (piece.status === status) return state
  return { ...state, pieces: { ...state.pieces, [slot]: { ...piece, status } } }
}

export function withRwbPrompt(state: OutlineState, step: RwbStepKey, index: number, value: string): OutlineState {
  if (!Number.isInteger(index) || index < 0 || index > 15) return state
  const key = rwbPromptKey(step, index)
  const nextValue = clip(value)
  if (!nextValue) {
    if (!(key in state.rwb)) return state
    const rwb = { ...state.rwb }
    delete rwb[key]
    return { ...state, rwb }
  }
  if (state.rwb[key] === nextValue) return state
  return { ...state, rwb: { ...state.rwb, [key]: nextValue } }
}

export function withChecklistToggle(state: OutlineState, slot: SlotId, itemId: string): OutlineState {
  if (!CHECK_ID.test(itemId)) return state
  const slotChecks = state.checklist[slot]
  const checklist = { ...state.checklist, [slot]: { ...slotChecks, [itemId]: !slotChecks[itemId] } }
  if (!checklist[slot][itemId]) delete checklist[slot][itemId]
  return { ...state, checklist }
}

/** Piece {n} vs piece {prev} — copy comes from the locale JSON. */
export function fillProgressionPrompt(template: string, pieceNo: number): string {
  return template.replaceAll('{n}', String(pieceNo)).replaceAll('{prev}', String(Math.max(1, pieceNo - 1)))
}

/**
 * The outline and the piece switcher both remember type. A saved outline type
 * wins; otherwise a type already chosen on the switcher is copied in.
 */
export function reconcilePieceTypes(
  state: OutlineState,
  slotTypes: Record<SlotId, SlotPieceType>,
): { state: OutlineState; slotTypes: Record<SlotId, SlotPieceType>; outlineChanged: boolean; slotsChanged: boolean } {
  let next = state
  const types: Record<SlotId, SlotPieceType> = { ...slotTypes }
  let outlineChanged = false
  let slotsChanged = false
  for (const id of SLOT_IDS) {
    const fromOutline = next.pieces[id].type
    const fromSlot = types[id]
    if (fromOutline === 'artwork' || fromOutline === 'criticalStudy') {
      if (fromSlot !== fromOutline) {
        types[id] = fromOutline
        slotsChanged = true
      }
    } else if (fromSlot) {
      next = withPieceType(next, id, fromSlot)
      outlineChanged = true
    }
  }
  return { state: next, slotTypes: types, outlineChanged, slotsChanged }
}
