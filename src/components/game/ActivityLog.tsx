import { Award, BookOpen, Flame, FolderOpen, PenLine, Search, TrendingUp } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import type { ActivityEntry } from '../../game/types'
import { MOOD_EMPTY_MAP } from '../../game/softMotion'
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
        <div className="mt-3 flex flex-col items-center gap-3 rounded-3xl bg-[#FFF9E9] px-4 py-6 text-center">
          <img
            src={MOOD_EMPTY_MAP}
            alt=""
            width={1152}
            height={864}
            className="w-full max-w-xs rounded-3xl object-contain"
            decoding="async"
          />
          <p className="text-sm font-semibold text-slate-700">{t('activity.empty')}</p>
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
