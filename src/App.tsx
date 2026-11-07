import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { ArtistCompare } from './components/ArtistCompare'
import { CommitmentFooter } from './components/CommitmentBadges'
import { FocusTunnel } from './components/FocusTunnel'
import { Header } from './components/Header'
import { SbaQuest } from './components/SbaQuest'
import { PracticeGuestDraftPrompt } from './components/PracticeGuestDraftPrompt'
import { PracticePapers } from './components/PracticePapers'
import { PrivacyModal } from './components/PrivacyModal'
import { MobileNav, Sidebar, STAFF_TAB, TABS } from './components/Sidebar'
import { Achievements } from './components/game/Achievements'
import { CheckInModal } from './components/game/CheckInModal'
import { LearningMap } from './components/game/LearningMap'
import { NudgeToast } from './components/game/NudgeToast'
import { ResearchLab } from './components/game/ResearchLab'
import { useT } from './i18n'
import { contentJson } from './i18n/content'
import type { AbilityChartFile } from './lib/abilityChart'
import { requestOpenAbilityChart } from './lib/portfolioSections'
import { isStudentTab, OPEN_TAB_EVENT } from './lib/openTab'
import { isSupabaseConfigured } from './lib/supabase'
import { useStaffGate } from './lib/useStaffRole'
import type { TabId } from './types'

const TeacherDraftBand = lazy(() => import('./components/TeacherDraftBand'))

const TAB_KEY = 'va-nexus:tab'

function initialTab(): TabId {
  try {
    const saved = localStorage.getItem(TAB_KEY) as TabId | null
    if (saved === 'staff') return saved
    if (saved && TABS.some((x) => x.id === saved)) return saved
  } catch {
    /* ignore */
  }
  return 'map'
}

export default function App() {
  const { t } = useT()
  const staffGate = useStaffGate()
  const staffRole = staffGate.role
  const [tab, setTab] = useState<TabId>(initialTab)
  const [artistSource, setArtistSource] = useState<'live' | 'mock'>(
    isSupabaseConfigured ? 'live' : 'mock',
  )
  const onSourceChange = useCallback((source: 'live' | 'mock') => {
    setArtistSource(source)
  }, [])

  const showStaffNav = staffRole != null
  const activeTab: TabId = tab === 'staff' && !showStaffNav ? 'map' : tab
  const extraTabs = showStaffNav ? [STAFF_TAB] : undefined

  useEffect(() => {
    // Don't overwrite a teacher's saved staff tab before the session is known.
    if (tab === 'staff' && !staffGate.ready) return
    try {
      localStorage.setItem(TAB_KEY, activeTab)
    } catch {
      /* ignore */
    }
  }, [activeTab, tab, staffGate.ready])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [activeTab])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<unknown>).detail
      if (isStudentTab(id)) setTab(id)
    }
    window.addEventListener(OPEN_TAB_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_TAB_EVENT, onOpen)
  }, [])

  const footer = t(artistSource === 'live' ? 'app.footer.live' : 'app.footer.mock')

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex">
        <Sidebar active={activeTab} onChange={setTab} extraTabs={extraTabs} />
        <main className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 md:pb-10 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div key={activeTab} className="tab-panel-enter">
              {activeTab === 'map' && <LearningMap />}
              {activeTab === 'research' && <ResearchLab />}
              {activeTab === 'portfolio' && (
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
              {activeTab === 'practice' && <PracticePapers />}
              {activeTab === 'library' && (
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
              {activeTab === 'achievements' && <Achievements />}
              {activeTab === 'staff' && showStaffNav && (
                <Suspense fallback={<div className="min-h-40" aria-busy="true" data-testid="teacher-draft-loading" />}>
                  <TeacherDraftBand />
                </Suspense>
              )}
            </div>
            <CommitmentFooter dataLine={footer} />
          </div>
        </main>
      </div>
      <MobileNav active={activeTab} onChange={setTab} extraTabs={extraTabs} />
      <FocusTunnel />
      <NudgeToast />
      <CheckInModal />
      <PrivacyModal />
      <PracticeGuestDraftPrompt />
    </div>
  )
}
