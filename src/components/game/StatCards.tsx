import { Flame, Star } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'

function Ring({ pct }: { pct: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="#2563eb"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
      />
    </svg>
  )
}

export function StatCards() {
  const { progressPct, state, streak, level } = useGame()
  const { settings } = useSen()
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Ring pct={progressPct} />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
            {progressPct}%
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">當前進度</p>
          <p className="text-lg font-bold text-slate-900">學習地圖</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Star className="h-7 w-7 fill-amber-400 text-amber-400" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">累積經驗值</p>
          <p className="text-lg font-bold text-slate-900">{state.xp.toLocaleString()} XP</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${level.pct}%` }} />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Lv.{level.level} {level.title}
            {level.next !== null ? ` · 距離下一級 ${level.next - state.xp} XP` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
          <Flame
            className={`h-7 w-7 ${streak > 0 ? 'fill-orange-400 text-orange-500' : 'text-slate-300'} ${
              streak > 0 && !settings.reduceMotion ? 'animate-pulse' : ''
            }`}
            aria-hidden
          />
        </span>
        <div>
          <p className="text-xs font-medium text-slate-500">連續學習</p>
          <p className="text-lg font-bold text-slate-900">{streak} 天</p>
          <p className="text-[11px] text-slate-500">最佳紀錄 {state.streak.best} 天（香港時間計）</p>
        </div>
      </div>
    </div>
  )
}
