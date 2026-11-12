/**
 * Informal formative reference comment for uploaded artwork and workbook pages.
 * The student later path and the staff button share this route.
 * A staff session is not required. A cross-origin browser call is refused.
 * A modest per-IP limit applies. No key or a model miss returns unavailable.
 * This route does not write a school reference and does not award an official mark.
 * Locked comparison excerpts are attached beside the student pages. They do not
 * count toward the student limit of four pages. A missing excerpt set uses the
 * same unavailable result as a model miss and does not guess from the file name.
 */
import { createHash } from 'node:crypto'
import { geminiModels } from './feedback.ts'
import {
  applyLockedSampleHit,
  loadLockedComparison,
  partsIncludeComparisonImages,
  type LockedComparisonImage,
} from '../src/lib/locked-sample-comparison.ts'
import {
  FORMATIVE_BODY_CHAR_MAX,
  FORMATIVE_PAGE_BYTE_MAX,
  FORMATIVE_TOTAL_BYTE_MAX,
  formativeAxisLabels,
  formativeCommentSystem,
  formativePageMime,
  formativePageSideNote,
  formativeScanSides,
  formativeUserPrompt,
  parseFormativeModelText,
} from '../src/lib/formativeAiComment.ts'

export type FormativeModelPart = { text?: string; inlineData?: { mimeType: string; data: string } }

export type FormativeGenerator = (input: {
  system: string
  user: string
  mime: string
  base64: string
  pages?: { side: string; sides: string[]; mime: string; base64: string }[]
  comparisons?: LockedComparisonImage[]
  parts?: FormativeModelPart[]
}) => Promise<string | null>

/**
 * Student pages stay at most four. Comparison excerpts are extra parts and are
 * not student uploads. A text label without an excerpt image is not included
 * as a comparison page.
 */
export function formativeModelParts(
  user: string,
  pages: readonly { side: string; sides: readonly string[]; mime: string; base64: string }[],
  comparisons: readonly LockedComparisonImage[],
): FormativeModelPart[] {
  const parts: FormativeModelPart[] = [{ text: user }]
  for (const image of comparisons) {
    const note = [
      image.base64 ? 'Locked comparison excerpt.' : 'Locked catalog entry with no excerpt image.',
      `Label: ${image.label}`,
      `Sample sha256: ${image.sampleSha256}`,
      `Band hint: ${image.bandHint}`,
    ].join('\n')
    parts.push({ text: note })
    if (image.base64) parts.push({ inlineData: { mimeType: 'image/png', data: image.base64 } })
  }
  for (const page of pages) {
    parts.push({ text: formativePageSideNote(page.sides.length > 0 ? page.sides : page.side ? [page.side] : []) })
    parts.push({ inlineData: { mimeType: page.mime, data: page.base64 } })
  }
  return parts
}

/** A class can upload together from one school network. Still bounded. */
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_DEFAULT = 120

let generator: FormativeGenerator | null = null
let rateMax = RATE_MAX_DEFAULT
const rateHits = new Map<string, number[]>()

export function setFormativeGeneratorForTests(next: FormativeGenerator | null): void {
  generator = next
}

export function setFormativeRateLimitForTests(max: number | null): void {
  rateMax = max == null || max < 1 ? RATE_MAX_DEFAULT : max
  rateHits.clear()
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function unavailable(status: number): Response {
  return json(status, { ok: false, reason: 'unavailable' })
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase()
  } catch {
    return null
  }
}

function requestHosts(request: Request): Set<string> {
  const hosts = new Set<string>()
  const fromUrl = hostOf(request.url)
  if (fromUrl) hosts.add(fromUrl)
  const host = request.headers.get('host')?.trim().toLowerCase()
  if (host) hosts.add(host)
  return hosts
}

/** A browser call with a foreign Origin or Referer is refused. A missing one is allowed. */
function sameOriginAllowed(request: Request): boolean {
  const declared = request.headers.get('origin') || request.headers.get('referer')
  if (!declared) return true
  const host = hostOf(declared)
  if (!host) return false
  return requestHosts(request).has(host)
}

function rateClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  return request.headers.get('x-real-ip')?.trim() || 'local'
}

/** True when this request is over the cap and must not call the model. */
function formativeRateLimited(request: Request, now = Date.now()): boolean {
  const key = rateClientKey(request)
  const recent = (rateHits.get(key) ?? []).filter((at) => now - at < RATE_WINDOW_MS)
  if (recent.length >= rateMax) {
    rateHits.set(key, recent)
    return true
  }
  recent.push(now)
  rateHits.set(key, recent)
  return false
}

function modelText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return ''
  const content = (candidates[0] as { content?: unknown }).content
  if (!content || typeof content !== 'object') return ''
  const parts = (content as { parts?: unknown }).parts
  if (!Array.isArray(parts)) return ''
  let text = ''
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue
    if ((part as { thought?: unknown }).thought === true) continue
    const piece = (part as { text?: unknown }).text
    if (typeof piece === 'string') text += piece
  }
  return text.trim()
}

function generationConfig(model: string): {
  temperature: number
  maxOutputTokens: number
  thinkingConfig: { thinkingBudget: number } | { thinkingLevel: 'low'; includeThoughts: false }
} {
  // A first reply can omit axes in more than one way: a partial object, criterion
  // labels instead of ids, or an answer cut short while thinking still uses this
  // budget. The student shell asks again when a present side is still short.
  // The larger budget only leaves room for the comment, every axis value, and the notes.
  if (model.startsWith('gemini-2.5')) {
    return { temperature: 0.4, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } }
  }
  return {
    temperature: 0.4,
    maxOutputTokens: 4096,
    thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
  }
}

type IncomingPage = {
  side: string
  sides: string[]
  mime: string
  base64: string
  fileSha256: string
  contentSha256: string
}

function readSha256(value: unknown): string {
  if (typeof value !== 'string') return ''
  const hex = value.trim().toLowerCase()
  return /^[0-9a-f]{64}$/.test(hex) ? hex : ''
}

function onePage(
  sideRaw: unknown,
  mimeRaw: unknown,
  imageBase64: unknown,
  fileNameRaw: unknown,
  sidesRaw: unknown,
  fileSha256Raw: unknown,
): IncomingPage | null {
  if (typeof mimeRaw !== 'string' || typeof imageBase64 !== 'string') return null
  const base64 = imageBase64.replace(/\s/g, '')
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.length > FORMATIVE_PAGE_BYTE_MAX) return null
  const name = typeof fileNameRaw === 'string' ? fileNameRaw : ''
  const mime = formativePageMime(name, mimeRaw, bytes)
  if (!mime) return null
  const sides = formativeScanSides(sideRaw, sidesRaw)
  return {
    side: sides[0] ?? '',
    sides,
    mime,
    base64,
    fileSha256: readSha256(fileSha256Raw),
    contentSha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

function uploadedSampleHashes(pages: readonly IncomingPage[]): string[] {
  const found: string[] = []
  for (const page of pages) {
    if (page.fileSha256) found.push(page.fileSha256)
    if (page.contentSha256) found.push(page.contentSha256)
  }
  return found
}

function pagesFromBody(body: unknown): { locale: string; pages: IncomingPage[] } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as {
    locale?: unknown
    mime?: unknown
    imageBase64?: unknown
    fileName?: unknown
    fileSha256?: unknown
    pages?: unknown
  }
  const locale = record.locale === 'en' || record.locale === 'zh-Hans' || record.locale === 'zh-Hant' ? record.locale : 'zh-Hant'
  const pages: IncomingPage[] = []
  let total = 0
  if (Array.isArray(record.pages)) {
    for (const item of record.pages) {
      if (pages.length >= 4) break
      if (!item || typeof item !== 'object') continue
      const page = item as {
        side?: unknown
        sides?: unknown
        mime?: unknown
        imageBase64?: unknown
        fileName?: unknown
        fileSha256?: unknown
      }
      const next = onePage(page.side, page.mime, page.imageBase64, page.fileName, page.sides, page.fileSha256)
      if (!next) continue
      const bytes = Buffer.from(next.base64, 'base64').length
      if (total > 0 && total + bytes > FORMATIVE_TOTAL_BYTE_MAX) continue
      pages.push(next)
      total += bytes
    }
  } else {
    const next = onePage('', record.mime, record.imageBase64, record.fileName, undefined, record.fileSha256)
    if (next) pages.push(next)
  }
  if (pages.length === 0) return null
  return { locale, pages }
}

async function generateFormative(
  apiKey: string,
  system: string,
  parts: FormativeModelPart[],
  comparisons: readonly LockedComparisonImage[],
): Promise<string | null> {
  if (!partsIncludeComparisonImages(parts, comparisons)) return null
  for (const model of geminiModels()) {
    let res: Response
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: generationConfig(model),
        }),
      })
    } catch {
      continue
    }
    if (!res.ok) continue
    const text = modelText(await res.json().catch(() => null))
    if (text) return text
  }
  return null
}

export async function handleFormativeComment(request: Request): Promise<Response> {
  if (request.method !== 'POST') return unavailable(405)
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? ''
  if (!apiKey) return unavailable(503)
  if (!sameOriginAllowed(request)) return unavailable(403)

  const raw = await request.text()
  if (raw.length === 0 || raw.length > FORMATIVE_BODY_CHAR_MAX) return unavailable(400)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return unavailable(400)
  }
  const page = pagesFromBody(body)
  if (!page) return unavailable(400)
  if (formativeRateLimited(request)) return unavailable(429)

  const labels = formativeAxisLabels(page.locale).map((axis) => axis.label)
  const loaded = loadLockedComparison()
  if (!loaded.ok) return unavailable(502)
  const system = formativeCommentSystem(labels, page.locale)
  const user = `${formativeUserPrompt(
    page.pages.flatMap((item) => (item.sides.length > 0 ? item.sides : item.side ? [item.side] : [])),
  )}\n${loaded.prompt}`
  const parts = formativeModelParts(user, page.pages, loaded.images)
  if (!partsIncludeComparisonImages(parts, loaded.images)) return unavailable(502)
  let text: string | null = null
  try {
    text = generator
      ? await generator({
          system,
          user,
          mime: page.pages[0].mime,
          base64: page.pages[0].base64,
          pages: page.pages,
          comparisons: loaded.images,
          parts,
        })
      : await generateFormative(apiKey, system, parts, loaded.images)
  } catch {
    text = null
  }
  const parsed = text ? parseFormativeModelText(text) : null
  if (!parsed) return unavailable(502)
  const scored = applyLockedSampleHit(parsed, uploadedSampleHashes(page.pages))
  return json(200, {
    ok: true,
    comment: scored.comment,
    band: scored.band,
    axes: scored.axes,
    score: scored.score,
    advice: scored.advice,
  })
}

export default {
  fetch: handleFormativeComment,
}
