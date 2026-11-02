import { Award, FolderOpen, Library, Map, Search, type LucideIcon } from 'lucide-react'
import { useGame } from '../context/GameContext'
import { t as tr, useT, type MessageKey } from '../i18n'
import type { TabId } from '../types'
import { PrivacyLink } from './PrivacyModal'

export const TABS: { id: TabId; icon: LucideIcon }[] = [
  { id: 'map', icon: Map },
  { id: 'research', icon: Search },
  { id: 'portfolio', icon: FolderOpen },
  { id: 'library', icon: Library },
  { id: 'achievements', icon: Award },
]

export function tabLabel(id: TabId, short = false): string {
  return tr(`tab.${id}${short ? '.short' : ''}` as MessageKey)
}

type Props = { active: TabId; onChange: (t: TabId) => void }

export function Sidebar({ active, onChange }: Props) {
  const { level, state } = useGame()
  const { t } = useT()
  return (
    <nav
      aria-label={t('nav.main')}
      className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 md:flex"
    >
      <ul className="space-y-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const on = active === tab.id
          return (
            <li key={tab.id}>
              <button
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => onChange(tab.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold ${
                  on ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {tabLabel(tab.id)}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-bold text-slate-900">
          Lv.{level.level} {level.title}
        </p>
        <p>{state.xp} XP</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${level.pct}%` }} />
        </div>
        <PrivacyLink className="mt-2 block text-[11px]" />
      </div>
    </nav>
  )
}

export function MobileNav({ active, onChange }: Props) {
  const { t } = useT()
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const on = active === tab.id
          return (
            <li key={tab.id}>
              <button
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => onChange(tab.id)}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  on ? 'text-blue-700' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {tabLabel(tab.id, true)}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
