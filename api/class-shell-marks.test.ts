import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyClassShellMarks, emptyClassShellStore } from './class-shell-marks.ts'

const owner = 'owner1234'

describe('class shell marks', () => {
  it('keeps a confirmed sentence on the class and does not rank', () => {
    const listed = applyClassShellMarks(emptyClassShellStore(), 'list', { classId: 'demo-f4', ownerId: owner })
    assert.equal(listed.result.ok, true)
    assert.deepEqual(listed.result.marks, [])
    const saved = applyClassShellMarks(listed.store, 'confirm', {
      classId: 'demo-f4',
      ownerId: owner,
      id: ' hw-demo-a ',
      mark: '  已留低。  ',
    })
    assert.equal(saved.result.ok, true)
    assert.deepEqual(saved.result.marks, [{ id: 'hw-demo-a', classId: 'demo-f4', mark: '已留低。' }])
    const other = applyClassShellMarks(saved.store, 'list', { classId: 'class-other', ownerId: owner })
    assert.deepEqual(other.result.marks, [])
    const again = applyClassShellMarks(saved.store, 'confirm', {
      classId: 'demo-f4',
      ownerId: owner,
      id: 'hw-demo-a',
      mark: '再留低。',
    })
    assert.equal(again.result.marks?.length, 1)
    assert.equal(again.result.marks?.[0]?.mark, '再留低。')
    assert.equal(applyClassShellMarks(saved.store, 'confirm', { classId: 'demo-f4', ownerId: 'short', id: 'hw-demo-a', mark: 'x' }).result.ok, false)
    assert.equal(applyClassShellMarks(saved.store, 'score', { classId: 'demo-f4', ownerId: owner }).result.reason, 'action')
  })
})
