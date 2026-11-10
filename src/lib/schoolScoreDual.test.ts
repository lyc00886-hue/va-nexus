import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  ARTWORK_AXIS_IDS,
  DUAL_AXIS_IDS,
  DUAL_CHARTS,
  DUAL_RADAR_KEY,
  DUAL_RADAR_SHA256,
  RWB_AXIS_IDS,
  dualChartValues,
  dualHasValue,
  emptyDualRadarStore,
  formatFormative,
  formativeForBand,
  parseFormative,
  sanitizeDualRadarStore,
  withDualAxis,
} from './schoolScoreDual.ts'
import { TEACHER_DRAFT_BAND_KEY } from './teacherDraftBand.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const LOCALE = {
  en: {
    'score.dual.title': 'School reference scoring (dual radar)',
    'score.dual.disclaimer':
      'Not a public-exam or HKEAA result. School-internal formative reference only. Radar values come from staff reference bands, not student self-rating.',
    'score.dual.staffNav': 'Dual-radar reference (staff)',
    'score.dual.studentSurface': 'Learning progress reference',
    'score.dual.replaceSelfKeep': 'Keeps school scoring reference (no student 1–4 self-rate)',
    'score.dual.unset': 'No reference result yet',
    'score.dual.bandSource': 'Reference bands: Starting / Developing / Steady / Strong (or 0–5 school formative)',
    'score.dual.chart.rwb': 'Research workbook',
    'score.dual.chart.artwork': 'Artwork / critical studies',
    'score.dual.readonlyNote': 'Read-only reference chart (not self-rated)',
    'score.dual.axis.rwb-1': 'Exploration and development of theme or ideas',
    'score.dual.axis.rwb-2': 'Interpretation of artworks and its articulation with artmaking / critical studies',
    'score.dual.axis.rwb-3': 'Experimentation of media and skills, and exploration of ways of expression',
    'score.dual.axis.rwb-4': 'Reflection and progression in learning',
    'score.dual.axis.aw-1': 'Media, skills and techniques / writing skills',
    'score.dual.axis.aw-2': 'Visual presentation / analysis',
    'score.dual.axis.aw-3': 'Relationship with context',
    'score.dual.axis.aw-4': 'Creativity and imagination / critical thinking skills',
    'score.dual.axis.aw-5': 'Overall presentation and communication of theme',
    'score.dual.axis.aw-6': 'Progression of all 4 pieces of work',
  },
  'zh-Hant': {
    'score.dual.title': '學校參考評分（雙雷達）',
    'score.dual.disclaimer':
      '非公開試／非 HKEAA 正式分數。只供本校校內討論參考。雷達數值來自教師參考帶，唔係學生自評。',
    'score.dual.staffNav': '雙雷達參考（教師）',
    'score.dual.studentSurface': '學習進度參考',
    'score.dual.replaceSelfKeep': '繼續用學校評分參考（唔再學生自評 1–4）',
    'score.dual.unset': '未有參考結果',
    'score.dual.bandSource': '參考帶：起步／發展中／穩固／良好（或 0–5 校內參考）',
    'score.dual.chart.rwb': '研究工作簿',
    'score.dual.chart.artwork': '藝術作品／評賞研究',
    'score.dual.readonlyNote': '只讀參考圖（唔可自評）',
    'score.dual.axis.rwb-1': '主題或意念的探索及發展',
    'score.dual.axis.rwb-2': '藝術品的詮釋及其與創作╱評賞研究的運用',
    'score.dual.axis.rwb-3': '媒介及技巧的實驗，以及表達形式的探索',
    'score.dual.axis.rwb-4': '反思及學習進程',
    'score.dual.axis.aw-1': '媒介、技巧及技法╱寫作技巧',
    'score.dual.axis.aw-2': '視覺表達形式╱分析',
    'score.dual.axis.aw-3': '與情境的關係',
    'score.dual.axis.aw-4': '創意及想像力╱批判思維',
    'score.dual.axis.aw-5': '整體表現及主題的傳意',
    'score.dual.axis.aw-6': '四件作品的改進',
  },
  'zh-Hans': {
    'score.dual.title': '学校参考评分（双雷达）',
    'score.dual.disclaimer':
      '非公开试／非 HKEAA 正式分数。只供本校校内讨论参考。雷达数值来自教师参考带，不是学生自评。',
    'score.dual.staffNav': '双雷达参考（教师）',
    'score.dual.studentSurface': '学习进度参考',
    'score.dual.replaceSelfKeep': '继续用学校评分参考（不再学生自评 1–4）',
    'score.dual.unset': '未有参考结果',
    'score.dual.bandSource': '参考带：起步／发展中／稳固／良好（或 0–5 校内参考）',
    'score.dual.chart.rwb': '研究工作簿',
    'score.dual.chart.artwork': '艺术作品／评赏研究',
    'score.dual.readonlyNote': '只读参考图（不可自评）',
    'score.dual.axis.rwb-1': '主题或意念的探索及发展',
    'score.dual.axis.rwb-2': '艺术品的诠释及其与创作╱评赏研究的运用',
    'score.dual.axis.rwb-3': '媒介及技巧的实验，以及表达形式的探索',
    'score.dual.axis.rwb-4': '反思及学习进程',
    'score.dual.axis.aw-1': '媒介、技巧及技法╱写作技巧',
    'score.dual.axis.aw-2': '视觉表达形式╱分析',
    'score.dual.axis.aw-3': '与情境的关系',
    'score.dual.axis.aw-4': '创意及想像力╱批判思维',
    'score.dual.axis.aw-5': '整体表现及主题的传意',
    'score.dual.axis.aw-6': '四件作品的改进',
  },
} as const

const FILES = {
  en: 'src/i18n/en.json',
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
} as const

const BANNED = /5\*\*|97分|全校降分|未自評|未達標|未自评|未达标|streak|hearts|gems|claim|3★|SEN|火焰|CCCKLC|功樂|孔教|\bSoft\b|FOMO/

function messages(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, string>
}

describe('school score dual locale', () => {
  it('matches the locale table and keeps pressure wording out', () => {
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      for (const [key, value] of Object.entries(LOCALE[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      for (const [key, value] of Object.entries(bag)) {
        if (!key.startsWith('score.dual.')) continue
        assert.equal(BANNED.test(value), false, `${locale} ${key} ${value}`)
      }
      for (const id of DUAL_AXIS_IDS) {
        assert.equal(typeof bag[`score.dual.axis.${id}`], 'string', id)
        assert.equal(typeof bag[`score.dual.short.${id}`], 'string', id)
      }
    }
  })
})

describe('school score dual plates', () => {
  it('keeps the scout sha256 bytes', () => {
    for (const [name, hex] of Object.entries(DUAL_RADAR_SHA256)) {
      const bytes = readFileSync(
        join(root, 'public/content/learning-map-illustrations/soft-scout/school-score-dual-radar-2611', name),
      )
      const hash = createHash('sha256').update(bytes).digest('hex')
      assert.equal(hash, hex, name)
      assert.equal(hash.startsWith(hex.slice(0, 12)), true, name)
    }
  })
})

describe('school score dual axes', () => {
  it('keeps workbook at 4 axes and artwork at 6', () => {
    assert.deepEqual([...RWB_AXIS_IDS], ['rwb-1', 'rwb-2', 'rwb-3', 'rwb-4'])
    assert.deepEqual([...ARTWORK_AXIS_IDS], ['aw-1', 'aw-2', 'aw-3', 'aw-4', 'aw-5', 'aw-6'])
    assert.deepEqual(
      DUAL_CHARTS.map((chart) => [chart.id, chart.axes.length]),
      [
        ['research_workbook', 4],
        ['artwork', 6],
      ],
    )
    assert.equal(DUAL_CHARTS.some((chart) => chart.axes.length === 5), false)
    assert.equal(formativeForBand('practice-emerging'), 1.25)
    assert.equal(formativeForBand('practice-developing'), 2.5)
    assert.equal(formativeForBand('practice-secure'), 3.5)
    assert.equal(formativeForBand('practice-strong'), 4.5)
    assert.equal(formatFormative(1.25), '1.25/5')
    assert.equal(formatFormative(2.5), '2.5/5')
    assert.equal(formatFormative(3.5), '3.5/5')
    assert.equal(formatFormative(4.5), '4.5/5')
  })

  it('stores 0–5 formative numbers and drops self-rate strings', () => {
    const selfKey = readFileSync(join(root, 'src/lib/selfAssessment.ts'), 'utf8').match(/SELF_ASSESSMENT_KEY = '([^']+)'/)?.[1]
    assert.ok(selfKey)
    assert.notEqual(DUAL_RADAR_KEY, selfKey)
    assert.notEqual(DUAL_RADAR_KEY, TEACHER_DRAFT_BAND_KEY)
    assert.equal(parseFormative('4'), null)
    assert.equal(parseFormative(6), null)
    assert.equal(parseFormative(-0.1), null)
    assert.equal(parseFormative(1.25), 1.25)
    const saved = withDualAxis(withDualAxis(emptyDualRadarStore(), 'rwb-1', 3.5), 'aw-6', 2.5)
    assert.equal(saved.axes['rwb-1'], 3.5)
    assert.equal(saved.axes['aw-6'], 2.5)
    assert.equal(dualHasValue(saved), true)
    assert.deepEqual(dualChartValues(saved, RWB_AXIS_IDS), [3.5, null, null, null])
    assert.equal(dualHasValue(withDualAxis(saved, 'rwb-1', null)), true)
    const clean = sanitizeDualRadarStore({
      version: 1,
      axes: {
        'rwb-1': 3.5,
        'aw-2': '4',
        'self-rwb-1': 4,
        'rwb-9': 5,
        'aw-6': 5,
        extra: 1,
      },
    })
    assert.deepEqual(clean.axes, { 'rwb-1': 3.5, 'aw-6': 5 })
    assert.deepEqual(sanitizeDualRadarStore({ version: 2, axes: { 'rwb-1': 1 } }), emptyDualRadarStore())
    assert.equal(withDualAxis(emptyDualRadarStore(), 'self-aw', 4).axes['rwb-1'], undefined)
  })
})

describe('school score dual chrome', () => {
  it('extends staff and student surfaces without a self-rate control', () => {
    const staff = readFileSync(join(root, 'src/components/SchoolScoreDualStaff.tsx'), 'utf8')
    const student = readFileSync(join(root, 'src/components/SchoolScoreDualStudent.tsx'), 'utf8')
    const progress = readFileSync(join(root, 'src/components/LearningProgressRef.tsx'), 'utf8')
    const page = readFileSync(join(root, 'src/components/TeacherDraftBand.tsx'), 'utf8')
    const v1 = readFileSync(join(root, 'src/components/SchoolScoreStaff.tsx'), 'utf8')
    assert.match(staff, /data-testid="score-dual-later"/)
    assert.match(staff, /disabled/)
    assert.match(staff, /score\.dual\.disclaimer/)
    assert.match(staff, /DUAL_CHARTS/)
    assert.doesNotMatch(staff, /type="file"|setSelfSelect|sba-self-assessment/)
    assert.match(student, /data-readonly="true"/)
    assert.match(student, /score\.dual\.cannotEdit/)
    assert.match(student, /disabled/)
    assert.match(student, /island\.chip\.sba/)
    assert.match(student, /island\.chip\.exam/)
    assert.match(student, /atlas\.card\.compare\.title/)
    assert.doesNotMatch(student, /<select|setSelfSelect|type="file"|type="number"|saveDualAxis/)
    assert.doesNotMatch(progress, /SchoolScoreDualStudent|score\.dual\.title/)
    assert.match(progress, /data-testid="score-current"/)
    assert.match(staff, /score\.dual\.title/)
    assert.match(page, /<SchoolScoreStaff \/>/)
    assert.match(page, /<SchoolScoreDualStaff \/>/)
    assert.match(v1, /data-testid="score-later"/)
    assert.doesNotMatch(v1, /SchoolScoreDual/)
  })
})
