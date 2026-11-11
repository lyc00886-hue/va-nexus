import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { researchToolFace } from './researchToolPair.ts'

const packs = [
  {
    grade: 'f4' as const,
    units: [
      { id: 'F4-U1-ORIENT', title: '中四視藝入門', nodes: [{ id: 'F4-U1-L1' }] },
      { id: 'F4-U2-DRAW-DESIGN', title: '寫生、美感同設計思維', nodes: [{ id: 'F4-U2-L1' }] },
    ],
  },
  {
    grade: 'f5' as const,
    units: [{ id: 'F5-U2-AESTHETIC', title: '美感同設計', nodes: [{ id: 'F5-U2-L1' }] }],
  },
]

describe('shared research tool unit', () => {
  it('follows the current course node and ignores which map is open', () => {
    const fromNode = researchToolFace(packs, 'F4-U2-L1')
    assert.deepEqual(fromNode, { grade: 'f4', id: 'F4-U2-DRAW-DESIGN', title: '寫生、美感同設計思維' })
    assert.deepEqual(researchToolFace(packs, 'F4-U2-L1'), fromNode)
    assert.deepEqual(researchToolFace(packs, 'F5-U2-L1'), {
      grade: 'f5',
      id: 'F5-U2-AESTHETIC',
      title: '美感同設計',
    })
    assert.deepEqual(researchToolFace(packs, null), {
      grade: 'f4',
      id: 'F4-U1-ORIENT',
      title: '中四視藝入門',
    })
    assert.deepEqual(researchToolFace(packs, 'not-a-course-node'), researchToolFace(packs, null))
  })
})
