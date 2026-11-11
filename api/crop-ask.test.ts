import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { handleCropAsk, setCropAskGeneratorForTests, type CropAskGenerator } from './crop-ask.ts'

const JPEG =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBIVEBUQFREVFRUVFRUVFRUVFRUWFhUVFRUYHSggGBolHRUVITEhJSsrLi4uFx8zODMtNygtLisBCgoKDg0OGhAQGi0fHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBAECBQYAB//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAAEQEBAQEBAQEBAQEAAAAAAAAAAQIDEQQSITFBURMiYf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJrS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tP/2Q=='

const SECTIONS = {
  seen: '框入面見到一粒淺色圓形，右下方有一抹較深的影子。',
  understood: '呢個局部可以理解成寫生時對形狀同明暗的觀察。',
  evidence: '圓形右下的深色塊支持上面對光源方向的理解。',
}

function request(body: unknown, method = 'POST'): Request {
  return new Request('https://example.test/api/crop-ask', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  })
}

describe('crop ask route', { concurrency: false }, () => {
  const previousKey = process.env.GEMINI_API_KEY

  afterEach(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
    setCropAskGeneratorForTests(null)
  })

  it('stays unavailable when no model key is configured and does not invent a draft', async () => {
    delete process.env.GEMINI_API_KEY
    let generated = false
    setCropAskGeneratorForTests(async () => {
      generated = true
      return null
    })
    const res = await handleCropAsk(request({ mime: 'image/jpeg', imageBase64: JPEG, locale: 'zh-Hant', unitTitle: '寫生、美感同設計思維' }))
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { ok: false, reason: 'unavailable' })
    assert.equal(generated, false)
  })

  it('rejects a response that includes a band or the wrong section names', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const generate: CropAskGenerator = async () => JSON.stringify({ ...SECTIONS, band: 'practice-secure' })
    setCropAskGeneratorForTests(generate)
    const banded = await handleCropAsk(
      request({ mime: 'image/jpeg', imageBase64: JPEG, locale: 'zh-Hant', unitTitle: '寫生、美感同設計思維' }),
    )
    assert.equal(banded.status, 502)
    assert.deepEqual(await banded.json(), { ok: false, reason: 'failed' })

    setCropAskGeneratorForTests(async () =>
      JSON.stringify({ describe: SECTIONS.seen, analyze: SECTIONS.understood, interpret: SECTIONS.evidence, judge: SECTIONS.evidence }),
    )
    const feldman = await handleCropAsk(
      request({ mime: 'image/jpeg', imageBase64: JPEG, locale: 'en', unitTitle: 'Drawing and design' }),
    )
    assert.equal(feldman.status, 502)
  })

  it('returns the three sections only, for the attached region', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const seen: { system: string; user: string }[] = []
    const generate: CropAskGenerator = async (input) => {
      seen.push({ system: input.system, user: input.user })
      return JSON.stringify(SECTIONS)
    }
    setCropAskGeneratorForTests(generate)
    const res = await handleCropAsk(
      request({ mime: 'image/jpeg', imageBase64: JPEG, locale: 'zh-Hant', unitTitle: '寫生、美感同設計思維' }),
    )
    assert.equal(res.status, 200)
    const body = (await res.json()) as Record<string, unknown>
    assert.equal(body.ok, true)
    assert.equal(body.seen, SECTIONS.seen)
    assert.equal(body.understood, SECTIONS.understood)
    assert.equal(body.evidence, SECTIONS.evidence)
    assert.equal('band' in body, false)
    assert.match(seen[0].system, /selected region only/)
    assert.match(seen[0].system, /寫生、美感同設計思維/)
    assert.equal(seen[0].system.includes('practice-secure'), false)
    assert.equal(seen[0].user.includes('only the cropped region'), true)
  })

  it('does not call the model for a missing region image', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    let generated = false
    setCropAskGeneratorForTests(async () => {
      generated = true
      return JSON.stringify(SECTIONS)
    })
    const res = await handleCropAsk(request({ mime: 'image/png', imageBase64: JPEG, locale: 'zh-Hant', unitTitle: '寫生、美感同設計思維' }))
    assert.equal(res.status, 400)
    assert.equal(generated, false)
    assert.deepEqual(await res.json(), { ok: false, reason: 'failed' })
  })
})
