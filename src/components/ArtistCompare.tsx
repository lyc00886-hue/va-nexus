import {
  ArrowLeftRight,
  BookOpenText,
  Lightbulb,
  Scale,
  Square,
  Volume2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ARTIST_PAIRS, ARTISTS, artistById as mockArtistById } from '../data/artists'
import { useSen } from '../context/SenContext'
import {
  artistDisplayName,
  artistSecondaryName,
  mapDbArtist,
  mapDbPair,
  type DbArtist,
  type DbArtistPair,
} from '../lib/artistMappers'
import { buildCompareRows, buildSbaTips, chunkText, type CompareRow, type SbaTip } from '../lib/compareInsights'
import { curatedCompare, getPairCompare } from '../lib/content'
import { joinList, t } from '../i18n'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useSpeech } from '../lib/useSpeech'
import type { Artist, ArtistPair } from '../types'

function ArtistCard({
  side,
  namePrimary,
  nameSecondary,
  era,
  medium,
  themes,
  styleKeywords,
  bio,
  padding,
  easyRead,
  sourceUrl,
}: {
  side: string
  namePrimary: string
  nameSecondary: string | null
  era: string | null
  medium: string | null
  themes: string[]
  styleKeywords: string[]
  bio: string | null
  padding: string
  easyRead: boolean
  sourceUrl?: string | null
}) {
  const chunks = easyRead ? chunkText(bio) : []
  return (
    <article
      className={`flex flex-1 flex-col rounded-2xl border border-teal-100 bg-white shadow-sm ${padding}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">{side}</p>
      <h3 className="mt-1 text-lg font-bold text-teal-950">{namePrimary}</h3>
      {nameSecondary && <p className="text-sm text-teal-800/80">{nameSecondary}</p>}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
        >
          {t('ac.source')}
        </a>
      )}
      <p className="mt-2 text-xs text-teal-700/70">
        {[era, medium].filter(Boolean).join(' · ')}
      </p>
      {easyRead ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-loose text-teal-950">
          {chunks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-teal-950/90">{bio}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {themes.map((x) => (
          <span
            key={x}
            className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800"
          >
            {x}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {styleKeywords.map((x) => (
          <span
            key={x}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900"
          >
            {x}
          </span>
        ))}
      </div>
    </article>
  )
}

type DataSource = 'live' | 'mock' | 'loading'

function displayName(a: Artist) {
  return artistDisplayName(a)
}

export function ArtistCompare({
  onSourceChange,
}: {
  onSourceChange?: (source: Exclude<DataSource, 'loading'>) => void
} = {}) {
  const { cardPadding, mode, setMode } = useSen()
  const easyRead = mode === 'spld'
  const tts = useSpeech()
  const [pairs, setPairs] = useState<ArtistPair[]>(ARTIST_PAIRS)
  const [artists, setArtists] = useState<Artist[]>(ARTISTS)
  const [source, setSource] = useState<DataSource>(
    isSupabaseConfigured ? 'loading' : 'mock',
  )
  const [error, setError] = useState<string | null>(null)
  const [pairId, setPairId] = useState(ARTIST_PAIRS[0]?.id ?? '')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!supabase) {
        setSource('mock')
        onSourceChange?.('mock')
        return
      }

      setSource('loading')
      const [artistsRes, pairsRes] = await Promise.all([
        supabase.from('artists').select('*').order('artist_id'),
        supabase.from('artist_pairs').select('*').order('id'),
      ])

      if (cancelled) return

      if (artistsRes.error || pairsRes.error) {
        const msg = artistsRes.error?.message || pairsRes.error?.message || 'fetch failed'
        setError(msg)
        setPairs(ARTIST_PAIRS)
        setArtists(ARTISTS)
        setPairId(ARTIST_PAIRS[0]?.id ?? '')
        setSource('mock')
        onSourceChange?.('mock')
        return
      }

      const dbArtists = (artistsRes.data as DbArtist[] | null) ?? []
      const dbPairs = (pairsRes.data as DbArtistPair[] | null) ?? []

      if (dbArtists.length === 0 || dbPairs.length === 0) {
        setError('Supabase returned empty seed data')
        setPairs(ARTIST_PAIRS)
        setArtists(ARTISTS)
        setPairId(ARTIST_PAIRS[0]?.id ?? '')
        setSource('mock')
        onSourceChange?.('mock')
        return
      }

      const mappedArtists = dbArtists.map(mapDbArtist)
      const mappedPairs = dbPairs.map(mapDbPair)
      setArtists(mappedArtists)
      setPairs(mappedPairs)
      setPairId(mappedPairs[0]?.id ?? '')
      setError(null)
      setSource('live')
      onSourceChange?.('live')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [onSourceChange])

  const artistMap = useMemo(() => {
    const m = new Map<string, Artist>()
    for (const a of artists) m.set(a.id, a)
    return m
  }, [artists])

  const pair = useMemo(
    () => pairs.find((p) => p.id === pairId) ?? pairs[0],
    [pairId, pairs],
  )
  const east = pair
    ? artistMap.get(pair.east_artist_id) ?? mockArtistById(pair.east_artist_id)
    : undefined
  const west = pair
    ? artistMap.get(pair.west_artist_id) ?? mockArtistById(pair.west_artist_id)
    : undefined

  const rows = useMemo<CompareRow[]>(
    () => (pair && east && west ? buildCompareRows(pair, east, west) : []),
    [pair, east, west],
  )
  const curated = useMemo(
    () => (pair ? curatedCompare(pair.id, pair.west_artist_id, pair.east_artist_id) : undefined),
    [pair],
  )
  const tips = useMemo<SbaTip[]>(() => {
    if (!pair || !east || !west) return []
    const generated = buildSbaTips(pair, east, west)
    if (!curated) return generated
    const curatedTips: SbaTip[] = curated.sba.map((body, i) => ({
      id: 'composition' as const,
      title:
        curated.sba.length === 2
          ? t('ac.borrowFrom', { name: displayName(i === 0 ? west : east) })
          : t('ac.borrowN', { n: i + 1 }),
      body,
    }))
    // Keep the generic reflection-writing tip after the curated ones
    const reflection = generated.find((x) => x.id === 'reflection')
    return reflection ? [...curatedTips, reflection] : curatedTips
  }, [pair, east, west, curated])

  const { stop: stopSpeech } = tts
  useEffect(() => {
    stopSpeech()
  }, [pairId, stopSpeech])

  if (source === 'loading') {
    return <p className="p-6 text-sm text-teal-800">{t('ac.loading')}</p>
  }

  if (!pair || !east || !west) {
    return <p className="p-6 text-sm text-teal-800">{t('ac.empty')}</p>
  }

  const statusLine =
    source === 'live'
      ? t('ac.status.live', { a: artists.length, p: pairs.length })
      : t('ac.status.mock', { err: error ? ` (${error})` : '', a: artists.length, p: pairs.length })

  const eName = displayName(east)
  const wName = displayName(west)
  const sep = t('ac.speech.sep')
  const none = t('ac.speech.none')
  const sbaNote = curated ? getPairCompare().note : t('ac.sbaNote.default')
  const speechText = [
    t('ac.speech.theme', { x: curated?.theme ?? pair.theme }),
    t('ac.speech.east', { name: eName, text: east.spld_summary || east.bio_short || '' }),
    t('ac.speech.west', { name: wName, text: west.spld_summary || west.bio_short || '' }),
    t('ac.speech.same', {
      x: (curated
        ? curated.same
        : rows.flatMap((r) => r.shared).filter((x) => x !== t('ci.shared.none'))
      ).join(sep),
    }),
    curated
      ? t('ac.speech.diff', { x: curated.diff.join(sep) })
      : t('ac.speech.diff', {
          x: rows
            .map((r) =>
              t('ac.speech.diffRow', {
                aspect: r.aspect,
                e: eName,
                ev: joinList(r.east) || none,
                w: wName,
                wv: joinList(r.west) || none,
              }),
            )
            .join(t('ac.speech.rowSep')),
        }),
    t('ac.speech.sba', { note: sbaNote }) +
      tips.map((x, i) => t('ac.speech.tip', { n: i + 1, title: x.title, body: x.body })).join(' '),
  ].join('\n')

  const textCls = easyRead ? 'text-base leading-loose' : 'text-sm leading-relaxed'

  return (
    <div className={`space-y-4 ${easyRead ? 'leading-loose' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-teal-950">{t('ac.title')}</h2>
          <p className="text-sm text-teal-800/70">{statusLine}</p>
        </div>
        <label className="text-sm text-teal-900">
          <span className="mb-1 block text-xs font-medium text-teal-700">{t('ac.pairSelect')}</span>
          <select
            className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={pair.id}
            onChange={(e) => setPairId(e.target.value)}
          >
            {pairs.map((p) => (
              <option key={p.id} value={p.id}>
                {curatedCompare(p.id, p.west_artist_id, p.east_artist_id)?.theme ?? p.theme}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t('ac.tools')}>
        <button
          type="button"
          aria-pressed={easyRead}
          onClick={() => setMode(easyRead ? 'standard' : 'spld')}
          className={
            easyRead
              ? 'inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow'
              : 'inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-50'
          }
        >
          <BookOpenText className="h-3.5 w-3.5" aria-hidden />
          {easyRead ? t('ac.easyRead.on') : t('ac.easyRead')}
        </button>
        {tts.supported ? (
          tts.speaking ? (
            <button
              type="button"
              onClick={tts.stop}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-600"
            >
              <Square className="h-3.5 w-3.5" aria-hidden />
              {t('tts.stopAria')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => tts.speak(speechText)}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-50"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden />
              {t('tts.read')}
            </button>
          )
        ) : (
          <span className="text-xs text-teal-700/70">{t('tts.unsupported')}</span>
        )}
        {tts.supported && !tts.voiceLang && (
          <span className="text-[11px] text-teal-700/60">{t('tts.noVoice')}</span>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-3 text-sm text-teal-900">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          {t('ac.prompt')}
        </span>
        <p className={`mt-1 ${easyRead ? 'text-base leading-loose' : ''}`}>{pair.compare_prompt}</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <ArtistCard
          side={t('ac.east')}
          namePrimary={artistDisplayName(east)}
          nameSecondary={artistSecondaryName(east)}
          era={east.era}
          medium={east.medium}
          themes={east.themes}
          styleKeywords={east.style_keywords}
          bio={easyRead ? east.spld_summary || east.bio_short : east.bio_short}
          padding={cardPadding}
          easyRead={easyRead}
          sourceUrl={east.source_url}
        />
        <ArtistCard
          side={t('ac.west')}
          namePrimary={artistDisplayName(west)}
          nameSecondary={artistSecondaryName(west)}
          era={west.era}
          medium={west.medium}
          themes={west.themes}
          styleKeywords={west.style_keywords}
          bio={easyRead ? west.spld_summary || west.bio_short : west.bio_short}
          padding={cardPadding}
          easyRead={easyRead}
          sourceUrl={west.source_url}
        />
      </div>
      {curated ? (
        <>
          <CuratedCompare
            same={curated.same}
            diff={curated.diff}
            theme={curated.theme}
            easyRead={easyRead}
            padding={cardPadding}
          />
          <details className="rounded-2xl border border-dashed border-teal-200 bg-white/60 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-teal-900">{t('ac.more')}</summary>
            <div className="mt-3">
              <CompareTable rows={rows} eastName={eName} westName={wName} easyRead={easyRead} padding={cardPadding} />
            </div>
          </details>
        </>
      ) : (
        <CompareTable rows={rows} eastName={eName} westName={wName} easyRead={easyRead} padding={cardPadding} />
      )}

      <section className={`rounded-2xl border border-amber-100 bg-amber-50/40 shadow-sm ${cardPadding}`}>
        <h3 className="inline-flex items-center gap-1.5 text-base font-bold text-teal-950">
          <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden />
          {t('ac.sba')}
        </h3>
        <p className="mt-1 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
          {sbaNote}
        </p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {tips.map((tip, i) => (
            <li key={tip.title} className="rounded-xl border border-amber-100 bg-white p-3">
              <p className="text-xs font-semibold text-amber-800">
                {i + 1}. {tip.title}
              </p>
              {easyRead ? (
                <ul className={`mt-1 list-disc space-y-1 pl-5 text-teal-950 ${textCls}`}>
                  {chunkText(tip.body).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className={`mt-1 text-teal-950/90 ${textCls}`}>{tip.body}</p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function Chips({ items, tone, easyRead }: { items: string[]; tone: 'teal' | 'amber' | 'slate'; easyRead: boolean }) {
  if (!items.length) return <span className="text-xs text-teal-700/50">—</span>
  if (easyRead) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-base leading-loose text-teal-950">
        {items.flatMap((x) => chunkText(x)).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    )
  }
  const cls =
    tone === 'teal'
      ? 'bg-teal-50 text-teal-800'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-900'
        : 'bg-slate-50 text-slate-800'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className={`rounded-lg px-2 py-0.5 text-xs leading-relaxed ${cls}`}>
          {x}
        </span>
      ))}
    </div>
  )
}

function CompareTable({
  rows,
  eastName,
  westName,
  easyRead,
  padding,
}: {
  rows: CompareRow[]
  eastName: string
  westName: string
  easyRead: boolean
  padding: string
}) {
  return (
    <section className={`rounded-2xl border border-teal-100 bg-white shadow-sm ${padding}`}>
      <h3 className="inline-flex items-center gap-1.5 text-base font-bold text-teal-950">
        <Scale className="h-4 w-4 text-teal-600" aria-hidden />
        {t('ac.sameVsDiff')}
      </h3>

      {/* Mobile-first: stacked cards; table from md up (cards always in easy-read) */}
      <div className={`mt-3 space-y-3 ${easyRead ? '' : 'md:hidden'}`}>
        {rows.map((r) => (
          <div key={r.aspect} className="rounded-xl border border-teal-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">{r.aspect}</p>
            <p className="mt-2 text-[11px] font-semibold text-teal-700">{t('ac.same')}</p>
            <Chips items={r.shared} tone="teal" easyRead={easyRead} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold text-amber-800">{t('ac.diffOf', { name: eastName })}</p>
                <Chips items={r.east} tone="amber" easyRead={easyRead} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-700">{t('ac.diffOf', { name: westName })}</p>
                <Chips items={r.west} tone="slate" easyRead={easyRead} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!easyRead && (
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-teal-700">
                <th className="w-24 border-b border-teal-100 px-2 py-2 font-semibold">{t('ac.aspect')}</th>
                <th className="border-b border-teal-100 px-2 py-2 font-semibold">{t('ac.same')}</th>
                <th className="border-b border-teal-100 px-2 py-2 font-semibold">{t('ac.diffOf', { name: eastName })}</th>
                <th className="border-b border-teal-100 px-2 py-2 font-semibold">{t('ac.diffOf', { name: westName })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.aspect} className="align-top">
                  <th className="border-b border-teal-50 px-2 py-2.5 text-xs font-semibold text-teal-900">
                    {r.aspect}
                  </th>
                  <td className="border-b border-teal-50 px-2 py-2.5">
                    <Chips items={r.shared} tone="teal" easyRead={false} />
                  </td>
                  <td className="border-b border-teal-50 px-2 py-2.5">
                    <Chips items={r.east} tone="amber" easyRead={false} />
                  </td>
                  <td className="border-b border-teal-50 px-2 py-2.5">
                    <Chips items={r.west} tone="slate" easyRead={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function CuratedCompare({
  same,
  diff,
  theme,
  easyRead,
  padding,
}: {
  same: string[]
  diff: string[]
  theme: string
  easyRead: boolean
  padding: string
}) {
  const textCls = easyRead ? 'text-base leading-loose' : 'text-sm leading-relaxed'
  const list = (items: string[], dot: string) =>
    easyRead ? (
      <ul className={`mt-2 list-disc space-y-1 pl-5 text-teal-950 ${textCls}`}>
        {items.flatMap((x) => chunkText(x)).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    ) : (
      <ul className={`mt-2 space-y-1.5 text-teal-950/90 ${textCls}`}>
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    )
  return (
    <section className={`rounded-2xl border border-teal-100 bg-white shadow-sm ${padding}`}>
      <h3 className="inline-flex items-center gap-1.5 text-base font-bold text-teal-950">
        <Scale className="h-4 w-4 text-teal-600" aria-hidden />
        {t('ac.sameVsDiff')}
      </h3>
      <p className="mt-0.5 text-xs text-teal-700/70">{t('ac.theme', { theme })}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-teal-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{t('ac.same')}</p>
          {list(same, 'bg-teal-500')}
        </div>
        <div className="rounded-xl bg-amber-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">{t('ac.diff')}</p>
          {list(diff, 'bg-amber-500')}
        </div>
      </div>
    </section>
  )
}
