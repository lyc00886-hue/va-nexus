import { useCallback, useEffect, useState } from 'react'
import { ArtistCompare } from './components/ArtistCompare'
import { CommitmentFooter } from './components/CommitmentBadges'
import { FocusTunnel } from './components/FocusTunnel'
import { Header } from './components/Header'
import { SbaQuest } from './components/SbaQuest'
import { PrivacyModal } from './components/PrivacyModal'
import { MobileNav, Sidebar, TABS } from './components/Sidebar'
import { Achievements } from './components/game/Achievements'
import { CheckInModal } from './components/game/CheckInModal'
import { LearningMap } from './components/game/LearningMap'
import { NudgeToast } from './components/game/NudgeToast'
import { ResearchLab } from './components/game/ResearchLab'
import { useT } from './i18n'
import { contentJson } from './i18n/content'
import type { AbilityChartFile } from './lib/abilityChart'
import { requestOpenAbilityChart } from './lib/portfolioSections'
import { isSupabaseConfigured } from './lib/supabase'
import type { TabId } from './types'

const TAB_KEY = 'va-nexus:tab'

function initialTab(): TabId {
  try {
    const saved = localStorage.getItem(TAB_KEY) as TabId | null
    if (saved && TABS.some((x) => x.id === saved)) return saved
  } catch {
    /* ignore */
  }
  return 'map'
}

export default function App() {
  const { t } = useT()
  const [tab, setTab] = useState<TabId>(initialTab)
  const [artistSource, setArtistSource] = useState<'live' | 'mock'>(
    isSupabaseConfigured ? 'live' : 'mock',
  )
  const onSourceChange = useCallback((source: 'live' | 'mock') => {
    setArtistSource(source)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 })
  }, [tab])

  const footer = t(artistSource === 'live' ? 'app.footer.live' : 'app.footer.mock')

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex">
        <Sidebar active={tab} onChange={setTab} />
        <main className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 md:pb-10 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div key={tab} className="tab-panel-enter">
              {tab === 'map' && <LearningMap />}
              {tab === 'research' && <ResearchLab />}
              {tab === 'portfolio' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{t('tab.portfolio')}</h2>
                    <p className="text-sm text-slate-500">{t('app.portfolio.subtitle')}</p>
                    <p className="mt-1 text-sm text-slate-600">{t('portfolio.sections.tip')}</p>
                    <button
                      type="button"
                      onClick={requestOpenAbilityChart}
                      className="mt-2 inline-block text-left text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
                    >
                      {contentJson<AbilityChartFile>('ability-chart').meta.title}
                    </button>
                  </div>
                  <SbaQuest />
                </div>
              )}
              {tab === 'library' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{t('tab.library')}</h2>
                    <p className="text-sm text-slate-500">{t('app.library.subtitle')}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <ArtistCompare onSourceChange={onSourceChange} />
                  </div>
                </div>
              )}
              {tab === 'achievements' && <Achievements />}
            </div>
            <CommitmentFooter dataLine={footer} />
          </div>
        </main>
      </div>
      <MobileNav active={tab} onChange={setTab} />
      <FocusTunnel />
      <NudgeToast />
      <CheckInModal />
      <PrivacyModal />
    </div>
  )
}
