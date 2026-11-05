import { Check, Lock } from 'lucide-react'
import { t } from '../../i18n'
import {
  ISLAND_SHORT,
  SOFT_ISLAND_IDS,
  islandNodeState,
  type IslandNodeId,
  type IslandNodeState,
  type SoftIslandId,
} from '../../lib/softIslands'

const STATE_KEY = {
  done: 'island.node.done',
  progress: 'island.node.progress',
  later: 'island.node.later',
} as const

const STAGE = { w: 320, h: 460 }

const NODES: { id: IslandNodeId; x: number; y: number }[] = [
  { id: 'history', x: 74, y: 48 },
  { id: 'research', x: 250, y: 136 },
  { id: 'critique', x: 74, y: 224 },
  { id: 'sba', x: 250, y: 312 },
  { id: 'exam', x: 82, y: 400 },
]

const PATH_D = NODES.map((node, index) => `${index === 0 ? 'M' : 'L'} ${node.x} ${node.y}`).join(' ')

const PATH_DOTS = NODES.slice(0, -1).flatMap((start, index) => {
  const end = NODES[index + 1]
  return [1, 2, 3, 4].map((step) => {
    const along = step / 5
    return { x: start.x + (end.x - start.x) * along, y: start.y + (end.y - start.y) * along }
  })
})

const CHIP =
  'min-h-9 rounded-full border px-2.5 py-1 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

/** Island icon shared by the map nodes and the focus card. */
export function IslandGlyph({ id, className = 'h-8 w-8' }: { id: IslandNodeId; className?: string }) {
  if (id === 'history') {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden>
        <path
          fill="currentColor"
          d="M16 5c-5.6 0-10 3.7-10 9.1 0 3.7 2.3 6.4 5.6 7.3.5.2.9.6.7 1.1-.4 1.1.4 2.1 1.5 2.1h2.1c5.8 0 10.1-3.9 10.1-9.4C26 9 21.8 5 16 5z"
        />
        <circle cx="11.2" cy="12.2" r="1.7" fill="#f2c14e" />
        <circle cx="16" cy="10.2" r="1.7" fill="#e85d4c" />
        <circle cx="20.6" cy="12.4" r="1.7" fill="#3b82f6" />
        <circle cx="17.4" cy="16.2" r="1.7" fill="#22a06b" />
      </svg>
    )
  }
  if (id === 'research') {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden>
        <circle cx="14" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M19.2 19.2 26 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'critique') {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden>
        <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="1.7" fill="currentColor" />
      </svg>
    )
  }
  if (id === 'sba') {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden>
        <path
          d="M13 4h6M14.2 4.5v6.2L8.4 23.2A4.2 4.2 0 0 0 12.2 29h7.6a4.2 4.2 0 0 0 3.8-5.8L17.8 10.7V4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 20h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="5" y="7" width="9" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="18" y="7" width="9" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function nodeFaceClass(state: IslandNodeState): string {
  if (state === 'done') {
    return 'flex h-16 w-16 items-center justify-center rounded-full bg-[#0D9488] text-white shadow-[0_0_0_5px_rgba(13,148,136,0.16)]'
  }
  if (state === 'progress') {
    return 'flex h-16 w-16 items-center justify-center rounded-full bg-[#f3fffd] text-[#0D9488] shadow-[0_0_0_3px_#0D9488,0_0_0_9px_rgba(13,148,136,0.18)]'
  }
  return 'flex h-16 w-16 items-center justify-center rounded-full bg-[#ece7df] text-[#8d877c] ring-1 ring-[#ddd6cb]'
}

/**
 * Map-shell home. Soft terrain, one path, five icon nodes.
 * History keeps its finished mark. Quest islands open from here.
 */
export function SoftIllustrationMap({
  island,
  onIsland,
  onOpen,
}: {
  island: SoftIslandId
  onIsland: (id: SoftIslandId) => void
  onOpen: (id: IslandNodeId) => void
}) {
  return (
    <section data-soft-plate="home" data-illu-map data-soft-motion="off" data-island={island} className="-mx-4 bg-[#FFF9E9] px-3 py-5 sm:mx-auto sm:max-w-md sm:rounded-[2rem] sm:px-5">
      <h2 className="text-[1.65rem] font-bold leading-tight text-slate-900">{t('island.illu.title')}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{t('island.illu.sub')}</p>
      <div role="radiogroup" aria-label={t('island.illu.sub')} data-island-strip="compact" className="mt-3 flex flex-wrap gap-1.5">
        {SOFT_ISLAND_IDS.map((id) => {
          const selected = island === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-island-chip={id}
              data-selected={selected ? 'true' : 'false'}
              onClick={() => onIsland(id)}
              className={
                selected
                  ? `${CHIP} border-[#0D9488] bg-[#0D9488] text-[#FFF9E9]`
                  : `${CHIP} border-[#0D9488] bg-white text-[#0D9488]`
              }
            >
              {t(ISLAND_SHORT[id])}
            </button>
          )
        })}
      </div>
      <div className="relative mx-auto mt-2 w-full max-w-[320px]" style={{ aspectRatio: `${STAGE.w} / ${STAGE.h}` }}>
        <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} className="absolute inset-0 h-full w-full" aria-hidden>
          <ellipse cx="78" cy="108" rx="74" ry="38" fill="#f3e6c4" />
          <ellipse cx="248" cy="196" rx="80" ry="40" fill="#f6edd6" />
          <ellipse cx="70" cy="286" rx="76" ry="38" fill="#f4e9cc" />
          <ellipse cx="246" cy="360" rx="78" ry="36" fill="#f7f0dc" />
          <ellipse cx="100" cy="430" rx="70" ry="28" fill="#f3e7c8" />
          <path d={PATH_D} fill="none" stroke="#46c4b8" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
          {PATH_DOTS.map((dot) => (
            <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="4" fill="#fff" />
          ))}
        </svg>
        {NODES.map((node) => {
          const state = islandNodeState(node.id, island)
          const name = t(ISLAND_SHORT[node.id])
          const status = t(STATE_KEY[state])
          return (
            <button
              key={node.id}
              type="button"
              data-island-node={node.id}
              data-node-state={state}
              onClick={() => {
                if (state === 'later') onIsland(node.id)
                else onOpen(node.id)
              }}
              className="absolute flex w-[5.75rem] -translate-x-1/2 -translate-y-8 flex-col items-center text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D9488]"
              style={{ left: `${(node.x / STAGE.w) * 100}%`, top: `${(node.y / STAGE.h) * 100}%` }}
            >
              <span className={`relative ${nodeFaceClass(state)}`}>
                <IslandGlyph id={node.id} className="h-8 w-8" />
                {state === 'done' ? (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0D9488] text-white ring-2 ring-[#FFF9E9]">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
                {state === 'later' ? (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#d9d3c7] text-[#6f6a62] ring-2 ring-[#FFF9E9]">
                    <Lock className="h-3 w-3" aria-hidden />
                  </span>
                ) : null}
              </span>
              <span className="mt-1.5 block text-sm font-bold leading-tight text-slate-800">{name}</span>
              <span className={`block text-xs leading-tight ${state === 'later' ? 'text-slate-400' : 'text-[#0D9488]'}`}>{status}</span>
            </button>
          )
        })}
      </div>
      <div data-illu-legend className="mt-1 rounded-2xl border border-[#b7e4df] bg-white/80 px-3 py-2">
        <p className="text-xs font-semibold text-slate-600">{t('island.legend')}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-[#0D9488]" aria-hidden />
            {t('island.node.done')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-[#0D9488] bg-white" aria-hidden />
            {t('island.node.progress')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-[#d9d3c7]" aria-hidden />
            {t('island.node.later')}
          </span>
          <span className="text-[11px] text-slate-500">{t('island.legend.note')}</span>
        </div>
      </div>
    </section>
  )
}
