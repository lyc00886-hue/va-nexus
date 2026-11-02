import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSen } from '../context/SenContext'

const FOCUS_SECONDS = 25 * 60

export function FocusTunnel() {
  const { focusTunnel, update } = useSen()
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [left, setLeft] = useState(FOCUS_SECONDS)
  const [task, setTask] = useState('')

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!focusTunnel) return null

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <>
      <div className="fixed bottom-20 right-4 z-30 flex items-center gap-2 md:bottom-6">
        <button
          type="button"
          onClick={() => update('focusTunnel', false)}
          className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-teal-900 shadow ring-1 ring-teal-200 hover:bg-teal-50"
          title="關閉專注隧道"
        >
          關閉專注
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-amber-600"
        >
          <Timer className="h-4 w-4" aria-hidden />
          專注計時 {mm}:{ss}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="專注隧道計時"
          className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/90 p-6 text-center text-white"
        >
          <div className="w-full max-w-sm">
            <p className="text-sm uppercase tracking-widest text-teal-200">Focus tunnel</p>
            <label className="mt-4 block text-left text-sm text-teal-100">
              而家只做一件事：
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="例如：寫完第 3 步草圖筆記"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-base text-white placeholder:text-teal-200/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <p className="mt-6 font-mono text-5xl font-bold tabular-nums" aria-live="polite">
              {mm}:{ss}
            </p>
            {left === 0 && <p className="mt-2 text-amber-300">完成！休息 5 分鐘先 🎉</p>}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                disabled={left === 0}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
              >
                {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                {running ? '暫停' : '開始'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRunning(false)
                  setLeft(FOCUS_SECONDS)
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> 重設
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              <X className="h-4 w-4" aria-hidden />
              返回作業（計時繼續）
            </button>
          </div>
        </div>
      )}
    </>
  )
}
