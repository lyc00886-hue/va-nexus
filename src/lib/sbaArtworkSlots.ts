/**
 * Four SBA portfolio pieces (artwork / critical study).
 * Guest-friendly: active piece, type, and evidence→piece tags live in localStorage.
 * sba_private_evidence has no slot column, so cloud rows are tagged on this device.
 * Legacy notes with no slot stay on piece 1.
 */

export const SBA_ARTWORK_SLOTS_KEY = 'va-nexus:sba-artwork-slots:v1'

export const SLOT_IDS = [1, 2, 3, 4] as const
export type SlotId = (typeof SLOT_IDS)[number]
export type PieceType = 'artwork' | 'criticalStudy'

export type SbaArtworkSlotsState = {
  active: SlotId
  types: Record<SlotId, PieceType | null>
  /** Evidence id → piece. Fills the gap until a slot column exists. */
  evidenceSlots: Record<string, SlotId>
}

export type GuideChecksBySlot = Record<string, Record<string, string[]>>

export type SbaArtworkSlotCopy = { short: string; full: string; empty: string }

export type SbaArtworkSlotsCopy = {
  section: { title: string; subtitle: string; hint: string }
  slots: Record<string, SbaArtworkSlotCopy>
  switcher: { label: string; aria: string; progressOf: string }
  typeToggle: { artwork: string; criticalStudy: string; chooseType: string }
}

type SlotStorage = Pick<Storage, 'getItem' | 'setItem'>

export function isSlotId(value: unknown): value is SlotId {
  return value === 1 || value === 2 || value === 3 || value === 4
}

export function isPieceType(value: unknown): value is PieceType {
  return value === 'artwork' || value === 'criticalStudy'
}

export function emptySbaArtworkSlots(): SbaArtworkSlotsState {
  return {
    active: 1,
    types: { 1: null, 2: null, 3: null, 4: null },
    evidenceSlots: {},
  }
}

export function fillSlotCopy(template: string, n: number): string {
  return template.replace(/\{n\}/g, String(n))
}

function parseTypes(raw: unknown): Record<SlotId, PieceType | null> {
  const types: Record<SlotId, PieceType | null> = { 1: null, 2: null, 3: null, 4: null }
  if (!raw || typeof raw !== 'object') return types
  const record = raw as Record<string, unknown>
  for (const id of SLOT_IDS) {
    const value = record[String(id)]
    types[id] = isPieceType(value) ? value : null
  }
  return types
}

function parseEvidenceSlots(raw: unknown): Record<string, SlotId> {
  const out: Record<string, SlotId> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, slot] of Object.entries(raw as Record<string, unknown>)) {
    if (isSlotId(slot)) out[id] = slot
  }
  return out
}

export function loadSbaArtworkSlots(storage: SlotStorage = localStorage): SbaArtworkSlotsState {
  try {
    const raw = storage.getItem(SBA_ARTWORK_SLOTS_KEY)
    if (!raw) return emptySbaArtworkSlots()
    const parsed = JSON.parse(raw) as { active?: unknown; types?: unknown; evidenceSlots?: unknown }
    return {
      active: isSlotId(parsed.active) ? parsed.active : 1,
      types: parseTypes(parsed.types),
      evidenceSlots: parseEvidenceSlots(parsed.evidenceSlots),
    }
  } catch {
    return emptySbaArtworkSlots()
  }
}

export function saveSbaArtworkSlots(state: SbaArtworkSlotsState, storage: SlotStorage = localStorage): void {
  try {
    storage.setItem(
      SBA_ARTWORK_SLOTS_KEY,
      JSON.stringify({
        active: state.active,
        types: state.types,
        evidenceSlots: state.evidenceSlots,
      }),
    )
  } catch {
    /* storage full / disabled */
  }
}

/** Prefer an explicit slot on the row; otherwise the on-device map; otherwise piece 1. */
export function assignPieceSlot<T extends { id: string; slot?: unknown }>(
  rows: T[],
  stored: SbaArtworkSlotsState = loadSbaArtworkSlots(),
): Array<Omit<T, 'slot'> & { slot: SlotId }> {
  return rows.map((row) => ({
    ...row,
    slot: isSlotId(row.slot) ? row.slot : (stored.evidenceSlots[row.id] ?? 1),
  }))
}

/**
 * Checklist ticks used to be `{ [step]: string[] }` for the single stream.
 * Nested `{ [slot]: { [step]: string[] } }` keeps each piece separate.
 * A flat map is treated as piece 1.
 */
export function migrateGuideChecks(raw: unknown): GuideChecksBySlot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length === 0) return {}
  if (entries.every(([, value]) => Array.isArray(value))) {
    const steps: Record<string, string[]> = {}
    for (const [step, ids] of entries) {
      steps[step] = (ids as unknown[]).filter((id): id is string => typeof id === 'string')
    }
    return { '1': steps }
  }
  const out: GuideChecksBySlot = {}
  for (const [slot, steps] of entries) {
    if (!isSlotId(Number(slot)) || !steps || typeof steps !== 'object' || Array.isArray(steps)) continue
    const stepMap: Record<string, string[]> = {}
    for (const [step, ids] of Object.entries(steps as Record<string, unknown>)) {
      if (Array.isArray(ids)) stepMap[step] = ids.filter((id): id is string => typeof id === 'string')
    }
    out[slot] = stepMap
  }
  return out
}
