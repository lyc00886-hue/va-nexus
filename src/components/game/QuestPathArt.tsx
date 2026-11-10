/**
 * Denser cream / teal scenes along the vertical quest path.
 * Five bands share one language: garden, studio, classroom, picture wall, practice field.
 * The sandy path stays in the open corridor, beside the props.
 * Motion, when opted in, is a few drifting marks in the garden. Nothing here flashes.
 */

import type { QuestBandId, QuestPathPoint } from '../../lib/questPathLayout'
import { questSceneBox } from '../../lib/questPathLayout'

const TEAL = '#0D9488'
const CREAM = '#FFF9E9'
const SAND = '#E7D3A4'
const SAND_LIGHT = '#F6EBD2'
const INK = '#C4A574'

export type QuestBandArt = { id: QuestBandId; label: string }

function sandyPath(points: QuestPathPoint[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index]
    const to = points[index + 1]
    const midY = (from.y + to.y) / 2
    d += ` C ${from.x} ${midY} ${to.x} ${midY} ${to.x} ${to.y}`
  }
  return d
}

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="8" width="6" height="16" rx="2" fill="#8D6B45" />
      <circle cx="-8" cy="4" r="9" fill="#2F7A68" />
      <circle cx="8" cy="3" r="9" fill="#4EA48C" />
      <circle cx="0" cy="-4" r="11" fill="#3E8F78" />
    </g>
  )
}

function Bush({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="10" ry="6" fill="#6AAA98" />
      <ellipse cx="8" cy="2" rx="7" ry="5" fill="#3E8F78" />
    </g>
  )
}

function Pebble({ x, y }: { x: number; y: number }) {
  return <ellipse cx={x} cy={y} rx="5" ry="3" fill="#E4D3AE" />
}

function Easel({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M2 28 L14 -2 L26 28" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 14 H21" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="4" y="-18" width="20" height="16" rx="2" fill={CREAM} stroke={TEAL} strokeWidth="1.8" />
      <path d="M8 -13 L12 -7 L15 -10 L20 -5" fill="none" stroke={TEAL} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  )
}

function Screen({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="36" height="26" rx="3" fill="#E7F6F4" stroke={TEAL} strokeWidth="2" />
      <path d="M8 8 H28 M8 14 H22" stroke="#9FD4CE" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 26 V34 M10 34 H26" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M6 16 L6 6" stroke="#3E8F78" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="6" cy="4" rx="5" ry="3.2" fill="#4EA48C" />
      <ellipse cx="11" cy="7" rx="4" ry="2.6" fill="#2F7A68" />
      <rect x="2" y="16" width="8" height="7" rx="1.5" fill="#E7D3A4" stroke={TEAL} strokeWidth="1.2" />
    </g>
  )
}

function WindowPane({ x, y, w = 28, h = 36 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="2" fill="#E7F6F4" stroke={TEAL} strokeWidth="1.8" />
      <path d={`M${w / 2} 0 V${h} M0 ${h / 2} H${w}`} stroke={TEAL} strokeWidth="1.4" />
    </g>
  )
}

function FrameRect({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx="2" fill={CREAM} stroke={TEAL} strokeWidth="1.8" />
}

function Bench({ x, y, w = 70 }: { x: number; y: number; w?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="4" y="0" width={w - 8} height="7" rx="2" fill="#E7D3A4" stroke={INK} strokeWidth="1.4" />
      <path d={`M8 7 V16 M${w - 8} 7 V16`} stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

function Clock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="9" fill={CREAM} stroke={TEAL} strokeWidth="1.8" />
      <path d="M0 0 V-5 M0 0 H4" stroke={TEAL} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  )
}

function BandLabel({ x, y, text, anchor }: { x: number; y: number; text: string; anchor: 'start' | 'end' }) {
  const wide = /[A-Za-z]/.test(text)
  const width = Math.min(168, Math.max(46, text.length * (wide ? 6.4 : 12) + 16))
  const left = anchor === 'end' ? x - width : x
  return (
    <g>
      <rect x={left} y={y} width={width} height="20" rx="10" fill={CREAM} stroke="#9FD4CE" strokeWidth="1.2" />
      <text
        x={left + width / 2}
        y={y + 14}
        textAnchor="middle"
        fill={TEAL}
        fontSize="11"
        fontWeight="700"
        fontFamily="inherit"
      >
        {text}
      </text>
    </g>
  )
}

function Garden({ label, motion }: { label: string; motion: boolean }) {
  return (
    <g data-quest-band="garden">
      <rect x="0" y="0" width="360" height="210" fill="#E7F3EC" />
      <ellipse cx="70" cy="168" rx="120" ry="36" fill="#D5E8DC" />
      <ellipse cx="280" cy="176" rx="130" ry="34" fill="#E7F0E4" />
      <Tree x={36} y={46} />
      <Tree x={68} y={58} scale={0.78} />
      <Tree x={104} y={42} scale={0.7} />
      <Tree x={250} y={40} scale={0.82} />
      <Tree x={286} y={54} />
      <Tree x={324} y={44} scale={0.76} />
      <Bush x={28} y={168} scale={0.9} />
      <Bush x={332} y={150} scale={0.8} />
      <Screen x={292} y={78} />
      <Easel x={300} y={132} scale={0.85} />
      <Pebble x={168} y={96} />
      <Pebble x={188} y={108} />
      <Pebble x={206} y={92} />
      <BandLabel x={348} y={14} text={label} anchor="end" />
      {motion ? (
        <g className="quest-env-hint">
          <path d="M78 18 l5 9 l-10 2 z" fill="#5EBEAE" />
          <path d="M168 14 l4 8 l-8 1.5 z" fill="#8FD4C8" />
          <path d="M248 20 l5 9 l-10 2 z" fill="#5EBEAE" />
          <circle cx="214" cy="48" r="3" fill="#7DCFC0" />
          <circle cx="332" cy="78" r="3.2" fill="#9FD4CE" />
        </g>
      ) : null}
    </g>
  )
}

function Studio({ box, label }: { box: { x: number; y: number; w: number; h: number }; label: string }) {
  const { x, y, w, h } = box
  return (
    <g data-quest-band="studio" transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="16" fill="#F7FBFA" stroke="#7ECCC2" strokeWidth="2" />
      <WindowPane x={10} y={34} w={34} h={44} />
      <Easel x={52} y={62} scale={0.82} />
      <Easel x={92} y={70} scale={0.62} />
      <rect x="12" y="86" width="22" height="16" rx="2" fill={CREAM} stroke={TEAL} strokeWidth="1.4" />
      <path d="M16 92 H30 M16 96 H26" stroke="#9FD4CE" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="40" y="102" width="16" height="8" rx="2" fill="#E7D3A4" stroke={INK} strokeWidth="1.2" />
      <ellipse cx="78" cy="108" rx="12" ry="7" fill={CREAM} stroke={TEAL} strokeWidth="1.4" />
      <circle cx="73" cy="107" r="2" fill="#E8A0A0" />
      <circle cx="80" cy="105" r="2" fill="#8EC9E8" />
      <circle cx="85" cy="109" r="2" fill="#E7D38A" />
      <rect x="100" y="96" width="8" height="14" rx="1.5" fill="#E7F6F4" stroke={TEAL} strokeWidth="1.2" />
      <Plant x={118} y={78} />
      <BandLabel x={8} y={8} text={label} anchor="start" />
    </g>
  )
}

function Classroom({ box, label }: { box: { x: number; y: number; w: number; h: number }; label: string }) {
  const { x, y, w, h } = box
  return (
    <g data-quest-band="classroom" transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="16" fill="#F8FBFA" stroke="#7ECCC2" strokeWidth="2" />
      <rect x="10" y="34" width="74" height="36" rx="3" fill={CREAM} stroke={TEAL} strokeWidth="1.8" />
      <path d="M16 44 H76 M16 52 H68 M16 60 H58" stroke="#9FD4CE" strokeWidth="1.5" strokeLinecap="round" />
      <WindowPane x={96} y={34} w={18} h={22} />
      <WindowPane x={118} y={34} w={18} h={22} />
      <rect x="12" y="84" width="36" height="16" rx="2" fill="#F3E6C8" stroke={INK} strokeWidth="1.3" />
      <rect x="56" y="88" width="36" height="16" rx="2" fill="#F3E6C8" stroke={INK} strokeWidth="1.3" />
      <rect x="100" y="84" width="36" height="16" rx="2" fill="#F3E6C8" stroke={INK} strokeWidth="1.3" />
      <rect x="18" y="80" width="12" height="8" rx="1" fill="white" stroke={TEAL} strokeWidth="1" />
      <rect x="64" y="84" width="12" height="8" rx="1" fill="white" stroke={TEAL} strokeWidth="1" />
      <rect x="108" y="80" width="10" height="12" rx="1" fill="#E7F6F4" stroke={TEAL} strokeWidth="1" />
      <path d="M20 100 V112 M42 100 V112 M64 104 V116 M86 104 V116" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <BandLabel x={w - 8} y={8} text={label} anchor="end" />
    </g>
  )
}

function FrameWall({ box, label }: { box: { x: number; y: number; w: number; h: number }; label: string }) {
  const { x, y, w, h } = box
  return (
    <g data-quest-band="frames" transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="16" fill="#FBF8F2" stroke="#7ECCC2" strokeWidth="2" />
      <FrameRect x={10} y={34} w={28} h={22} />
      <FrameRect x={42} y={32} w={32} h={24} />
      <FrameRect x={78} y={36} w={26} h={20} />
      <ellipse cx="122" cy="46" rx="12" ry="15" fill={CREAM} stroke={TEAL} strokeWidth="1.8" />
      <circle cx="122" cy="42" r="4" fill="#9FD4CE" />
      <path d="M114 54 Q122 46 130 54" fill="#9FD4CE" />
      <FrameRect x={18} y={60} w={36} h={24} />
      <FrameRect x={60} y={64} w={30} h={20} />
      <Bench x={28} y={100} w={92} />
      <BandLabel x={8} y={8} text={label} anchor="start" />
    </g>
  )
}

function PracticeField({ box, label }: { box: { x: number; y: number; w: number; h: number }; label: string }) {
  const { x, y, w, h } = box
  return (
    <g data-quest-band="exam" transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="16" fill="#F7FBFA" stroke="#7ECCC2" strokeWidth="2" />
      <FrameRect x={12} y={30} w={22} h={18} />
      <FrameRect x={38} y={28} w={22} h={20} />
      <FrameRect x={64} y={32} w={18} h={16} />
      <rect x="18" y="58" width="28" height="34" rx="2" fill="white" stroke={TEAL} strokeWidth="1.5" />
      <path d="M24 66 H40 M24 72 H38 M24 78 H34" stroke="#9FD4CE" strokeWidth="1.3" strokeLinecap="round" />
      <Bench x={56} y={96} w={78} />
      <Clock x={112} y={48} />
      <Plant x={118} y={70} />
      <BandLabel x={w - 8} y={8} text={label} anchor="end" />
    </g>
  )
}

function Scene({ band, box }: { band: QuestBandArt; box: { x: number; y: number; w: number; h: number } }) {
  if (band.id === 'studio') return <Studio box={box} label={band.label} />
  if (band.id === 'classroom') return <Classroom box={box} label={band.label} />
  if (band.id === 'frames') return <FrameWall box={box} label={band.label} />
  return <PracticeField box={box} label={band.label} />
}

export function QuestPathArt({
  layout,
  bands,
  motion,
}: {
  layout: { width: number; height: number; points: QuestPathPoint[] }
  bands: QuestBandArt[]
  motion: boolean
}) {
  const { width, height, points } = layout
  const d = sandyPath(points)
  const garden = bands[0]?.id === 'garden' ? bands[0] : undefined
  return (
    <svg
      data-quest-art="path"
      data-quest-density="bands"
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full"
      aria-hidden
    >
      <rect width={width} height={height} fill={CREAM} />
      {garden ? <Garden label={garden.label} motion={motion} /> : null}
      {points.map((point, index) => {
        const band = bands[index]
        if (!band || band.id === 'garden') return null
        return (
          <ellipse
            key={`ground-${point.y}`}
            cx={point.x + (index % 2 === 0 ? 70 : -70)}
            cy={point.y + 36}
            rx="120"
            ry="42"
            fill={index % 2 === 0 ? '#E7F0E4' : '#F3E6C4'}
          />
        )
      })}
      {d ? (
        <>
          <path d={d} fill="none" stroke={SAND} strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={SAND_LIGHT} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={CREAM} strokeWidth="2.2" strokeDasharray="7 11" strokeLinecap="round" />
        </>
      ) : null}
      {points.map((point, index) => {
        const band = bands[index]
        if (!band || band.id === 'garden') return null
        return <Scene key={band.id + point.y} band={band} box={questSceneBox(index, point)} />
      })}
      {points.map((point, index) => {
        const beside = index % 2 === 0 ? point.x + 46 : point.x - 46
        return (
          <g key={`edge-${point.y}`}>
            <Bush x={beside} y={point.y + 28} scale={0.72} />
            <Pebble x={beside + (index % 2 === 0 ? 16 : -16)} y={point.y + 18} />
          </g>
        )
      })}
    </svg>
  )
}
