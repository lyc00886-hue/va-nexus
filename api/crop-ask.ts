/**
 * Region-only learning-support note.
 * No key, a bad image, or a model miss returns a failure.
 * This route never returns a band and never fills in a draft of its own.
 */
import { geminiModels } from './feedback.ts'
import {
  CROP_ASK_USER_PROMPT,
  cropAskSystem,
  parseCropAskModelText,
} from '../src/lib/cropAsk.ts'

export type CropAskGenerator = (input: {
  system: string
  user: string
  mime: string
  base64: string
}) => Promise<string | null>

const BODY_CHAR_MAX = 2_200_000
const IMAGE_BYTE_MAX = 1_500_000

let generator: CropAskGenerator | null = null

export function setCropAskGeneratorForTests(next: CropAskGenerator | null): void {
  generator = next
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

function failed(status: number, reason: 'failed' | 'unavailable' = 'failed'): Response {
  return json(status, { ok: false, reason })
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

async function generateCropAsk(apiKey: string, system: string, mime: string, base64: string): Promise<string | null> {
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
          contents: [
            {
              role: 'user',
              parts: [{ text: CROP_ASK_USER_PROMPT }, { inlineData: { mimeType: mime, data: base64 } }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: model.startsWith('gemini-2.5') ? 512 : 1024,
            thinkingConfig: model.startsWith('gemini-2.5')
              ? { thinkingBudget: 0 }
              : { thinkingLevel: 'low', includeThoughts: false },
          },
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

function pageFromBody(body: unknown): { locale: string; unitTitle: string; mime: string; base64: string } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as { locale?: unknown; unitTitle?: unknown; mime?: unknown; imageBase64?: unknown }
  if (record.mime !== 'image/jpeg' || typeof record.imageBase64 !== 'string') return null
  const base64 = record.imageBase64.replace(/\s/g, '')
  if (!base64 || base64.length > BODY_CHAR_MAX || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.length > IMAGE_BYTE_MAX) return null
  const locale = record.locale === 'en' || record.locale === 'zh-Hans' || record.locale === 'zh-Hant' ? record.locale : 'zh-Hant'
  const unitTitle = typeof record.unitTitle === 'string' ? record.unitTitle.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
  if (!unitTitle) return null
  return { locale, unitTitle, mime: 'image/jpeg', base64 }
}

export async function handleCropAsk(request: Request): Promise<Response> {
  if (request.method !== 'POST') return failed(405)
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? ''
  if (!apiKey) return failed(503, 'unavailable')
  const raw = await request.text()
  if (raw.length === 0 || raw.length > BODY_CHAR_MAX) return failed(400)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return failed(400)
  }
  const page = pageFromBody(body)
  if (!page) return failed(400)
  const system = cropAskSystem(page.locale, page.unitTitle)
  let text: string | null = null
  try {
    text = generator
      ? await generator({ system, user: CROP_ASK_USER_PROMPT, mime: page.mime, base64: page.base64 })
      : await generateCropAsk(apiKey, system, page.mime, page.base64)
  } catch {
    text = null
  }
  const sections = text ? parseCropAskModelText(text) : null
  if (!sections) return failed(502)
  return json(200, { ok: true, seen: sections.seen, understood: sections.understood, evidence: sections.evidence })
}

export default {
  fetch: handleCropAsk,
}
