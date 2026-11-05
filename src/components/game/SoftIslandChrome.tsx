import { Check, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '../../i18n'
import {
  ISLAND_CHIP,
  ISLAND_SHORT,
  SOFT_ISLAND_IDS,
  type SoftIslandId,
} from '../../lib/softIslands'

const CHIP =
  'rounded-full border font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

function chipClass(selected: boolean, variant: 'full' | 'compact'): string {
  const size = variant === 'compact' ? 'min-h-9 px-2.5 py-1 text-[13px]' : 'min-h-9 px-3 py-1 text-sm'
  return selected
    ? `${CHIP} ${size} border-[#0D9488] bg-[#0D9488] text-[#FFF9E9]`
    : `${CHIP} ${size} border-[#0D9488] bg-white text-[#0D9488]`
}

export function SoftIslandChips({
  island,
  onIsland,
  variant,
  label,
}: {
  island: SoftIslandId
  onIsland: (id: SoftIslandId) => void
  variant: 'full' | 'compact'
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-island-strip={variant}
      className={
        variant === 'compact'
          ? 'flex flex-nowrap justify-center gap-1.5 overflow-x-auto'
          : 'flex flex-wrap justify-center gap-2'
      }
    >
      {SOFT_ISLAND_IDS.map((id) => {
        const selected = island === id
        const full = t(ISLAND_CHIP[id])
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-island-chip={id}
            data-selected={selected ? 'true' : 'false'}
            aria-label={variant === 'compact' ? full : undefined}
            onClick={() => onIsland(id)}
            className={chipClass(selected, variant)}
          >
            {t(variant === 'compact' ? ISLAND_SHORT[id] : ISLAND_CHIP[id])}
          </button>
        )
      })}
    </div>
  )
}

const PLATE = '-mx-4 bg-[#FFF9E9] px-3 py-7 sm:mx-auto sm:max-w-md sm:rounded-[2rem] sm:px-5'

/** Plate 01. Full island names and the start panel. */
export function SoftIslandHome({
  island,
  onIsland,
  onStart,
  mainPath,
}: {
  island: SoftIslandId
  onIsland: (id: SoftIslandId) => void
  onStart: () => void
  mainPath?: ReactNode
}) {
  const name = t(ISLAND_CHIP[island])
  return (
    <section data-soft-plate="home" data-island={island} className={PLATE}>
      <h2 className="text-center text-[1.65rem] font-bold leading-tight text-slate-900">{t('island.home.title')}</h2>
      <p className="mt-1 text-center text-sm text-slate-500">{t('island.home.sub')}</p>
      <div className="mt-5">
        <SoftIslandChips variant="full" island={island} onIsland={onIsland} label={t('island.home.sub')} />
      </div>
      {mainPath ? (
        <div className="mt-6">{mainPath}</div>
      ) : (
        <button
          type="button"
          data-island-start={island}
          onClick={() => {
            if (island === 'history') onStart()
          }}
          className="mx-auto mt-8 flex min-h-80 w-full flex-col items-center justify-center rounded-[1.75rem] border-2 border-[#0D9488] bg-[#fffdf8] px-6 text-center"
        >
          <span className="text-base text-slate-500">{t('island.start')}</span>
          <span className="mt-1 text-sm font-semibold text-[#0D9488]">{t('island.start.note', { name })}</span>
        </button>
      )}
    </section>
  )
}

/** Plate 03 header. Compact chips over the path. */
export function SoftMapPlate({
  island,
  onIsland,
  onHome,
  children,
}: {
  island: SoftIslandId
  onIsland: (id: SoftIslandId) => void
  onHome: () => void
  children: ReactNode
}) {
  return (
    <section data-soft-plate="path" data-island={island} className={PLATE}>
      <h2 className="text-center text-2xl font-bold text-slate-900">
        <button
          type="button"
          data-island-home
          onClick={onHome}
          className="bg-transparent p-0 text-2xl font-bold text-slate-900"
        >
          {t('island.map.heading', { name: t(ISLAND_CHIP[island]) })}
        </button>
      </h2>
      <p className="mt-1 text-center text-sm text-slate-500">{t('island.map.sub')}</p>
      <div className="mt-4">
        <SoftIslandChips variant="compact" island={island} onIsland={onIsland} label={t('island.map.sub')} />
      </div>
      <div className="mt-8">{children}</div>
    </section>
  )
}

function PathStem() {
  return <span aria-hidden className="my-0.5 block h-8 w-1.5 rounded-full bg-[#0D9488]" />
}

function LockedNode() {
  return (
    <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c8c8c8] text-slate-600">
      <Lock className="h-5 w-5" />
    </span>
  )
}

/** History island path. The quest stays first. Illustrated lessons can continue after it. */
export function SoftHistoryPath({ onOpen, children }: { onOpen: () => void; children?: ReactNode }) {
  return (
    <div data-history-path className="mx-auto flex max-w-xs flex-col items-center">
      <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0D9488] text-white">
        <Check className="h-7 w-7" strokeWidth={3} />
      </span>
      <PathStem />
      <button
        type="button"
        data-history-node
        onClick={onOpen}
        className="flex flex-col items-center rounded-3xl px-2 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D9488]"
        aria-label={t('island.quest.title')}
      >
        <span className="flex h-[4.75rem] w-[4.75rem] items-center justify-center overflow-hidden rounded-full border-4 border-[#0D9488] bg-white">
          <img
            src="/o2-otter.png"
            alt=""
            width={512}
            height={512}
            className="h-[145%] w-[145%] max-w-none object-cover object-[center_22%]"
            decoding="async"
          />
        </span>
        <span className="mt-3 block text-base font-bold leading-snug text-slate-900">{t('island.quest.title')}</span>
        <span className="mt-2 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-[#0D9488] px-2.5 py-0.5 text-xs font-bold text-[#FFF9E9]">
            {t('island.quest.choice')}
          </span>
          <span className="rounded-full bg-[#0D9488] px-2.5 py-0.5 text-xs font-bold text-[#FFF9E9]">
            {t('island.quest.skill')}
          </span>
        </span>
      </button>
      <PathStem />
      {children ?? (
        <>
          <LockedNode />
          <PathStem />
          <LockedNode />
        </>
      )}
    </div>
  )
}
