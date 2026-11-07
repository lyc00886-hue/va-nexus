/**
 * School-score dual radar (research workbook ×4 + artwork ×6).
 * Values are staff formative reference on a 0–5 scale, fed by the v1 practice
 * bands or a direct 0–5 school reference. Student self-assessment is not read
 * or written here. Axis counts stay 4 and 6.
 */
import type { MessageKey } from '../i18n'
import { schoolBandRows } from './schoolScore.ts'
import { PRACTICE_BAND_IDS, type PracticeBandId } from './teacherDraftBand.ts'

export const DUAL_RADAR_KEY = 'va-nexus:school-score-dual:v1'
export const FORMATIVE_MAX = 5

export const DUAL_RADAR_SCOUT_DIR =
  '/content/learning-map-illustrations/soft-scout/school-score-dual-radar-2611'

export const DUAL_RADAR_PLATES = {
  staff: `${DUAL_RADAR_SCOUT_DIR}/01-staff-dual-radar.png`,
  student: `${DUAL_RADAR_SCOUT_DIR}/02-student-radar-readonly.png`,
  map: `${DUAL_RADAR_SCOUT_DIR}/03-disclaimer-band-map.png`,
  strip: `${DUAL_RADAR_SCOUT_DIR}/preview-strip.png`,
} as const

/** sha256 of the scout plates. Prefixes: 01 6458a749bbea · 02 1dad2fd7ba1b · 03 8836ce1f4f5d · strip c195b2fc0f12. */
export const DUAL_RADAR_SHA256 = {
  '01-staff-dual-radar.png': '6458a749bbea6e9c100d246c5e60b27f9a87b2b91c32c0addcd98b48d412a892',
  '02-student-radar-readonly.png': '1dad2fd7ba1b0a2cb6be6888298f02f37ed9b6a0c2e0d525b69dd2b54c302fd3',
  '03-disclaimer-band-map.png': '8836ce1f4f5d1a12bdb00bd14092dbbe936b2e195e8799c839798e5a42f88218',
  'preview-strip.png': 'c195b2fc0f12e1f3dc3b5f132ece33efa2d1e41b069d0257a6e71518a2376bad',
} as const

export const RWB_AXIS_IDS = ['rwb-1', 'rwb-2', 'rwb-3', 'rwb-4'] as const
export const ARTWORK_AXIS_IDS = ['aw-1', 'aw-2', 'aw-3', 'aw-4', 'aw-5', 'aw-6'] as const
export const DUAL_AXIS_IDS = [...RWB_AXIS_IDS, ...ARTWORK_AXIS_IDS] as const
export type DualAxisId = (typeof DUAL_AXIS_IDS)[number]
export type DualChartId = 'research_workbook' | 'artwork'

const AXIS_SET = new Set<string>(DUAL_AXIS_IDS)

export const DUAL_CHARTS: { id: DualChartId; axes: readonly DualAxisId[]; title: MessageKey; axesNote: MessageKey }[] = [
  {
    id: 'research_workbook',
    axes: RWB_AXIS_IDS,
    title: 'score.dual.chart.rwb',
    axesNote: 'score.dual.chartAxes.rwb',
  },
  {
    id: 'artwork',
    axes: ARTWORK_AXIS_IDS,
    title: 'score.dual.chart.artwork',
    axesNote: 'score.dual.chartAxes.artwork',
  },
]

/** Practice band → about n/5 formative. Staff may also store any 0–5 reference. */
export const BAND_FORMATIVE: Record<PracticeBandId, number> = {
  'practice-emerging': 1.25,
  'practice-developing': 2.5,
  'practice-secure': 3.5,
  'practice-strong': 4.5,
}

const MAP_COPY: Record<PracticeBandId, MessageKey> = {
  'practice-emerging': 'score.dual.map.emerging',
  'practice-developing': 'score.dual.map.developing',
  'practice-secure': 'score.dual.map.secure',
  'practice-strong': 'score.dual.map.strong',
}

export type DualRadarStore = {
  axes: Partial<Record<DualAxisId, number>>
}

export function isDualAxisId(value: unknown): value is DualAxisId {
  return typeof value === 'string' && AXIS_SET.has(value)
}

export function axisLabelKey(id: DualAxisId): MessageKey {
  return `score.dual.axis.${id}` as MessageKey
}

export function axisShortKey(id: DualAxisId): MessageKey {
  return `score.dual.short.${id}` as MessageKey
}

export function emptyDualRadarStore(): DualRadarStore {
  return { axes: {} }
}

/** Accept a finite 0–5 school reference. Strings (including 1–4 selects) are dropped. */
export function parseFormative(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  if (raw < 0 || raw > FORMATIVE_MAX) return null
  return Math.round(raw * 100) / 100
}

export function formatFormative(value: number): string {
  const hundredths = Math.round(value * 100)
  if (hundredths % 10 === 0) return `${(hundredths / 100).toFixed(1)}/5`
  return `${(hundredths / 100).toFixed(2)}/5`
}

export function formativeForBand(id: PracticeBandId): number {
  return BAND_FORMATIVE[id]
}

export function bandForFormative(value: number): PracticeBandId | null {
  const parsed = parseFormative(value)
  if (parsed == null) return null
  for (const id of PRACTICE_BAND_IDS) {
    if (BAND_FORMATIVE[id] === parsed) return id
  }
  return null
}

export function dualBandMapRows(): {
  id: PracticeBandId
  label: MessageKey
  hint: MessageKey
  map: MessageKey
  formative: number
}[] {
  return schoolBandRows().map((row) => ({
    ...row,
    map: MAP_COPY[row.id],
    formative: BAND_FORMATIVE[row.id],
  }))
}

export function sanitizeDualRadarStore(raw: unknown): DualRadarStore {
  const empty = emptyDualRadarStore()
  if (!raw || typeof raw !== 'object') return empty
  const record = raw as { version?: unknown; axes?: unknown }
  if (record.version !== 1 || !record.axes || typeof record.axes !== 'object') return empty
  const axes: DualRadarStore['axes'] = {}
  const bag = record.axes as Record<string, unknown>
  for (const id of DUAL_AXIS_IDS) {
    const value = parseFormative(bag[id])
    if (value == null) continue
    axes[id] = value
  }
  return { axes }
}

export function withDualAxis(store: DualRadarStore, axisId: string, value: number | null): DualRadarStore {
  if (!isDualAxisId(axisId)) return store
  if (value == null) {
    if (!(axisId in store.axes)) return store
    const axes = { ...store.axes }
    delete axes[axisId]
    return { axes }
  }
  const parsed = parseFormative(value)
  if (parsed == null) return store
  if (store.axes[axisId] === parsed) return store
  return { axes: { ...store.axes, [axisId]: parsed } }
}

export function dualChartValues(store: DualRadarStore, axes: readonly DualAxisId[]): Array<number | null> {
  return axes.map((id) => store.axes[id] ?? null)
}

export function dualHasValue(store: DualRadarStore): boolean {
  return DUAL_AXIS_IDS.some((id) => store.axes[id] != null)
}

export function formativeRadius(value: number, outer: number): number {
  const parsed = parseFormative(value)
  if (parsed == null || outer < 0) return 0
  return (parsed / FORMATIVE_MAX) * outer
}
