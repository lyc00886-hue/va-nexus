import { Award, BookOpen, Flame, FolderOpen, PenLine, Search, TrendingUp } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import type { ActivityEntry } from '../../game/types'
import { t } from '../../i18n'

const ICONS: Record<ActivityEntry['kind'], typeof Award> = {
  lesson: BookOpen,
  quest: Search,
  badge: Award,
  sba: FolderOpen,
  feldman: PenLine,
  level: TrendingUp,
  streak: Flame,
}

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return t('ago.now')
  if (m < 60) return t('ago.min', { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return t('ago.hour', { n: h })
  return t('ago.day', { n: Math.round(h / 24) })
}

export function ActivityLog({ limit = 6 }: { limit?: number }) {
  const { state } = useGame()
  const items = state.activity.slice(0, limit)
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{t('activity.recent')}</h3>
      {items.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
          <img
            src="/o2-otter.png"
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 object-contain"
            decoding="async"
          />
          <p className="text-sm text-slate-500">{t('activity.empty')}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((a) => {
            const Icon = ICONS[a.kind]
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    a.kind === 'badge' ? 'bg-violet-100 text-violet-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{a.text}</p>
                  <p className="text-[11px] text-slate-400">{ago(a.ts)}</p>
                </div>
                {a.xp ? <span className="text-xs font-bold text-amber-600">{t('chrome.xpGain', { n: a.xp })}</span> : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
