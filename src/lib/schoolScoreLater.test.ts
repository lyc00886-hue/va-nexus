import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { DUAL_AXIS_IDS, emptyDualRadarStore, formativeForBand, withDualAxis } from './schoolScoreDual.ts'
import { SCHOOL_SCORE_SLOT } from './schoolScore.ts'
import {
  SCHOOL_SCORE_LATER_KEY,
  SCHOOL_SCORE_LATER_SHA256,
  aiReferenceFormative,
  applyAiFallback,
  applyModelComment,
  approximateBandId,
  draftFromFile,
  effectiveBand,
  emptyLaterStore,
  isLaterUploadFile,
  laterFeed,
  laterPending,
  sanitizeLaterStore,
  studentVisibleBand,
  withAdjustBand,
  withCommitted,
} from './schoolScoreLater.ts'
import { PRACTICE_BAND_IDS, TEACHER_DRAFT_BAND_KEY } from './teacherDraftBand.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const LOCALE = {
  en: {
    'score.later.upload': 'Upload artwork / workbook pages',
    'score.later.aiApprox': 'AI approximate reference band (not an official score)',
    'score.later.teacherAdjust': 'Teacher adjust',
    'score.later.disclaimer':
      'Not a public-exam or HKEAA result. AI approx is school-internal only; teacher-adjusted values prevail.',
    'score.later.pending': 'Pending teacher confirm',
    'score.later.studentRo': 'Learning progress reference (read-only)',
    'score.later.notFinal': 'Not the final score',
    'score.later.notFinalNote':
      'What you see now is an approximate rating / reference band and comments, including the AI reference radar, not the final score. It is for school discussion only. The formal school reference and dual radar are written only after the teacher confirms or adjusts.',
    'score.later.aiRadar': 'AI reference radar',
    'score.later.aiRadarHint':
      'This is the AI reference radar, not the final score. The formal school reference and dual radar are written only after the teacher confirms or adjusts.',
  },
  'zh-Hant': {
    'score.later.upload': '上傳作品／工作簿頁',
    'score.later.aiApprox': 'AI 大概參考帶（非正式分）',
    'score.later.teacherAdjust': '教師調分',
    'score.later.disclaimer': '非公開試／非 HKEAA 正式分數。AI 大概分只供校內討論；以教師調分後為準。',
    'score.later.pending': '待教師確認',
    'score.later.studentRo': '學習進度參考（只讀）',
    'score.later.notFinal': '唔係最終分數',
    'score.later.notFinalNote':
      '你而家見到嘅係大概評級／參考帶同參考評語，亦包括 AI 參考雷達，唔係最終分數。只供校內討論；正式學校參考／雙雷達仍要教師確認或調分後先餵。',
    'score.later.aiRadar': 'AI 參考雷達',
    'score.later.aiRadarHint': '呢幅係 AI 參考雷達，唔係最終分數。正式學校參考／雙雷達仍要教師確認或調分後先餵。',
  },
  'zh-Hans': {
    'score.later.upload': '上传作品／工作簿页',
    'score.later.aiApprox': 'AI 大概参考带（非正式分）',
    'score.later.teacherAdjust': '教师调分',
    'score.later.disclaimer': '非公开试／非 HKEAA 正式分数。AI 大概分只供校内讨论；以教师调分后为准。',
    'score.later.pending': '待教师确认',
    'score.later.studentRo': '学习进度参考（只读）',
    'score.later.notFinal': '不是最终分数',
    'score.later.notFinalNote':
      '你现在见到的是大概评级／参考带和参考评语，也包括 AI 参考雷达，不是最终分数。只供校内讨论；正式学校参考／双雷达仍要教师确认或调分后先写入。',
    'score.later.aiRadar': 'AI 参考雷达',
    'score.later.aiRadarHint': '这幅是 AI 参考雷达，不是最终分数。正式学校参考／双雷达仍要教师确认或调分后先写入。',
  },
} as const

const FILES = {
  en: 'src/i18n/en.json',
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
} as const

const BANNED =
  /5\*\*|97分|全校降分|未自評|未達標|未自评|未达标|streak|hearts|gems|claim|3★|SEN|火焰|CCCKLC|功樂|孔教|\bSoft\b|FOMO|真題|夺星|奪星|競技場|竞技场/

function messages(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, string>
}

describe('school score later locale', () => {
  it('matches the locale table and keeps pressure wording out', () => {
    const staff = readFileSync(join(root, 'src/components/SchoolScoreLaterStaff.tsx'), 'utf8')
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    const used = new Set<string>()
    for (const match of `${staff}\n${student}`.matchAll(/t\('(score\.later\.[^']+)'\)/g)) used.add(match[1])
    assert.ok(used.has('score.later.disclaimer'))
    assert.ok(used.has('score.later.pending'))
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      for (const [key, value] of Object.entries(LOCALE[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      for (const key of used) assert.equal(typeof bag[key], 'string', `${locale} ${key}`)
      for (const [key, value] of Object.entries(bag)) {
        if (!key.startsWith('score.later.')) continue
        assert.equal(BANNED.test(value), false, `${locale} ${key} ${value}`)
      }
    }
  })
})

describe('school score later plates', () => {
  it('keeps the scout sha256 bytes', () => {
    for (const [name, hex] of Object.entries(SCHOOL_SCORE_LATER_SHA256)) {
      const bytes = readFileSync(
        join(root, 'public/content/learning-map-illustrations/soft-scout/school-score-soft-later-upload-ai-2611', name),
      )
      const hash = createHash('sha256').update(bytes).digest('hex')
      assert.equal(hash, hex, name)
      assert.equal(hash.startsWith(hex.slice(0, 12)), true, name)
    }
  })
})

describe('school score later band', () => {
  it('maps a file to one practice band and the existing formative value', () => {
    assert.equal(isLaterUploadFile({ name: 'page.png', type: 'image/png' }), true)
    assert.equal(isLaterUploadFile({ name: 'page.pdf', type: 'application/pdf' }), true)
    assert.equal(isLaterUploadFile({ name: 'page.pdf', type: '' }), true)
    assert.equal(isLaterUploadFile({ name: 'notes.txt', type: 'text/plain' }), false)
    const band = approximateBandId('工作簿頁 1.pdf', 12000)
    assert.equal(PRACTICE_BAND_IDS.includes(band), true)
    assert.equal(approximateBandId('工作簿頁 1.pdf', 12000), band)
    assert.equal(formativeForBand(band) > 0 && formativeForBand(band) <= 5, true)
    const draft = draftFromFile('工作簿頁 1.pdf', 12000, 'application/pdf')
    assert.equal(draft.approxBand, band)
    assert.equal(draft.adjustBand, null)
    assert.equal(draft.committedBand, null)
    assert.equal(laterPending(draft), true)
    assert.equal(studentVisibleBand(draft), band)
    assert.equal(formativeForBand(draft.approxBand), formativeForBand(band))
  })

  it('lets a teacher override feed the school slot and only empty dual axes', () => {
    const selfKey = readFileSync(join(root, 'src/lib/selfAssessment.ts'), 'utf8').match(/SELF_ASSESSMENT_KEY = '([^']+)'/)?.[1]
    assert.ok(selfKey)
    assert.notEqual(SCHOOL_SCORE_LATER_KEY, selfKey)
    assert.notEqual(SCHOOL_SCORE_LATER_KEY, TEACHER_DRAFT_BAND_KEY)
    const draft = draftFromFile('page.pdf', 42, 'application/pdf')
    const adjusted = withAdjustBand(draft, draft.approxBand === 'practice-strong' ? 'practice-emerging' : 'practice-strong')
    assert.notEqual(effectiveBand(adjusted), draft.approxBand)
    assert.equal(laterPending(adjusted), true)
    assert.equal(studentVisibleBand(adjusted), draft.approxBand)
    const committed = withCommitted(adjusted)
    assert.equal(committed.committedBand, effectiveBand(adjusted))
    assert.equal(laterPending(committed), false)
    assert.equal(studentVisibleBand(committed), effectiveBand(adjusted))
    assert.equal(withAdjustBand(committed, null).adjustBand, null)
    const dual = withDualAxis(emptyDualRadarStore(), 'rwb-1', 1.25)
    const plan = laterFeed(adjusted, dual)
    assert.equal(plan.band, effectiveBand(adjusted))
    assert.equal(plan.formative, formativeForBand(plan.band))
    assert.equal(plan.axes.includes('rwb-1'), false)
    assert.equal(plan.axes.length, DUAL_AXIS_IDS.length - 1)
    const fresh = laterFeed(draft, emptyDualRadarStore())
    assert.equal(fresh.axes.length, DUAL_AXIS_IDS.length)
    assert.deepEqual(sanitizeLaterStore({ version: 2, draft }), emptyLaterStore())
    const clean = sanitizeLaterStore({
      version: 1,
      draft: {
        fileName: ' page.pdf ',
        fileSize: 42,
        mime: 'application/pdf',
        approxBand: 'practice-developing',
        adjustBand: 'practice-strong',
        committedBand: 'nope',
      },
    })
    assert.equal(clean.draft?.fileName, 'page.pdf')
    assert.equal(clean.draft?.approxBand, 'practice-developing')
    assert.equal(clean.draft?.adjustBand, 'practice-strong')
    assert.equal(clean.draft?.committedBand, null)
    assert.equal(sanitizeLaterStore({ version: 1, draft: { ...draft, approxBand: '1-4' } }).draft, null)
  })
})

describe('school score later chrome', () => {
  it('mounts staff and read-only student surfaces without touching v1 controls', () => {
    const staff = readFileSync(join(root, 'src/components/SchoolScoreLaterStaff.tsx'), 'utf8')
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    const progress = readFileSync(join(root, 'src/components/LearningProgressRef.tsx'), 'utf8')
    const page = readFileSync(join(root, 'src/components/TeacherDraftBand.tsx'), 'utf8')
    const hook = readFileSync(join(root, 'src/lib/useSchoolScoreLater.ts'), 'utf8')
    const v1 = readFileSync(join(root, 'src/components/SchoolScoreStaff.tsx'), 'utf8')
    const dual = readFileSync(join(root, 'src/components/SchoolScoreDualStaff.tsx'), 'utf8')
    assert.match(staff, /data-testid="score-later-staff"/)
    assert.match(staff, /data-testid="score-later-upload"/)
    assert.match(staff, /data-testid="score-later-ai-approx"/)
    assert.match(staff, /data-testid="score-later-teacher-adjust"/)
    assert.match(staff, /data-testid="score-later-disclaimer"/)
    assert.match(staff, /type="file"/)
    assert.match(staff, /#FFF9E9/)
    assert.match(staff, /#0D9488/)
    assert.doesNotMatch(staff, /animate-|framer-motion|多校|練習卷|未達標/)
    assert.match(student, /data-testid="score-later-student"/)
    assert.match(student, /data-readonly="true"/)
    assert.match(student, /score\.later\.notFinal/)
    assert.match(student, /score\.later\.notFinalNote/)
    assert.match(student, /score\.later\.aiRadar/)
    assert.match(student, /score\.later\.disclaimer/)
    assert.match(student, /aiReferenceFormative/)
    assert.match(student, /axisLabelKey/)
    assert.match(student, /chart\.id === 'research_workbook'/)
    assert.match(student, /data-testid="score-later-ai-chart-research_workbook"/)
    assert.doesNotMatch(student, /DUAL_CHARTS\.map|sm:grid-cols-2|score-later-ai-chart-artwork/)
    assert.match(student, /disabled/)
    assert.doesNotMatch(student, /score\.later\.pending|score\.later\.submitted|score\.later\.commentPending/)
    assert.doesNotMatch(student, /axisShortKey|effectiveBand|adjustBand/)
    assert.doesNotMatch(student, /type="file"|<select|saveDualAxis|saveTeacherDraft|acceptLaterFile|setLaterAdjust|未達標|\bSoft\b/)
    assert.match(progress, /compact \? null : <SchoolScoreDualStudent/)
    assert.match(progress, /compact \? null : <SchoolScoreLaterStudent/)
    assert.match(page, /<SchoolScoreStaff \/>/)
    assert.match(page, /<SchoolScoreDualStaff \/>/)
    assert.match(page, /<SchoolScoreLaterStaff \/>/)
    assert.match(hook, /saveTeacherDraft\(SCHOOL_SCORE_SLOT/)
    assert.match(hook, /saveDualAxis/)
    assert.match(hook, /SCHOOL_SCORE_SLOT/)
    assert.equal(SCHOOL_SCORE_SLOT, 'school-score-v1')
    assert.match(v1, /data-testid="score-later"/)
    assert.doesNotMatch(v1, /SchoolScoreLater|type="file"/)
    assert.doesNotMatch(dual, /SchoolScoreLater|type="file"/)
    const dualStudent = readFileSync(join(root, 'src/components/SchoolScoreDualStudent.tsx'), 'utf8')
    assert.match(dualStudent, /score\.later\.notFinal/)
    assert.match(dualStudent, /axisShortKey/)
    assert.match(dualStudent, /DUAL_CHARTS\.map/)
    assert.doesNotMatch(dualStudent, /aiReferenceFormative|useSchoolScoreLater|saveDualAxis/)
  })
})

describe('student instant approximate band', () => {
  it('maps the AI radar from the approximate band and leaves an unwritten teacher adjust off it', () => {
    const draft = draftFromFile('工作簿頁 1.pdf', 12000, 'application/pdf')
    assert.equal(draft.aiStatus, 'idle')
    assert.equal(draft.aiComment, null)
    assert.equal(aiReferenceFormative(draft), formativeForBand(draft.approxBand))
    const other = draft.approxBand === 'practice-strong' ? 'practice-emerging' : 'practice-strong'
    const adjusted = withAdjustBand(draft, other)
    assert.notEqual(effectiveBand(adjusted), draft.approxBand)
    assert.equal(laterPending(adjusted), true)
    assert.equal(aiReferenceFormative(adjusted), formativeForBand(draft.approxBand))
    assert.notEqual(aiReferenceFormative(adjusted), formativeForBand(effectiveBand(adjusted)))
    const committed = withCommitted(adjusted)
    assert.equal(committed.committedBand, effectiveBand(adjusted))
    assert.equal(aiReferenceFormative(committed), formativeForBand(draft.approxBand))
    const comment = '主題或意念的探索及發展接近穩固，反思及學習進程仍可再寫清楚。'
    const model = applyModelComment(draft, { comment, band: 'practice-secure' })
    assert.equal(model.aiStatus, 'model')
    assert.equal(model.aiComment, comment)
    assert.equal(model.committedBand, null)
    assert.equal(aiReferenceFormative(model), formativeForBand('practice-secure'))
    const fallback = applyAiFallback(model)
    assert.equal(fallback.aiStatus, 'fallback')
    assert.equal(fallback.aiComment, null)
    assert.equal(aiReferenceFormative(fallback), formativeForBand(draft.stubBand))
  })

  it('keeps the official not-final sentence and does not invent a substitute', () => {
    const substitute = /暫定分|预测分|預測分|即時得分|即时得分|5\*\*|公開試結果|公开试结果|artionhk|AI＝公開試預測|AI＝公开试预测/
    const student = readFileSync(join(root, 'src/components/SchoolScoreLaterStudent.tsx'), 'utf8')
    assert.equal(substitute.test(student), false)
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      for (const key of [
        'score.later.notFinal',
        'score.later.notFinalNote',
        'score.later.aiRadar',
        'score.later.aiRadarHint',
      ] as const) {
        assert.equal(substitute.test(bag[key]), false, `${locale} ${key}`)
      }
      for (const key of ['score.later.notFinal', 'score.later.notFinalNote', 'score.later.aiRadarHint'] as const) {
        const value = bag[key]
        const hasOfficial =
          value.toLowerCase().includes('not the final score') || value.includes('最終分數') || value.includes('最终分数')
        assert.equal(hasOfficial, true, `${locale} ${key}`)
      }
    }
  })
})
