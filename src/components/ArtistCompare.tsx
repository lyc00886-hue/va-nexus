import {
  ArrowLeftRight,
  BookOpenText,
  Check,
  Lightbulb,
  Scale,
  Search,
  Square,
  Volume2,
  X,
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
import {
  cultureBucket,
  getCompareLenses,
  lensValues,
  type CultureBucket,
  type CompareLens,
} from '../lib/compareLenses'
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
type ViewMode = 'browse' | 'pairs' | 'free'

function displayName(a: Artist) {
  return artistDisplayName(a)
}

function matchesQuery(a: Artist, q: string): boolean {
  if (!q) return true
  const hay = [
    a.name_en,
    a.name_zh ?? '',
    a.name_zh_hans ?? '',
    a.medium ?? '',
    a.culture_group ?? '',
    ...a.themes,
    ...a.style_keywords,
  ]
    .join(' ')
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => hay.includes(tok))
}

function regionFilterOk(a: Artist, bucket: CultureBucket): boolean {
  if (bucket === 'all') return true
  return cultureBucket(a.culture_group) === bucket
}

export function ArtistCompare({
  onSourceChange,
}: {
  onSourceChange?: (source: Exclude<DataSource, 'loading'>) => void
} = {}) {
  const { cardPadding, mode, setMode } = useSen()
  const easyRead = mode === 'spld'
  const tts = useSpeech()
  const lensesFile = useMemo(() => getCompareLenses(), [])
  const [pairs, setPairs] = useState<ArtistPair[]>(ARTIST_PAIRS)
  const [artists, setArtists] = useState<Artist[]>(ARTISTS)
  const [source, setSource] = useState<DataSource>(
    isSupabaseConfigured ? 'loading' : 'mock',
  )
  const [error, setError] = useState<string | null>(null)
  const [pairId, setPairId] = useState(ARTIST_PAIRS[0]?.id ?? '')
  const [view, setView] = useState<ViewMode>('browse')
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<CultureBucket>('all')
  const [mediumFilter, setMediumFilter] = useState('all')
  const [picked, setPicked] = useState<string[]>([])
  const [lensId, setLensId] = useState(lensesFile.lenses[0]?.id ?? 'theme')

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

  const mediaOptions = useMemo(() => {
    const set = new Set<string>()
    for (const a of artists) if (a.medium?.trim()) set.add(a.medium.trim())
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  }, [artists])

  const filtered = useMemo(() => {
    return artists.filter(
      (a) =>
        matchesQuery(a, query.trim()) &&
        regionFilterOk(a, region) &&
        (mediumFilter === 'all' || a.medium === mediumFilter),
    )
  }, [artists, query, region, mediumFilter])

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
    const reflection = generated.find((x) => x.id === 'reflection')
    return reflection ? [...curatedTips, reflection] : curatedTips
  }, [pair, east, west, curated])

  const selectedArtists = useMemo(
    () => picked.map((id) => artistMap.get(id)).filter((a): a is Artist => Boolean(a)),
    [picked, artistMap],
  )
  const activeLens: CompareLens | undefined = lensesFile.lenses.find((l) => l.id === lensId) ?? lensesFile.lenses[0]

  const { stop: stopSpeech } = tts
  useEffect(() => {
    stopSpeech()
  }, [pairId, view, stopSpeech])

  function togglePick(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= lensesFile.maxArtists) return prev
      return [...prev, id]
    })
  }

  if (source === 'loading') {
    return <p className="p-6 text-sm text-teal-800">{t('ac.loading')}</p>
  }

  const statusLine =
    source === 'live'
      ? t('ac.status.live', { a: artists.length, p: pairs.length })
      : t('ac.status.mock', { err: error ? ` (${error})` : '', a: artists.length, p: pairs.length })

  const textCls = easyRead ? 'text-base leading-loose' : 'text-sm leading-relaxed'

  return (
    <div className={`space-y-4 ${easyRead ? 'leading-loose' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-teal-950">{t('ac.title')}</h2>
          <p className="text-sm text-teal-800/70">{statusLine}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('ac.title')}>
          {(
            [
              ['browse', t('ac.browse')],
              ['pairs', t('ac.recommended')],
              ['free', t('ac.freeCompare')],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={
                view === id
                  ? 'rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-50'
              }
            >
              {label}
            </button>
          ))}
        </div>
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
          ) : null
        ) : (
          <span className="text-xs text-teal-700/70">{t('tts.unsupported')}</span>
        )}
      </div>

      {(view === 'browse' || view === 'free') && (
        <div className="space-y-3 rounded-2xl border border-teal-100 bg-white p-3 shadow-sm">
          <p className="text-sm text-teal-800/80">{lensesFile.intro}</p>
          <div className="flex flex-wrap gap-2">
            <label className="relative min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-xs font-medium text-teal-700">{t('ac.search')}</span>
              <span className="pointer-events-none absolute bottom-2.5 left-2.5 text-teal-500">
                <Search className="h-4 w-4" aria-hidden />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ac.search.ph')}
                className="w-full rounded-xl border border-teal-200 bg-white py-2 pl-8 pr-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-teal-700">{t('ac.filter.region')}</span>
              <select
                className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={region}
                onChange={(e) => setRegion(e.target.value as CultureBucket)}
              >
                <option value="all">{t('ac.filter.region.all')}</option>
                <option value="hk">{t('ac.filter.region.hk')}</option>
                <option value="china">{t('ac.filter.region.china')}</option>
                <option value="west">{t('ac.filter.region.west')}</option>
                <option value="mingqing">{t('ac.filter.region.mingqing')}</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-teal-700">{t('ac.filter.medium')}</span>
              <select
                className="max-w-[14rem] rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
              >
                <option value="all">{t('ac.filter.medium.all')}</option>
                {mediaOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-teal-800">{t('ac.picked', { n: picked.length })}</span>
            <button
              type="button"
              disabled={picked.length < lensesFile.minArtists}
              onClick={() => setView('free')}
              className="rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('ac.compareBtn')}
            </button>
            <button
              type="button"
              disabled={picked.length === 0}
              onClick={() => setPicked([])}
              className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50"
            >
              {t('ac.compareClear')}
            </button>
            {picked.length > 0 && picked.length < lensesFile.minArtists && (
              <span className="text-xs text-amber-800">{t('ac.compareNeed')}</span>
            )}
          </div>

          <p className="text-xs text-teal-700/70">{t('ac.results', { n: filtered.length })}</p>
          {filtered.length === 0 ? (
            <p className="text-sm text-teal-800">{t('ac.noResults')}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => {
                const on = picked.includes(a.id)
                const full = !on && picked.length >= lensesFile.maxArtists
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={full}
                      onClick={() => togglePick(a.id)}
                      aria-pressed={on}
                      className={
                        on
                          ? 'flex w-full flex-col rounded-2xl border-2 border-teal-600 bg-teal-50 p-3 text-left shadow-sm'
                          : 'flex w-full flex-col rounded-2xl border border-teal-100 bg-white p-3 text-left shadow-sm hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-50'
                      }
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-teal-950">{artistDisplayName(a)}</span>
                          {artistSecondaryName(a) && (
                            <span className="block text-xs text-teal-800/70">{artistSecondaryName(a)}</span>
                          )}
                        </span>
                        {on ? (
                          <Check className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600">
                            {t('ac.pick')}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 text-[11px] text-teal-700/70">
                        {[a.culture_group, a.medium].filter(Boolean).join(' · ')}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1">
                        {a.themes.slice(0, 3).map((th) => (
                          <span key={th} className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] text-teal-800 ring-1 ring-teal-100">
                            {th}
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {view === 'free' && selectedArtists.length >= lensesFile.minArtists && activeLens && (
        <FreeCompare
          artists={selectedArtists}
          lenses={lensesFile.lenses}
          lens={activeLens}
          onLensChange={setLensId}
          sameLabel={lensesFile.columns.same}
          diffLabel={lensesFile.columns.diff}
          easyRead={easyRead}
          padding={cardPadding}
          textCls={textCls}
          onBack={() => setView('browse')}
        />
      )}

      {view === 'pairs' && pair && east && west && (
        <PairCompareView
          pair={pair}
          pairs={pairs}
          pairId={pair.id}
          onPairId={setPairId}
          east={east}
          west={west}
          rows={rows}
          curated={curated}
          tips={tips}
          easyRead={easyRead}
          cardPadding={cardPadding}
          textCls={textCls}
          tts={tts}
        />
      )}

      {view === 'pairs' && (!pair || !east || !west) && (
        <p className="text-sm text-teal-800">{t('ac.empty')}</p>
      )}
    </div>
  )
}

function FreeCompare({
  artists,
  lenses,
  lens,
  onLensChange,
  sameLabel,
  diffLabel,
  easyRead,
  padding,
  textCls,
  onBack,
}: {
  artists: Artist[]
  lenses: CompareLens[]
  lens: CompareLens
  onLensChange: (id: string) => void
  sameLabel: string
  diffLabel: string
  easyRead: boolean
  padding: string
  textCls: string
  onBack: () => void
}) {
  const valueLists = artists.map((a) => ({ artist: a, values: lensValues(a, lens) }))
  const shared = valueLists
    .map((x) => x.values)
    .reduce<string[]>((acc, cur, i) => {
      if (i === 0) return [...cur]
      return acc.filter((v) => cur.includes(v))
    }, [])

  return (
    <section className={`space-y-3 rounded-2xl border border-teal-100 bg-white shadow-sm ${padding}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-teal-950">{t('ac.freeCompare')}</h3>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 px-2 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          {t('ac.compareBack')}
        </button>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-teal-700">{t('ac.lens')}</span>
        <select
          className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm shadow-sm"
          value={lens.id}
          onChange={(e) => onLensChange(e.target.value)}
        >
          {lenses.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {valueLists.map(({ artist, values }) => (
          <article key={artist.id} className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
            <h4 className="font-bold text-teal-950">{artistDisplayName(artist)}</h4>
            {artistSecondaryName(artist) && (
              <p className="text-xs text-teal-800/70">{artistSecondaryName(artist)}</p>
            )}
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
              {t('ac.lens.fields')}
            </p>
            {values.length ? (
              easyRead ? (
                <ul className={`mt-1 list-disc space-y-1 pl-5 text-teal-950 ${textCls}`}>
                  {values.flatMap((v) => chunkText(v)).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : (
                <ul className={`mt-1 space-y-1 text-teal-950/90 ${textCls}`}>
                  {values.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              )
            ) : (
              <p className="mt-1 text-xs text-teal-700/60">{t('ac.lens.emptyField')}</p>
            )}
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-amber-800">{diffLabel}</p>
              <ul className={`mt-1 space-y-1 text-teal-950/90 ${textCls}`}>
                {values.filter((v) => !shared.includes(v)).map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-xl bg-teal-50/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{sameLabel}</p>
        {shared.length ? (
          <ul className={`mt-1 space-y-1 text-teal-950 ${textCls}`}>
            {shared.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-teal-700/60">{t('ac.lens.emptyField')}</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-teal-800">{t('ac.lens.questions')}</p>
          <ol className={`mt-1 list-decimal space-y-1 pl-5 text-teal-950 ${textCls}`}>
            {lens.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className="text-xs font-semibold text-teal-800">{t('ac.lens.frames')}</p>
          <ul className={`mt-1 space-y-1.5 text-teal-950 ${textCls}`}>
            {lens.frames.map((f) => (
              <li key={f} className="rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-teal-100">
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function PairCompareView({
  pair,
  pairs,
  pairId,
  onPairId,
  east,
  west,
  rows,
  curated,
  tips,
  easyRead,
  cardPadding,
  textCls,
  tts,
}: {
  pair: ArtistPair
  pairs: ArtistPair[]
  pairId: string
  onPairId: (id: string) => void
  east: Artist
  west: Artist
  rows: CompareRow[]
  curated: ReturnType<typeof curatedCompare>
  tips: SbaTip[]
  easyRead: boolean
  cardPadding: string
  textCls: string
  tts: ReturnType<typeof useSpeech>
}) {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-sm text-teal-900">
          <span className="mb-1 block text-xs font-medium text-teal-700">{t('ac.pairSelect')}</span>
          <select
            className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={pairId}
            onChange={(e) => onPairId(e.target.value)}
          >
            {pairs.map((p) => (
              <option key={p.id} value={p.id}>
                {curatedCompare(p.id, p.west_artist_id, p.east_artist_id)?.theme ?? p.theme}
              </option>
            ))}
          </select>
        </label>
        {tts.supported && !tts.speaking && (
          <button
            type="button"
            onClick={() => tts.speak(speechText)}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-50"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
            {t('tts.read')}
          </button>
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
