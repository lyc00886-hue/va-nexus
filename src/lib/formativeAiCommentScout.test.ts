import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { BAND_FORMATIVE } from './schoolScoreDual.ts'
import {
  FORMATIVE_BAND_VALUE,
  FORMATIVE_USER_PROMPT,
  bandFromModel,
  formativeAxisLabels,
  formativeCommentSystem,
  parseFormativeModelText,
  postFormativeComment,
} from './formativeAiComment.ts'
import { FORMATIVE_AI_COMMENT_SHA256 } from './formativeAiCommentScout.ts'
import { CRITERIA_IDS, PRACTICE_BAND_IDS } from './teacherDraftBand.ts'
import {
  applyAiFallback,
  applyModelComment,
  approximateBandId,
  draftFromFile,
  laterPending,
  withCommitted,
} from './schoolScoreLater.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const PLATE_DIR = 'public/content/learning-map-illustrations/soft-scout/formative-ai-comment-band-thin-2611'

const NEW_LOCALE = {
  en: {
    'score.later.aiComment': 'AI reference comments (not an official grade)',
    'score.later.aiCommentHint': 'Short comments are school-internal only — not SBA or public-exam remarks.',
    'score.later.requestAi': 'Generate reference comments / band',
    'score.later.modelNote':
      'Reference comments and the approximate band are model-generated and unofficial; the teacher-confirmed values prevail.',
    'score.later.aiUnavailable':
      'Reference comments are unavailable just now. Try again later, or adjust the band yourself.',
    'score.later.commentPending': 'Reference comments pending teacher confirm',
  },
  'zh-Hant': {
    'score.later.aiComment': 'AI 參考評語（非正式）',
    'score.later.aiCommentHint': '短評只供校內討論，唔係 SBA 或公開試評語。',
    'score.later.requestAi': '產生參考評語／大概帶',
    'score.later.modelNote': '參考評語同大概帶由模型產生，非正式分；以教師確認後為準。',
    'score.later.aiUnavailable': '暫時未能產生參考評語。你可以稍後再試，或先用教師調分。',
    'score.later.commentPending': '參考評語待教師確認',
  },
  'zh-Hans': {
    'score.later.aiComment': 'AI 参考评语（非正式）',
    'score.later.aiCommentHint': '短评只供校内讨论，不是 SBA 或公开试评语。',
    'score.later.requestAi': '生成参考评语／大概带',
    'score.later.modelNote': '参考评语和大概带由模型生成，非正式分；以教师确认后为准。',
    'score.later.aiUnavailable': '暂时未能生成参考评语。你可以稍后再试，或先用教师调分。',
    'score.later.commentPending': '参考评语待教师确认',
  },
} as const

const KEPT = {
  en: {
    'score.later.disclaimer':
      'Not a public-exam or HKEAA result. AI approx is school-internal only; teacher-adjusted values prevail.',
    'score.later.stubNote':
      'Approximate reference, pending teacher confirm. Without a live vision model, the band comes from the file name and size.',
  },
  'zh-Hant': {
    'score.later.disclaimer': '非公開試／非 HKEAA 正式分數。AI 大概分只供校內討論；以教師調分後為準。',
    'score.later.stubNote': '大概參考 · 待教師確認。未接實時影像模型時，以檔名與大小給一條參考帶。',
  },
  'zh-Hans': {
    'score.later.disclaimer': '非公开试／非 HKEAA 正式分数。AI 大概分只供校内讨论；以教师调分后为准。',
    'score.later.stubNote': '大概参考 · 待教师确认。未接实时影像模型时，以档名与大小给一条参考带。',
  },
} as const

const LOCALE_FILES = {
  en: 'src/i18n/en.json',
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
} as const

const CRITERIA_FILES = {
  'zh-Hant': 'src/content/teacher-draft-band.json',
  en: 'src/content/teacher-draft-band.en.json',
  'zh-Hans': 'src/content/teacher-draft-band.zh-Hans.json',
} as const

const COMMENT = '主題或意念的探索及發展接近穩固，反思及學習進程仍可再寫清楚。'

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

function sliceExport(source: string, name: string): string {
  const marker = source.includes(`export async function ${name}`)
    ? `export async function ${name}`
    : `export function ${name}`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, name)
  const rest = source.slice(start + 1)
  const next = rest.search(/\nexport (?:async )?function |\nfunction /)
  return next >= 0 ? source.slice(start, start + 1 + next) : source.slice(start)
}

describe('formative AI comment scout plates', () => {
  it('keeps the Soft SCOUT sha256 bytes for 01, 02, 03, and the strip', () => {
    assert.deepEqual(Object.keys(FORMATIVE_AI_COMMENT_SHA256), [
      '01-staff-request-ai-comment-band.png',
      '02-student-comment-band-readonly.png',
      '03-fallback-locale-soft-never.png',
      'preview-strip.png',
    ])
    for (const [name, hex] of Object.entries(FORMATIVE_AI_COMMENT_SHA256)) {
      const bytes = readFileSync(join(root, PLATE_DIR, name))
      const hash = createHash('sha256').update(bytes).digest('hex')
      assert.equal(hash, hex, name)
      assert.equal(hash.slice(0, 12), hex.slice(0, 12), name)
    }
    assert.equal(FORMATIVE_AI_COMMENT_SHA256['01-staff-request-ai-comment-band.png'].slice(0, 12), '924e32a98d0f')
    assert.equal(FORMATIVE_AI_COMMENT_SHA256['02-student-comment-band-readonly.png'].slice(0, 12), '54f7475b1d39')
    assert.equal(FORMATIVE_AI_COMMENT_SHA256['03-fallback-locale-soft-never.png'].slice(0, 12), '3acb04c2d4e4')
    assert.equal(FORMATIVE_AI_COMMENT_SHA256['preview-strip.png'].slice(0, 12), 'dbb9e3fd3849')
  })
})

describe('formative AI comment locale', () => {
  it('adds the six new strings verbatim and keeps disclaimer and stubNote', () => {
    for (const locale of Object.keys(LOCALE_FILES) as (keyof typeof LOCALE_FILES)[]) {
      const bag = messages(LOCALE_FILES[locale])
      for (const [key, value] of Object.entries(NEW_LOCALE[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      for (const [key, value] of Object.entries(KEPT[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
    }
  })
})

describe('formative AI comment axes', () => {
  it('uses the school criterion labels and the existing 0–5 band map', () => {
    for (const locale of Object.keys(CRITERIA_FILES) as (keyof typeof CRITERIA_FILES)[]) {
      const copy = JSON.parse(read(CRITERIA_FILES[locale])) as {
        criteria: { rows: { id: string; label: string }[] }
      }
      const axes = formativeAxisLabels(locale)
      assert.deepEqual(
        axes.map((axis) => axis.id),
        [...CRITERIA_IDS],
      )
      assert.deepEqual(
        axes.map((axis) => axis.label),
        copy.criteria.rows.map((row) => row.label),
      )
    }
    const labels = formativeAxisLabels('zh-Hant').map((axis) => axis.label)
    assert.equal(labels.includes('主題清晰度'), false)
    const system = formativeCommentSystem(labels, 'zh-Hant')
    for (const label of labels) assert.match(system, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.equal(system.includes('洞察藝術'), false)
    assert.match(FORMATIVE_USER_PROMPT, /Do not award an official mark/)
    for (const id of PRACTICE_BAND_IDS) assert.equal(FORMATIVE_BAND_VALUE[id], BAND_FORMATIVE[id])
    assert.equal(bandFromModel(3.5), 'practice-secure')
    assert.equal(bandFromModel('良好'), 'practice-strong')
    assert.equal(bandFromModel('5**'), null)
  })
})

describe('formative AI comment trigger', () => {
  it('keeps the request on the staff surface and leaves the student read-only', () => {
    const staff = read('src/components/SchoolScoreLaterStaff.tsx')
    const student = read('src/components/SchoolScoreLaterStudent.tsx')
    const hook = read('src/lib/useSchoolScoreLater.ts')
    const request = sliceExport(hook, 'requestLaterComment')
    const write = sliceExport(hook, 'writeLaterAdjust')

    assert.match(staff, /data-testid="score-later-request-ai"/)
    assert.match(staff, /score\.later\.requestAi/)
    assert.match(staff, /requestLaterComment\(locale, true\)/)
    assert.match(staff, /if \(!role\) return null/)
    assert.match(staff, /useStaffRole/)
    assert.equal(staff.includes('主題清晰度'), false)
    assert.equal(student.includes('requestAi'), false)
    assert.equal(student.includes('requestLaterComment'), false)
    assert.equal(student.includes('postFormativeComment'), false)
    assert.match(student, /data-readonly="true"/)
    assert.match(student, /disabled/)
    assert.doesNotMatch(student, />\s*score\.later\./)
    assert.match(request, /if \(!staff\) return 'idle'/)
    assert.equal(request.includes('saveTeacherDraft'), false)
    assert.equal(request.includes('saveDualAxis'), false)
    assert.equal(request.includes('laterFeed'), false)
    assert.match(write, /saveTeacherDraft\(SCHOOL_SCORE_SLOT/)
  })

  it('does not write the school reference until the teacher confirms', () => {
    const draft = draftFromFile('工作簿頁 1.pdf', 12000, 'application/pdf')
    const next = applyModelComment(draft, { comment: COMMENT, band: 'practice-secure' })
    assert.equal(next.aiStatus, 'model')
    assert.equal(next.aiComment, COMMENT)
    assert.equal(next.approxBand, 'practice-secure')
    assert.equal(next.committedBand, null)
    assert.equal(laterPending(next), true)
    assert.equal(next.stubBand, approximateBandId('工作簿頁 1.pdf', 12000))
    const written = withCommitted(next)
    assert.equal(written.committedBand, 'practice-secure')
    assert.equal(laterPending(written), false)
    assert.equal(written.aiComment, COMMENT)
  })

  it('falls back to the filename stub when the model is unavailable', async () => {
    const draft = draftFromFile('工作簿頁 1.pdf', 12000, 'application/pdf')
    const stub = approximateBandId('工作簿頁 1.pdf', 12000)
    const model = applyModelComment(draft, { comment: COMMENT, band: 'practice-strong' })
    const fallback = applyAiFallback(model)
    assert.equal(fallback.aiStatus, 'fallback')
    assert.equal(fallback.aiComment, null)
    assert.equal(fallback.approxBand, stub)
    assert.equal(fallback.committedBand, null)
    assert.equal(laterPending(fallback), true)
    assert.equal(parseFormativeModelText('{"comment":"這頁係 5** 公開試結果。","band":"practice-strong"}'), null)
    assert.equal(parseFormativeModelText(`{"comment":"${COMMENT}","band":"practice-developing"}`)?.band, 'practice-developing')

    let called = false
    const missed = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'page.png',
      mime: 'image/png',
      bytes: null,
      fetchImpl: async () => {
        called = true
        return new Response(null, { status: 503 })
      },
    })
    assert.deepEqual(missed, { ok: false, reason: 'unavailable' })
    assert.equal(called, false)

    const down = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'page.png',
      mime: 'image/png',
      bytes: Uint8Array.from([1, 2, 3, 4]),
      fetchImpl: async () => new Response(JSON.stringify({ ok: false, reason: 'unavailable' }), { status: 503 }),
    })
    assert.deepEqual(down, { ok: false, reason: 'unavailable' })

    const fresh = draftFromFile('page.png', 4, 'image/png')
    assert.equal(fresh.aiStatus, 'idle')
    assert.equal(fresh.aiComment, null)
    assert.equal(applyModelComment(fresh, { comment: '太短', band: 'practice-secure' }).aiStatus, 'fallback')
  })
})
