import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { mapUxQuery } from './mapUx.ts'
import { researchUxQuery } from './researchUx.ts'
import {
  EASY_READ_FLAG,
  STEP_BY_STEP_CHOICES,
  STEP_BY_STEP_DEFAULT,
  STEP_BY_STEP_ON_EVENT,
  STEP_BY_STEP_STORAGE_KEY,
  applyEasyReadQuery,
  easyReadQuery,
  effectiveStepByStep,
  loadStepByStep,
  manualListenVisible,
  pickEasyEmpty,
  readLines,
  readPlace,
  saveStepByStep,
  sentenceChunks,
  showOfflineNote,
  stepByStepAnalytics,
  writePlace,
  type StepByStepStored,
  type StepStorage,
} from './easyReadMode.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const COPY = {
  en: {
    'er.mode.standard': 'Standard',
    'er.mode.step': 'Step-by-step',
    'er.mode.minimal': 'Minimal text',
    'er.mode.literacy': 'Reading help',
    'er.mode.focus': 'Focus',
    'er.mode.on': 'On: one step',
    'er.mode.off': 'Off: full view',
    'er.mode.badge': 'Steps',
    'er.settings.label': 'Display & reading',
    'er.settings.oneLine': 'One step at a time',
    'er.tts.listen': 'Read aloud',
    'er.tts.stop': 'Stop',
    'er.tts.replay': 'Listen again',
    'er.map.continue': 'Continue lesson',
    'er.map.back': 'Back to map',
    'er.map.progress': 'Progress',
    'empty.lessons': 'No lessons yet',
    'er.empty.offline': 'Offline',
    'er.lesson.start': 'Start lesson',
    'er.lesson.leave': 'Leave lesson',
    'er.lesson.continue': 'Continue',
    'er.lesson.sectionDone': 'Section done',
    'er.lesson.oneTask': 'One task here',
    'er.quiz.check': 'Check',
    'er.quiz.next': 'Next',
    'er.quiz.correct': 'Correct!',
    'er.quiz.retry': 'Try again',
    'er.quiz.pickOne': 'Pick one',
    'er.cta.next': 'Next',
    'er.cta.back': 'Back',
    'er.cta.done': 'Done',
    'er.cta.skip': 'Later',
    'er.cta.saved': 'Saved',
    'er.progress.of': 'Step {n} of {t}',
    'er.progress.left': '{n} left',
    'er.leave.confirm': 'Leave?',
  },
  'zh-Hant': {
    'er.mode.standard': '標準',
    'er.mode.step': '逐步完成',
    'er.mode.minimal': '簡潔文字',
    'er.mode.literacy': '讀寫',
    'er.mode.focus': '專注',
    'er.mode.on': '已開：一步一屏',
    'er.mode.off': '已關：完整畫面',
    'er.mode.badge': '逐步',
    'er.settings.label': '顯示同閱讀',
    'er.settings.oneLine': '一次只做一步',
    'er.tts.listen': '朗讀呢頁',
    'er.tts.stop': '停止朗讀',
    'er.tts.replay': '再聽一次',
    'er.map.continue': '繼續呢課',
    'er.map.back': '返地圖',
    'er.map.progress': '進度',
    'empty.lessons': '未有課堂',
    'er.empty.offline': '離線中',
    'er.lesson.start': '開始這一課',
    'er.lesson.leave': '離開課',
    'er.lesson.continue': '繼續',
    'er.lesson.sectionDone': '完成本段',
    'er.lesson.oneTask': '呢頁一件事',
    'er.quiz.check': '檢查',
    'er.quiz.next': '下一題',
    'er.quiz.correct': '啱！',
    'er.quiz.retry': '再試',
    'er.quiz.pickOne': '請揀一個',
    'er.cta.next': '下一步',
    'er.cta.back': '上一步',
    'er.cta.done': '完成呢步',
    'er.cta.skip': '稍後',
    'er.cta.saved': '已儲存',
    'er.progress.of': '第 {n}／{t} 步',
    'er.progress.left': '仲有 {n} 步',
    'er.leave.confirm': '確定離開？',
  },
  'zh-Hans': {
    'er.mode.standard': '标准',
    'er.mode.step': '逐步完成',
    'er.mode.minimal': '简洁文字',
    'er.mode.literacy': '读写',
    'er.mode.focus': '专注',
    'er.mode.on': '已开：一步一屏',
    'er.mode.off': '已关：完整画面',
    'er.mode.badge': '逐步',
    'er.settings.label': '显示与阅读',
    'er.settings.oneLine': '一次只做一步',
    'er.tts.listen': '朗读本页',
    'er.tts.stop': '停止朗读',
    'er.tts.replay': '再听一次',
    'er.map.continue': '继续这课',
    'er.map.back': '回地图',
    'er.map.progress': '进度',
    'empty.lessons': '暂无课堂',
    'er.empty.offline': '离线中',
    'er.lesson.start': '开始这一课',
    'er.lesson.leave': '离开课',
    'er.lesson.continue': '继续',
    'er.lesson.sectionDone': '完成本段',
    'er.lesson.oneTask': '本页一件事',
    'er.quiz.check': '检查',
    'er.quiz.next': '下一题',
    'er.quiz.correct': '对！',
    'er.quiz.retry': '再试',
    'er.quiz.pickOne': '请选一个',
    'er.cta.next': '下一步',
    'er.cta.back': '上一步',
    'er.cta.done': '完成这步',
    'er.cta.skip': '稍后',
    'er.cta.saved': '已保存',
    'er.progress.of': '第 {n}／{t} 步',
    'er.progress.left': '还剩 {n} 步',
    'er.leave.confirm': '确定离开？',
  },
} as const

const BANNED = ['SEN', 'IQ', 'SPLD', 'disability', '診斷', '诊断', '弱智', '心心', 'FOMO', '分數', '分数', '評分', '评分']

function memory(initial: Record<string, string> = {}): StepStorage & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value)
    },
    dump: () => Object.fromEntries(map),
  }
}

function messages(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, string>
}

function hanCount(value: string): number {
  return [...value].filter((ch) => /\p{Script=Han}/u.test(ch)).length
}

function englishWords(value: string): number {
  return value.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length
}

describe('step-by-step preference', () => {
  it('stays off until a student or teacher display choice turns it on', () => {
    assert.deepEqual(STEP_BY_STEP_CHOICES, ['standard', 'step'])
    assert.equal(STEP_BY_STEP_STORAGE_KEY, 'display.stepByStep')
    assert.equal(effectiveStepByStep(STEP_BY_STEP_DEFAULT), false)
    const preset: StepByStepStored = { ...STEP_BY_STEP_DEFAULT, teacherPreset: true }
    assert.equal(effectiveStepByStep(preset), true)
    assert.equal(effectiveStepByStep({ ...preset, studentSet: true, on: false }), false)
    assert.equal(effectiveStepByStep({ ...STEP_BY_STEP_DEFAULT, studentSet: true, on: true }), true)
  })

  it('ignores map and research preview values and clears on classic', () => {
    assert.equal(easyReadQuery('?ux=stepByStep'), 'stepByStep')
    assert.equal(easyReadQuery('?ux=easyRead'), 'easyRead')
    assert.equal(easyReadQuery('?ux=map1'), null)
    assert.equal(easyReadQuery('?ux=steps'), null)
    assert.equal(mapUxQuery('?ux=stepByStep'), null)
    assert.equal(mapUxQuery('?ux=easyRead'), null)
    assert.equal(researchUxQuery('?ux=stepByStep'), null)
    assert.equal(researchUxQuery('?ux=easyRead'), null)

    const on = applyEasyReadQuery('?ux=stepByStep', STEP_BY_STEP_DEFAULT)
    assert.equal(on.stored.on, true)
    assert.equal(on.stored.preview, true)
    assert.equal(on.stored.studentSet, true)
    assert.equal(on.restore, null)

    const revealed = applyEasyReadQuery('?ux=easyRead', STEP_BY_STEP_DEFAULT)
    assert.equal(revealed.stored.on, false)
    assert.equal(revealed.stored.preview, true)

    const classic = applyEasyReadQuery('?ux=classic', { ...on.stored, priorSupports: { focusTunnel: false, easyRead: false } })
    assert.equal(classic.stored.on, false)
    assert.equal(classic.stored.preview, false)
    assert.deepEqual(classic.restore, { focusTunnel: false, easyRead: false })
    assert.equal(applyEasyReadQuery('?ux=off', on.stored).stored.on, false)
    assert.equal(applyEasyReadQuery('?ux=map1', on.stored).stored.on, true)
  })

  it('stores display fields only and drops diagnosis keys', () => {
    const storage = memory({
      [STEP_BY_STEP_STORAGE_KEY]: JSON.stringify({
        on: true,
        teacherPreset: true,
        studentSet: false,
        preview: true,
        diagnosis: 'nope',
        senLabel: 'nope',
        sen_mode: true,
        priorSupports: { focusTunnel: true, easyRead: false },
      }),
    })
    const loaded = loadStepByStep(storage)
    assert.equal(loaded.on, true)
    assert.equal(loaded.teacherPreset, true)
    assert.deepEqual(loaded.priorSupports, { focusTunnel: true, easyRead: false })
    assert.equal('diagnosis' in loaded, false)
    saveStepByStep(storage, loaded)
    const saved = storage.dump()[STEP_BY_STEP_STORAGE_KEY]
    assert.match(saved, /"teacherPreset":true/)
    for (const banned of ['diagnosis', 'senLabel', 'sen_', 'disability', 'medicalCode']) {
      assert.equal(saved.includes(banned), false, banned)
    }
    assert.deepEqual(loadStepByStep(memory({ [STEP_BY_STEP_STORAGE_KEY]: '{' })), STEP_BY_STEP_DEFAULT)
  })

  it('names the analytics event as a display preference', () => {
    assert.equal(stepByStepAnalytics(false), null)
    assert.deepEqual(stepByStepAnalytics(true), { name: STEP_BY_STEP_ON_EVENT, flag: EASY_READ_FLAG })
    assert.equal(STEP_BY_STEP_ON_EVENT, 'display_step_by_step_on')
    assert.equal(EASY_READ_FLAG, 'easyReadMode')
    assert.equal(STEP_BY_STEP_ON_EVENT.toLowerCase().includes('sen'), false)
  })

  it('chunks short lines, picks empty states, and remembers the step', () => {
    assert.equal(manualListenVisible({ step: false, literacy: false, focus: false }), false)
    assert.equal(manualListenVisible({ step: true, literacy: false, focus: false }), true)
    assert.equal(manualListenVisible({ step: false, literacy: true, focus: false }), true)
    assert.equal(manualListenVisible({ step: false, literacy: false, focus: true }), true)

    assert.deepEqual(readLines({ body: 'Long paragraph.', easy: ['One.', 'Two.'] }, true), ['One.', 'Two.'])
    assert.deepEqual(readLines({ body: 'First. Second. Third.', easy: [] }, true), ['First.', 'Second.'])
    assert.deepEqual(readLines({ body: 'Full card.', easy: ['Short.'] }, false), ['Full card.'])
    assert.deepEqual(sentenceChunks('甲。乙。'), ['甲。', '乙。'])

    assert.equal(pickEasyEmpty({ offline: true, hasDownload: false, lessonCount: 0, hasCurrent: false }), 'offline')
    assert.equal(pickEasyEmpty({ offline: true, hasDownload: true, lessonCount: 2, hasCurrent: true }), null)
    assert.equal(showOfflineNote(true, true), true)
    assert.equal(pickEasyEmpty({ offline: false, hasDownload: true, lessonCount: 0, hasCurrent: false }), 'no-lessons')
    assert.equal(pickEasyEmpty({ offline: false, hasDownload: true, lessonCount: 1, stepCount: 0, hasCurrent: true }), 'no-content')
    assert.equal(pickEasyEmpty({ offline: false, hasDownload: true, lessonCount: 2, hasCurrent: false }), 'next-lesson')

    const storage = memory()
    assert.equal(readPlace(storage, 'L1'), 0)
    writePlace(storage, 'L1', 2)
    assert.equal(readPlace(storage, 'L1'), 2)
    assert.equal(storage.dump()[STEP_BY_STEP_STORAGE_KEY], undefined)
  })
})

describe('step-by-step chrome copy', () => {
  it('matches the ultra-short lines and stays free of diagnostic words', () => {
    const files = {
      en: 'src/i18n/en.json',
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = messages(files[locale])
      for (const [key, value] of Object.entries(COPY[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        if (locale === 'en') assert.ok(englishWords(value) <= 8, value)
        else assert.ok(hanCount(value) <= 12, value)
        for (const banned of BANNED) assert.equal(value.includes(banned), false, `${key} ${banned}`)
      }
    }
    const ui = [
      'src/components/easy-read/EasyReadBar.tsx',
      'src/components/easy-read/EasyReadEmpty.tsx',
      'src/components/easy-read/StepPath.tsx',
      'src/components/easy-read/ListenButton.tsx',
    ]
    for (const file of ui) {
      const source = readFileSync(join(root, file), 'utf8')
      for (const banned of ['sen_', 'SEN', 'SPLD', 'disability', '診斷', '弱智']) {
        assert.equal(source.includes(banned), false, `${file} ${banned}`)
      }
      assert.equal(source.includes('role="radiogroup"') && file.endsWith('StepPath.tsx'), false)
    }
    const bar = readFileSync(join(root, 'src/components/easy-read/EasyReadBar.tsx'), 'utf8')
    assert.match(bar, /role="radiogroup"/)
    assert.match(bar, /easy-read-choice-\$\{id\}/)
    assert.match(bar, /id="standard"/)
    assert.match(bar, /id="step"/)
    assert.match(bar, /role="switch"/)
    assert.match(bar, /easy-read-minimal/)
    assert.equal(bar.includes('er.mode.minimal') && bar.includes('role="radio"') && bar.includes('minimal'), true)
    const radioBlock = bar.slice(bar.indexOf('radiogroup'), bar.indexOf('easy-read-state'))
    assert.equal(radioBlock.includes('er.mode.minimal'), false)
    assert.equal(radioBlock.includes('er.mode.literacy'), false)
    assert.equal(radioBlock.includes('er.mode.focus'), false)

    const map = readFileSync(join(root, 'src/components/game/LearningMap.tsx'), 'utf8')
    assert.match(map, /if \(easy\.on\)/)
    assert.match(map, /if \(mapOne\)/)
    assert.match(map, /HistoryTrack/)
  })
})
