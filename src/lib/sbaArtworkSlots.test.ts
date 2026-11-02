import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  SBA_ARTWORK_SLOTS_KEY,
  assignPieceSlot,
  emptySbaArtworkSlots,
  fillSlotCopy,
  loadSbaArtworkSlots,
  migrateGuideChecks,
  saveSbaArtworkSlots,
} from './sbaArtworkSlots.ts'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

describe('sba artwork slots', () => {
  it('starts on piece 1 with no types', () => {
    const state = loadSbaArtworkSlots(memoryStorage())
    assert.deepEqual(state, emptySbaArtworkSlots())
  })

  it('round-trips the active piece and a type on each slot', () => {
    const storage = memoryStorage()
    const next = emptySbaArtworkSlots()
    next.active = 3
    next.types[1] = 'artwork'
    next.types[3] = 'criticalStudy'
    next.evidenceSlots['note-a'] = 3
    saveSbaArtworkSlots(next, storage)
    assert.equal(storage.getItem(SBA_ARTWORK_SLOTS_KEY)?.includes('"active":3'), true)
    assert.deepEqual(loadSbaArtworkSlots(storage), next)
  })

  it('drops invalid slots, types, and evidence tags', () => {
    const storage = memoryStorage({
      [SBA_ARTWORK_SLOTS_KEY]: JSON.stringify({
        active: 9,
        types: { '1': 'ranking', '2': 'artwork', '3': 'criticalStudy', '4': '' },
        evidenceSlots: { a: 2, b: 5, c: 'artwork' },
      }),
    })
    const state = loadSbaArtworkSlots(storage)
    assert.equal(state.active, 1)
    assert.equal(state.types[1], null)
    assert.equal(state.types[2], 'artwork')
    assert.equal(state.types[3], 'criticalStudy')
    assert.equal(state.types[4], null)
    assert.deepEqual(state.evidenceSlots, { a: 2 })
  })

  it('falls back when storage is corrupt', () => {
    const storage = memoryStorage({ [SBA_ARTWORK_SLOTS_KEY]: '{not json' })
    assert.deepEqual(loadSbaArtworkSlots(storage), emptySbaArtworkSlots())
  })

  it('assigns explicit slots, then the on-device map, then piece 1', () => {
    const stored = emptySbaArtworkSlots()
    stored.evidenceSlots['cloud-2'] = 2
    const rows = assignPieceSlot(
      [
        { id: 'local-4', slot: 4 },
        { id: 'cloud-2' },
        { id: 'legacy' },
        { id: 'bad', slot: 8 },
      ],
      stored,
    )
    assert.deepEqual(
      rows.map((row) => row.slot),
      [4, 2, 1, 1],
    )
  })

  it('fills the {n} token in switcher copy', () => {
    assert.equal(fillSlotCopy('切換至第 {n} 件作品／評賞', 2), '切換至第 2 件作品／評賞')
    assert.equal(fillSlotCopy('Piece {n} of 4', 4), 'Piece 4 of 4')
  })

  it('keeps a flat checklist on piece 1 and nests later pieces', () => {
    assert.deepEqual(migrateGuideChecks({ '1': ['th-c1'], '2': [] }), {
      '1': { '1': ['th-c1'], '2': [] },
    })
    assert.deepEqual(migrateGuideChecks({ '2': { '3': ['a', 1, 'b'] }, '9': { '1': ['z'] } }), {
      '2': { '3': ['a', 'b'] },
    })
    assert.deepEqual(migrateGuideChecks(null), {})
  })
})
