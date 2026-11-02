import {
  AlertTriangle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Loader2,
  Lock,
  Unlock,
  UploadCloud,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { useSen } from '../context/SenContext'
import { XP } from '../game/rewards'
import { getDeviceId } from '../lib/deviceId'
import {
  fetchEvidence,
  loadLocalNotes,
  saveEvidence,
  saveLocal,
  validateImage,
  type SbaEvidence,
} from '../lib/sbaEvidence'
import { isSupabaseConfigured } from '../lib/supabase'

const STEPS = [
  { id: 1, title: '主題探索', hint: '寫下主題關鍵字與靈感來源' },
  { id: 2, title: '參考研究', hint: '揀最少一位藝術家作參照' },
  { id: 3, title: '草圖發展', hint: '上傳草圖／過程照' },
  { id: 4, title: '媒材試驗', hint: '記錄試驗結果與取捨' },
  { id: 5, title: '作品製作', hint: '過程證據（至少 2 張）' },
  { id: 6, title: '反思評鑑', hint: '對照評核準則寫短評' },
] as const

type Source = 'loading' | 'live' | 'local'

export function SbaQuest() {
  const { cardPadding, focusTunnel } = useSen()
  const { awardOnce } = useGame()
  const deviceId = useMemo(() => getDeviceId(), [])
  const [evidence, setEvidence] = useState<SbaEvidence[]>([])
  const [source, setSource] = useState<Source>(isSupabaseConfigured ? 'loading' : 'local')
  const [active, setActive] = useState(1)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<{ file: File; preview: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!isSupabaseConfigured) {
      setEvidence(loadLocalNotes())
      return
    }
    fetchEvidence(deviceId)
      .then((rows) => {
        if (cancelled) return
        setEvidence(rows)
        setSource('live')
      })
      .catch((e) => {
        if (cancelled) return
        console.warn('[sba] fetch failed, using local mode', e)
        setEvidence(loadLocalNotes())
        setSource('local')
      })
    return () => {
      cancelled = true
    }
  }, [deviceId])

  function goTo(step: number) {
    if (step === active) return
    pending.forEach((x) => URL.revokeObjectURL(x.preview))
    setPending([])
    setNote('')
    setMessage(null)
    setActive(step)
  }

  const doneSteps = useMemo(() => new Set(evidence.map((e) => e.step)), [evidence])

  const unlocked = useMemo(() => {
    const set = new Set<number>([1])
    for (let i = 1; i <= 6; i++) {
      if (doneSteps.has(i)) set.add(Math.min(6, i + 1))
      else break
    }
    return set
  }, [doneSteps])

  const completed = STEPS.filter((s) => doneSteps.has(s.id)).length
  const pct = Math.round((completed / STEPS.length) * 100)

  function onPick(list: FileList | null) {
    if (!list) return
    const errors: string[] = []
    const ok: { file: File; preview: string }[] = []
    Array.from(list).forEach((f) => {
      const err = validateImage(f)
      if (err) errors.push(err)
      else ok.push({ file: f, preview: URL.createObjectURL(f) })
    })
    setPending((p) => [...p, ...ok])
    setMessage(errors.length ? { kind: 'error', text: errors.join('；') } : null)
  }

  function removePending(preview: string) {
    URL.revokeObjectURL(preview)
    setPending((p) => p.filter((x) => x.preview !== preview))
  }

  async function onSave() {
    const files = pending.map((p) => p.file)
    if (files.length === 0 && !note.trim()) {
      setMessage({ kind: 'error', text: '請寫筆記或揀最少一張相片' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      let added: SbaEvidence[]
      if (source === 'live') {
        try {
          added = await saveEvidence(deviceId, active, files, note)
          pending.forEach((x) => URL.revokeObjectURL(x.preview))
          setMessage({ kind: 'ok', text: '已儲存到雲端 ✓' })
        } catch (e) {
          console.warn('[sba] upload failed, saving locally', e)
          added = saveLocal(active, files, note)
          setMessage({ kind: 'error', text: '上載失敗，已暫存喺本機（相片重新整理後會消失）' })
        }
      } else {
        added = saveLocal(active, files, note)
        setMessage({ kind: 'ok', text: '已暫存喺本機（離線模式）' })
      }
      setEvidence((prev) => [...prev, ...added])
      const stepTitle = STEPS.find((s) => s.id === active)?.title ?? ''
      awardOnce(`sba-step-${active}`, XP.sbaStep, `完成 SBA 第${active}步：${stepTitle}`, 'sba')
      setNote('')
      setPending([])
    } finally {
      setSaving(false)
    }
  }

  const activeIdx = STEPS.findIndex((s) => s.id === active)
  const prev = STEPS[activeIdx - 1]
  const next = STEPS[activeIdx + 1]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-teal-950">SBA 六步闖關</h2>
        <p className="text-sm text-teal-800/70">完成筆記或上傳證據即可解鎖下一步</p>
      </div>

      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>試用版：相片未有登入保護，請只上載測試相片，唔好上載真學生作品或樣貌。</span>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
          <span>
            進度 {completed} / {STEPS.length} 步
          </span>
          <span className="inline-flex items-center gap-1 font-normal text-teal-800/70">
            {source === 'loading' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> 連接雲端…
              </>
            )}
            {source === 'live' && <>雲端同步（Supabase）</>}
            {source === 'local' && (
              <>
                <CloudOff className="h-3 w-3" aria-hidden /> 離線／本機模式
              </>
            )}
          </span>
        </div>
        <div
          className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-teal-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="SBA 進度"
        >
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {focusTunnel ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && goTo(prev.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-teal-900 hover:bg-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> 上一步
          </button>
          <span className="font-semibold text-amber-900">
            專注模式 · 第 {active} / {STEPS.length} 步
          </span>
          <button
            type="button"
            disabled={!next || !unlocked.has(next.id)}
            onClick={() => next && goTo(next.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-teal-900 hover:bg-white disabled:opacity-40"
          >
            下一步 <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STEPS.map((s) => {
            const isOpen = unlocked.has(s.id)
            const done = doneSteps.has(s.id)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!isOpen}
                  onClick={() => goTo(s.id)}
                  aria-current={active === s.id ? 'step' : undefined}
                  className={`flex w-full flex-col items-start rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    active === s.id
                      ? 'border-teal-600 bg-teal-700 text-white shadow'
                      : isOpen
                        ? 'border-teal-200 bg-white text-teal-950 hover:border-teal-400'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : isOpen ? (
                      <Unlock className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    Step {s.id}
                  </span>
                  <span className="mt-1 font-semibold">{s.title}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {STEPS.filter((s) => s.id === active).map((s) => {
        const items = evidence.filter((e) => e.step === s.id)
        return (
          <section
            key={s.id}
            className={`rounded-2xl border border-teal-100 bg-white shadow-sm ${cardPadding}`}
          >
            <h3 className="text-lg font-bold text-teal-950">
              第 {s.id} 步 · {s.title}
            </h3>
            <p className="mt-1 text-sm text-teal-800/70">{s.hint}</p>

            <label className="mt-4 block text-sm font-medium text-teal-900">
              過程筆記
              <textarea
                className="mt-1 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="用自己嘅說話記錄…"
              />
            </label>

            <label className="mt-4 flex cursor-pointer flex-col items-start gap-2">
              <span className="text-sm font-medium text-teal-900">證據相片（每張最多 5 MB）</span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-3 text-sm text-teal-800">
                <Camera className="h-4 w-4" aria-hidden />
                選擇相片
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  onPick(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>

            {pending.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3" aria-label="待上載相片">
                {pending.map((p) => (
                  <li
                    key={p.preview}
                    className="relative w-24 overflow-hidden rounded-xl border border-amber-200 bg-amber-50"
                  >
                    <img src={p.preview} alt={p.file.name} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePending(p.preview)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                      aria-label={`移除 ${p.file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || source === 'loading'}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <UploadCloud className="h-4 w-4" aria-hidden />
                )}
                {saving ? '儲存中…' : '儲存證據'}
              </button>
              {message && (
                <p
                  role="status"
                  className={`text-sm ${message.kind === 'error' ? 'text-rose-700' : 'text-teal-700'}`}
                >
                  {message.text}
                </p>
              )}
            </div>

            {items.length > 0 && (
              <div className="mt-5 border-t border-teal-100 pt-4">
                <h4 className="text-sm font-semibold text-teal-900">已儲存（{items.length}）</h4>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {items.map((e) => (
                    <li key={e.id} className="w-32 overflow-hidden rounded-xl border border-teal-100 bg-teal-50">
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noreferrer">
                          <img
                            src={e.url}
                            alt={e.note ?? `Step ${e.step} 證據`}
                            loading="lazy"
                            className="h-24 w-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-24 items-center justify-center p-2 text-center text-[11px] text-teal-800">
                          {e.file_path ? '相片（本機，已失效）' : '筆記'}
                        </div>
                      )}
                      {e.note && <p className="line-clamp-3 px-2 py-1 text-[11px] text-teal-900">{e.note}</p>}
                      {e.local && <p className="px-2 pb-1 text-[10px] text-amber-700">本機暫存</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
