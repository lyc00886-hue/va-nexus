/**
 * Static cream / teal path for the vertical quest map.
 * Hills, trees, and node props sit in the scene. Nothing here moves.
 */

import type { QuestPathPoint } from '../../lib/questPathLayout'

function sandyPath(points: QuestPathPoint[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index]
    const to = points[index + 1]
    const midY = (from.y + to.y) / 2
    const bow = index % 2 === 0 ? 16 : -16
    d += ` Q ${from.x + bow} ${midY} ${to.x} ${to.y}`
  }
  return d
}

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="10" width="6" height="16" rx="2" fill="#8D6B45" />
      <circle cx="-8" cy="6" r="9" fill="#2F7A68" />
      <circle cx="8" cy="5" r="9" fill="#4EA48C" />
      <circle cx="0" cy="-2" r="11" fill="#3E8F78" />
    </g>
  )
}

function Bush({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="10" ry="6" fill="#6AAA98" />
      <ellipse cx="8" cy="2" rx="7" ry="5" fill="#3E8F78" />
    </g>
  )
}

function Eye({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="18" ry="11" fill="#FFF9E9" stroke="#0D9488" strokeWidth="2.4" />
      <circle cx="0" cy="0" r="5.5" fill="#0D9488" />
      <circle cx="2" cy="-2" r="1.6" fill="#FFF9E9" />
    </g>
  )
}

function Easel({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M2 34 L16 -2 L30 34" fill="none" stroke="#C4A574" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 16 H24" stroke="#C4A574" strokeWidth="3" strokeLinecap="round" />
      <rect x="5" y="-22" width="22" height="18" rx="2" fill="#FFF9E9" stroke="#0D9488" strokeWidth="2.2" />
      <path d="M9 -16 L14 -8 L17 -12 L23 -6" fill="none" stroke="#0D9488" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

function WindowProp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="32" height="32" rx="3" fill="#E7F6F4" stroke="#0D9488" strokeWidth="2.4" />
      <path d="M16 0 V32 M0 16 H32" stroke="#0D9488" strokeWidth="2.2" />
    </g>
  )
}

function Portrait({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="28" height="34" rx="3" fill="#FFF9E9" stroke="#0D9488" strokeWidth="2.4" />
      <circle cx="14" cy="13" r="5.5" fill="#9FD4CE" />
      <path d="M6 30 Q14 18 22 30" fill="#9FD4CE" />
    </g>
  )
}

function Frames({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="10" width="24" height="18" rx="2" fill="#FFF9E9" stroke="#0D9488" strokeWidth="2.2" />
      <rect x="14" y="0" width="24" height="18" rx="2" fill="#FFF9E9" stroke="#0D9488" strokeWidth="2.2" />
      <path d="M18 12 H30 M4 18 H16" stroke="#9FD4CE" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

function Prop({ index, x, y }: { index: number; x: number; y: number }) {
  const kind = index % 5
  if (kind === 0) return <Eye x={x + 54} y={y - 8} />
  if (kind === 1) return <Easel x={x + 36} y={y - 6} />
  if (kind === 2) return <WindowProp x={x - 78} y={y - 16} />
  if (kind === 3) return <Portrait x={x - 70} y={y - 8} />
  return <Frames x={x + 40} y={y + 8} />
}

export function QuestPathArt({ layout }: { layout: { width: number; height: number; points: QuestPathPoint[] } }) {
  const { width, height, points } = layout
  const d = sandyPath(points)
  return (
    <svg data-quest-art="path" viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" aria-hidden>
      {points.map((point, index) => (
        <ellipse
          key={`hill-${point.y}`}
          cx={point.x + (index % 2 === 0 ? -36 : 28)}
          cy={point.y + 18}
          rx="108"
          ry="46"
          fill={index % 2 === 0 ? '#D7E6D8' : '#EADCC0'}
        />
      ))}
      <Tree x={46} y={58} />
      <Tree x={78} y={78} scale={0.82} />
      <Bush x={58} y={132} />
      {points[2] ? <Bush x={points[2].x - 70} y={points[2].y + 28} /> : null}
      {points[4] ? (
        <>
          <Tree x={points[4].x - 78} y={points[4].y + 8} scale={0.9} />
          <Bush x={points[4].x + 70} y={points[4].y + 36} />
        </>
      ) : null}
      {points.map((point, index) => (
        <Prop key={`prop-${point.y}`} index={index} x={point.x} y={point.y} />
      ))}
      {d ? (
        <>
          <path d={d} fill="none" stroke="#D9C091" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#F3E6C8" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={d}
            fill="none"
            stroke="#FFF9E9"
            strokeWidth="2.4"
            strokeDasharray="8 10"
            strokeLinecap="round"
          />
        </>
      ) : null}
    </svg>
  )
}
