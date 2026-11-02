// Vercel Node.js Function (Web Request/Response) for Feldman-method feedback.
// GEMINI_API_KEY is read server-side only and never shipped to the browser.
//
// Export `default { fetch }`. A bare `export default function` is invoked as
// Node `(req, res) => void`: the returned Response is discarded and the
// invocation hangs until FUNCTION_INVOCATION_TIMEOUT, including requests
// that never had a session.
//
// Age gate: a Supabase session plus user_progress.can_use_ai from the DB.
// Client adultConfirmed and birth_year are ignored. birth_year is never
// selected, logged, or placed in the Gemini prompt.

import type { SupabaseClient } from '@supabase/supabase-js'

type Stage = 'describe' | 'analyze' | 'interpret' | 'judge'

const STAGE_HINT: Record<Stage, string> = {
  describe: 'Focus on observable facts only (what you see). No interpretation yet.',
  analyze: 'Focus on formal elements and relationships (composition, colour, line, texture, space).',
  interpret: 'Focus on meaning, mood, context, and possible messages.',
  judge: 'Focus on evaluation with clear criteria and reasoned judgment.',
}

type Locale = 'zh-Hant' | 'zh-Hans' | 'en'

const ERR: Record<
  Locale,
  {
    method: string
    json: string
    stage: string
    empty: string
    tooLong: string
    noKey: string
    gemini: string
    authRequired: string
    authDown: string
    under18: string
  }
> = {
  'zh-Hant': {
    method: '只接受 POST',
    json: '請求格式錯誤',
    stage: 'stage 無效',
    empty: '請先寫作',
    tooLong: '文字太長',
    noKey: '伺服器未設定 GEMINI_API_KEY',
    gemini: 'Gemini 暫時未能回應，請稍後再試',
    authRequired: '請先登入 Google 帳戶先可以使用 AI 回饋。',
    authDown: '暫時未能核實登入狀態，請稍後再試。',
    under18: 'AI 回饋只開放畀已核實 18 歲或以上嘅用戶。寫作框架、檢查清單同術語助推仍然可以用。',
  },
  'zh-Hans': {
    method: '只接受 POST',
    json: '请求格式错误',
    stage: 'stage 无效',
    empty: '请先写作',
    tooLong: '文字太长',
    noKey: '服务器未设定 GEMINI_API_KEY',
    gemini: 'Gemini 暂时未能回应，请稍后再试',
    authRequired: '请先登录 Google 账户才可以使用 AI 反馈。',
    authDown: '暂时未能核实登录状态，请稍后再试。',
    under18: 'AI 反馈只对已核实 18 岁或以上的用户开放。写作框架、检查清单和术语助推仍然可用。',
  },
  en: {
    method: 'POST only',
    json: 'Invalid JSON body',
    stage: 'Invalid stage',
    empty: 'Write something first',
    tooLong: 'Text too long',
    noKey: 'Server missing GEMINI_API_KEY',
    gemini: 'Gemini is temporarily unavailable — try again shortly',
    authRequired: 'Sign in with Google to use AI feedback.',
    authDown: 'Could not verify sign-in just now. Try again shortly.',
    under18: 'AI feedback is only available to verified users aged 18 or over. Writing frames, checklists and the vocab booster still work.',
  },
}

/** Per-call cap so a stalled Auth or PostgREST request cannot hold the function open. */
const AUTH_FETCH_MS = 2_000
const MAX_BODY_BYTES = 16 * 1024

function localeOf(raw: unknown): Locale {
  if (raw === 'zh-Hans' || raw === 'zh-CN') return 'zh-Hans'
  if (raw === 'en' || raw === 'en-US' || raw === 'en-GB') return 'en'
  return 'zh-Hant'
}

function localeFromHeader(request: Request): Locale {
  const h = (request.headers.get('accept-language') ?? '').toLowerCase()
  if (h.startsWith('en')) return 'en'
  if (h.includes('zh-cn') || h.includes('zh-hans') || h.includes('zh-sg')) return 'zh-Hans'
  return 'zh-Hant'
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

function bearerToken(request: Request): string | null {
  const raw = request.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(\S+)$/i.exec(raw.trim())
  return m ? m[1] : null
}

/** Local reject for missing shape or an already-expired access token. No network. */
function jwtCurrentlyValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) return false
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      exp?: unknown
    }
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return false
    return payload.exp * 1000 > Date.now() - 60_000
  } catch {
    return false
  }
}

function fetchWithDeadline(ms: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    const signal = init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal
    // Ref'd timer: AbortSignal.timeout() is unref'd and would not fire if it were the only handle.
    return fetch(input, { ...init, signal }).finally(() => clearTimeout(timer))
  }
}

async function requireUser(
  token: string,
  err: (typeof ERR)[Locale],
): Promise<{ supabase: SupabaseClient; userId: string } | Response> {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !anon) return json(503, { error: 'Server missing Supabase configuration' })

  // Loaded only after a structurally valid JWT. Unauthenticated requests never reach this.
  // skipAutoInitialize: constructing the client does no I/O. Each fetch is aborted at AUTH_FETCH_MS.
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      skipAutoInitialize: true,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: fetchWithDeadline(AUTH_FETCH_MS),
    },
  })

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error) {
      const down = isAuthOutage(error)
      return json(down ? 503 : 401, { error: down ? err.authDown : err.authRequired })
    }
    if (!data.user?.id) return json(401, { error: err.authRequired })
    return { supabase, userId: data.user.id }
  } catch {
    return json(503, { error: err.authDown })
  }
}

function isAuthOutage(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true
  const status = (error as { status?: unknown }).status
  if (typeof status !== 'number') return true
  return status === 0 || status >= 500
}

async function requireCanUseAi(
  supabase: SupabaseClient,
  userId: string,
  err: (typeof ERR)[Locale],
): Promise<Response | null> {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('can_use_ai')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || data?.can_use_ai !== true) return json(403, { error: err.under18 })
  } catch {
    return json(403, { error: err.under18 })
  }
  return null
}

type FeedbackBody = {
  stage?: string
  text?: string
  artwork?: string
  locale?: string
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: FeedbackBody } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { ok: false, response: json(400, { error: ERR['zh-Hant'].tooLong }) }
  }
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return { ok: false, response: json(400, { error: ERR['zh-Hant'].json }) }
  }
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: json(400, { error: ERR['zh-Hant'].tooLong }) }
  }
  try {
    const body = raw ? (JSON.parse(raw) as unknown) : {}
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, response: json(400, { error: ERR['zh-Hant'].json }) }
    }
    return { ok: true, body: body as FeedbackBody }
  } catch {
    return { ok: false, response: json(400, { error: ERR['zh-Hant'].json }) }
  }
}

/**
 * AI Studio's current default Flash model.
 * GEMINI_MODEL, when set to a model id, is tried first; the list below is the fallback.
 */
const GEMINI_MODEL = 'gemini-3.8-flash'
const GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-flash-latest'] as const

function isGeminiModelId(value: string): boolean {
  return /^[A-Za-z0-9._-]{1,80}$/.test(value) && !value.startsWith('AIza')
}

function geminiModels(): string[] {
  const override = process.env.GEMINI_MODEL?.trim() ?? ''
  const preferred = isGeminiModelId(override) ? override : GEMINI_MODEL
  const seen = new Set<string>()
  const order: string[] = []
  for (const id of [preferred, GEMINI_MODEL, ...GEMINI_MODEL_FALLBACKS]) {
    if (!isGeminiModelId(id) || seen.has(id)) continue
    seen.add(id)
    order.push(id)
  }
  return order
}

function generationConfig(model: string): {
  temperature: number
  maxOutputTokens: number
  thinkingConfig: { thinkingBudget: number } | { thinkingLevel: 'low'; includeThoughts: false }
} {
  // 2.5 Flash rejects thinkingLevel. Thoughts count against maxOutputTokens, so a
  // 512 cap with dynamic thinking often returns an empty candidate.
  if (model.startsWith('gemini-2.5')) {
    return { temperature: 0.6, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } }
  }
  // 3.8 Flash (and the flash-latest alias) cannot turn thinking off. `low` is supported;
  // leave room so thoughts do not consume the whole answer.
  return {
    temperature: 0.6,
    maxOutputTokens: 2048,
    thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
  }
}

/** Upstream HTTP status, model id, and a short error status/message. Never the key or bodies. */
function logGeminiUpstream(model: string, status: number | null, message: string): void {
  const safe = message
    .replace(/AIza[0-9A-Za-z_-]+/g, '[redacted]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
  console.error(JSON.stringify({ model, status, message: safe || 'upstream error' }))
}

function upstreamErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'upstream error'
  const error = (payload as { error?: unknown }).error
  if (!error || typeof error !== 'object') return 'upstream error'
  const status = (error as { status?: unknown }).status
  const message = (error as { message?: unknown }).message
  const bits: string[] = []
  if (typeof status === 'string' && status.trim()) bits.push(status.trim())
  if (typeof message === 'string' && message.trim()) bits.push(message.trim())
  return bits.join(': ') || 'upstream error'
}

function feedbackText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ''
  const first = candidates[0]
  if (!first || typeof first !== 'object') return ''
  const content = (first as { content?: unknown }).content
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

async function geminiFeedback(apiKey: string, system: string, userText: string): Promise<string | null> {
  const requestBody = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
  }

  for (const model of geminiModels()) {
    // Key stays in the header so a thrown URL cannot contain it. Do not log this request.
    let res: Response
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: AbortSignal.timeout(25_000),
          body: JSON.stringify({ ...requestBody, generationConfig: generationConfig(model) }),
        },
      )
    } catch {
      logGeminiUpstream(model, null, 'request failed')
      continue
    }

    if (!res.ok) {
      const raw = await res.text().catch(() => '')
      let parsed: unknown = null
      if (raw) {
        try {
          parsed = JSON.parse(raw) as unknown
        } catch {
          parsed = null
        }
      }
      logGeminiUpstream(model, res.status, upstreamErrorMessage(parsed))
      continue
    }

    const feedback = feedbackText(await res.json().catch(() => null))
    if (feedback) return feedback
    logGeminiUpstream(model, res.status, 'empty candidates')
  }

  return null
}

async function handleFeedback(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { error: ERR['zh-Hant'].method })
  }

  // Missing, malformed, or expired tokens return before the body is read and before Supabase.
  const token = bearerToken(request)
  const headerErr = ERR[localeFromHeader(request)]
  if (!token || !jwtCurrentlyValid(token)) {
    return json(401, { error: headerErr.authRequired })
  }

  const session = await requireUser(token, headerErr)
  if (session instanceof Response) return session

  // Locale for the 403 comes from the body when it parses. birth_year / adultConfirmed
  // are never copied into the prompt. A bad body still cannot reach Gemini: the DB
  // flag is checked first, and an allowed user with a bad body gets 400.
  const parsed = await readJsonBody(request)
  const err = parsed.ok ? ERR[localeOf(parsed.body.locale)] : headerErr
  const gateFail = await requireCanUseAi(session.supabase, session.userId, err)
  if (gateFail) return gateFail
  if (!parsed.ok) return parsed.response
  const body = parsed.body

  const stage = body.stage as Stage | undefined
  if (!stage || !(stage in STAGE_HINT)) return json(400, { error: err.stage })

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return json(400, { error: err.empty })
  if (text.length > 2000) return json(400, { error: err.tooLong })

  const artwork =
    typeof body.artwork === 'string' && body.artwork.trim()
      ? body.artwork.trim().slice(0, 200)
      : null

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return json(503, { error: err.noKey })

  const loc = localeOf(body.locale)
  const langLine =
    loc === 'en'
      ? 'Reply in clear English suitable for senior secondary art students.'
      : loc === 'zh-Hans'
        ? '请用简明的简体中文回复，适合高中视觉艺术学生。'
        : '請用简明嘅繁體中文（香港用字）回覆，適合高中視覺藝術學生。'

  const system = [
    'You are a supportive Visual Arts teacher giving Feldman-method writing feedback.',
    STAGE_HINT[stage],
    langLine,
    'Be concise (3–6 short sentences). Praise one strength, then give 1–2 concrete next steps.',
    'Do not invent artwork details the student did not write. Never ask for or mention age or birth year.',
  ].join(' ')

  const userParts = [
    artwork ? `Artwork / context: ${artwork}` : null,
    `Student writing (${stage}):\n${text}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const feedback = await geminiFeedback(apiKey, system, userParts)
  if (!feedback) return json(502, { error: err.gemini, code: 'gemini_upstream' })

  return json(200, { feedback })
}

export default {
  fetch: handleFeedback,
}
