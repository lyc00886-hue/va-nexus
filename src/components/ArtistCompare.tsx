import { ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ARTIST_PAIRS, artistById } from '../data/artists'
import { useSen } from '../context/SenContext'

function ArtistCard({
  side,
  nameEn,
  nameZh,
  era,
  medium,
  themes,
  styleKeywords,
  bio,
  padding,
}: {
  side: string
  nameEn: string
  nameZh: string | null
  era: string | null
  medium: string | null
  themes: string[]
  styleKeywords: string[]
  bio: string | null
  padding: string
}) {
  return (
    <article
      className={`flex flex-1 flex-col rounded-2xl border border-teal-100 bg-white shadow-sm ${padding}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">{side}</p>
      <h3 className="mt-1 text-lg font-bold text-teal-950">{nameEn}</h3>
      {nameZh && <p className="text-sm text-teal-800/80">{nameZh}</p>}
      <p className="mt-2 text-xs text-teal-700/70">
        {[era, medium].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-teal-950/90">{bio}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {themes.map((t) => (
          <span
            key={t}
            className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {styleKeywords.map((t) => (
          <span
            key={t}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900"
          >
            {t}
          </span>
        ))}
      </div>
    </article>
  )
}

export function ArtistCompare() {
  const { cardPadding } = useSen()
  const [pairId, setPairId] = useState(ARTIST_PAIRS[0]?.id ?? '')

  const pair = useMemo(
    () => ARTIST_PAIRS.find((p) => p.id === pairId) ?? ARTIST_PAIRS[0],
    [pairId],
  )
  const east = pair ? artistById(pair.east_artist_id) : undefined
  const west = pair ? artistById(pair.west_artist_id) : undefined

  if (!pair || !east || !west) {
    return <p className="p-6 text-sm text-teal-800">未有藝術家種子資料。</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-teal-950">中西藝術家對比</h2>
          <p className="text-sm text-teal-800/70">20 位種子庫 · 10 組主題對照（mock → Supabase）</p>
        </div>
        <label className="text-sm text-teal-900">
          <span className="mb-1 block text-xs font-medium text-teal-700">主題配對</span>
          <select
            className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={pair.id}
            onChange={(e) => setPairId(e.target.value)}
          >
            {ARTIST_PAIRS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.theme}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-3 text-sm text-teal-900">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          比較提示
        </span>
        <p className="mt-1">{pair.compare_prompt}</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <ArtistCard
          side="East"
          nameEn={east.name_en}
          nameZh={east.name_zh}
          era={east.era}
          medium={east.medium}
          themes={east.themes}
          styleKeywords={east.style_keywords}
          bio={east.bio_short}
          padding={cardPadding}
        />
        <ArtistCard
          side="West"
          nameEn={west.name_en}
          nameZh={west.name_zh}
          era={west.era}
          medium={west.medium}
          themes={west.themes}
          styleKeywords={west.style_keywords}
          bio={west.bio_short}
          padding={cardPadding}
        />
      </div>
    </div>
  )
}
