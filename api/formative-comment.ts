/**
 * Staff-only formative reference comment for one uploaded workbook page.
 * No key, no staff session, or a model miss returns unavailable so the
 * client can keep the filename/size stub. This route does not write a
 * school reference and does not award an official mark.
 */
import { geminiModels } from './feedback.ts'
import {
  FORMATIVE_PAGE_BYTE_MAX,
  FORMATIVE_USER_PROMPT,
  formativeAxisLabels,
  formativeCommentSystem,
  formativePageMime,
  parseFormativeModelText,
} from '../src/lib/formativeAiComment.ts'
import { parseStaffEmailAllowlist, resolveStaffRole } from '../src/lib/staffRole.ts'

export type FormativeGenerator = (input: {
  system: string
  user: string
  mime: string
  base64: string
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
    return { temperature: 0.4, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } }
  }
  return {
    temperature: 0.4,
    maxOutputTokens: 1024,
    thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
  }
}

async function generateFormative(apiKey: string, system: string, mime: string, base64: string): Promise<string | null> {
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
              parts: [{ text: FORMATIVE_USER_PROMPT }, { inlineData: { mimeType: mime, data: base64 } }],
            },
          ],
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

function pageFromBody(body: unknown): { locale: string; mime: string; base64: string } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as { locale?: unknown; mime?: unknown; imageBase64?: unknown }
  if (typeof record.mime !== 'string' || typeof record.imageBase64 !== 'string') return null
  const mime = formativePageMime('page', record.mime)
  if (!mime) return null
  const base64 = record.imageBase64.replace(/\s/g, '')
  if (!base64 || base64.length > BODY_CHAR_MAX || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.length > FORMATIVE_PAGE_BYTE_MAX) return null
  const locale = record.locale === 'en' || record.locale === 'zh-Hans' || record.locale === 'zh-Hant' ? record.locale : 'zh-Hant'
  return { locale, mime, base64 }
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
  const page = pageFromBody(body)
  if (!page) return unavailable(400)

  const labels = formativeAxisLabels(page.locale).map((axis) => axis.label)
  const system = formativeCommentSystem(labels, page.locale)
  let text: string | null = null
  try {
    text = generator
      ? await generator({ system, user: FORMATIVE_USER_PROMPT, mime: page.mime, base64: page.base64 })
      : await generateFormative(apiKey, system, page.mime, page.base64)
  } catch {
    text = null
  }
  const parsed = text ? parseFormativeModelText(text) : null
  if (!parsed) return unavailable(502)
  return json(200, { ok: true, comment: parsed.comment, band: parsed.band })
}

export default {
  fetch: handleFormativeComment,
}
