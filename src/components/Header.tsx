import { Accessibility, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useSen } from '../context/SenContext'
import type { SenMode } from '../types'
import { AuthButton } from './AuthButton'
import { ProgressSync } from './ProgressSync'
import { SenSettingsPanel } from './SenSettingsPanel'

const MODES: { id: SenMode; label: string; hint: string }[] = [
  { id: 'standard', label: '標準', hint: '標準顯示' },
  { id: 'spld', label: '讀寫', hint: '讀寫支援：大字、行距、簡易版文字' },
  { id: 'adhd', label: '專注', hint: '專注支援：專注模式、減少動畫' },
]

export function Header() {
  const { mode, setMode } = useSen()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">VA-Nexus AI</p>
            <p className="text-[11px] text-slate-500">HKDSE 視覺藝術 · 藝術史 · 研究 · SBA</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full bg-blue-50 p-1 ring-1 ring-blue-100"
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
                    ? 'rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow'
                    : 'rounded-full px-3 py-1 text-xs font-medium text-slate-600 hover:bg-blue-100'
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
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-blue-200 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            <Accessibility className="h-3.5 w-3.5" aria-hidden />
            無障礙設定
          </button>

          <AuthButton />
          <ProgressSync />
        </div>

        {open && <SenSettingsPanel onClose={close} />}
      </div>
    </header>
  )
}
