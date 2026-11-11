/**
 * Informal formative reference comment for uploaded artwork and workbook pages.
 * The student later path and the staff button share this route.
 * A staff session is not required. A cross-origin browser call is refused.
 * A modest per-IP limit applies. No key or a model miss returns unavailable.
 * This route does not write a school reference and does not award an official mark.
 */
import { geminiModels } from './feedback.ts'
import {
  FORMATIVE_BODY_CHAR_MAX,
  FORMATIVE_PAGE_BYTE_MAX,
  FORMATIVE_TOTAL_BYTE_MAX,
  formativeAxisLabels,
  formativeCommentSystem,
  formativePageMime,
  formativeUserPrompt,
  parseFormativeModelText,
} from '../src/lib/formativeAiComment.ts'

export type FormativeGenerator = (input: {
  system: string
  user: string
  mime: string
  base64: string
  pages?: { side: string; mime: string; base64: string }[]
}) => Promise<string | null>

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
  if (model.startsWith('gemini-2.5')) {
    return { temperature: 0.4, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
  }
  return {
    temperature: 0.4,
    maxOutputTokens: 1024,
    thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
  }
}

type IncomingPage = { side: string; mime: string; base64: string }

function onePage(sideRaw: unknown, mimeRaw: unknown, imageBase64: unknown, fileNameRaw: unknown): IncomingPage | null {
  if (typeof mimeRaw !== 'string' || typeof imageBase64 !== 'string') return null
  const base64 = imageBase64.replace(/\s/g, '')
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.length > FORMATIVE_PAGE_BYTE_MAX) return null
  const name = typeof fileNameRaw === 'string' ? fileNameRaw : ''
  const mime = formativePageMime(name, mimeRaw, bytes)
  if (!mime) return null
  const side = sideRaw === 'artwork' || sideRaw === 'research_workbook' ? sideRaw : ''
  return { side, mime, base64 }
}

function pagesFromBody(body: unknown): { locale: string; pages: IncomingPage[] } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as {
    locale?: unknown
    mime?: unknown
    imageBase64?: unknown
    fileName?: unknown
    pages?: unknown
  }
  const locale = record.locale === 'en' || record.locale === 'zh-Hans' || record.locale === 'zh-Hant' ? record.locale : 'zh-Hant'
  const pages: IncomingPage[] = []
  let total = 0
  if (Array.isArray(record.pages)) {
    for (const item of record.pages) {
      if (pages.length >= 4) break
      if (!item || typeof item !== 'object') continue
      const page = item as { side?: unknown; mime?: unknown; imageBase64?: unknown; fileName?: unknown }
      const next = onePage(page.side, page.mime, page.imageBase64, page.fileName)
      if (!next) continue
      const bytes = Buffer.from(next.base64, 'base64').length
      if (total > 0 && total + bytes > FORMATIVE_TOTAL_BYTE_MAX) continue
      pages.push(next)
      total += bytes
    }
  } else {
    const next = onePage('', record.mime, record.imageBase64, record.fileName)
    if (next) pages.push(next)
  }
  if (pages.length === 0) return null
  return { locale, pages }
}

async function generateFormative(
  apiKey: string,
  system: string,
  user: string,
  pages: IncomingPage[],
): Promise<string | null> {
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: user }]
  for (const page of pages) {
    parts.push({ text: page.side ? `Page side: ${page.side}` : 'Page' })
    parts.push({ inlineData: { mimeType: page.mime, data: page.base64 } })
  }
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
  const system = formativeCommentSystem(labels, page.locale)
  const user = formativeUserPrompt(page.pages.map((item) => item.side))
  let text: string | null = null
  try {
    text = generator
      ? await generator({
          system,
          user,
          mime: page.pages[0].mime,
          base64: page.pages[0].base64,
          pages: page.pages,
        })
      : await generateFormative(apiKey, system, user, page.pages)
  } catch {
    text = null
  }
  const parsed = text ? parseFormativeModelText(text) : null
  if (!parsed) return unavailable(502)
  return json(200, {
    ok: true,
    comment: parsed.comment,
    band: parsed.band,
    axes: parsed.axes,
    score: parsed.score,
    advice: parsed.advice,
  })
}

export default {
  fetch: handleFormativeComment,
}
