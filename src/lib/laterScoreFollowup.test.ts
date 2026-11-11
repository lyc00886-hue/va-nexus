import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ARTWORK_AXIS_IDS, RWB_AXIS_IDS, formativeForBand } from './schoolScoreDual.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  aiReferenceFormative,
  applyModelComment,
  formatLaterVisible,
  laterPageSide,
  laterRadarView,
  sanitizeLaterStore,
  withUploadedFile,
} from './schoolScoreLater.ts'
import {
  acceptLaterFiles,
  getSchoolScoreLater,
  removeLaterFile,
  replaceLaterFile,
  requestLaterComment,
  resetSchoolScoreLaterForTests,
} from './useSchoolScoreLater.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const LEVELS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const
const COMMENT = '樽同缺口杯有前後層次，左窗光令空間再企穩啲。'
const COMMENT_NEXT = '第二份頁面先至係而家嘅參考，舊評語唔可以留低。'
const OLD_PENDING = '未有按各軸分開計嘅模型參考，暫時唔畫雷達，避免每條軸都同一分數。'

const NEW_LOCALE = {
  en: {
    'score.later.radarPending':
      'Per-axis model reference for this artwork is not available yet, so this artwork radar is not drawn. This avoids painting the same score on every axis.',
    'score.later.radarPendingWorkbook':
      'Per-axis model reference for this research workbook is not available yet, so the research-workbook radar is not drawn. This avoids painting the same score on every axis.',
    'score.later.removeFile': 'Remove',
    'score.later.replaceFile': 'Replace',
    'score.later.axisAdvicePending': 'A tailored improvement note for this axis and this work is not available yet.',
  },
  'zh-Hant': {
    'score.later.radarPending': '未有按呢幅作品各軸分開計嘅模型參考，暫時唔畫呢幅作品雷達，避免每條軸都同一分數。',
    'score.later.radarPendingWorkbook':
      '未有按呢份研究工作簿各軸分開計嘅模型參考，暫時唔畫研究工作簿雷達，避免每條軸都同一分數。',
    'score.later.removeFile': '剷除',
    'score.later.replaceFile': '更換',
    'score.later.axisAdvicePending': '暫時未有跟呢條軸、跟呢份作品嘅改進建議。',
  },
  'zh-Hans': {
    'score.later.radarPending': '未有按这幅作品各轴分开计的模型参考，暂时不画这幅作品雷达，避免每条轴都同一分数。',
    'score.later.radarPendingWorkbook':
      '未有按这份研究工作簿各轴分开计的模型参考，暂时不画研究工作簿雷达，避免每条轴都同一分数。',
    'score.later.removeFile': '铲除',
    'score.later.replaceFile': '更换',
    'score.later.axisAdvicePending': '暂时未有跟这条轴、跟这份作品的改进建议。',
  },
} as const

const FILES = {
  en: 'src/i18n/en.json',
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
} as const

function messages(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, string>
}

function page(name: string, size: number, type: string): File {
  return { name, size, type } as File
}

const ART = {
  'aw-1': 3.5,
  'aw-2': 4.5,
  'aw-3': 2,
  'aw-4': 5,
  'aw-5': 4,
  'aw-6': 2.5,
} as const

const ADVICE = {
  'aw-1': '鉛筆同淡彩已出反光，但樽口同杯緣轉折仍然平。',
  'aw-2': '缺口杯同蘋果已有前後層次，左窗光可以再清楚。',
  'aw-3': '主題已清楚係日常物，但情境連結仍然短。',
  'aw-4': '側影同缺口已帶出新角度，可以再推深。',
  'aw-5': '日常器物意象已清楚，杯同蘋果受光方向可以再集中。',
  'aw-6': '系列入面呢一件同上一件變化仍然有限。',
} as const

type Sent = { url: string; init?: RequestInit; resolve: (response: Response) => void }
const pending: Sent[] = []
let restore: (() => void) | null = null

function installNet() {
  const originalFetch = globalThis.fetch
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:later-followup'
  URL.revokeObjectURL = () => {}
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith('blob:')) return new Response(Uint8Array.of(1, 2, 3, 4))
    return await new Promise<Response>((resolve) => {
      pending.push({ url, init, resolve })
    })
  }
  restore = () => {
    globalThis.fetch = originalFetch
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    pending.splice(0, pending.length)
    restore = null
  }
}

async function waitFor(count: number) {
  for (let i = 0; i < 50; i += 1) {
    if (pending.length >= count) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`expected ${count} formative posts, saw ${pending.length}`)
}

function reply(status: number, body: unknown): Sent {
  const next = pending.shift()
  if (!next) throw new Error('no formative post is waiting')
  next.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  return next
}

function modelBody(
  comment: string,
  band: string,
  axes: Record<string, number>,
  score: number,
  advice: Record<string, string> = {},
) {
  return { ok: true, comment, band, axes, score, advice }
}

describe('later score follow-up locale', () => {
  it('rewrites only radarPending and adds the four official keys', () => {
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      for (const [key, value] of Object.entries(NEW_LOCALE[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      assert.equal(bag['score.later.radarPending'].includes(OLD_PENDING), false, locale)
      assert.equal(bag['score.later.radarPending'].includes('so the radar is not drawn'), false, locale)
      assert.equal(bag['score.later.notFinal']?.includes('5**') ?? false, false)
    }
    const hant = messages(FILES['zh-Hant'])
    assert.equal(hant['score.later.notFinal'], '唔係最終分數')
    assert.equal(hant['score.v1.band.emerging'], '起步')
    assert.equal(hant['score.v1.band.developing'], '發展中')
    assert.equal(hant['score.v1.band.secure'], '穩固')
    assert.equal(hant['score.v1.band.strong'], '良好')
    assert.equal(hant['score.dual.map.emerging'], '映到約 1.25／5 校內參考')
    assert.equal(hant['score.later.stubNote']?.includes('唔會用檔名或檔案大小估一條可見分數'), true)
    assert.equal(hant['score.later.fileNotSent']?.includes('唔會用檔名或檔案大小估分'), true)
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    assert.equal(overrides['score.later.radarPending'], NEW_LOCALE['zh-Hans']['score.later.radarPending'])
    assert.equal(overrides['score.later.removeFile'], '铲除')
    assert.equal(overrides['score.later.axisAdvicePending'], NEW_LOCALE['zh-Hans']['score.later.axisAdvicePending'])
  })
})

describe('later score follow-up radars and scores', () => {
  it('draws an ordinary SBA artwork radar without waiting for a workbook', () => {
    assert.equal(laterPageSide('VA SBA123全.pdf'), 'artwork')
    assert.equal(laterPageSide('Sba full marks _09_18_2025.pdf'), 'artwork')
    assert.equal(laterPageSide('研究工作簿.pdf'), 'research_workbook')
    assert.equal(laterPageSide('my workbook.pdf'), 'research_workbook')
    const draft = applyModelComment(withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf'), {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART },
      advice: { ...ADVICE },
    })
    const view = laterRadarView(draft)
    assert.deepEqual(view.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.equal(view.workbook, null)
    assert.equal(view.artworkPending, false)
    assert.equal(view.workbookPending, false)
    assert.equal(new Set(view.artwork).size > 1, true)
    assert.equal(draft.aiAdvice['aw-1']?.includes('樽口'), true)
    assert.notEqual(draft.aiAdvice['aw-1'], draft.aiAdvice['aw-6'])
    for (const value of Object.values(draft.aiAxes)) assert.equal(LEVELS.includes(value as (typeof LEVELS)[number]), true)
    assert.equal(draft.approxValue, 3.5)
    assert.equal(formatLaterVisible(draft.approxValue ?? 0), '3.5／5')
    assert.equal(formatLaterVisible(5), '5／5')
    assert.equal(formatLaterVisible(1), '1／5')
  })

  it('pends only the workbook chart when that file is present and its axes are incomplete', () => {
    let draft = withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf')
    draft = withUploadedFile(draft, '研究工作簿.pdf', 800, 'application/pdf')
    const model = applyModelComment(draft, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, 'rwb-1': 3, 'rwb-2': 4 },
    })
    const view = laterRadarView(model)
    assert.deepEqual(view.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.equal(view.workbook, null)
    assert.equal(view.artworkPending, false)
    assert.equal(view.workbookPending, true)
    assert.equal(model.aiAxes['rwb-3'], undefined)
    assert.equal(model.aiAxes['aw-1'], 3.5)
    const complete = applyModelComment(draft, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART, 'rwb-1': 2, 'rwb-2': 3, 'rwb-3': 4, 'rwb-4': 5 },
    })
    const done = laterRadarView(complete)
    assert.deepEqual(done.artwork, [3.5, 4.5, 2, 5, 4, 2.5])
    assert.deepEqual(done.workbook, [2, 3, 4, 5])
    assert.equal(done.workbookPending, false)
  })

  it('does not invent an even radar or copy the overall band onto a missing axis', () => {
    const draft = withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf')
    const partial = applyModelComment(draft, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3,
      axes: { 'aw-1': 3, 'aw-2': 4, 'aw-3': 2, 'aw-4': 5, 'aw-5': 4 },
    })
    assert.equal(partial.aiAxes['aw-6'], undefined)
    assert.equal(laterRadarView(partial).artwork, null)
    assert.equal(laterRadarView(partial).artworkPending, true)
    assert.equal(laterRadarView(partial).workbookPending, false)
    const overallOnly = applyModelComment(draft, { comment: COMMENT, band: 'practice-secure', score: 4 })
    assert.deepEqual(overallOnly.aiAxes, {})
    assert.equal(laterRadarView(overallOnly).artwork, null)
    assert.equal(aiReferenceFormative(overallOnly), 4)
  })

  it('keeps tailored advice and drops a repeated sentence instead of filling a generic tip', () => {
    const draft = withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf')
    const shared = '同一句套句唔可以用喺第二條軸。'
    const model = applyModelComment(draft, {
      comment: COMMENT,
      band: 'practice-secure',
      score: 3.5,
      axes: { ...ART },
      advice: { 'aw-1': shared, 'aw-2': shared, 'aw-3': ADVICE['aw-3'] },
    })
    assert.equal(model.aiAdvice['aw-1'], undefined)
    assert.equal(model.aiAdvice['aw-2'], undefined)
    assert.equal(model.aiAdvice['aw-3'], ADVICE['aw-3'])
    assert.equal(model.aiAdvice['aw-6'], undefined)
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    assert.match(student, /score\.later\.axisAdvicePending/)
    assert.equal(student.includes('<textarea'), false)
    assert.equal(student.includes('5**'), false)
    assert.equal(student.includes(OLD_PENDING), false)
    assert.equal(student.includes('so the radar is not drawn'), false)
  })

  it('writes new results on the nine-level scale and leaves a stored 1.25 result alone', () => {
    const draft = withUploadedFile(null, 'VA SBA123全.pdf', 1200, 'application/pdf')
    const fresh = applyModelComment(draft, {
      comment: COMMENT,
      band: 'practice-emerging',
      score: 1.25,
      axes: { 'aw-1': 1.25, 'aw-2': 5, 'aw-3': 1, 'aw-4': 2, 'aw-5': 3, 'aw-6': 4.5 },
    })
    assert.equal(fresh.approxValue, 1.5)
    assert.equal(fresh.aiAxes['aw-1'], 1.5)
    assert.equal(fresh.aiAxes['aw-2'], 5)
    assert.notEqual(fresh.approxValue, 1.25)
    for (const value of [fresh.approxValue, ...Object.values(fresh.aiAxes)]) {
      assert.equal(LEVELS.includes(value as (typeof LEVELS)[number]), true)
    }
    assert.equal(formativeForBand('practice-emerging'), 1.25)
    const legacy = sanitizeLaterStore({
      version: 1,
      draft: {
        fileName: 'VA SBA123全.pdf',
        fileSize: 1200,
        mime: 'application/pdf',
        approxBand: 'practice-emerging',
        aiStatus: 'model',
        aiComment: '舊結果仍然顯示原本嘅數字。',
        aiAxes: { 'aw-1': 1.25, 'aw-2': 2.5, 'aw-3': 3.5, 'aw-4': 4.5, 'aw-5': 2.5, 'aw-6': 3.5 },
        pages: [{ fileName: 'VA SBA123全.pdf', fileSize: 1200, mime: 'application/pdf', side: 'artwork' }],
      },
    })
    assert.equal(legacy.draft?.aiAxes['aw-1'], 1.25)
    assert.equal(legacy.draft?.approxValue, null)
    assert.equal(aiReferenceFormative(legacy.draft!), 1.25)
    assert.equal(formatLaterVisible(1.25), '1.25／5')
    assert.equal(legacy.draft?.aiAxes['aw-2'], 2.5)
  })
})

describe('later score follow-up remove and replace', { concurrency: false }, () => {
  beforeEach(() => {
    pending.splice(0, pending.length)
    resetSchoolScoreLaterForTests()
    installNet()
  })

  afterEach(() => {
    restore?.()
    resetSchoolScoreLaterForTests()
  })

  it('clears a removed file and re-requests the one that remains, with no staff session', async () => {
    assert.equal(SCHOOL_SCORE_LATER_KEY, 'va-nexus:school-score-later:v1')
    const firstName = 'VA SBA123全.pdf'
    const secondName = 'Sba full marks _09_18_2025.pdf'
    assert.equal(
      acceptLaterFiles([
        page(firstName, 1000, 'application/pdf'),
        page(secondName, 2000, 'application/pdf'),
      ]),
      true,
    )
    const first = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    assert.equal(removeLaterFile(secondName), true)
    const cleared = getSchoolScoreLater().draft
    assert.ok(cleared)
    assert.deepEqual(cleared.pages.map((item) => item.fileName), [firstName])
    assert.equal(cleared.aiComment, null)
    assert.equal(cleared.approxBand, null)
    assert.deepEqual(cleared.aiAxes, {})
    assert.deepEqual(cleared.aiAdvice, {})
    const second = requestLaterComment('zh-Hant', false)
    await waitFor(2)
    const stale = reply(200, modelBody(COMMENT, 'practice-strong', { ...ART }, 4.5, { ...ADVICE }))
    assert.equal(stale.url, '/api/formative-comment')
    assert.equal(await first, 'idle')
    assert.equal(getSchoolScoreLater().draft?.aiComment, null)
    const sent = reply(
      200,
      modelBody(COMMENT_NEXT, 'practice-secure', { ...ART, 'aw-4': 5, 'aw-3': 1 }, 3, { ...ADVICE }),
    )
    assert.equal(sent.url, '/api/formative-comment')
    assert.equal(((sent.init?.headers ?? {}) as Record<string, string>).Authorization, undefined)
    assert.equal(await second, 'model')
    const kept = getSchoolScoreLater().draft
    assert.equal(kept?.aiComment, COMMENT_NEXT)
    assert.equal(kept?.fileName, firstName)
    assert.equal(kept?.pages.some((item) => item.fileName === secondName), false)
    assert.equal(kept?.aiAxes['aw-3'], 1)
    assert.equal(kept?.aiAxes['aw-4'], 5)
    assert.equal(kept?.approxValue, 3)
    for (const value of Object.values(kept?.aiAxes ?? {})) {
      assert.equal(LEVELS.includes(value as (typeof LEVELS)[number]), true)
      assert.notEqual(value, 1.25)
    }
    const view = laterRadarView(kept)
    assert.ok(view.artwork)
    assert.equal(view.artworkPending, false)
    assert.equal(view.workbookPending, false)
  })

  it('replaces one file, drops the old result, and requests again on the nine-level scale', async () => {
    assert.equal(acceptLaterFiles([page('VA SBA123全.pdf', 1000, 'application/pdf')]), true)
    const first = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    reply(200, modelBody(COMMENT, 'practice-secure', { ...ART }, 3.5, { ...ADVICE }))
    assert.equal(await first, 'model')
    assert.equal(replaceLaterFile('VA SBA123全.pdf', page('作品頁 新.png', 3000, 'image/png')), true)
    const cleared = getSchoolScoreLater().draft
    assert.equal(cleared?.fileName, '作品頁 新.png')
    assert.equal(cleared?.pages.some((item) => item.fileName === 'VA SBA123全.pdf'), false)
    assert.equal(cleared?.aiComment, null)
    assert.deepEqual(cleared?.aiAxes, {})
    const second = requestLaterComment('zh-Hant', false)
    await waitFor(1)
    const sent = reply(200, modelBody(COMMENT_NEXT, 'practice-strong', { ...ART, 'aw-1': 1, 'aw-4': 5 }, 5, { ...ADVICE }))
    assert.equal(((sent.init?.headers ?? {}) as Record<string, string>).Authorization, undefined)
    assert.equal(await second, 'model')
    const next = getSchoolScoreLater().draft
    assert.equal(next?.aiComment, COMMENT_NEXT)
    assert.equal(next?.approxValue, 5)
    assert.equal(next?.aiAxes['aw-1'], 1)
    assert.equal(next?.aiAxes['aw-4'], 5)
    assert.equal(formatLaterVisible(next?.approxValue ?? 0), '5／5')
    assert.equal(removeLaterFile('作品頁 新.png'), true)
    assert.equal(getSchoolScoreLater().draft, null)
    assert.equal(await requestLaterComment('zh-Hant', false), 'idle')
    assert.equal(pending.length, 0)
    assert.equal(laterRadarView(null).artworkPending, false)
    assert.equal(laterRadarView(null).workbookPending, false)
  })
})

describe('later score follow-up portfolio card', () => {
  it('places the scoring reference on its own portfolio card in both editions', () => {
    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
    const quest = readFileSync(join(root, 'src/components/SbaQuest.tsx'), 'utf8')
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    const portfolio = app.split("activeTab === 'portfolio'")[1]?.split("activeTab === 'practice'")[0] ?? ''
    assert.match(portfolio, /data-testid="score-portfolio-card"/)
    assert.match(portfolio, /<AbilityChart/)
    assert.match(portfolio, /tab\.staff/)
    assert.match(portfolio, /<SbaQuest/)
    assert.ok(portfolio.indexOf('score-portfolio-card') < portfolio.indexOf('<SbaQuest'))
    assert.equal(quest.includes('AbilityChart'), false)
    assert.doesNotMatch(portfolio, /ux=map1|ux=classic|useMapOneShell/)
    assert.match(student, /score\.later\.removeFile/)
    assert.match(student, /score\.later\.replaceFile/)
    assert.match(student, /score\.later\.radarPendingWorkbook/)
    assert.match(student, /laterRadarView/)
    assert.match(student, /if \(getSchoolScoreLater\(\)\.draft\) void requestLaterComment\(locale, false\)/)
    assert.match(student, /if \(replaced\) void requestLaterComment\(locale, false\)/)
    assert.equal(student.includes('score-later-request-ai'), false)
    assert.equal(ARTWORK_AXIS_IDS.length, 6)
    assert.equal(RWB_AXIS_IDS.length, 4)
  })
})
