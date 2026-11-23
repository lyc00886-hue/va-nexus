import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyClassShellMarks, emptyClassShellStore, handleClassInvite, resetLocalInviteStoreForTests } from '../../api/class-invite.ts'

const owner = 'owner1234'

describe('class shell marks', () => {
  it('keeps a confirmed sentence on the class record and does not rank', () => {
    const listed = applyClassShellMarks(emptyClassShellStore(), 'mark-list', { classId: 'demo-f4', ownerId: owner })
    assert.equal(listed.result.ok, true)
    assert.deepEqual(listed.result.marks, [])
    const saved = applyClassShellMarks(listed.store, 'mark-confirm', {
      classId: 'demo-f4',
      ownerId: owner,
      id: ' hw-demo-a ',
      mark: '  saved sentence  ',
    })
    assert.equal(saved.result.ok, true)
    assert.deepEqual(saved.result.marks, [{ id: 'hw-demo-a', classId: 'demo-f4', mark: 'saved sentence' }])
    const other = applyClassShellMarks(saved.store, 'mark-list', { classId: 'class-other', ownerId: owner })
    assert.deepEqual(other.result.marks, [])
    const again = applyClassShellMarks(saved.store, 'mark-confirm', {
      classId: 'demo-f4',
      ownerId: owner,
      id: 'hw-demo-a',
      mark: 'saved again',
    })
    assert.equal(again.result.marks?.length, 1)
    assert.equal(again.result.marks?.[0]?.mark, 'saved again')
    assert.equal(
      applyClassShellMarks(saved.store, 'mark-confirm', { classId: 'demo-f4', ownerId: 'short', id: 'hw-demo-a', mark: 'x' }).result.ok,
      false,
    )
    assert.equal(applyClassShellMarks(saved.store, 'score', { classId: 'demo-f4', ownerId: owner }).result.reason, 'action')
  })

  it('stores the confirmed sentence on the existing invite route', async () => {
    resetLocalInviteStoreForTests()
    const saved = await handleClassInvite(
      new Request('http://localhost/api/class-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-confirm',
          classId: 'demo-f4',
          ownerId: owner,
          id: 'hw-demo-a',
          mark: 'saved sentence',
        }),
      }),
    )
    assert.equal(saved.status, 200)
    const confirmed = (await saved.json()) as { marks?: { id: string; mark: string }[] }
    assert.equal(confirmed.marks?.[0]?.id, 'hw-demo-a')
    assert.equal(confirmed.marks?.[0]?.mark, 'saved sentence')
    const listed = await handleClassInvite(
      new Request('http://localhost/api/class-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'mark-list', classId: 'demo-f4', ownerId: owner }),
      }),
    )
    assert.equal(listed.status, 200)
    const body = (await listed.json()) as { marks?: { mark: string }[] }
    assert.equal(body.marks?.[0]?.mark, 'saved sentence')
  })
})
