import { Lock } from 'lucide-react'
import { useState } from 'react'
import { t } from '../../i18n'
import {
  ATLAS_CHIP,
  ATLAS_FILTERS,
  atlasCard,
  atlasCardsFor,
  type AtlasCard,
  type AtlasCardId,
  type AtlasFilter,
  type AtlasGlyph,
  type SoftShell,
} from '../../lib/softAtlas'

const PLATE = '-mx-4 bg-[#FFF9E9] px-3 pt-6 sm:mx-auto sm:max-w-md sm:rounded-[2rem] sm:px-4'
const DOCKED = `${PLATE} pb-24`

const NAV: { id: SoftShell; label: 'atlas.nav.map' | 'atlas.nav.path' | 'atlas.nav.atlas' | 'atlas.nav.mine' }[] = [
  { id: 'map', label: 'atlas.nav.map' },
  { id: 'path', label: 'atlas.nav.path' },
  { id: 'atlas', label: 'atlas.nav.atlas' },
  { id: 'mine', label: 'atlas.nav.mine' },
]

function Glyph({ kind, large = false }: { kind: AtlasGlyph; large?: boolean }) {
  const size = large ? 'h-16 w-16' : 'h-10 w-10'
  return (
    <svg viewBox="0 0 64 64" className={`${size} text-[#0D9488]`} aria-hidden>
      {kind === 'steps' ? (
        <>
          <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="24" cy="40" r="3" fill="currentColor" />
          <circle cx="32" cy="32" r="3" fill="currentColor" />
          <circle cx="40" cy="24" r="3" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
          <path
            d={kind === 'wave' ? 'M16 34c6-8 10 8 16 0s10-8 16 0' : 'M20 36c4 8 20 8 24 0'}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

function NavMark({ id, on }: { id: SoftShell; on: boolean }) {
  const stroke = on ? '#0D9488' : '#8AA8A4'
  if (id === 'atlas') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <rect x="5" y="5" width="14" height="14" rx="3" fill={on ? '#0D9488' : 'none'} stroke={stroke} strokeWidth="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <circle cx="12" cy="12" r="7" fill={on ? '#0D9488' : 'none'} stroke={stroke} strokeWidth="2" />
    </svg>
  )
}

/** 地圖／闖關／圖鑑／我的. Docked on the atlas screens, in the column on the map. */
export function SoftShellNav({
  active,
  onShell,
  placement,
}: {
  active: SoftShell
  onShell: (next: SoftShell) => void
  placement: 'flow' | 'dock'
}) {
  const items = (
    <div className="mx-auto grid w-full max-w-md grid-cols-4">
      {NAV.map((item) => {
        const on = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            data-soft-nav-item={item.id}
            aria-current={on ? 'page' : undefined}
            onClick={() => onShell(item.id)}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
          >
            <NavMark id={item.id} on={on} />
            <span className={on ? 'text-[#0D9488]' : 'text-slate-500'}>{t(item.label)}</span>
          </button>
        )
      })}
    </div>
  )
  if (placement === 'dock') {
    return (
      <nav
        data-soft-nav={active}
        aria-label={t('atlas.nav.label')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#efe6d4] bg-[#FFF9E9] pb-[env(safe-area-inset-bottom)]"
      >
        {items}
      </nav>
    )
  }
  return (
    <nav data-soft-nav={active} aria-label={t('atlas.nav.label')} className="mx-auto w-full max-w-md rounded-[1.5rem] bg-[#FFF9E9] py-1">
      {items}
    </nav>
  )
}

function AtlasChips({ filter, onFilter }: { filter: AtlasFilter; onFilter: (next: AtlasFilter) => void }) {
  return (
    <div role="radiogroup" aria-label={t('atlas.filter')} data-atlas-filters className="flex flex-wrap justify-center gap-1.5">
      {ATLAS_FILTERS.map((id) => {
        const selected = filter === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-atlas-filter={id}
            data-selected={selected ? 'true' : 'false'}
            onClick={() => onFilter(id)}
            className={
              selected
                ? 'min-h-9 rounded-full border border-[#0D9488] bg-[#0D9488] px-2.5 py-1 text-[13px] font-semibold text-[#FFF9E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'
                : 'min-h-9 rounded-full border border-[#0D9488] bg-white px-2.5 py-1 text-[13px] font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'
            }
          >
            {t(ATLAS_CHIP[id])}
          </button>
        )
      })}
    </div>
  )
}

function AtlasCardFace({ card, onOpen }: { card: AtlasCard; onOpen: (id: AtlasCardId) => void }) {
  const locked = card.locked
  return (
    <button
      type="button"
      data-atlas-card={card.id}
      data-atlas-locked={locked ? 'true' : 'false'}
      aria-disabled={locked}
      onClick={() => {
        if (!locked) onOpen(card.id)
      }}
      className={
        locked
          ? 'flex h-full min-h-[11.5rem] w-full flex-col items-center rounded-3xl border-2 border-[#8C877D] bg-[#EBE4D2] px-1.5 py-3 text-center text-[#8C877D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'
          : 'flex h-full min-h-[11.5rem] w-full flex-col items-center rounded-3xl border-2 border-[#0D9488] bg-[#99D2CC] px-1.5 py-3 text-center text-[#2D2D30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'
      }
    >
      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${locked ? 'bg-[#D9D3C7]' : 'bg-white'}`}>
        {locked ? <Lock className="h-5 w-5" aria-hidden /> : <Glyph kind={card.glyph} />}
      </span>
      <span
        data-atlas-category={card.category}
        className={`mt-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#FFF9E9] ${locked ? 'bg-[#8C877D]' : 'bg-[#0D9488]'}`}
      >
        {t(ATLAS_CHIP[card.category])}
      </span>
      <span className="mt-1.5 text-[13px] font-bold leading-tight">{t(card.title)}</span>
      <span data-atlas-subtitle className="mt-0.5 text-[10px] leading-tight opacity-90">
        {t(card.subtitle)}
      </span>
      <span className="mt-1 text-[11px] font-semibold">{t(locked ? 'atlas.locked' : 'atlas.unlocked')}</span>
    </button>
  )
}

function AtlasDetail({
  card,
  onBack,
  onOpen,
}: {
  card: AtlasCard
  onBack: () => void
  onOpen: (id: AtlasCardId) => void
}) {
  return (
    <section data-soft-plate="atlas-detail" data-atlas-detail={card.id} data-soft-motion="off" className={`${PLATE} pb-8`}>
      <button
        type="button"
        data-atlas-back
        onClick={onBack}
        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#0D9488] bg-white px-3 text-sm font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
      >
        <span aria-hidden>←</span>
        {t('atlas.back')}
      </button>
      <article className="mt-4 overflow-hidden rounded-[1.75rem] border-2 border-[#0D9488] bg-[#FFFCF5]">
        <div className="flex h-40 items-center justify-center bg-[#E1EFE7]">
          <Glyph kind={card.glyph} large />
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-[#0D9488] px-2.5 py-0.5 text-xs font-bold text-[#FFF9E9]">
              {t(ATLAS_CHIP[card.category])}
            </span>
            <span data-atlas-state="open" className="rounded-full border border-[#0D9488] px-2.5 py-0.5 text-xs font-semibold text-[#0D9488]">
              {t('atlas.unlocked')}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">{t(card.title)}</h2>
          <p className="mt-1 text-sm text-slate-500">{t(card.subtitle)}</p>
          {card.tip ? (
            <div data-atlas-tip className="mt-4 rounded-2xl bg-[#FFECD2] px-4 py-3 text-[#7A4B1A]">
              <p className="text-base font-bold">{t('atlas.tipTitle')}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{t(card.tip)}</p>
            </div>
          ) : null}
        </div>
      </article>
      <h3 className="mt-5 text-base font-bold text-slate-900">{t('atlas.related')}</h3>
      <ul data-atlas-related className="mt-2 flex flex-wrap gap-2">
        {card.related.map((id) => {
          const related = atlasCard(id)
          const locked = related.locked
          return (
            <li key={id}>
              <button
                type="button"
                data-atlas-related-card={id}
                aria-disabled={locked}
                onClick={() => {
                  if (!locked) onOpen(id)
                }}
                className={
                  locked
                    ? 'rounded-full bg-[#EBE4D2] px-3 py-1 text-sm font-semibold text-[#8C877D]'
                    : 'rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'
                }
              >
                {t(related.title)}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** 3×2 educational atlas. Locked cards stay on the grid. */
export function SoftAtlas({ onShell }: { onShell: (next: SoftShell) => void }) {
  const [filter, setFilter] = useState<AtlasFilter>('all')
  const [openId, setOpenId] = useState<AtlasCardId | null>(null)
  const open = openId ? atlasCard(openId) : null
  if (open && !open.locked && open.tip) {
    return <AtlasDetail card={open} onBack={() => setOpenId(null)} onOpen={setOpenId} />
  }
  const cards = atlasCardsFor(filter)
  return (
    <section data-soft-plate="atlas" data-atlas-filter-value={filter} data-soft-motion="off" className={DOCKED}>
      <h2 className="text-center text-[1.65rem] font-bold leading-tight text-slate-900">{t('atlas.title')}</h2>
      <p className="mt-1 text-center text-sm text-slate-500">{t('atlas.sub')}</p>
      <div className="mt-4">
        <AtlasChips filter={filter} onFilter={setFilter} />
      </div>
      <ul data-atlas-grid className="mt-4 grid grid-cols-3 gap-2.5">
        {cards.map((card) => (
          <li key={card.id}>
            <AtlasCardFace card={card} onOpen={setOpenId} />
          </li>
        ))}
      </ul>
      {cards.length === 0 ? <p className="mt-4 text-center text-sm text-slate-500">{t('atlas.empty')}</p> : null}
      <div className="mt-6">
        <SoftShellNav active="atlas" onShell={onShell} placement="dock" />
      </div>
    </section>
  )
}

/** Quiet device note. No scores, counts, or shop language. */
export function SoftMine({ onShell }: { onShell: (next: SoftShell) => void }) {
  return (
    <section data-soft-plate="mine" data-soft-motion="off" className={DOCKED}>
      <h2 className="text-center text-2xl font-bold text-slate-900">{t('atlas.mine.title')}</h2>
      <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">{t('atlas.mine.body')}</p>
      <div className="mt-8">
        <SoftShellNav active="mine" onShell={onShell} placement="dock" />
      </div>
    </section>
  )
}
