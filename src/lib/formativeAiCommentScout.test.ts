import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { encode } from 'jpeg-js'
import { FORMATIVE_PAGE_BYTE_MAX } from './formativePageFit.ts'
import { BAND_FORMATIVE } from './schoolScoreDual.ts'
import {
  FORMATIVE_BAND_VALUE,
  FORMATIVE_USER_PROMPT,
  bandFromModel,
  formativeAxisLabels,
  formativeCommentSystem,
  axisValueFromModel,
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
      'Approximate reference, pending teacher confirm. If the model cannot produce a band or comments from the work, a visible score is not guessed from the file name or size. You can try again later.',
    'score.later.radarPending':
      'Per-axis model reference for this artwork is not available yet, so this artwork radar is not drawn. This avoids painting the same score on every axis.',
  },
  'zh-Hant': {
    'score.later.disclaimer': '非公開試／非 HKEAA 正式分數。AI 大概分只供校內討論；以教師調分後為準。',
    'score.later.stubNote':
      '大概參考 · 待教師確認。模型未能按作品計出大概帶或評語時，唔會用檔名或檔案大小估一條可見分數。你可以稍後再試。',
    'score.later.radarPending': '未有按呢幅作品各軸分開計嘅模型參考，暫時唔畫呢幅作品雷達，避免每條軸都同一分數。',
  },
  'zh-Hans': {
    'score.later.disclaimer': '非公开试／非 HKEAA 正式分数。AI 大概分只供校内讨论；以教师调分后为准。',
    'score.later.stubNote':
      '大概参考 · 待教师确认。模型未能按作品计出大概带或评语时，不会用档名或档案大小估一条可见分数。你可以稍后再试。',
    'score.later.radarPending': '未有按这幅作品各轴分开计的模型参考，暂时不画这幅作品雷达，避免每条轴都同一分数。',
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
      assert.deepEqual(
        axes.map((axis) => axis.focus),
        copy.criteria.rows.map((row) => row.focusHint),
      )
    }
    const labels = formativeAxisLabels('zh-Hant').map((axis) => axis.label)
    assert.equal(labels.includes('主題清晰度'), false)
    const system = formativeCommentSystem(labels, 'zh-Hant')
    for (const label of labels) assert.match(system, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(system, /school-score v1/)
    assert.match(system, /Do not use the file name/)
    assert.match(system, /Do not copy one overall band onto every axis/)
    assert.equal(system.includes('洞察藝術'), false)
    assert.equal(system.includes('主題清晰度'), false)
    assert.equal(system.includes('5**'), false)
    assert.equal(system.includes('Lindsay'), false)
    assert.match(FORMATIVE_USER_PROMPT, /Do not award an official mark/)
    assert.match(FORMATIVE_USER_PROMPT, /Do not use the file name or file size/)
    for (const id of PRACTICE_BAND_IDS) assert.equal(FORMATIVE_BAND_VALUE[id], BAND_FORMATIVE[id])
    assert.equal(bandFromModel(3.5), 'practice-secure')
    assert.equal(bandFromModel('良好'), 'practice-strong')
    assert.equal(bandFromModel('1.25'), 'practice-emerging')
    assert.equal(bandFromModel('1.2'), 'practice-emerging')
    assert.equal(axisValueFromModel('1.2'), 1)
    assert.equal(axisValueFromModel(1.25), 1.5)
    assert.equal(axisValueFromModel(2.5), 2.5)
    assert.equal(axisValueFromModel(5), 5)
    assert.notEqual(axisValueFromModel(1.25), 1.25)
    assert.equal(bandFromModel('5**'), null)
  })
})

describe('formative AI comment trigger', () => {
  it('starts the informal request from a student upload and keeps the staff button', () => {
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
    assert.equal(student.includes('score-later-request-ai'), false)
    assert.match(student, /const accepted = acceptLaterFiles\(files\)/)
    assert.match(student, /if \(accepted\) void requestLaterComment\(locale, false\)/)
    assert.equal(student.includes('postFormativeComment'), false)
    assert.match(student, /data-readonly="true"/)
    assert.match(student, /disabled/)
    assert.doesNotMatch(student, />\s*score\.later\./)
    assert.doesNotMatch(request, /if \(!staff\) return 'idle'/)
    assert.match(request, /postFormativeComment/)
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
    assert.deepEqual(next.aiAxes, {})
    const written = withCommitted(next)
    assert.equal(written.committedBand, 'practice-secure')
    assert.equal(laterPending(written), false)
    assert.equal(written.aiComment, COMMENT)
  })

  it('does not restore a filename stub when the model is unavailable', async () => {
    const draft = draftFromFile('工作簿頁 1.pdf', 12000, 'application/pdf')
    const model = applyModelComment(draft, { comment: COMMENT, band: 'practice-strong' })
    const fallback = applyAiFallback(model)
    assert.equal(fallback.aiStatus, 'fallback')
    assert.equal(fallback.aiComment, null)
    assert.equal(fallback.approxBand, null)
    assert.deepEqual(fallback.aiAxes, {})
    assert.equal(fallback.committedBand, null)
    assert.equal(laterPending(fallback), true)
    assert.notEqual(fallback.approxBand, approximateBandId('工作簿頁 1.pdf', 12000))
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
    assert.deepEqual(missed, { ok: false, reason: 'not_sent' })
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

  it('sends the original file sha256, including after a fitted page replaces those bytes', async () => {
    const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])
    let raw = ''
    const same = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'page.png',
      mime: 'image/png',
      bytes,
      pages: [{ side: 'artwork', mime: 'image/png', bytes, fileName: 'page.png' }],
      fetchImpl: async (_input, init) => {
        raw = String(init?.body ?? '')
        return new Response(JSON.stringify({ ok: false, reason: 'unavailable' }), { status: 503 })
      },
    })
    assert.equal(same.ok, false)
    const sameBody = JSON.parse(raw) as { pages?: { fileSha256?: string }[] }
    assert.equal(sameBody.pages?.[0]?.fileSha256, createHash('sha256').update(bytes).digest('hex'))

    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    for (let index = 0; index < 5; index += 1) doc.addPage([200, 200])
    const pdf = new Uint8Array(await doc.save())
    const original = createHash('sha256').update(pdf).digest('hex')
    const fitted = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'workbook.pdf',
      mime: 'application/pdf',
      bytes: pdf,
      pages: [{ side: 'artwork', mime: 'application/pdf', bytes: pdf, fileName: 'workbook.pdf' }],
      fetchImpl: async (_input, init) => {
        raw = String(init?.body ?? '')
        return new Response(JSON.stringify({ ok: false, reason: 'unavailable' }), { status: 503 })
      },
    })
    assert.equal(fitted.ok, false)
    const fittedBody = JSON.parse(raw) as { pages?: { fileSha256?: string; imageBase64?: string }[] }
    const page = fittedBody.pages?.[0]
    assert.equal(page?.fileSha256, original)
    const posted = Buffer.from(page?.imageBase64 ?? '', 'base64')
    const { PDFDocument: LoadedPdf } = await import('pdf-lib')
    const loaded = await LoadedPdf.load(posted)
    assert.equal(loaded.getPageCount(), 5)
    assert.equal(createHash('sha256').update(posted).digest('hex'), original)

    const width = 8
    const height = 8
    const pixels = new Uint8Array(width * height * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 20
      pixels[i + 1] = 40
      pixels[i + 2] = 60
      pixels[i + 3] = 255
    }
    const jpeg = new Uint8Array(encode({ data: pixels, width, height }, 80).data)
    const extra = FORMATIVE_PAGE_BYTE_MAX + 1000 - jpeg.byteLength
    const segments: number[] = []
    let left = extra
    while (left > 0) {
      const payload = Math.min(left, 65533)
      segments.push(payload)
      left -= payload
    }
    const big = new Uint8Array(jpeg.byteLength + segments.reduce((sum, payload) => sum + 4 + payload, 0))
    big[0] = 0xff
    big[1] = 0xd8
    let offset = 2
    for (const payload of segments) {
      big[offset] = 0xff
      big[offset + 1] = 0xfe
      const length = payload + 2
      big[offset + 2] = length >> 8
      big[offset + 3] = length & 0xff
      offset += 4 + payload
    }
    big.set(jpeg.subarray(2), offset)
    const bigSha = createHash('sha256').update(big).digest('hex')
    const shrunk = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'page.jpg',
      mime: 'image/jpeg',
      bytes: big,
      pages: [{ side: 'artwork', mime: 'image/jpeg', bytes: big, fileName: 'page.jpg' }],
      fetchImpl: async (_input, init) => {
        raw = String(init?.body ?? '')
        return new Response(JSON.stringify({ ok: false, reason: 'unavailable' }), { status: 503 })
      },
    })
    assert.equal(shrunk.ok, false)
    const shrunkBody = JSON.parse(raw) as { pages?: { fileSha256?: string; imageBase64?: string }[] }
    const shrunkPage = shrunkBody.pages?.[0]
    assert.equal(shrunkPage?.fileSha256, bigSha)
    const shrunkBytes = Buffer.from(shrunkPage?.imageBase64 ?? '', 'base64')
    assert.notEqual(createHash('sha256').update(shrunkBytes).digest('hex'), bigSha)
  })
})
