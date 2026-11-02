import { useCallback, useEffect, useState } from 'react'
import { ArtistCompare } from './components/ArtistCompare'
import { FocusTunnel } from './components/FocusTunnel'
import { Header } from './components/Header'
import { SbaQuest } from './components/SbaQuest'
import { PrivacyLink, PrivacyModal } from './components/PrivacyModal'
import { MobileNav, Sidebar, TABS } from './components/Sidebar'
import { Achievements } from './components/game/Achievements'
import { CheckInModal } from './components/game/CheckInModal'
import { LearningMap } from './components/game/LearningMap'
import { NudgeToast } from './components/game/NudgeToast'
import { ResearchLab } from './components/game/ResearchLab'
import { isSupabaseConfigured } from './lib/supabase'
import type { TabId } from './types'

const TAB_KEY = 'va-nexus:tab'

function initialTab(): TabId {
  try {
    const t = localStorage.getItem(TAB_KEY) as TabId | null
    if (t && TABS.some((x) => x.id === t)) return t
  } catch {
    /* ignore */
  }
  return 'map'
}

export default function App() {
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

  const footer =
    artistSource === 'live'
      ? 'VA-Nexus AI · live Supabase (artists + pairs) · 學習進度暫存本機'
      : 'VA-Nexus AI · mock data (live fetch unavailable) · 學習進度暫存本機'

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex">
        <Sidebar active={tab} onChange={setTab} />
        <main className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 md:pb-10 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {tab === 'map' && <LearningMap />}
            {tab === 'research' && <ResearchLab />}
            {tab === 'portfolio' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">我的作品集</h2>
                  <p className="text-sm text-slate-500">SBA 六步任務 · 每完成一步 +50 XP</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <SbaQuest />
                </div>
              </div>
            )}
            {tab === 'library' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">藝術圖書館</h2>
                  <p className="text-sm text-slate-500">藝術家資料庫 · 比較兩位藝術家</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <ArtistCompare onSourceChange={onSourceChange} />
                </div>
              </div>
            )}
            {tab === 'achievements' && <Achievements />}
            <p className="mt-8 text-center text-[11px] text-slate-400">
              {footer} · <PrivacyLink />
            </p>
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
