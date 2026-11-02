import { Accessibility, LogIn, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useSen } from '../context/SenContext'
import type { SenMode } from '../types'
import { SenSettingsPanel } from './SenSettingsPanel'

const MODES: { id: SenMode; label: string; hint: string }[] = [
  { id: 'standard', label: '標準', hint: 'Standard' },
  { id: 'spld', label: '讀寫', hint: 'SpLD · larger text + spacing' },
  { id: 'adhd', label: '專注', hint: 'ADHD · focus tunnel + reduced motion' },
]

export function Header() {
  const { mode, setMode } = useSen()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-teal-950">VA-Nexus AI</p>
            <p className="text-[11px] text-teal-800/70">HKDSE Visual Arts · SBA</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full bg-teal-50 p-1 ring-1 ring-teal-100"
            role="group"
            aria-label="SEN 快速模式"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.hint}
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={
                  mode === m.id
                    ? 'rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white shadow'
                    : 'rounded-full px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100'
                }
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-sen-trigger
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              open || mode === 'custom'
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-teal-200 bg-white text-teal-900 hover:bg-teal-50'
            }`}
          >
            <Accessibility className="h-3.5 w-3.5" aria-hidden />
            無障礙設定
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-50"
            onClick={() =>
              alert(
                'Google 登入稍後接 Supabase Auth。\n請在 .env 設定 VITE_SUPABASE_URL 同 VITE_SUPABASE_ANON_KEY。',
              )
            }
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            Sign in with Google
          </button>
        </div>

        {open && <SenSettingsPanel onClose={close} />}
      </div>
    </header>
  )
}
