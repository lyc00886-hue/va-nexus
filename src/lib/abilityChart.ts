/**
 * Ability-chart scoring.
 *
 * Radar values come only from a 4-level self-assessment select (1–4).
 * A missing answer is null — never 0 — and is not plotted.
 * Checklists, free text, photo counts, step progress and AI output are not inputs.
 */

export type SelfFieldOption = { value: string; label: string }

export type SelfField = {
  id: string
  is_new?: boolean
  step?: number
  label: string
  type: 'select' | string
  placeholder?: string
  required?: boolean
  options: SelfFieldOption[]
}

export type AxisLevel = {
  value: number
  level: string
  label: string
  hkeaa_band?: string
  descriptor?: string
}

export type RelatedChecklist = {
  counts_toward_score: boolean
  note: string
  items: { id: string; text: string }[]
}

export type ChartAxis = {
  id: string
  label: string
  official_criterion?: string
  self_field?: SelfField
  levels?: AxisLevel[]
  rubric_source?: { step: number; step_title: string; path: string }
  related_checklist?: RelatedChecklist
}

export type AbilityRadar = {
  id: string
  type: string
  component?: string
  title: string
  note?: string
  axes: ChartAxis[]
}

export type StepProgressStep = {
  id: number
  key: string
  title: string
  required_fields: string[]
  min_rows: number | null
}

export type AbilityChartFile = {
  version: number
  id: string
  locale: string
  meta: {
    title: string
    subtitle: string
    disclaimer: string
    privacy: string
    no_ranking: boolean
    no_peer_comparison: boolean
    no_sen_labels: boolean
    ai_marks: boolean
  }
  scale: {
    min: number
    max: number
    empty_label: string
    levels: { value: number; level: string; label: string; hkeaa_band?: string }[]
  }
  scoring?: {
    rule?: string
    rubric_note?: string
    never_counts?: string[]
  }
  charts: AbilityRadar[]
  step_progress: {
    id: string
    type: string
    position: string
    title: string
    note: string
    is_hkeaa_criterion: boolean
    rule: string
    steps: StepProgressStep[]
  }
  field_mapping: { criterion: string; self_field: string; is_new: boolean }[]
}

/** Accept only integer levels inside the scale. "0", blanks and junk are missing, not zero. */
export function parseSelfLevel(raw: unknown, min = 1, max = 4): number | null {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < min || raw > max) return null
    return raw
  }
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!/^[0-9]+$/.test(s)) return null
  const n = Number(s)
  if (String(n) !== s || n < min || n > max) return null
  return n
}

/**
 * Field id that feeds one axis.
 * HKEAA axes use `self_field.id` (aw-5 stays `self-aw`; `self-aw-5` is ignored).
 * critique_daie has labels only, so the app stores `self-<axis id>`.
 */
export function selfFieldId(
  chartId: string,
  axis: { id: string; self_field?: { id: string } | undefined },
): string | null {
  const id = axis.self_field?.id
  if (id) return id === 'self-aw-5' ? null : id
  if (chartId === 'critique_daie') return `self-${axis.id}`
  return null
}

/** One entry per axis. Missing or invalid answers stay null and must not be drawn. */
export function plotValues(
  chartId: string,
  axes: { id: string; self_field?: { id: string } | undefined }[],
  selects: Record<string, string | undefined>,
  min = 1,
  max = 4,
): Array<number | null> {
  return axes.map((axis) => {
    const id = selfFieldId(chartId, axis)
    if (!id) return null
    return parseSelfLevel(selects[id], min, max)
  })
}

/** Radius for a real level. Level 1 sits on the first ring, not at the centre. */
export function radiusForLevel(value: number, max: number, outer: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max || max < 1 || outer < 0) {
    throw new Error('ability chart level is out of range')
  }
  return (value / max) * outer
}

export function isRadarClosed(values: Array<number | null>): boolean {
  return values.length >= 3 && values.every((v) => v != null)
}

/** Segments join neighbouring answered axes only. A gap is not bridged. */
export function radarSegments(values: Array<number | null>): Array<[number, number]> {
  const n = values.length
  const segs: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    if (values[i] != null && values[j] != null) segs.push([i, j])
  }
  return segs
}

export type ScalarAnswers = Record<string, string | null | undefined>
export type RowAnswers = Record<string, string | null | undefined>

export type StepAnswerInput = {
  /** Flat template field id → value. Steps without min_rows read this map only. */
  fields: ScalarAnswers
  /** Step id → test rows. Read only when the step sets min_rows. */
  rowsByStep?: Record<number, RowAnswers[] | undefined>
}

/** A self-assessment id counts only when it is a real 1–4 choice. Other ids count when non-empty. */
export function fieldIsFilled(id: string, raw: string | null | undefined): boolean {
  if (raw == null) return false
  const s = String(raw).trim()
  if (!s) return false
  if (id.startsWith('self-')) return parseSelfLevel(s) != null
  return true
}

export type StepCount = {
  id: number
  title: string
  filled: number
  required: number
  ratio: number
}

/**
 * Step completion = required fields filled ÷ required fields.
 * Step 4 (min_rows) counts required fields across that many rows; missing rows are empty.
 * This result is never a radar input.
 */
export function stepCounts(steps: StepProgressStep[], input: StepAnswerInput): StepCount[] {
  return steps.map((step) => {
    if (step.min_rows != null && step.min_rows > 0) {
      const rows = input.rowsByStep?.[step.id] ?? []
      const required = step.required_fields.length * step.min_rows
      let filled = 0
      for (let i = 0; i < step.min_rows; i++) {
        const row = rows[i] ?? {}
        for (const id of step.required_fields) {
          const raw = row[id]
          if (fieldIsFilled(id, raw == null ? undefined : String(raw))) filled++
        }
      }
      return { id: step.id, title: step.title, filled, required, ratio: required ? filled / required : 0 }
    }
    const required = step.required_fields.length
    let filled = 0
    for (const id of step.required_fields) {
      const raw = input.fields[id]
      if (fieldIsFilled(id, raw == null ? undefined : String(raw))) filled++
    }
    return { id: step.id, title: step.title, filled, required, ratio: required ? filled / required : 0 }
  })
}

export function totalCount(steps: StepCount[]): { filled: number; required: number; ratio: number } {
  const filled = steps.reduce((n, s) => n + s.filled, 0)
  const required = steps.reduce((n, s) => n + s.required, 0)
  return { filled, required, ratio: required ? filled / required : 0 }
}

export function levelCopy(
  axis: ChartAxis,
  scale: AbilityChartFile['scale'],
  value: number | null,
): { label: string; descriptor?: string } | null {
  if (value == null) return null
  const fromAxis = axis.levels?.find((l) => l.value === value)
  if (fromAxis) return { label: fromAxis.label, descriptor: fromAxis.descriptor }
  const fromScale = scale.levels.find((l) => l.value === value)
  return fromScale ? { label: fromScale.label } : null
}
