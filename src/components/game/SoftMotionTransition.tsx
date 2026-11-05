import { useSen } from '../../context/SenContext'
import { softMotionPlay } from '../../game/softMotion'
import { t } from '../../i18n'
import { ISLAND_NODE_IDS, ISLAND_SHORT } from '../../lib/softIslands'

const ZIGZAG_POS: { x: number; y: number; labelX: number; labelY: number; anchor: 'start' | 'middle' | 'end' }[] = [
  { x: 56, y: 46, labelX: 56, labelY: 20, anchor: 'middle' },
  { x: 188, y: 98, labelX: 212, labelY: 90, anchor: 'start' },
  { x: 304, y: 150, labelX: 304, labelY: 188, anchor: 'middle' },
  { x: 108, y: 198, labelX: 108, labelY: 232, anchor: 'middle' },
  { x: 252, y: 250, labelX: 252, labelY: 284, anchor: 'middle' },
]

function Zigzag() {
  const nodes = ISLAND_NODE_IDS.map((id, index) => ({ id, ...ZIGZAG_POS[index] }))
  const line = nodes.map((node) => `${node.x},${node.y}`).join(' ')
  return (
    <svg viewBox="0 0 340 300" className="mx-auto mt-6 w-full max-w-sm" role="img">
      <polyline
        points={line}
        fill="none"
        stroke="#7dcec6"
        strokeWidth="10"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {nodes.map((node) => {
        const first = node.id === 'history'
        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={first ? 18 : 16}
              fill={first ? '#0D9488' : '#FFF9E9'}
              stroke={first ? '#0D9488' : '#b7e4df'}
              strokeWidth="3"
            />
            <text
              x={node.labelX}
              y={node.labelY}
              textAnchor={node.anchor}
              fill="#3f6f6a"
              fontSize="13"
              fontWeight="600"
            >
              {t(ISLAND_SHORT[node.id])}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const PILL =
  'min-h-10 rounded-full border border-[#0D9488] px-4 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

/**
 * Static explainer. The screen never plays a pass.
 * Opt-in only changes the existing gear flags through applyMany.
 */
export function SoftMotionTransition({ onBack }: { onBack: () => void }) {
  const { settings, applyMany } = useSen()
  const play = softMotionPlay({ soundMotion: settings.soundMotion, reduceMotion: settings.reduceMotion })
  return (
    <section data-soft-plate="motion" data-soft-motion="off" className="rounded-[2rem] bg-[#FFF9E9] px-4 py-5 sm:px-6">
      <h2 className="text-2xl font-bold text-slate-900">{t('motion.title')}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{t('motion.sub')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-motion-reduce
          aria-pressed={!play}
          onClick={() => applyMany({ soundMotion: false })}
          className={play ? `${PILL} bg-white text-[#0D9488]` : `${PILL} bg-[#0D9488] text-[#FFF9E9]`}
        >
          {t('motion.reduce')}
        </button>
        <button
          type="button"
          data-motion-open
          aria-pressed={play}
          onClick={() => applyMany({ soundMotion: true, reduceMotion: false })}
          className={play ? `${PILL} bg-[#0D9488] text-[#FFF9E9]` : `${PILL} bg-white text-[#0D9488]`}
        >
          {t('motion.open')}
        </button>
      </div>
      {play ? null : <p className="mt-2 text-sm text-slate-600">{t('motion.reduceNote')}</p>}
      <Zigzag />
      <div className="mt-4 rounded-2xl border border-[#0D9488] bg-white px-4 py-3">
        <h3 className="text-base font-bold text-[#0D9488]">{t('motion.cardTitle')}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-800">{t('motion.cardBody')}</p>
        <p className="mt-3">
          <span className="inline-flex rounded-full border border-[#f0c48a] bg-[#fde8c8] px-3 py-1 text-sm font-semibold text-[#7a4b1a]">
            {t('motion.keep')}
          </span>
        </p>
      </div>
      <button
        type="button"
        data-motion-back
        onClick={onBack}
        className="mt-4 text-sm font-semibold text-[#0D9488] underline-offset-2 hover:underline"
      >
        {t('map.backTracks')}
      </button>
    </section>
  )
}
