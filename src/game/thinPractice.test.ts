import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { linesReady, moveItem, orderMatches, practiceNeedsDraft, shuffledItems } from './thinPractice.ts'

describe('thin practice', () => {
  it('shuffles order items away from the answer and moves one step', () => {
    const items = ['描述', '分析', '詮釋', '評價']
    const mixed = shuffledItems(items, 'F4-U1-L1-q5')
    assert.equal(mixed.length, items.length)
    assert.deepEqual([...mixed].sort(), [...items].sort())
    assert.equal(orderMatches(mixed, items), false)
    assert.equal(orderMatches(items, items), true)
    assert.deepEqual(moveItem(items, 0, -1), items)
    assert.deepEqual(moveItem(items, 0, 1), ['分析', '描述', '詮釋', '評價'])
  })

  it('treats blank lines as unfinished and keeps match waiting', () => {
    assert.equal(linesReady(['  一句  ', '第二'], 2), true)
    assert.equal(linesReady(['一句', '   '], 2), false)
    assert.equal(linesReady(['一句'], 2), false)
    assert.equal(practiceNeedsDraft('match', null), true)
    assert.equal(practiceNeedsDraft('order', ['a'], 2), true)
    assert.equal(practiceNeedsDraft('order', ['a', 'b'], 2), false)
    assert.equal(practiceNeedsDraft('dualRead', ['左', ''], 2), true)
    assert.equal(practiceNeedsDraft('dualRead', ['左', '右'], 2), false)
    assert.equal(practiceNeedsDraft('short', [''], 1), true)
    assert.equal(practiceNeedsDraft('short', ['一句'], 1), false)
    assert.equal(practiceNeedsDraft('mcq', null), true)
    assert.equal(practiceNeedsDraft('fill', '空間'), false)
  })
})
