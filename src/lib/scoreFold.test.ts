import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  initialScoreFold,
  reduceScoreFold,
  scoreFoldLaterHasResults,
  scoreFoldNowHasResults,
  toggleScoreFold,
} from './scoreFold.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

const FOLD = {
  en: { 'score.fold.open': 'Show', 'score.fold.close': 'Hide' },
  'zh-Hant': { 'score.fold.open': '展開', 'score.fold.close': '收起' },
  'zh-Hans': { 'score.fold.open': '展开', 'score.fold.close': '收起' },
} as const

const KEEP = {
  en: {
    'score.v1.now': 'Current status',
    'score.v1.bandsTitle': 'Progress bands (read-only)',
    'score.later.aiApprox': 'AI approximate reference band (not an official score)',
    'score.later.aiComment': 'AI reference comments (not an official grade)',
    'score.later.aiRadar': 'AI reference radar',
    'score.later.aiRadarHint': 'This is the AI reference radar, not the final score.',
    'score.later.notFinal': 'Not the final score',
  },
  'zh-Hant': {
    'score.v1.now': '而家狀態',
    'score.v1.bandsTitle': '進度參考帶（只讀）',
    'score.later.aiApprox': 'AI 大概參考帶（非正式分）',
    'score.later.aiComment': 'AI 參考評語（非正式）',
    'score.later.aiRadar': 'AI 參考雷達',
    'score.later.aiRadarHint': '呢幅係 AI 參考雷達，唔係最終分數。',
    'score.later.notFinal': '唔係最終分數',
  },
  'zh-Hans': {
    'score.v1.now': '当前状态',
    'score.v1.bandsTitle': '进度参考带（只读）',
    'score.later.aiApprox': 'AI 大概参考带（非正式分）',
    'score.later.aiComment': 'AI 参考评语（非正式）',
    'score.later.aiRadar': 'AI 参考雷达',
    'score.later.aiRadarHint': '这幅是 AI 参考雷达，不是最终分数。',
    'score.later.notFinal': '不是最终分数',
  },
} as const

describe('score fold locale', () => {
  it('adds only the two fold labels and keeps the official score titles', () => {
    const files = {
      en: 'src/i18n/en.json',
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = messages(files[locale])
      const foldKeys = Object.keys(bag).filter((key) => key.startsWith('score.fold.'))
      assert.deepEqual(foldKeys.sort(), ['score.fold.close', 'score.fold.open'])
      for (const [key, value] of Object.entries(FOLD[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      for (const [key, value] of Object.entries(KEEP[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      assert.equal(bag['score.later.notFinalNote']?.includes('最終分數') || bag['score.later.notFinalNote']?.includes('最终分数') || bag['score.later.notFinalNote']?.toLowerCase().includes('not the final score'), true)
    }
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    assert.equal(overrides['score.fold.open'], '展开')
    assert.equal(overrides['score.fold.close'], '收起')
  })
})

describe('score fold defaults', () => {
  it('starts closed when empty and open when a group already has results', () => {
    assert.equal(initialScoreFold(false).open, false)
    assert.equal(initialScoreFold(false).manual, false)
    assert.equal(initialScoreFold(true).open, true)
    assert.equal(initialScoreFold(true).manual, false)
  })

  it('ignores empty school and AI copy, and treats a band, comment, or radar as results', () => {
    assert.equal(scoreFoldNowHasResults({ band: null }), false)
    assert.equal(scoreFoldNowHasResults({ band: null, comment: '未有參考結果' }), false)
    assert.equal(scoreFoldNowHasResults({ band: null, comment: '  未有参考结果 ' }), false)
    assert.equal(scoreFoldNowHasResults({ band: null, comment: 'No reference result yet' }), false)
    assert.equal(scoreFoldNowHasResults({ band: null, comment: '   ' }), false)
    assert.equal(scoreFoldNowHasResults({ band: 'practice-secure' }), true)
    assert.equal(scoreFoldNowHasResults({ band: null, comment: '主題已清楚，過程紀錄同試驗頁可見。' }), true)

    assert.equal(scoreFoldLaterHasResults({ approxBand: null, comment: '未有上傳參考', radarDrawable: false }), false)
    assert.equal(scoreFoldLaterHasResults({ approxBand: null, comment: '未有上传参考', radarDrawable: false }), false)
    assert.equal(scoreFoldLaterHasResults({ approxBand: null, comment: 'No upload reference yet', radarDrawable: false }), false)
    assert.equal(scoreFoldLaterHasResults({ approxBand: null, comment: '未有參考結果', radarDrawable: false }), false)
    assert.equal(scoreFoldLaterHasResults({ approxBand: null, comment: 'No reference result yet', radarDrawable: false }), false)
    assert.equal(scoreFoldLaterHasResults({ approxBand: 'practice-developing', comment: null, radarDrawable: false }), true)
    assert.equal(scoreFoldLaterHasResults({ approxBand: null, comment: '短評正文足夠長。', radarDrawable: false }), true)
    assert.equal(scoreFoldLaterHasResults({ approxBand: null, comment: null, radarDrawable: true }), true)
  })

  it('auto-opens on empty to results until the student changes that group', () => {
    let state = initialScoreFold(false)
    state = reduceScoreFold(state, true)
    assert.equal(state.open, true)
    assert.equal(state.manual, false)

    state = toggleScoreFold(state)
    assert.equal(state.open, false)
    assert.equal(state.manual, true)
    state = reduceScoreFold(state, false)
    state = reduceScoreFold(state, true)
    assert.equal(state.open, false)
    assert.equal(state.manual, true)

    let opened = toggleScoreFold(initialScoreFold(false))
    assert.equal(opened.open, true)
    opened = reduceScoreFold(opened, true)
    assert.equal(opened.open, true)
    assert.equal(opened.manual, true)

    const filled = toggleScoreFold(initialScoreFold(true))
    assert.equal(filled.open, false)
    assert.equal(reduceScoreFold(filled, true).open, false)
  })
})

describe('score fold wire', () => {
  it('folds both groups on the shared student surface without animation or storage', () => {
    const progress = read('src/components/LearningProgressRef.tsx')
    const later = read('src/components/SchoolScoreLaterStudent.tsx')
    const fold = read('src/components/ScoreFold.tsx')
    const logic = read('src/lib/scoreFold.ts')
    const chart = read('src/components/AbilityChart.tsx')
    const quest = read('src/components/SbaQuest.tsx')
    const app = read('src/App.tsx')
    const invented = /AI 大概參考帶／評語／雷達|AI 大概参考带／评语／雷达/

    assert.match(chart, /<LearningProgressRef/)
    assert.match(quest, /<AbilityChart/)
    assert.match(progress, /data-testid="score-student"/)
    assert.match(progress, /testId="score-fold-now"/)
    assert.match(progress, /score\.v1\.now/)
    assert.match(progress, /score\.v1\.bandsTitle/)
    assert.match(progress, /compact \? null : <SchoolScoreLaterStudent/)
    assert.match(progress, /data-testid="score-current"/)
    assert.match(progress, /data-readonly="true"/)
    assert.doesNotMatch(progress, /SchoolScoreDualStudent|score\.dual\.title/)
    assert.doesNotMatch(progress, /useMapOneShell|ux=map1|ux=classic/)

    assert.match(later, /testId="score-fold-later"/)
    assert.match(later, /score\.later\.aiApprox/)
    assert.match(later, /score\.later\.aiComment/)
    assert.match(later, /score\.later\.aiRadar/)
    assert.match(later, /data-readonly="true"/)
    assert.match(later, /disabled/)
    assert.doesNotMatch(later, /SchoolScoreDualStudent|useSchoolScoreDual|score\.dual\.title/)
    assert.doesNotMatch(later, /useMapOneShell|ux=map1|ux=classic/)
    assert.equal(invented.test(progress + later + fold), false)

    assert.match(fold, /score\.fold\.open/)
    assert.match(fold, /score\.fold\.close/)
    assert.match(fold, /aria-expanded/)
    assert.doesNotMatch(fold, /transition|animate-|framer-motion|useSoftMotion|matchMedia|localStorage|sessionStorage/)
    assert.doesNotMatch(logic, /localStorage|sessionStorage|useSoftMotion|matchMedia/)
    assert.match(logic, /useState/)

    const portfolio = app.split("activeTab === 'portfolio'")[1]?.split("activeTab === 'practice'")[0] ?? ''
    assert.match(portfolio, /<SbaQuest/)
    assert.doesNotMatch(portfolio, /map1|classic|useMapOneShell/)
  })
})
