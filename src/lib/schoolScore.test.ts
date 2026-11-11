import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { SCHOOL_SCORE_SHA256, SCHOOL_SCORE_SLOT, schoolReferenceBand } from './schoolScore.ts'
import { emptyTeacherDraftStore, TEACHER_DRAFT_BAND_KEY, withSavedBand } from './teacherDraftBand.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const LOCALE = {
  en: {
    'score.v1.title': 'School scoring reference',
    'score.v1.disclaimer': 'Not a public-exam or HKEAA result. School-internal reference only.',
    'score.v1.sampleStd': 'Reference standard: school samples',
    'score.v1.staffNav': 'Scoring reference (staff)',
    'score.v1.studentSurface': 'Learning progress reference',
    'score.v1.replaceSelf': 'Uses school scoring reference (no student 1–4 self-rate)',
    'score.v1.unset': 'No reference result yet',
    'score.v1.band.emerging': 'Emerging',
    'score.v1.band.developing': 'Developing',
    'score.v1.band.secure': 'Secure',
    'score.v1.band.strong': 'Strong',
  },
  'zh-Hant': {
    'score.v1.title': '學校評分參考',
    'score.v1.disclaimer': '非公開試／非 HKEAA 正式分數。只供本校校內討論參考。',
    'score.v1.sampleStd': '參考標準：本校 sample',
    'score.v1.staffNav': '評分參考（教師）',
    'score.v1.studentSurface': '學習進度參考',
    'score.v1.replaceSelf': '已改用學校評分參考（唔再學生自評 1–4）',
    'score.v1.unset': '未有參考結果',
    'score.v1.band.emerging': '起步',
    'score.v1.band.developing': '發展中',
    'score.v1.band.secure': '穩固',
    'score.v1.band.strong': '良好',
  },
  'zh-Hans': {
    'score.v1.title': '学校评分参考',
    'score.v1.disclaimer': '非公开试／非 HKEAA 正式分数。只供本校校内讨论参考。',
    'score.v1.sampleStd': '参考标准：本校 sample',
    'score.v1.staffNav': '评分参考（教师）',
    'score.v1.studentSurface': '学习进度参考',
    'score.v1.replaceSelf': '已改用学校评分参考（不再学生自评 1–4）',
    'score.v1.unset': '未有参考结果',
    'score.v1.band.emerging': '起步',
    'score.v1.band.developing': '发展中',
    'score.v1.band.secure': '稳固',
    'score.v1.band.strong': '良好',
  },
} as const

const FILES = {
  en: 'src/i18n/en.json',
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
} as const

const BANNED = /5\*\*|97分|全校降分|未自評|未達標|未自评|未达标|streak|hearts|gems|claim|3★|SEN|火焰|CCCKLC|功樂|孔教|\bSoft\b/

function messages(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, string>
}

describe('school score v1 locale', () => {
  it('matches the Soft Coord table and practice-band names', () => {
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      for (const [key, value] of Object.entries(LOCALE[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.equal(BANNED.test(value), false, `${locale} ${key}`)
      }
      for (const [key, value] of Object.entries(bag)) {
        if (!key.startsWith('score.v1.')) continue
        assert.equal(BANNED.test(value), false, `${locale} ${key} ${value}`)
        assert.equal(/[a-f0-9]{12}/.test(value), false, `${locale} ${key}`)
      }
      assert.equal(/待鎖定|待锁定|not locked|SAMPLES\.md/.test(bag['score.v1.samplePending']), false)
      assert.equal(/待鎖定|待锁定|not locked|SAMPLES\.md/.test(bag['score.v1.sampleLock']), false)
      assert.match(bag['score.v1.samplePending'], /locked|已鎖定|已锁定/)
    }
  })
})

describe('school score v1 plates', () => {
  it('keeps the Soft SCOUT sha256 bytes under the lesson illustration tree', () => {
    for (const [name, hex] of Object.entries(SCHOOL_SCORE_SHA256)) {
      const bytes = readFileSync(join(root, 'public/content/learning-map-illustrations/soft-scout/school-score-v1', name))
      const hash = createHash('sha256').update(bytes).digest('hex')
      assert.equal(hash, hex, name)
      assert.equal(hash.startsWith(hex.slice(0, 12)), true, name)
    }
  })
})

describe('school score v1 store', () => {
  it('reads one school slot and leaves the student self-assessment key alone', () => {
    const selfKey = readFileSync(join(root, 'src/lib/selfAssessment.ts'), 'utf8').match(/SELF_ASSESSMENT_KEY = '([^']+)'/)?.[1]
    assert.ok(selfKey)
    assert.notEqual(SCHOOL_SCORE_SLOT, selfKey)
    assert.notEqual(TEACHER_DRAFT_BAND_KEY, selfKey)
    const saved = withSavedBand(emptyTeacherDraftStore(), SCHOOL_SCORE_SLOT, 'practice-secure')
    assert.equal(schoolReferenceBand(saved), 'practice-secure')
    assert.equal(schoolReferenceBand(emptyTeacherDraftStore()), null)
    const staff = readFileSync(join(root, 'src/components/SchoolScoreStaff.tsx'), 'utf8')
    const student = readFileSync(join(root, 'src/components/LearningProgressRef.tsx'), 'utf8')
    assert.match(staff, /data-testid="score-later"/)
    assert.match(staff, /disabled/)
    assert.doesNotMatch(staff, /onClick=\{[^}]*scan|type="file"|SAMPLES\.md\s*=/)
    assert.match(staff, /score\.v1\.samplePending/)
    assert.doesNotMatch(student, /setSelfSelect|<select/)
    assert.match(student, /data-readonly="true"/)
  })
})
