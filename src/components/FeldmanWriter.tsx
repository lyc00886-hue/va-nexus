import { Bot, CheckSquare, Loader2, Plus, Sparkles, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSen } from '../context/SenContext'
import {
  boostOralText,
  FELDMAN_STAGES,
  inlineTerm,
  termEnglish,
  vocabForStage,
} from '../lib/content'
import type { FeldmanStageId, FeldmanVocabEntry } from '../types'

type StepKey = FeldmanStageId

type AiState = { status: 'idle' | 'loading' | 'done' | 'error'; text: string }

const STAGE_API: Record<StepKey, 'describe' | 'analyze' | 'interpret' | 'judge'> = {
  describe: 'describe',
  analyse: 'analyze',
  interpret: 'interpret',
  judge: 'judge',
}

const AI_IDLE: AiState = { status: 'idle', text: '' }

const STEPS = FELDMAN_STAGES.map((s, i) => ({
  ...s,
  key: s.id,
  title: `${i + 1}. ${s.zh} ${s.en}`,
}))

function emptyRecord<T>(v: () => T): Record<StepKey, T> {
  return { describe: v(), analyse: v(), interpret: v(), judge: v() }
}

export function FeldmanWriter() {
  const { cardPadding } = useSen()
  const [texts, setTexts] = useState<Record<StepKey, string>>(() => emptyRecord(() => ''))
  const [checked, setChecked] = useState<Record<StepKey, string[]>>(() => emptyRecord(() => []))
  const [active, setActive] = useState<StepKey>('describe')
  const [boostRan, setBoostRan] = useState(false)
  const [hits, setHits] = useState<FeldmanVocabEntry[]>([])
  const [artwork, setArtwork] = useState('')
  const [ai, setAi] = useState<Record<StepKey, AiState>>(() => emptyRecord(() => AI_IDLE))

  const draft = useMemo(
    () => STEPS.map((s) => `【${s.title}】\n${texts[s.key] || '（未寫）'}`).join('\n\n'),
    [texts],
  )

  function runBooster() {
    const result = boostOralText(texts[active])
    setBoostRan(true)
    setHits(result.hits)
    if (result.hits.length) {
      setTexts((t) => ({ ...t, [active]: result.boosted }))
    }
  }

  function insertFrame(key: StepKey, frame: string) {
    setTexts((t) => {
      const cur = t[key]
      return { ...t, [key]: (cur && !cur.endsWith('\n') ? `${cur}\n` : cur) + frame }
    })
  }

  function toggleCheck(key: StepKey, item: string) {
    setChecked((c) => ({
      ...c,
      [key]: c[key].includes(item) ? c[key].filter((x) => x !== item) : [...c[key], item],
    }))
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
        <p className="text-sm text-teal-800/70">句子框架＋檢查清單＋口語 → DSE 術語助推＋ Gemini AI 回饋</p>
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
              setBoostRan(false)
              setHits([])
            }}
            className={
              active === s.key
                ? 'rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-100'
            }
          >
            {s.title}
            {checked[s.key].length > 0 && (
              <span className="ml-1 opacity-80">
                ({checked[s.key].length}/{s.checklist.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {STEPS.filter((s) => s.key === active).map((s) => {
        const stageVocab = vocabForStage(s.key)
        return (
          <section
            key={s.key}
            className={`rounded-2xl border border-teal-100 bg-white shadow-sm ${cardPadding}`}
          >
            <h3 className="text-lg font-bold text-teal-950">{s.title}</h3>
            <p className="mt-1 text-sm text-teal-800/70">目標：{s.goal}</p>

            <div className="mt-3">
              <p className="text-xs font-semibold text-teal-700">句子框架（撳一下加入草稿，再填＿＿）</p>
              <ul className="mt-1.5 space-y-1.5">
                {s.frames.map((f) => (
                  <li key={f}>
                    <button
                      type="button"
                      onClick={() => insertFrame(s.key, f)}
                      className="inline-flex w-full items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2 text-left text-sm text-teal-950 hover:bg-teal-100"
                    >
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                      <span>{f}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <textarea
              className="mt-3 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              rows={5}
              value={texts[s.key]}
              onChange={(e) => setTexts((t) => ({ ...t, [s.key]: e.target.value }))}
              placeholder="用粵語口語都得，再撳助推轉術語…"
              maxLength={2000}
            />

            <fieldset className="mt-3">
              <legend className="text-xs font-semibold text-teal-700">檢查清單：寫咗未？</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {s.checklist.map((item) => {
                  const on = checked[s.key].includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleCheck(s.key, item)}
                      className={
                        on
                          ? 'inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-900 hover:bg-teal-50'
                      }
                    >
                      {on ? (
                        <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Square className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {item}
                    </button>
                  )
                })}
              </div>
            </fieldset>

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
            {boostRan && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {hits.length === 0 ? (
                  <p>
                    未偵測到詞典關鍵字。呢一步可試：
                    {stageVocab
                      .slice(0, 4)
                      .map((v) => `「${v.colloquial}」`)
                      .join('、')}
                    …
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {hits.map((h) => (
                      <li key={h.colloquial}>
                        「{h.colloquial}」→ <span className="font-semibold">{inlineTerm(h.term)}</span>
                        {h.term !== inlineTerm(h.term) && (
                          <span className="text-amber-800/70">（亦可寫：{h.term}）</span>
                        )}
                      </li>
                    ))}
                  </ul>
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

            <details className="mt-3 rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-teal-900">
                {s.zh}階段術語（{stageVocab.length} 條口語 → DSE 術語）
              </summary>
              <ul className="mt-2 space-y-1.5">
                {stageVocab.map((v) => (
                  <li key={v.colloquial}>
                    <span className="font-semibold">{v.colloquial}</span> → {v.term}
                    {termEnglish(v.term) && (
                      <span className="text-xs text-teal-700/70"> · {termEnglish(v.term)}</span>
                    )}
                    <p className="text-xs text-teal-700/60">例：{v.example}</p>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )
      })}

      <details className="rounded-2xl border border-teal-100 bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-semibold text-teal-950">四步草稿總覽</summary>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-teal-900/90">{draft}</pre>
      </details>
    </div>
  )
}
