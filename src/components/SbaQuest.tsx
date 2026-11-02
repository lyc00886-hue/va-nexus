import { Check, Camera, Lock, Unlock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSen } from '../context/SenContext'

const STEPS = [
  { id: 1, title: '主題探索', hint: '寫下主題關鍵字與靈感來源' },
  { id: 2, title: '參考研究', hint: '揀最少一位藝術家作參照' },
  { id: 3, title: '草圖發展', hint: '上傳草圖／過程照' },
  { id: 4, title: '媒材試驗', hint: '記錄試驗結果與取捨' },
  { id: 5, title: '作品製作', hint: '過程證據（至少 2 張）' },
  { id: 6, title: '反思評鑑', hint: '對照評核準則寫短評' },
] as const

type Evidence = { stepId: number; name: string; previewUrl: string }

export function SbaQuest() {
  const { cardPadding } = useSen()
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [active, setActive] = useState(1)

  const unlocked = useMemo(() => {
    const set = new Set<number>([1])
    for (let i = 1; i <= 6; i++) {
      const hasNote = (notes[i] ?? '').trim().length > 0
      const hasEv = evidence.some((e) => e.stepId === i)
      if (hasNote || hasEv) set.add(Math.min(6, i + 1))
      else break
    }
    return set
  }, [notes, evidence])

  function onUpload(stepId: number, file: File | null) {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setEvidence((prev) => [...prev, { stepId, name: file.name, previewUrl }])
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-teal-950">SBA 六步闖關</h2>
        <p className="text-sm text-teal-800/70">
          完成筆記或上傳證據即可解鎖下一步（本機預覽；稍後接 Supabase Storage）
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s) => {
          const isOpen = unlocked.has(s.id)
          const done =
            (notes[s.id] ?? '').trim().length > 0 || evidence.some((e) => e.stepId === s.id)
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!isOpen}
                onClick={() => setActive(s.id)}
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

      {STEPS.filter((s) => s.id === active).map((s) => (
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
              rows={4}
              value={notes[s.id] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
              placeholder="用自己嘅說話記錄…"
            />
          </label>

          <label className="mt-4 flex cursor-pointer flex-col items-start gap-2">
            <span className="text-sm font-medium text-teal-900">證據上傳（相片／檔案）</span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-3 text-sm text-teal-800">
              <Camera className="h-4 w-4" aria-hidden />
              選擇檔案（本機預覽）
            </span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(e) => onUpload(s.id, e.target.files?.[0] ?? null)}
            />
          </label>

          <ul className="mt-3 flex flex-wrap gap-3">
            {evidence
              .filter((e) => e.stepId === s.id)
              .map((e) => (
                <li key={e.previewUrl} className="w-28 overflow-hidden rounded-xl border border-teal-100 bg-teal-50">
                  {e.previewUrl.match(/\.(pdf)$/i) || e.name.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex h-20 items-center justify-center p-2 text-center text-[11px] text-teal-800">
                      PDF
                    </div>
                  ) : (
                    <img src={e.previewUrl} alt={e.name} className="h-20 w-full object-cover" />
                  )}
                  <p className="truncate px-2 py-1 text-[10px] text-teal-900">{e.name}</p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
