/**
 * Staff-only formative reference comment for uploaded artwork and workbook pages.
 * No key, no staff session, or a model miss returns unavailable. The client
 * then leaves the visible band unset. This route does not write a school
 * reference and does not award an official mark.
 */
import { geminiModels } from './feedback.ts'
import {
  FORMATIVE_PAGE_BYTE_MAX,
  formativeAxisLabels,
  formativeCommentSystem,
  formativePageMime,
  formativeUserPrompt,
  parseFormativeModelText,
} from '../src/lib/formativeAiComment.ts'
import { parseStaffEmailAllowlist, resolveStaffRole } from '../src/lib/staffRole.ts'

export type FormativeGenerator = (input: {
  system: string
  user: string
  mime: string
  base64: string
  pages?: { side: string; mime: string; base64: string }[]
}) => Promise<string | null>

type StaffCheck = (request: Request) => Promise<boolean>

const BODY_CHAR_MAX = 5_500_000

let staffCheck: StaffCheck | null = null
let generator: FormativeGenerator | null = null

export function setFormativeStaffCheckForTests(check: StaffCheck | null): void {
  staffCheck = check
}

export function setFormativeGeneratorForTests(next: FormativeGenerator | null): void {
  generator = next
}

export function formativeStaffAllowed(appMetadata: object | null, email: string | null): boolean {
  return (
    resolveStaffRole({
      appMetadata,
      email,
      allowlist: parseStaffEmailAllowlist(process.env.VITE_STAFF_EMAILS ?? process.env.STAFF_EMAILS),
      previewEnabled: false,
    }) != null
  )
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

async function defaultStaffAllowed(request: Request): Promise<boolean> {
  const match = /^Bearer\s+(\S+)$/i.exec((request.headers.get('authorization') ?? '').trim())
  if (!match) return false
  const token = match[1]
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !anon) return false
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        skipAutoInitialize: true,
      },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return false
    const meta = data.user.app_metadata
    return formativeStaffAllowed(meta && typeof meta === 'object' ? meta : null, data.user.email ?? null)
  } catch {
    return false
  }
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

const TOTAL_BYTE_MAX = 3_200_000

type IncomingPage = { side: string; mime: string; base64: string }

function onePage(sideRaw: unknown, mimeRaw: unknown, imageBase64: unknown): IncomingPage | null {
  if (typeof mimeRaw !== 'string' || typeof imageBase64 !== 'string') return null
  const mime = formativePageMime('page', mimeRaw)
  if (!mime) return null
  const base64 = imageBase64.replace(/\s/g, '')
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.length > FORMATIVE_PAGE_BYTE_MAX) return null
  const side = sideRaw === 'artwork' || sideRaw === 'research_workbook' ? sideRaw : ''
  return { side, mime, base64 }
}

function pagesFromBody(body: unknown): { locale: string; pages: IncomingPage[] } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as { locale?: unknown; mime?: unknown; imageBase64?: unknown; pages?: unknown }
  const locale = record.locale === 'en' || record.locale === 'zh-Hans' || record.locale === 'zh-Hant' ? record.locale : 'zh-Hant'
  const pages: IncomingPage[] = []
  let total = 0
  if (Array.isArray(record.pages)) {
    for (const item of record.pages) {
      if (pages.length >= 4) break
      if (!item || typeof item !== 'object') continue
      const page = item as { side?: unknown; mime?: unknown; imageBase64?: unknown }
      const next = onePage(page.side, page.mime, page.imageBase64)
      if (!next) continue
      const bytes = Buffer.from(next.base64, 'base64').length
      if (total > 0 && total + bytes > TOTAL_BYTE_MAX) continue
      pages.push(next)
      total += bytes
    }
  } else {
    const next = onePage('', record.mime, record.imageBase64)
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
  const allowed = await (staffCheck ?? defaultStaffAllowed)(request)
  if (!allowed) return unavailable(403)

  const raw = await request.text()
  if (raw.length === 0 || raw.length > BODY_CHAR_MAX) return unavailable(400)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return unavailable(400)
  }
  const page = pagesFromBody(body)
  if (!page) return unavailable(400)

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
  return json(200, { ok: true, comment: parsed.comment, band: parsed.band, axes: parsed.axes })
}

export default {
  fetch: handleFormativeComment,
}
