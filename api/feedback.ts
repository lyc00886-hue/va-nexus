// Vercel Node.js Function (Web Request/Response handler) for Feldman-method feedback.
// The Gemini key is read server-side only from process.env.GEMINI_API_KEY and never
// shipped to the browser bundle.
// Age gate: require a valid Supabase session and trust ONLY user_progress.can_use_ai
// from the DB (derived from birth_year server-side). Client adultConfirmed is ignored.

import { createClient } from '@supabase/supabase-js'

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
    under18: 'AI feedback is only available to verified users aged 18 or over. Writing frames, checklists and the vocab booster still work.',
  },
}

function localeOf(raw: unknown): Locale {
  if (raw === 'zh-Hans' || raw === 'zh-CN') return 'zh-Hans'
  if (raw === 'en' || raw === 'en-US' || raw === 'en-GB') return 'en'
  return 'zh-Hant'
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function assertCanUseAi(req: Request, err: (typeof ERR)[Locale]): Promise<Response | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return json(503, { error: 'Server missing Supabase configuration' })
  }

  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim())
  if (!m) return json(401, { error: err.authRequired })
  const token = m[1].trim()
  if (!token) return json(401, { error: err.authRequired })

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) return json(401, { error: err.authRequired })

  const { data, error } = await supabase
    .from('user_progress')
    .select('can_use_ai')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) return json(403, { error: err.under18 })
  if (!data?.can_use_ai) return json(403, { error: err.under18 })
  return null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json(405, { error: ERR['zh-Hant'].method })
  }

  let body: {
    stage?: string
    text?: string
    artwork?: string
    locale?: string
    adultConfirmed?: unknown
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json(400, { error: ERR['zh-Hant'].json })
  }

  const err = ERR[localeOf(body.locale)]
  // Ignore any client-supplied adultConfirmed — DB can_use_ai is the only gate.
  void body.adultConfirmed

  const gateFail = await assertCanUseAi(req, err)
  if (gateFail) return gateFail

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

  const geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    encodeURIComponent(apiKey)

  let geminiRes: Response
  try {
    geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userParts }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
      }),
    })
  } catch {
    return json(502, { error: err.gemini })
  }

  if (!geminiRes.ok) {
    return json(502, { error: err.gemini })
  }

  const payload = (await geminiRes.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  } | null
  const feedback = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')?.trim()
  if (!feedback) return json(502, { error: err.gemini })

  return json(200, { feedback })
}
