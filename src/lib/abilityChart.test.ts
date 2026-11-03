import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fieldIsFilled,
  isRadarClosed,
  parseSelfLevel,
  plotValues,
  radarSegments,
  radiusForLevel,
  selfFieldId,
  stepCounts,
  totalCount,
  type AbilityChartFile,
  type StepProgressStep,
} from './abilityChart.ts'

const contentDir = join(dirname(fileURLToPath(import.meta.url)), '../content')

function readJson(name: string): AbilityChartFile {
  return JSON.parse(readFileSync(join(contentDir, name), 'utf8')) as AbilityChartFile
}

const LOCALES = [
  ['zh-Hant', 'ability-chart.json', 'sba-guide.json'],
  ['en', 'ability-chart.en.json', 'sba-guide.en.json'],
  ['zh-Hans', 'ability-chart.zh-Hans.json', 'sba-guide.zh-Hans.json'],
] as const

describe('parseSelfLevel', () => {
  it('keeps 1–4 and treats missing, 0 and junk as absent', () => {
    assert.equal(parseSelfLevel('1'), 1)
    assert.equal(parseSelfLevel('4'), 4)
    assert.equal(parseSelfLevel(2), 2)
    assert.equal(parseSelfLevel(' 3 '), 3)
    for (const raw of [null, undefined, '', '0', 0, '5', 5, '1.5', '01', true, '未達標']) {
      assert.equal(parseSelfLevel(raw), null)
    }
  })
})

describe('radar values', () => {
  it('does not plot a missing axis and does not turn it into 0', () => {
    const values = plotValues(
      'research_workbook',
      [
        { id: 'rwb-1', self_field: { id: 'self-rwb-1' } },
        { id: 'rwb-2', self_field: { id: 'self-rwb-2' } },
        { id: 'rwb-4', self_field: { id: 'self-rwb-4' } },
      ],
      { 'self-rwb-1': '4', 'self-rwb-2': '0', 'self-rwb-4': '' },
    )
    assert.deepEqual(values, [4, null, null])
    assert.equal(radiusForLevel(1, 4, 100), 25)
    assert.notEqual(radiusForLevel(1, 4, 100), 0)
  })

  it('uses self-aw for aw-5 and never self-aw-5', () => {
    assert.equal(selfFieldId('artwork', { id: 'aw-5', self_field: { id: 'self-aw' } }), 'self-aw')
    assert.equal(selfFieldId('artwork', { id: 'aw-5', self_field: { id: 'self-aw-5' } }), null)
    const values = plotValues(
      'artwork',
      [{ id: 'aw-5', self_field: { id: 'self-aw' } }],
      { 'self-aw': '2', 'self-aw-5': '4' },
    )
    assert.deepEqual(values, [2])
  })

  it('reads critique axes only from their own selects', () => {
    const values = plotValues(
      'critique_daie',
      [{ id: 'describe' }, { id: 'analyse' }, { id: 'interpret' }, { id: 'judge' }],
      { 'self-describe': '3', 'self-analyse': 'nope' },
    )
    assert.deepEqual(values, [3, null, null, null])
  })

  it('joins only neighbouring answered axes', () => {
    const gapped = [4, null, 2, 3]
    assert.equal(isRadarClosed(gapped), false)
    assert.deepEqual(radarSegments(gapped), [
      [2, 3],
      [3, 0],
    ])
    const full = [1, 2, 3, 4]
    assert.equal(isRadarClosed(full), true)
    assert.equal(radarSegments(full).length, 4)
    assert.deepEqual(radarSegments([null, null, null, null]), [])
  })
})

describe('step progress', () => {
  const steps: StepProgressStep[] = [
    { id: 1, key: 'theme', title: 'Theme', required_fields: ['theme', 'keywords'], min_rows: null },
    {
      id: 4,
      key: 'media',
      title: 'Media',
      required_fields: ['question', 'photo'],
      min_rows: 3,
    },
    {
      id: 6,
      key: 'reflection',
      title: 'Reflection',
      required_fields: ['success', 'self-rwb-1', 'self-aw'],
      min_rows: null,
    },
  ]

  it('counts required fields only and never treats a blank self-assessment as filled', () => {
    const counts = stepCounts(steps, {
      fields: {
        theme: 'city',
        'th-c1': 'checked',
        'self-rwb-1': '0',
        'self-aw': '4',
        'self-describe': '3',
      },
    })
    assert.deepEqual(
      counts.map((s) => [s.id, s.filled, s.required]),
      [
        [1, 1, 2],
        [4, 0, 6],
        [6, 1, 3],
      ],
    )
    assert.equal(fieldIsFilled('self-rwb-1', '0'), false)
    assert.equal(fieldIsFilled('self-rwb-1', undefined), false)
  })

  it('counts step 4 across min_rows and ignores checklist-shaped extras', () => {
    const counts = stepCounts(steps, {
      fields: {},
      rowsByStep: {
        4: [{ question: 'ink', photo: 'a.jpg' }, { question: 'wash' }],
      },
    })
    const media = counts.find((s) => s.id === 4)
    assert.deepEqual([media?.filled, media?.required], [3, 6])
  })

  it('does not feed step progress back into a radar', () => {
    const counts = stepCounts(steps, { fields: { theme: 'x', keywords: 'y', success: 'z', 'self-aw': '4', 'self-rwb-1': '1' } })
    const total = totalCount(counts)
    assert.ok(total.ratio > 0)
    const plotted = plotValues(
      'research_workbook',
      [
        { id: 'rwb-1', self_field: { id: 'self-rwb-1' } },
        { id: 'rwb-2', self_field: { id: 'self-rwb-2' } },
      ],
      { 'self-rwb-1': '1' },
    )
    assert.deepEqual(plotted, [1, null])
    assert.ok(plotted.every((v) => v == null || v >= 1))
  })
})

describe('ability-chart content', () => {
  const files = LOCALES.map(([locale, chartName, guideName]) => ({
    locale,
    chart: readJson(chartName),
    guide: JSON.parse(readFileSync(join(contentDir, guideName), 'utf8')) as {
      steps: { id: number; fields?: { id: string; type: string; required?: boolean; options?: { value: string }[] }[] }[]
    },
  }))

  it('shares key paths and never defines self-aw-5', () => {
    const [base, ...rest] = files
    const shape = (file: AbilityChartFile) => ({
      charts: file.charts.map((c) => ({
        id: c.id,
        axes: c.axes.map((a) => ({ id: a.id, field: a.self_field?.id ?? null })),
      })),
      steps: file.step_progress.steps.map((s) => ({
        id: s.id,
        fields: s.required_fields,
        min_rows: s.min_rows,
      })),
      mapping: file.field_mapping.map((m) => m.self_field),
    })
    const expected = shape(base.chart)
    for (const file of rest) assert.deepEqual(shape(file.chart), expected)
    const ids = expected.mapping
    assert.deepEqual(ids, [
      'self-rwb-1',
      'self-rwb-2',
      'self-rwb-3',
      'self-rwb-4',
      'self-aw-1',
      'self-aw-2',
      'self-aw-3',
      'self-aw-4',
      'self-aw',
      'self-aw-6',
    ])
    assert.equal(ids.includes('self-aw-5'), false)
    const privacy = {
      'zh-Hant': '數據只儲存在學生自己的裝置╱帳戶；圖表唔會為你貼上任何標籤。',
      en: "Data stays on the student's own device / account; the chart never labels you.",
      'zh-Hans': '数据只储存在学生自己的设备╱账户；图表不会为你贴上任何标签。',
    } as const
    for (const file of files) {
      assert.equal(file.chart.meta.privacy, privacy[file.locale])
      assert.equal(/SEN|學習需要|学习需要|special educational needs/i.test(file.chart.meta.privacy), false)
      assert.ok(file.chart.meta.disclaimer.length > 0)
      assert.equal(file.chart.meta.ai_marks, false)
      assert.equal(file.chart.meta.no_ranking, true)
      assert.equal(file.chart.meta.no_peer_comparison, true)
      assert.equal(file.chart.meta.no_sen_labels, true)
      assert.ok(file.chart.scale.empty_label.length > 0)
      const step6 = file.guide.steps.find((s) => s.id === 6)
      assert.ok(step6?.fields)
      assert.deepEqual(
        step6.fields.map((f) => f.id),
        ids,
      )
      for (const field of step6.fields) {
        assert.equal(field.type, 'select')
        assert.equal(field.required, true)
        assert.deepEqual(
          field.options?.map((o) => o.value),
          ['1', '2', '3', '4'],
        )
        assert.notEqual(field.id, 'self-aw-5')
      }
    }
  })
})
