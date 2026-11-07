import { Award, ClipboardList, FileText, FolderOpen, Library, Map, Search, type LucideIcon } from 'lucide-react'
import { useGame } from '../context/GameContext'
import { t as tr, useT, type MessageKey } from '../i18n'
import type { TabId } from '../types'
import { PrivacyLink } from './PrivacyModal'

export type TabItem = { id: TabId; icon: LucideIcon }

export const TABS: TabItem[] = [
  { id: 'map', icon: Map },
  { id: 'research', icon: Search },
  { id: 'portfolio', icon: FolderOpen },
  { id: 'library', icon: Library },
  { id: 'practice', icon: FileText },
  { id: 'achievements', icon: Award },
]

/** Staff-only. Not part of TABS, so student chrome stays the five learning tabs. */
export const STAFF_TAB: TabItem = { id: 'staff', icon: ClipboardList }

export function tabLabel(id: TabId, short = false): string {
  return tr(`tab.${id}${short ? '.short' : ''}` as MessageKey)
}

type Props = { active: TabId; onChange: (t: TabId) => void; extraTabs?: TabItem[] }

function tabsFor(extraTabs?: TabItem[]): TabItem[] {
  if (!extraTabs || extraTabs.length === 0) return TABS
  return [...TABS, ...extraTabs]
}

export function Sidebar({ active, onChange, extraTabs }: Props) {
  const { level, state } = useGame()
  const { t } = useT()
  const tabs = tabsFor(extraTabs)
  return (
    <nav
      aria-label={t('nav.main')}
      className="map-one-chrome sticky top-[64px] hidden h-[calc(100vh-64px)] w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 md:flex"
    >
      <ul className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const on = active === tab.id
          return (
            <li key={tab.id}>
              <button
                type="button"
                aria-current={on ? 'page' : undefined}
                data-testid={tab.id === 'staff' ? 'nav-staff-desktop' : undefined}
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
          {t('chrome.levelTitle', { n: level.level, title: level.title })}
        </p>
        <p>{t('chrome.xp', { n: state.xp })}</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${level.pct}%` }} />
        </div>
        <PrivacyLink className="mt-2 block text-[11px]" />
      </div>
    </nav>
  )
}

export function MobileNav({ active, onChange, extraTabs }: Props) {
  const { t } = useT()
  const tabs = tabsFor(extraTabs)
  return (
    <nav
      aria-label={t('nav.main')}
      className="map-one-chrome fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const on = active === tab.id
          const full = tabLabel(tab.id)
          return (
            <li key={tab.id} className="min-w-0">
              <button
                type="button"
                aria-current={on ? 'page' : undefined}
                aria-label={full}
                title={full}
                data-testid={tab.id === 'staff' ? 'nav-staff-mobile' : undefined}
                onClick={() => onChange(tab.id)}
                className={`flex w-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[11px] font-semibold leading-none ${
                  on ? 'text-blue-700' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate whitespace-nowrap">{tabLabel(tab.id, true)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
