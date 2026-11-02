import { Bot, Loader2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { boostOralText, ORAL_TO_DSE } from '../data/vocab'
import { useSen } from '../context/SenContext'

const STEPS = [
  { key: 'describe', title: '1. 描述 Describe', prompt: '你見到啲咩？（物件、人物、顏色、構圖）' },
  { key: 'analyse', title: '2. 分析 Analyse', prompt: '線條、形狀、質感、空間、節奏點樣組織？' },
  { key: 'interpret', title: '3. 詮釋 Interpret', prompt: '作品想表達咩意思／情緒／故事？' },
  { key: 'judge', title: '4. 評價 Judge', prompt: '以 DSE 準則評價優點與可改進處。' },
] as const

type StepKey = (typeof STEPS)[number]['key']

type AiState = { status: 'idle' | 'loading' | 'done' | 'error'; text: string }

const STAGE_API: Record<StepKey, 'describe' | 'analyze' | 'interpret' | 'judge'> = {
  describe: 'describe',
  analyse: 'analyze',
  interpret: 'interpret',
  judge: 'judge',
}

const AI_IDLE: AiState = { status: 'idle', text: '' }

export function FeldmanWriter() {
  const { cardPadding } = useSen()
  const [texts, setTexts] = useState<Record<StepKey, string>>({
    describe: '',
    analyse: '',
    interpret: '',
    judge: '',
  })
  const [active, setActive] = useState<StepKey>('describe')
  const [boosted, setBoosted] = useState<string | null>(null)
  const [hits, setHits] = useState<string[]>([])
  const [artwork, setArtwork] = useState('')
  const [ai, setAi] = useState<Record<StepKey, AiState>>({
    describe: AI_IDLE,
    analyse: AI_IDLE,
    interpret: AI_IDLE,
    judge: AI_IDLE,
  })

  const draft = useMemo(
    () => STEPS.map((s) => `【${s.title}】\n${texts[s.key] || '（未寫）'}`).join('\n\n'),
    [texts],
  )

  function runBooster() {
    const result = boostOralText(texts[active])
    setBoosted(result.boosted)
    setHits(result.hits)
    if (result.hits.length) {
      setTexts((t) => ({ ...t, [active]: result.boosted }))
    }
  }

  async function requestAiFeedback(key: StepKey) {
    const text = texts[key].trim()
    if (!text) {
      setAi((a) => ({ ...a, [key]: { status: 'error', text: '請先寫低你嘅評賞，再撳「AI 回饋」。' } }))
      return
    }
    setAi((a) => ({ ...a, [key]: { status: 'loading', text: '' } }))
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: STAGE_API[key],
          text: text.slice(0, 2000),
          artwork: artwork.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { feedback?: string; error?: string }
      if (!res.ok || !data.feedback) {
        throw new Error(data.error || `AI 回饋暫時未能提供（${res.status}）。`)
      }
      setAi((a) => ({ ...a, [key]: { status: 'done', text: data.feedback ?? '' } }))
    } catch (err) {
      const msg = err instanceof Error && err.message !== 'Failed to fetch' ? err.message : '網絡連線出錯，請稍後再試。'
      setAi((a) => ({ ...a, [key]: { status: 'error', text: msg } }))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-teal-950">費德曼四步寫作</h2>
        <p className="text-sm text-teal-800/70">口語 → DSE 術語助推（客戶端詞典）＋ Gemini AI 回饋</p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-teal-900">評賞作品（選填）</span>
        <input
          type="text"
          value={artwork}
          maxLength={200}
          onChange={(e) => setArtwork(e.target.value)}
          placeholder="例如：梵高《星夜》"
          className="mt-1 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setActive(s.key)
              setBoosted(null)
              setHits([])
            }}
            className={
              active === s.key
                ? 'rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-100'
            }
          >
            {s.title}
          </button>
        ))}
      </div>

      {STEPS.filter((s) => s.key === active).map((s) => (
        <section
          key={s.key}
          className={`rounded-2xl border border-teal-100 bg-white shadow-sm ${cardPadding}`}
        >
          <h3 className="text-lg font-bold text-teal-950">{s.title}</h3>
          <p className="mt-1 text-sm text-teal-800/70">{s.prompt}</p>
          <textarea
            className="mt-3 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            rows={5}
            value={texts[s.key]}
            onChange={(e) => setTexts((t) => ({ ...t, [s.key]: e.target.value }))}
            placeholder="用粵語口語都得，再撳助推轉術語…"
            maxLength={2000}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runBooster}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              口語 → DSE 術語
            </button>
            <button
              type="button"
              onClick={() => requestAiFeedback(s.key)}
              disabled={ai[s.key].status === 'loading'}
              className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-70"
            >
              {ai[s.key].status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Bot className="h-4 w-4" aria-hidden />
              )}
              {ai[s.key].status === 'loading' ? 'AI 分析中…' : 'AI 回饋'}
            </button>
          </div>
          {boosted !== null && (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {hits.length === 0 ? (
                <p>未偵測到詞典關鍵字。可試：靚、亂、空蕩蕩、光猛…</p>
              ) : (
                <p>
                  已替換：{hits.map((h) => `「${h}」→ ${ORAL_TO_DSE[h]}`).join('；')}
                </p>
              )}
            </div>
          )}
          {ai[s.key].status === 'done' && (
            <div
              className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950"
              aria-live="polite"
            >
              <p className="mb-1 font-semibold">AI 老師回饋</p>
              <p className="whitespace-pre-wrap">{ai[s.key].text}</p>
              <p className="mt-2 text-xs text-teal-800/60">由 Gemini 生成，僅供參考。</p>
            </div>
          )}
          {ai[s.key].status === 'error' && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
              {ai[s.key].text}
            </p>
          )}
        </section>
      ))}

      <details className="rounded-2xl border border-teal-100 bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-semibold text-teal-950">四步草稿總覽</summary>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-teal-900/90">{draft}</pre>
      </details>

      <details className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-teal-900">詞典一覽</summary>
        <ul className="mt-2 columns-1 gap-3 sm:columns-2">
          {Object.entries(ORAL_TO_DSE).map(([k, v]) => (
            <li key={k} className="mb-1 break-inside-avoid">
              <span className="font-semibold">{k}</span> → {v}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
