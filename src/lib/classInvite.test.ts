import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  INVITE_ALPHABET,
  applyInvite,
  emptyInviteStore,
  handleClassInvite,
  makeInviteCode,
  resetLocalInviteStoreForTests,
  type InviteStore,
} from '../../api/class-invite.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const messages = (path: string) => JSON.parse(read(path)) as Record<string, string>

const NEW_HANT = {
  'class.staff.openReal': '開真實課室',
  'class.staff.nameLabel': '課室名稱',
  'class.staff.namePlaceholder': '輸入課室名稱',
  'class.staff.sharedNote': '呢個課室同名單會同受邀請嘅同學共享，唔只留喺呢部裝置。',
  'class.staff.inviteCode': '邀請碼',
  'class.staff.copyInvite': '複製邀請碼',
  'class.staff.handInvite': '將邀請碼交給同學，由同學自己加入。系統唔會代你發出。',
  'class.staff.realChip': '真實課室',
  'class.staff.plateExampleName': '中四甲班',
  'class.staff.inviteSample': '4F7K2M',
  'class.staff.emptyInvitees': '暫時未有受邀請同學。同學用邀請碼加入之後，就會出現喺呢度。',
  'class.student.inviteTitle': '用邀請碼加入',
  'class.student.invitePlaceholder': '輸入邀請碼',
  'class.student.joinWithCode': '用邀請碼加入',
  'class.student.inviteIntro': '輸入老師交嚟嘅邀請碼，加入呢個課室。',
  'class.student.joinedHint': '你已加入呢個課室。而家可以用學生上載功課系統交功課。',
  'teacher.keepBlocks': '學校評分參考、進度參考帶（只讀）、學校參考評分（雙雷達）仍然喺同一教師殼，呢度唔改名。',
} as const

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|RELAY|raiders|學生面|学生面|教師面|教师面|Grok|Duolingo|Feldman|DAIE|Soft Coord|Soft QA|Soft SCOUT|generate/

function countPoint(value: string, point: number): number {
  return [...value].filter((char) => char.codePointAt(0) === point).length
}

describe('shared classroom invite', () => {
  it('shares a room between a teacher and a classmate without sending the code', () => {
    const ownerId = 'owner1234'
    const memberId = 'member123'
    const created = applyInvite(emptyInviteStore(), 'create', {
      ownerId,
      name: '  午後課  ',
      id: 'room12345',
      code: 'K7M2Q9',
    })
    assert.equal(created.result.ok, true)
    assert.equal(created.result.room?.name, '午後課')
    assert.equal(created.result.room?.code, 'K7M2Q9')
    assert.equal(created.result.room?.members.length, 0)
    assert.notEqual(created.result.room?.code, '4F7K2M')

    const again = applyInvite(created.store, 'create', {
      ownerId,
      name: '午後課',
      id: 'room99999',
      code: 'ABCDEF',
    })
    assert.equal(again.result.room?.id, 'room12345')
    assert.equal(again.store.rooms.length, 1)

    const missing = applyInvite(created.store, 'join', { code: 'ZZZZZZ', memberId })
    assert.equal(missing.result.ok, false)

    const joined = applyInvite(created.store, 'join', { code: 'k7m2q9', memberId })
    assert.equal(joined.result.ok, true)
    assert.equal(joined.result.room?.ownerId, '')
    assert.deepEqual(joined.result.room?.members, [{ id: memberId }])
    const repeat = applyInvite(joined.store, 'join', { code: 'K7M2Q9', memberId })
    assert.equal(repeat.store.rooms[0]?.members.length, 1)

    const early = applyInvite(created.store, 'submit', {
      code: 'K7M2Q9',
      memberId,
      assignmentId: 'demo-november',
      fileName: 'work.pdf',
    })
    assert.equal(early.result.ok, false)

    const handed = applyInvite(joined.store, 'submit', {
      code: 'K7M2Q9',
      memberId,
      assignmentId: 'demo-november',
      fileName: 'work.pdf',
    })
    assert.equal(handed.result.room?.submissions.length, 1)
    const replaced = applyInvite(handed.store, 'submit', {
      code: 'K7M2Q9',
      memberId,
      assignmentId: 'demo-november',
      fileName: 'whole.pdf',
    })
    assert.equal(replaced.store.rooms[0]?.submissions.length, 1)
    assert.equal(replaced.store.rooms[0]?.submissions[0]?.fileName, 'whole.pdf')

    const other = applyInvite(replaced.store, 'list', { ownerId: 'otherowner' })
    assert.deepEqual(other.result.rooms, [])
    const mine = applyInvite(replaced.store, 'list', { ownerId })
    assert.equal(mine.result.rooms?.length, 1)
    assert.equal(mine.result.rooms?.[0]?.members.length, 1)
    assert.equal(mine.result.rooms?.[0]?.submissions[0]?.fileName, 'whole.pdf')

    const published = applyInvite(replaced.store, 'publish', {
      ownerId,
      id: 'room12345',
      assignmentId: 'assign-1234',
      title: '課後練習',
      due: '2026年12月1日',
      instructions: '',
      attach: 'paper',
    })
    assert.equal(published.result.room?.assignments.length, 1)
    const stranger = applyInvite(replaced.store, 'publish', {
      ownerId: 'otherowner',
      id: 'room12345',
      assignmentId: 'assign-9999',
      title: '課後練習',
      due: '2026年12月1日',
      instructions: '',
      attach: 'none',
    })
    assert.equal(stranger.result.ok, false)

    const blank = applyInvite(emptyInviteStore(), 'create', {
      ownerId,
      name: '   ',
      id: 'room12345',
      code: 'K7M2Q9',
    })
    assert.equal(blank.result.ok, false)
    assert.equal(makeInviteCode(() => 0), INVITE_ALPHABET[0].repeat(6))
    assert.equal(read('api/class-invite.ts').includes('mailto:'), false)
    assert.equal(read('api/class-invite.ts').includes('nodemailer'), false)
  })

  it('keeps the new zh-Hant lines on the official glyphs and off the plate defaults', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    let de = 0
    let ba = 0
    let se = 0
    let lai = 0
    let come = 0
    let zhen = 0
    let lei = 0
    for (const [key, value] of Object.entries(NEW_HANT)) {
      assert.equal(hant[key], value, key)
      assert.equal(Buffer.from(hant[key], 'utf8').equals(Buffer.from(value, 'utf8')), true, key)
      assert.equal(en[key].trim() !== '', true, key)
      assert.equal(hans[key].trim() !== '', true, key)
      assert.equal(BANNED.test(hant[key]), false, key)
      assert.equal(BANNED.test(en[key]), false, key)
      assert.equal(BANNED.test(hans[key]), false, key)
      assert.equal(/[嘅咗唔喺嚟睇畀]/.test(hans[key]), false, key)
      de += countPoint(value, 0x7684)
      ba += countPoint(value, 0x628a)
      se += countPoint(value, 0x5572)
      lai += countPoint(value, 0x4f86)
      come += countPoint(value, 0x6765)
      zhen += countPoint(value, 0x771e)
      lei += countPoint(value, 0x569f)
    }
    assert.deepEqual({ de, ba, se, lai, come, zhen }, { de: 0, ba: 0, se: 0, lai: 0, come: 0, zhen: 0 })
    assert.equal(lei, 1)
    assert.equal(hant['assign.staff.demoTitle'], '十一月：走進社區觀察課業')
    assert.equal(hant['class.staff.demoClass'], '中四示例班')
    assert.equal(hant['class.staff.demoClassNote'], '以下係示例課室，唔係真實學校名單。')
    assert.equal(hant['class.staff.addClass'], '加入課室')
    const faces = [
      'src/components/ClassroomManagement.tsx',
      'src/components/ClassInviteStaff.tsx',
      'src/components/HomeworkStudent.tsx',
      'src/components/HomeworkReview.tsx',
      'src/components/AssignmentPublish.tsx',
      'src/lib/classInvite.ts',
    ]
    for (const file of faces) {
      const source = read(file)
      assert.equal(source.includes('4F7K2M'), false, file)
      assert.equal(source.includes('中四甲班'), false, file)
      assert.equal(source.includes('\u7684'), false, file)
      assert.equal(source.includes('\u628a'), false, file)
      assert.equal(source.includes('\u5572'), false, file)
      assert.equal(BANNED.test(source), false, file)
      assert.equal(source.includes('/api/'), file === 'src/lib/classInvite.ts', file)
    }
    const store = emptyInviteStore()
    assert.equal((store as InviteStore).rooms.length, 0)
  })

  it('opens an existing classroom for the signed-in teacher on another device', () => {
    const deviceOwner = 'owner1234'
    const sessionUserId = 'teacher-session-1'
    const otherDevice = 'otherdev1'
    const stranger = 'stranger1'
    const created = applyInvite(emptyInviteStore(), 'create', {
      ownerId: deviceOwner,
      name: '午後課',
      id: 'room12345',
      code: 'K7M2Q9',
    })
    const joined = applyInvite(created.store, 'join', { code: 'K7M2Q9', memberId: 'member123' })
    const handed = applyInvite(joined.store, 'submit', {
      code: 'K7M2Q9',
      memberId: 'member123',
      assignmentId: 'demo-november',
      fileName: 'work.png',
    })
    assert.equal(handed.store.rooms.length, 1)
    assert.equal(handed.store.rooms[0]?.sessionUserId, '')

    const unsigned = applyInvite(handed.store, 'list', { ownerId: otherDevice })
    assert.deepEqual(unsigned.result.rooms, [])
    assert.equal(unsigned.store.rooms.length, 1)

    const claimed = applyInvite(handed.store, 'list', { ownerId: deviceOwner, sessionUserId })
    assert.equal(claimed.store.rooms[0]?.sessionUserId, sessionUserId)
    assert.equal(claimed.store.rooms.length, 1)
    assert.equal(claimed.result.rooms?.length, 1)
    assert.equal(claimed.result.rooms?.[0]?.submissions[0]?.assignmentId, 'demo-november')
    assert.equal(claimed.result.rooms?.[0]?.sessionUserId, '')

    const opened = applyInvite(claimed.store, 'list', { ownerId: otherDevice, sessionUserId })
    assert.equal(opened.result.rooms?.length, 1)
    assert.equal(opened.result.rooms?.[0]?.id, 'room12345')
    assert.equal(opened.result.rooms?.[0]?.submissions[0]?.fileName, 'work.png')
    assert.equal(opened.store.rooms.length, 1)
    assert.equal(opened.store, claimed.store)

    const hidden = applyInvite(claimed.store, 'list', { ownerId: otherDevice, sessionUserId: stranger })
    assert.deepEqual(hidden.result.rooms, [])
    const stillThere = applyInvite(claimed.store, 'list', { ownerId: deviceOwner })
    assert.equal(stillThere.result.rooms?.length, 1)

    const published = applyInvite(claimed.store, 'publish', {
      ownerId: otherDevice,
      sessionUserId,
      id: 'room12345',
      assignmentId: 'assign-1234',
      title: '課後練習',
      due: '2026年12月1日',
      instructions: '',
      attach: 'none',
    })
    assert.equal(published.result.ok, true)
    assert.equal(published.store.rooms.length, 1)
  })

  it('does not let a posted session id open another device classroom', async () => {
    resetLocalInviteStoreForTests()
    const created = await handleClassInvite(
      new Request('http://localhost/api/class-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create', ownerId: 'owner1234', name: '午後課' }),
      }),
    )
    assert.equal(created.status, 200)
    const forged = await handleClassInvite(
      new Request('http://localhost/api/class-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          ownerId: 'otherdev1',
          sessionUserId: 'teacher-session-1',
        }),
      }),
    )
    assert.equal(forged.status, 200)
    const body = (await forged.json()) as { rooms?: unknown[] }
    assert.deepEqual(body.rooms, [])
    const mine = await handleClassInvite(
      new Request('http://localhost/api/class-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'list', ownerId: 'owner1234' }),
      }),
    )
    const listed = (await mine.json()) as { rooms?: unknown[] }
    assert.equal(listed.rooms?.length, 1)
  })

  it('keeps list-open on the signed-in session and create-new on the existing button', () => {
    const client = read('src/lib/classInvite.ts')
    const page = read('src/components/ClassroomManagement.tsx')
    const sql = read('supabase/migrations/20261127_class_invite_session_owner.sql')
    const auth = read('src/lib/auth.ts')
    assert.match(client, /currentAccessToken\(\)/)
    assert.match(client, /Authorization/)
    assert.match(client, /const gen = \+\+listGen/)
    assert.match(client, /useAuth\(\)/)
    assert.equal(client.includes('sessionUserId'), false)
    assert.match(auth, /export function currentAccessToken/)
    assert.match(page, /openShared\(room\)/)
    assert.match(page, /setScreen\('create'\)/)
    assert.match(page, /sharedRoom=\{openRow\.demo \? null : realRoom\}/)
    assert.equal(page.includes('createRealClassroom'), false)
    assert.match(sql, /auth\.uid\(\)/)
    assert.match(sql, /session_user_id/)
    assert.equal(sql.includes("p_payload->>'sessionUserId'"), false)
    assert.equal(sql.includes('\u8a55\u5206\u6821\u6e96'), false)
  })
})
