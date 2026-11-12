import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { encode } from 'jpeg-js'
import { PDFDocument } from 'pdf-lib'
import { ARTWORK_AXIS_IDS } from './schoolScoreDual.ts'
import {
  FORMATIVE_BODY_CHAR_MAX,
  FORMATIVE_PAGE_BYTE_MAX,
  FORMATIVE_PLATFORM_BODY_MAX,
  postFormativeComment,
} from './formativeAiComment.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  aiReferenceAxes,
  approximateBandId,
  isLaterUploadFile,
  laterPageSide,
  sanitizeLaterStore,
  studentVisibleBand,
  withUploadedFile,
} from './schoolScoreLater.ts'
import { getDualRadarStore } from './useSchoolScoreDual.ts'
import { getTeacherDraftStore } from './useTeacherDraftStore.ts'
import { acceptLaterFiles, getSchoolScoreLater, requestLaterComment, resetSchoolScoreLaterForTests } from './useSchoolScoreLater.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const OVER_OLD_CAP = 3_500_001

const COMMENT = '主題或意念的探索及發展接近穩固，反思及學習進程仍可再寫清楚。'
const AXES = {
  'aw-1': 2.5,
  'aw-2': 3.5,
  'aw-3': 1,
  'aw-4': 4.5,
  'aw-5': 3.5,
  'aw-6': 2.5,
} as const

const FILE_NOT_SENT = {
  'zh-Hant': '呢份檔已上傳，但暫時未能交到模型計參考評語。唔會用檔名或檔案大小估分。你可以稍後再試，或先用教師調分。',
  'zh-Hans': '这份档案已上传，但暂时未能交到模型计参考评语。不会用档名或档案大小估分。你可以稍后再试，或先用教师调分。',
  en: 'This file is uploaded, but it could not be sent to the model for a reference comment. A score is not guessed from the file name or size. You can try again later, or adjust the band yourself.',
} as const

type Sent = { url: string; init?: RequestInit; resolve: (response: Response) => void }

const pending: Sent[] = []
let blobBytes = new Uint8Array()
let restore: (() => void) | null = null

function tinyJpeg(): Uint8Array {
  const width = 8
  const height = 8
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 180
    data[i + 1] = 40
    data[i + 2] = 60
    data[i + 3] = 255
  }
  return new Uint8Array(encode({ data, width, height }, 80).data)
}

function padJpeg(jpeg: Uint8Array, minBytes: number): Uint8Array {
  const extra = minBytes - jpeg.byteLength
  const segments: number[] = []
  let left = extra
  while (left > 0) {
    const payload = Math.min(left, 65533)
    segments.push(payload)
    left -= payload
  }
  const out = new Uint8Array(jpeg.byteLength + segments.reduce((sum, payload) => sum + 4 + payload, 0))
  out[0] = 0xff
  out[1] = 0xd8
  let offset = 2
  for (const payload of segments) {
    out[offset] = 0xff
    out[offset + 1] = 0xfe
    const length = payload + 2
    out[offset + 2] = length >> 8
    out[offset + 3] = length & 0xff
    offset += 4 + payload
  }
  out.set(jpeg.subarray(2), offset)
  return out
}

function pdfAround(jpeg: Uint8Array): Uint8Array {
  const header = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`
  const footer =
    '\nendstream endobj\n5 0 obj << /Length 44 >> stream\nq 200 0 0 200 0 0 cm /Im0 Do Q\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n'
  const head = new TextEncoder().encode(header)
  const tail = new TextEncoder().encode(footer)
  const out = new Uint8Array(head.length + jpeg.length + tail.length)
  out.set(head, 0)
  out.set(jpeg, head.length)
  out.set(tail, head.length + jpeg.length)
  return out
}

const BIG_JPEG = padJpeg(tinyJpeg(), OVER_OLD_CAP)
const BIG_PDF = pdfAround(BIG_JPEG)
const SMALL_PDF = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n',
)

function page(name: string, size: number, type: string): File {
  return { name, size, type } as File
}

function installNet() {
  const originalFetch = globalThis.fetch
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:later-file'
  URL.revokeObjectURL = () => {}
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith('blob:')) return new Response(blobBytes)
    return await new Promise<Response>((resolve) => {
      pending.push({ url, init, resolve })
    })
  }
  restore = () => {
    globalThis.fetch = originalFetch
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    pending.splice(0, pending.length)
    restore = null
  }
}

async function waitForPost() {
  for (let i = 0; i < 100; i += 1) {
    if (pending.length >= 1) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('expected a formative post')
}

function postedBody(): { url: string; headers: Record<string, string>; raw: string; pages: { side?: string; mime?: string; imageBase64?: string }[] } {
  const next = pending.shift()
  if (!next) throw new Error('no formative post is waiting')
  const raw = String(next.init?.body ?? '')
  const parsed = JSON.parse(raw) as { pages?: { side?: string; mime?: string; imageBase64?: string }[] }
  next.resolve(
    new Response(JSON.stringify({ ok: true, comment: COMMENT, band: 'practice-secure', axes: { ...AXES } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  return {
    url: next.url,
    headers: (next.init?.headers ?? {}) as Record<string, string>,
    raw,
    pages: parsed.pages ?? [],
  }
}

function decodePage(pageBody: { imageBase64?: string }): Uint8Array {
  return Uint8Array.from(Buffer.from(pageBody.imageBase64 ?? '', 'base64'))
}

describe('later files still reach the formative comment', { concurrency: false }, () => {
  beforeEach(() => {
    pending.splice(0, pending.length)
    blobBytes = new Uint8Array()
    resetSchoolScoreLaterForTests()
    installNet()
  })

  afterEach(() => {
    restore?.()
    resetSchoolScoreLaterForTests()
  })

  it('keeps the send cap under the platform body limit and adds only fileNotSent', () => {
    assert.ok(FORMATIVE_BODY_CHAR_MAX < FORMATIVE_PLATFORM_BODY_MAX)
    assert.ok(Math.ceil(FORMATIVE_PAGE_BYTE_MAX / 3) * 4 < FORMATIVE_BODY_CHAR_MAX)
    assert.equal(SCHOOL_SCORE_LATER_KEY, 'va-nexus:school-score-later:v1')
    const files = {
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
      en: 'src/i18n/en.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = JSON.parse(readFileSync(join(root, files[locale]), 'utf8')) as Record<string, string>
      assert.equal(bag['score.later.fileNotSent'], FILE_NOT_SENT[locale])
      assert.equal(bag['score.later.fileNotSent'].includes('5**'), false)
      assert.equal(bag['score.later.aiUnavailable'].includes('fileNotSent'), false)
    }
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    const staff = readFileSync(join(root, 'src/components/SchoolScoreLaterStaff.tsx'), 'utf8')
    assert.match(student, /aiStatus === 'unsent'/)
    assert.match(student, /score\.later\.fileNotSent/)
    assert.match(student, /score\.later\.aiUnavailable/)
    assert.match(student, /score\.dual\.unset/)
    assert.match(staff, /score\.later\.fileNotSent/)
    assert.match(student, /if \(accepted\) void requestLaterComment\(locale, false\)/)
    assert.equal(student.includes('5**'), false)
  })

  it('classifies ordinary names as artwork and still accepts empty or octet-stream images', () => {
    assert.equal(laterPageSide('Jessie_revised_1.pdf'), 'artwork')
    assert.equal(laterPageSide('IMG_5288.jpeg'), 'artwork')
    assert.equal(laterPageSide('page.pdf'), 'artwork')
    assert.equal(laterPageSide('研究工作簿.pdf'), 'research_workbook')
    assert.equal(laterPageSide('research-workbook.pdf'), 'research_workbook')
    assert.equal(laterPageSide('練習卷作品.pdf'), null)
    assert.equal(laterPageSide('course artwork.pdf'), null)
    assert.equal(isLaterUploadFile({ name: 'Jessie_revised_1.pdf', type: '' }), true)
    assert.equal(isLaterUploadFile({ name: 'Jessie_revised_1.pdf', type: 'application/octet-stream' }), true)
    assert.equal(isLaterUploadFile({ name: 'IMG_5288.jpeg', type: '' }), true)
    assert.equal(isLaterUploadFile({ name: 'IMG_5288.jpeg', type: 'application/octet-stream' }), true)
    assert.equal(isLaterUploadFile({ name: 'IMG_5288.png', type: '' }), true)
    assert.equal(isLaterUploadFile({ name: 'notes.txt', type: '' }), false)
    assert.equal(withUploadedFile(null, 'Jessie_revised_1.pdf', 1200, '').pages[0]?.side, 'artwork')
    assert.equal(withUploadedFile(null, 'IMG_5288.jpeg', 1200, 'application/octet-stream').pages[0]?.side, 'artwork')
    assert.equal(withUploadedFile(null, '練習卷 1.pdf', 50, 'application/pdf').pages.length, 0)
    assert.equal(withUploadedFile(null, 'my workbook.pdf', 80, 'application/pdf').pages[0]?.side, 'research_workbook')
  })

  it('posts a PDF larger than 3500000 bytes and stores the model result', async () => {
    assert.ok(BIG_PDF.byteLength > 3_500_000)
    blobBytes = BIG_PDF
    const dualBefore = JSON.stringify(getDualRadarStore())
    const teacherBefore = JSON.stringify(getTeacherDraftStore())
    assert.equal(acceptLaterFiles([page('portfolio-scan.pdf', BIG_PDF.byteLength, 'application/pdf')]), true)
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitForPost()
    const sent = postedBody()
    assert.equal(sent.url, '/api/formative-comment')
    assert.equal(sent.headers.Authorization, undefined)
    assert.equal(sent.raw.length < FORMATIVE_PLATFORM_BODY_MAX, true)
    assert.equal(sent.raw.includes('portfolio-scan'), false)
    assert.equal(sent.pages.length >= 1, true)
    assert.equal(sent.pages[0]?.side, 'artwork')
    assert.equal(sent.pages[0]?.mime, 'image/jpeg')
    const bytes = decodePage(sent.pages[0] ?? {})
    assert.ok(bytes.byteLength > 0)
    assert.ok(bytes.byteLength < 3_500_000)
    assert.equal(bytes[0], 0xff)
    assert.equal(bytes[1], 0xd8)
    assert.equal(await pendingResult, 'model')
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiComment, COMMENT)
    assert.equal(draft?.approxBand, 'practice-secure')
    assert.equal(studentVisibleBand(draft!), 'practice-secure')
    assert.equal(draft?.committedBand, null)
    assert.deepEqual(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS), [2.5, 3.5, 1, 4.5, 3.5, 2.5])
    assert.equal(new Set(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS)).size > 1, true)
    assert.equal(JSON.stringify(getDualRadarStore()), dualBefore)
    assert.equal(JSON.stringify(getTeacherDraftStore()), teacherBefore)
  })

  it('posts a PDF whose MIME is empty or application/octet-stream', async () => {
    for (const type of ['', 'application/octet-stream']) {
      resetSchoolScoreLaterForTests()
      blobBytes = SMALL_PDF
      assert.equal(acceptLaterFiles([page('from-phone.pdf', SMALL_PDF.byteLength, type)]), true)
      const pendingResult = requestLaterComment('zh-Hant', false)
      await waitForPost()
      const sent = postedBody()
      assert.equal(sent.url, '/api/formative-comment')
      assert.equal(sent.headers.Authorization, undefined)
      assert.equal(sent.pages[0]?.mime, 'application/pdf')
      assert.equal(sent.pages[0]?.side, 'artwork')
      const bytes = decodePage(sent.pages[0] ?? {})
      assert.equal(bytes[0], 0x25)
      assert.equal(await pendingResult, 'model')
      assert.equal(getSchoolScoreLater().draft?.approxBand, 'practice-secure')
      assert.equal(getSchoolScoreLater().draft?.aiComment, COMMENT)
    }
  })

  it('posts an ordinary PDF name without asking the student to rename it', async () => {
    blobBytes = SMALL_PDF
    assert.equal(laterPageSide('Jessie_revised_1.pdf'), 'artwork')
    assert.equal(acceptLaterFiles([page('Jessie_revised_1.pdf', SMALL_PDF.byteLength, 'application/pdf')]), true)
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitForPost()
    const sent = postedBody()
    assert.equal(sent.url, '/api/formative-comment')
    assert.equal(sent.raw.includes('Jessie_revised_1'), false)
    assert.equal(sent.pages[0]?.side, 'artwork')
    assert.equal(sent.pages[0]?.mime, 'application/pdf')
    assert.equal(await pendingResult, 'model')
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.fileName, 'Jessie_revised_1.pdf')
    assert.equal(draft?.pages[0]?.side, 'artwork')
    assert.equal(draft?.aiComment, COMMENT)
    assert.equal(studentVisibleBand(draft!), 'practice-secure')
    assert.deepEqual(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS), [2.5, 3.5, 1, 4.5, 3.5, 2.5])
  })

  it('posts a large ordinary photo and does not guess from the file name', async () => {
    assert.ok(BIG_JPEG.byteLength > 3_500_000)
    assert.equal(laterPageSide('IMG_5288.jpeg'), 'artwork')
    blobBytes = BIG_JPEG
    assert.equal(acceptLaterFiles([page('IMG_5288.jpeg', BIG_JPEG.byteLength, '')]), true)
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitForPost()
    const sent = postedBody()
    assert.equal(sent.url, '/api/formative-comment')
    assert.equal(sent.headers.Authorization, undefined)
    assert.equal(sent.raw.length < FORMATIVE_BODY_CHAR_MAX, true)
    assert.equal(sent.raw.includes('IMG_5288'), false)
    assert.equal(sent.pages[0]?.side, 'artwork')
    assert.equal(sent.pages[0]?.mime, 'image/jpeg')
    const bytes = decodePage(sent.pages[0] ?? {})
    assert.ok(bytes.byteLength > 0)
    assert.ok(bytes.byteLength < 3_500_000)
    assert.equal(bytes[0], 0xff)
    assert.equal(bytes[1], 0xd8)
    assert.equal(await pendingResult, 'model')
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiStatus, 'model')
    assert.equal(draft?.aiComment, COMMENT)
    assert.equal(draft?.approxBand, 'practice-secure')
    assert.equal(studentVisibleBand(draft!), 'practice-secure')
    assert.deepEqual(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS), [2.5, 3.5, 1, 4.5, 3.5, 2.5])
    assert.equal(new Set(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS)).size > 1, true)

    resetSchoolScoreLaterForTests()
    blobBytes = BIG_JPEG
    assert.equal(acceptLaterFiles([page('IMG_5288.jpeg', BIG_JPEG.byteLength, 'application/octet-stream')]), true)
    const octet = requestLaterComment('zh-Hant', false)
    await waitForPost()
    const octetSent = postedBody()
    assert.equal(octetSent.pages[0]?.mime, 'image/jpeg')
    assert.equal(octetSent.pages[0]?.side, 'artwork')
    assert.equal(await octet, 'model')
  })

  it('still posts when the only file name available to the packer is page', async () => {
    let called = false
    const result = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'page',
      mime: '',
      bytes: SMALL_PDF,
      fetchImpl: async (_input, init) => {
        called = true
        const body = JSON.parse(String(init?.body)) as { mime?: string }
        assert.equal(body.mime, 'application/pdf')
        return new Response(JSON.stringify({ ok: true, comment: COMMENT, band: 'practice-secure', axes: { ...AXES } }), {
          status: 200,
        })
      },
    })
    assert.equal(called, true)
    assert.equal(result.ok, true)
  })

  it('sends every page of a long PDF instead of a four-page stand-in', async () => {
    for (const count of [6, 24, 27, 71]) {
      const doc = await PDFDocument.create()
      for (let i = 0; i < count; i += 1) doc.addPage([200, 200])
      const file = new Uint8Array(await doc.save())
      let sent = new Uint8Array()
      let declared = 0
      const result = await postFormativeComment({
        locale: 'en',
        fileName: 'portfolio.pdf',
        mime: 'application/pdf',
        bytes: file,
        pages: [{ side: 'artwork', mime: 'application/pdf', bytes: file, fileName: 'portfolio.pdf' }],
        fetchImpl: async (_input, init) => {
          const body = JSON.parse(String(init?.body)) as {
            sourcePageCount?: number
            pages?: { mime?: string; imageBase64?: string }[]
          }
          declared = body.sourcePageCount ?? 0
          assert.equal(body.pages?.length, 1)
          assert.equal(body.pages?.[0]?.mime, 'application/pdf')
          sent = Uint8Array.from(Buffer.from(body.pages?.[0]?.imageBase64 ?? '', 'base64'))
          return new Response(JSON.stringify({ ok: true, comment: COMMENT, band: 'practice-developing', score: 2.5 }), {
            status: 200,
          })
        },
      })
      assert.equal(result.ok, true, String(count))
      assert.equal(declared, count)
      const loaded = await PDFDocument.load(sent)
      assert.equal(loaded.getPageCount(), count)
      assert.notEqual(loaded.getPageCount(), 4)
    }
  })

  it('does not post a score when the whole file cannot be sent', async () => {
    const doc = await PDFDocument.create()
    for (let i = 0; i < 8; i += 1) doc.addPage([200, 200])
    const saved = new Uint8Array(await doc.save())
    const huge = new Uint8Array(FORMATIVE_PAGE_BYTE_MAX + 64)
    huge.set(saved)
    let called = false
    const result = await postFormativeComment({
      locale: 'zh-Hant',
      fileName: 'portfolio.pdf',
      mime: 'application/pdf',
      bytes: huge,
      pages: [{ side: 'artwork', mime: 'application/pdf', bytes: huge, fileName: 'portfolio.pdf' }],
      fetchImpl: async () => {
        called = true
        return new Response(JSON.stringify({ ok: true, comment: COMMENT, band: 'practice-strong', score: 5 }), {
          status: 200,
        })
      },
    })
    assert.equal(called, false)
    assert.deepEqual(result, { ok: false, reason: 'not_sent' })
  })

  it('keeps an older later result when a later whole-file send cannot leave', async () => {
    const kept = sanitizeLaterStore({
      version: 1,
      draft: {
        fileName: 'page.pdf',
        fileSize: 1200,
        mime: 'application/pdf',
        approxBand: 'practice-strong',
        aiStatus: 'model',
        aiComment: COMMENT,
        approxValue: 5,
        pages: [{ fileName: 'page.pdf', fileSize: 1200, mime: 'application/pdf' }],
      },
    })
    assert.equal(SCHOOL_SCORE_LATER_KEY, 'va-nexus:school-score-later:v1')
    assert.equal(kept.draft?.approxValue, 5)
    assert.equal(kept.draft?.aiComment, COMMENT)
    assert.equal(kept.draft?.approxBand, 'practice-strong')
    assert.equal(kept.draft?.aiStatus, 'model')

    blobBytes = SMALL_PDF
    assert.equal(acceptLaterFiles([page('page.pdf', SMALL_PDF.byteLength, 'application/pdf')]), true)
    const first = requestLaterComment('zh-Hant', false)
    await waitForPost()
    postedBody()
    assert.equal(await first, 'model')
    const scored = getSchoolScoreLater().draft
    assert.equal(scored?.aiStatus, 'model')
    assert.equal(scored?.aiComment, COMMENT)

    blobBytes = new Uint8Array(FORMATIVE_PAGE_BYTE_MAX + 32)
    const again = requestLaterComment('zh-Hant', false)
    assert.equal(await again, 'unsent')
    assert.equal(pending.length, 0)
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiStatus, 'model')
    assert.equal(draft?.aiComment, COMMENT)
    assert.equal(draft?.approxBand, scored?.approxBand)
    assert.equal(draft?.approxValue, scored?.approxValue)
    assert.notEqual(draft?.approxBand, null)
  })

  it('does not post an excluded name and does not guess a band', async () => {
    blobBytes = SMALL_PDF
    assert.equal(acceptLaterFiles([page('練習卷 1.pdf', SMALL_PDF.byteLength, 'application/pdf')]), true)
    assert.equal(await requestLaterComment('zh-Hant', false), 'fallback')
    assert.equal(pending.length, 0)
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.pages.length, 0)
    assert.equal(draft?.aiStatus, 'fallback')
    assert.equal(draft?.approxBand, null)
    assert.equal(draft?.aiComment, null)
    assert.deepEqual(draft?.aiAxes, {})
    assert.equal(studentVisibleBand(draft!), null)
  })

  it('uses the unsent state when a damaged file cannot be packed', async () => {
    const broken = new Uint8Array(OVER_OLD_CAP)
    blobBytes = broken
    assert.equal(acceptLaterFiles([page('broken.pdf', broken.byteLength, 'application/pdf')]), true)
    assert.equal(await requestLaterComment('zh-Hant', false), 'unsent')
    assert.equal(pending.length, 0)
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiStatus, 'unsent')
    assert.equal(draft?.aiComment, null)
    assert.equal(draft?.approxBand, null)
    assert.deepEqual(draft?.aiAxes, {})
    assert.equal(studentVisibleBand(draft!), null)
    assert.equal(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS), null)
    assert.notEqual(draft?.approxBand, approximateBandId('broken.pdf', broken.byteLength))
  })

  it('keeps a model miss on the existing unavailable result after the file was sent', async () => {
    blobBytes = SMALL_PDF
    assert.equal(acceptLaterFiles([page('Jessie_revised_1.pdf', SMALL_PDF.byteLength, 'application/pdf')]), true)
    const pendingResult = requestLaterComment('zh-Hant', false)
    await waitForPost()
    const next = pending.shift()
    if (!next) throw new Error('no formative post is waiting')
    next.resolve(new Response(JSON.stringify({ ok: false, reason: 'unavailable' }), { status: 502 }))
    assert.equal(await pendingResult, 'fallback')
    const draft = getSchoolScoreLater().draft
    assert.equal(draft?.aiStatus, 'fallback')
    assert.equal(draft?.approxBand, null)
    assert.equal(draft?.aiComment, null)
    assert.deepEqual(draft?.aiAxes, {})
    assert.equal(aiReferenceAxes(draft!, ARTWORK_AXIS_IDS), null)
  })
})
