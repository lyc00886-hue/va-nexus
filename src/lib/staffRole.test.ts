import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collectRoleTokens, parseStaffEmailAllowlist, resolveStaffRole } from './staffRole.ts'

describe('resolveStaffRole', () => {
  it('grants teacher and coordinator from app_metadata only', () => {
    assert.equal(resolveStaffRole({ appMetadata: { role: 'teacher' } }), 'teacher')
    assert.equal(resolveStaffRole({ appMetadata: { role: ' Coordinator ' } }), 'coordinator')
    assert.equal(resolveStaffRole({ appMetadata: { roles: ['student', 'teacher'] } }), 'teacher')
    assert.equal(resolveStaffRole({ appMetadata: { staff_role: 'coordinator' } }), 'coordinator')
  })

  it('refuses students, guests, and user-editable metadata', () => {
    assert.equal(resolveStaffRole({}), null)
    assert.equal(resolveStaffRole({ appMetadata: null, email: 'student@school.edu.hk' }), null)
    assert.equal(resolveStaffRole({ appMetadata: { role: 'student' } }), null)
    assert.equal(resolveStaffRole({ appMetadata: { role: 'admin' } }), null)
    assert.equal(resolveStaffRole({ appMetadata: { user_metadata: { role: 'teacher' } } }), null)
    assert.equal(collectRoleTokens({ user_metadata: { role: 'teacher' } }).length, 0)
  })

  it('uses the email allowlist only when no role is set', () => {
    const allowlist = parseStaffEmailAllowlist(' Teacher@School.edu.hk, coordinator@school.edu.hk ')
    assert.deepEqual(allowlist, ['teacher@school.edu.hk', 'coordinator@school.edu.hk'])
    assert.equal(
      resolveStaffRole({ email: 'teacher@school.edu.hk', allowlist }),
      'teacher',
    )
    assert.equal(
      resolveStaffRole({
        appMetadata: { role: 'student' },
        email: 'teacher@school.edu.hk',
        allowlist,
      }),
      null,
    )
    assert.equal(resolveStaffRole({ email: 'other@school.edu.hk', allowlist }), null)
    assert.deepEqual(parseStaffEmailAllowlist('teacher'), [])
  })

  it('honors a dev preview and ignores it when disabled', () => {
    assert.equal(
      resolveStaffRole({ preview: 'teacher', previewEnabled: false, appMetadata: { role: 'student' } }),
      null,
    )
    assert.equal(resolveStaffRole({ preview: 'coordinator', previewEnabled: true }), 'coordinator')
    assert.equal(
      resolveStaffRole({ preview: 'student', previewEnabled: true, appMetadata: { role: 'teacher' } }),
      null,
    )
    assert.equal(resolveStaffRole({ preview: 'hkeaa', previewEnabled: true }), null)
  })
})
