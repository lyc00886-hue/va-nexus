import { useCallback, useState } from 'react'
import { ArtistCompare } from './components/ArtistCompare'
import { FeldmanWriter } from './components/FeldmanWriter'
import { FocusTunnel } from './components/FocusTunnel'
import { Header } from './components/Header'
import { SbaQuest } from './components/SbaQuest'
import { TabNav } from './components/TabNav'
import { isSupabaseConfigured } from './lib/supabase'
import type { TabId } from './types'

export default function App() {
  const [tab, setTab] = useState<TabId>('artists')
  const [artistSource, setArtistSource] = useState<'live' | 'mock'>(
    isSupabaseConfigured ? 'live' : 'mock',
  )
  const onSourceChange = useCallback((source: 'live' | 'mock') => {
    setArtistSource(source)
  }, [])

  const footer =
    artistSource === 'live'
      ? 'VA-Nexus AI MVP · live Supabase (artists + pairs) · Vercel + Gemini next'
      : 'VA-Nexus AI MVP · Vercel + Supabase + Gemini · mock data (live fetch unavailable)'

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <Header />
      <TabNav active={tab} onChange={setTab} />
      <main className="mx-auto max-w-5xl px-4 py-5 pb-24">
        <div className="rounded-b-2xl rounded-tr-2xl border border-teal-100 bg-white/70 p-4 shadow-sm backdrop-blur sm:p-6">
          {tab === 'artists' && <ArtistCompare onSourceChange={onSourceChange} />}
          {tab === 'sba' && <SbaQuest />}
          {tab === 'feldman' && <FeldmanWriter />}
        </div>
        <p className="mt-6 text-center text-[11px] text-teal-800/50">{footer}</p>
      </main>
      <FocusTunnel />
    </div>
  )
}
