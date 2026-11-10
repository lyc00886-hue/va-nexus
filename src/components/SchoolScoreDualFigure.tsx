import { isRadarClosed, radarSegments } from '../lib/abilityChart'
import { FORMATIVE_MAX, formativeRadius } from '../lib/schoolScoreDual'

const TEAL = '#0D9488'
const CX = 180
const CY = 148
const OUTER = 70

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function angleAt(index: number, count: number): number {
  return -Math.PI / 2 + (2 * Math.PI * index) / count
}

function polar(index: number, count: number, radius: number): [number, number] {
  const angle = angleAt(index, count)
  return [round1(CX + radius * Math.cos(angle)), round1(CY + radius * Math.sin(angle))]
}

/**
 * Static dual-radar figure. Rings are a 0–5 formative scale.
 * A missing axis is not drawn and is not treated as zero.
 */
export function SchoolScoreDualFigure({
  chartId,
  labels,
  values,
  drawLabels = true,
}: {
  chartId: string
  labels: string[]
  values: Array<number | null>
  /** Formal dual radar keeps labels on the spokes. The AI radar lists full axis names beside the figure. */
  drawLabels?: boolean
}) {
  const n = labels.length
  if (n < 3 || n !== values.length) return null
  const closed = isRadarClosed(values)
  const segments = radarSegments(values)
  const ringPoints = (level: number) =>
    Array.from({ length: n }, (_, i) => polar(i, n, formativeRadius(level, OUTER)).join(',')).join(' ')
  const dataPoint = (index: number) => {
    const value = values[index]
    if (value == null) return null
    return polar(index, n, formativeRadius(value, OUTER))
  }
  const closedPoints = closed
    ? values.map((value, i) => polar(i, n, formativeRadius(value ?? 0, OUTER)).join(',')).join(' ')
    : ''

  return (
    <svg viewBox="0 0 360 300" role="img" aria-hidden="true" className="mx-auto h-auto w-full max-w-[280px]">
      {Array.from({ length: FORMATIVE_MAX }, (_, i) => i + 1).map((level) => (
        <polygon key={`${chartId}-ring-${level}`} points={ringPoints(level)} fill="none" stroke="#99f6e4" strokeWidth={1} />
      ))}
      {labels.map((label, i) => {
        const [x, y] = polar(i, n, OUTER)
        return <line key={`${chartId}-spoke-${label}`} x1={CX} y1={CY} x2={x} y2={y} stroke="#ccfbf1" strokeWidth={1} />
      })}
      {closed ? (
        <polygon points={closedPoints} fill={TEAL} fillOpacity={0.35} stroke={TEAL} strokeWidth={2} />
      ) : (
        segments.map(([a, b]) => {
          const pa = dataPoint(a)
          const pb = dataPoint(b)
          if (!pa || !pb) return null
          return (
            <line
              key={`${chartId}-seg-${a}-${b}`}
              x1={pa[0]}
              y1={pa[1]}
              x2={pb[0]}
              y2={pb[1]}
              stroke={TEAL}
              strokeWidth={2}
            />
          )
        })
      )}
      {labels.map((label, i) => {
        const point = dataPoint(i)
        if (!point) return null
        return <circle key={`${chartId}-dot-${label}`} cx={point[0]} cy={point[1]} r={4} fill={TEAL} stroke="#ffffff" strokeWidth={1.5} />
      })}
      {drawLabels
        ? labels.map((label, i) => {
            const angle = angleAt(i, n)
            const [x, y] = polar(i, n, OUTER + 16)
            const cos = Math.cos(angle)
            const anchor = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle'
            return (
              <text
                key={`${chartId}-label-${label}`}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="#134e4a"
                fontSize={12}
              >
                {label}
              </text>
            )
          })
        : null}
    </svg>
  )
}
