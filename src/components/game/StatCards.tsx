import { Flame, Star } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { t } from '../../i18n'

export function StatCards() {
  const { state, streak, level } = useGame()
  const { settings } = useSen()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Star className="h-7 w-7 fill-amber-400 text-amber-400" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{t('stats.xp')}</p>
          <p className="text-lg font-bold text-slate-900">{t('chrome.xp', { n: state.xp.toLocaleString() })}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${level.pct}%` }} />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {t('chrome.levelTitle', { n: level.level, title: level.title })}
            {level.next !== null ? ` · ${t('stats.toNext', { n: level.next - state.xp })}` : ''}
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
          <p className="text-xs font-medium text-slate-500">{t('stats.streak')}</p>
          <p className="text-lg font-bold text-slate-900">{t('common.days', { n: streak })}</p>
          <p className="text-[11px] text-slate-500">{t('stats.best', { n: state.streak.best })}</p>
        </div>
      </div>
    </div>
  )
}
