import { Star } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import { t } from '../../i18n'

export function StatCards() {
  const { state, level } = useGame()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center gap-4 rounded-3xl border border-[#b7e4df] bg-white p-4 shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF9E9]">
          <Star className="h-7 w-7 text-[#0D9488]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{t('stats.xp')}</p>
          <p className="text-lg font-bold text-slate-900">{t('chrome.xp', { n: state.xp.toLocaleString() })}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${level.pct}%` }} />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {t('chrome.levelTitle', { n: level.level, title: level.title })}
            {level.next !== null ? ` · ${t('stats.toNext', { n: level.next - state.xp })}` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
