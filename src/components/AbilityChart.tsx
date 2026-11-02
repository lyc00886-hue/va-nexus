import { contentJson } from '../i18n/content'
import {
  isRadarClosed,
  levelCopy,
  plotValues,
  radarSegments,
  radiusForLevel,
  selfFieldId,
  stepCounts,
  totalCount,
  type AbilityChartFile,
  type AbilityRadar,
  type ChartAxis,
} from '../lib/abilityChart'
import { setSelfSelect, useSelfAssessment } from '../lib/selfAssessment'
import { SelfLevelSelect } from './SelfLevelSelect'

const ACCENT: Record<string, string> = {
  research_workbook: '#0f766e',
  artwork: '#0369a1',
  critique_daie: '#6d28d9',
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

const CX = 400
const CY = 250
const OUTER = 128
const VB = '0 0 800 520'

function angleAt(index: number, count: number): number {
  return -Math.PI / 2 + (2 * Math.PI * index) / count
}

function polar(index: number, count: number, radius: number): [number, number] {
  const a = angleAt(index, count)
  return [round1(CX + radius * Math.cos(a)), round1(CY + radius * Math.sin(a))]
}

function labelBox(index: number, count: number) {
  const a = angleAt(index, count)
  const [x, y] = polar(index, count, OUTER + 16)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const w = 168
  const h = 48
  let left = x - w / 2
  let top = y - h / 2
  let textAlign: 'left' | 'center' | 'right' = 'center'
  if (cos > 0.3) {
    left = x
    textAlign = 'left'
  } else if (cos < -0.3) {
    left = x - w
    textAlign = 'right'
  }
  if (sin < -0.4) top = y - h
  else if (sin > 0.4) top = y
  return { left: round1(left), top: round1(top), w, h, textAlign }
}

function RadarFigure({
  chartId,
  axes,
  values,
  max,
  accent,
}: {
  chartId: string
  axes: ChartAxis[]
  values: Array<number | null>
  max: number
  accent: string
}) {
  const n = axes.length
  if (n < 3) return null
  const closed = isRadarClosed(values)
  const segments = radarSegments(values)
  const ringPoints = (level: number) =>
    Array.from({ length: n }, (_, i) => polar(i, n, radiusForLevel(level, max, OUTER)).join(',')).join(' ')
  const spokeEnd = (i: number) => polar(i, n, OUTER)
  const dataPoint = (i: number) => {
    const value = values[i]
    if (value == null) return null
    return polar(i, n, radiusForLevel(value, max, OUTER))
  }
  const closedPoints = closed
    ? values.map((value, i) => polar(i, n, radiusForLevel(value ?? 1, max, OUTER)).join(',')).join(' ')
    : ''

  return (
    <div className="ability-radar mx-auto w-full max-w-[520px]">
      <svg viewBox={VB} role="img" aria-hidden="true" className="h-auto w-full">
        {Array.from({ length: max }, (_, i) => i + 1).map((level) => (
          <polygon key={level} points={ringPoints(level)} fill="none" stroke="#cbd5e1" strokeWidth={1} />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = spokeEnd(i)
          return <line key={axis.id} x1={CX} y1={CY} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />
        })}
        {Array.from({ length: max }, (_, i) => i + 1).map((level) => {
          const r = radiusForLevel(level, max, OUTER)
          return (
            <text key={level} x={CX + 6} y={round1(CY - r + 4)} fill="#64748b" fontSize={11}>
              {level}
            </text>
          )
        })}
        {closed ? (
          <polygon points={closedPoints} fill={accent} fillOpacity={0.18} stroke={accent} strokeWidth={2} />
        ) : (
          segments.map(([a, b]) => {
            const pa = dataPoint(a)
            const pb = dataPoint(b)
            if (!pa || !pb) return null
            return (
              <line
                key={`${chartId}-${a}-${b}`}
                x1={pa[0]}
                y1={pa[1]}
                x2={pb[0]}
                y2={pb[1]}
                stroke={accent}
                strokeWidth={2}
              />
            )
          })
        )}
        {axes.map((axis, i) => {
          const p = dataPoint(i)
          if (!p) return null
          return <circle key={axis.id} cx={p[0]} cy={p[1]} r={4.5} fill={accent} stroke="#ffffff" strokeWidth={1.5} />
        })}
        {axes.map((axis, i) => {
          const box = labelBox(i, n)
          return (
            <foreignObject key={axis.id} x={box.left} y={box.top} width={box.w} height={box.h}>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.25,
                  color: '#134e4a',
                  textAlign: box.textAlign,
                  fontFamily: 'inherit',
                }}
              >
                {axis.label}
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}

function Disclaimer({ text }: { text: string }) {
  return (
    <p
      role="note"
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600"
    >
      {text}
    </p>
  )
}

function AxisReadout({
  file,
  chart,
  values,
}: {
  file: AbilityChartFile
  chart: AbilityRadar
  values: Array<number | null>
}) {
  return (
    <ul className="space-y-3">
      {chart.axes.map((axis, i) => {
        const value = values[i] ?? null
        const copy = levelCopy(axis, file.scale, value)
        const prompts = axis.related_checklist
        return (
          <li key={axis.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">{axis.label}</p>
            <p className={`text-sm ${value == null ? 'text-slate-500' : 'text-slate-800'}`}>
              {value == null ? file.scale.empty_label : copy?.label}
            </p>
            {copy?.descriptor ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{copy.descriptor}</p> : null}
            {prompts && prompts.counts_toward_score === false && prompts.items.length > 0 ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-[11px] text-slate-500">{prompts.note}</summary>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-600">
                  {prompts.items.map((item) => (
                    <li key={item.id}>{item.text}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function RadarCard({
  file,
  chart,
  selects,
}: {
  file: AbilityChartFile
  chart: AbilityRadar
  selects: Record<string, string>
}) {
  const values = plotValues(chart.id, chart.axes, selects, file.scale.min, file.scale.max)
  const accent = ACCENT[chart.id] ?? '#0f766e'
  const editable = chart.id === 'critique_daie'
  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4" aria-labelledby={`${chart.id}-title`}>
      <div>
        <h3 id={`${chart.id}-title`} className="text-base font-bold text-slate-900">
          {chart.title}
        </h3>
        {chart.note ? <p className="mt-1 text-sm text-slate-600">{chart.note}</p> : null}
      </div>
      <Disclaimer text={file.meta.disclaimer} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <RadarFigure chartId={chart.id} axes={chart.axes} values={values} max={file.scale.max} accent={accent} />
        <AxisReadout file={file} chart={chart} values={values} />
      </div>
      {chart.id !== 'critique_daie' && file.scoring?.rubric_note ? (
        <p className="text-[11px] leading-relaxed text-slate-500">{file.scoring.rubric_note}</p>
      ) : null}
      {editable ? (
        <fieldset className="space-y-3">
          <legend className="sr-only">{chart.title}</legend>
          {chart.axes.map((axis) => {
            const fieldId = selfFieldId(chart.id, axis)
            if (!fieldId) return null
            return (
              <SelfLevelSelect
                key={fieldId}
                fieldId={fieldId}
                label={axis.label}
                placeholder={file.scale.empty_label}
                options={file.scale.levels.map((l) => ({ value: String(l.value), label: l.label }))}
                value={selects[fieldId] ?? ''}
                onChange={(value) => setSelfSelect(fieldId, value)}
              />
            )
          })}
        </fieldset>
      ) : null}
    </article>
  )
}

function StepProgress({ file, selects }: { file: AbilityChartFile; selects: Record<string, string> }) {
  const spec = file.step_progress
  const counts = stepCounts(spec.steps, { fields: selects })
  const total = totalCount(counts)
  const width = `${Math.min(100, total.ratio * 100)}%`
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="sba-step-progress-title">
      <div>
        <h3 id="sba-step-progress-title" className="text-base font-bold text-slate-900">
          {spec.title}
        </h3>
        <p className="mt-1 text-sm text-slate-600">{spec.note}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{spec.rule}</p>
      </div>
      <Disclaimer text={file.meta.disclaimer} />
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {total.filled} / {total.required}
        </p>
        <div
          className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total.required}
          aria-valuenow={total.filled}
          aria-label={spec.title}
        >
          <div className="h-full rounded-full bg-teal-700" style={{ width }} />
        </div>
      </div>
      <ol className="space-y-2">
        {counts.map((step) => (
          <li key={step.id}>
            <div className="flex items-baseline justify-between gap-3 text-xs font-medium text-slate-700">
              <span>{step.title}</span>
              <span>
                {step.filled} / {step.required}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={step.required}
              aria-valuenow={step.filled}
              aria-label={step.title}
            >
              <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, step.ratio * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function AbilityChart() {
  const file = contentJson<AbilityChartFile>('ability-chart')
  const { selects } = useSelfAssessment()
  const sbaCharts = file.charts.filter((c) => c.id === 'research_workbook' || c.id === 'artwork')
  const critique = file.charts.find((c) => c.id === 'critique_daie')
  const step6 = file.step_progress.steps.find((s) => s.id === 6)
  const guide = contentJson<{ steps: { id: number; fields?: { id: string; type: string; label: string; placeholder?: string; options?: { value: string; label: string }[] }[] }[] }>(
    'sba-guide',
  )
  const step6Fields = (guide.steps.find((s) => s.id === 6)?.fields ?? []).filter(
    (f) => f.type === 'select' && f.id !== 'self-aw-5' && f.options && f.options.length > 0,
  )

  return (
    <section id="ability-chart" className="ability-chart scroll-mt-20 space-y-4" aria-labelledby="ability-chart-title">
      <div>
        <h2 id="ability-chart-title" className="text-xl font-bold text-slate-900">
          {file.meta.title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{file.meta.subtitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{file.meta.privacy}</p>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {file.scale.levels.map((level) => (
            <li key={level.value}>
              {level.value} {level.label}
            </li>
          ))}
        </ul>
      </div>

      {sbaCharts.map((chart) => (
        <RadarCard key={chart.id} file={file} chart={chart} selects={selects} />
      ))}

      <StepProgress file={file} selects={selects} />

      {step6Fields.length > 0 ? (
        <fieldset className="space-y-3 rounded-2xl border border-teal-100 bg-white p-4">
          <legend className="px-1 text-sm font-bold text-teal-950">{step6?.title}</legend>
          {step6Fields.map((field) => (
            <SelfLevelSelect
              key={field.id}
              fieldId={field.id}
              label={field.label}
              placeholder={field.placeholder ?? file.scale.empty_label}
              options={field.options ?? []}
              value={selects[field.id] ?? ''}
              onChange={(value) => setSelfSelect(field.id, value)}
            />
          ))}
        </fieldset>
      ) : null}

      {critique ? <RadarCard file={file} chart={critique} selects={selects} /> : null}
    </section>
  )
}
