import { Timer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSen } from '../context/SenContext'

const FOCUS_SECONDS = 25 * 60

export function FocusTunnel() {
  const { focusTunnel } = useSen()
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState(FOCUS_SECONDS)

  useEffect(() => {
    if (!open) return
    setLeft(FOCUS_SECONDS)
    const id = window.setInterval(() => {
      setLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [open])

  if (!focusTunnel) return null

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-amber-600 md:bottom-6"
      >
        <Timer className="h-4 w-4" aria-hidden />
        專注隧道 25:00
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/90 p-6 text-center text-white">
          <div className="max-w-sm">
            <p className="text-sm uppercase tracking-widest text-teal-200">Focus tunnel</p>
            <p className="mt-4 font-mono text-5xl font-bold tabular-nums">
              {mm}:{ss}
            </p>
            <p className="mt-4 text-sm text-teal-100">
              ADHD 模式：一次只做一件事。計時完可以休息。
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              <X className="h-4 w-4" aria-hidden />
              離開隧道
            </button>
          </div>
        </div>
      )}
    </>
  )
}
