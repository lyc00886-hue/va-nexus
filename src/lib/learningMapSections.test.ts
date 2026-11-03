import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_LESSON_FOLDS,
  LEARNING_MAP_SECTIONS_KEY,
  loadLearningMapSections,
  saveLearningMapSections,
  sectionOpen,
  type LearningMapSectionStorage,
  type LearningMapSections,
} from './learningMapSections.ts'

function memoryStorage(initial: Record<string, string> = {}): LearningMapSectionStorage {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

const EMPTY: LearningMapSections = {
  units: {},
  lessons: {},
  folds: { ...DEFAULT_LESSON_FOLDS },
}

describe('learning map accordion sections', () => {
  it('starts collapsed on the first visit', () => {
    assert.deepEqual(loadLearningMapSections(memoryStorage()), EMPTY)
    assert.equal(sectionOpen({}, 'U1'), false)
    assert.equal(DEFAULT_LESSON_FOLDS.goal, false)
    assert.equal(DEFAULT_LESSON_FOLDS.steps, false)
    assert.equal(DEFAULT_LESSON_FOLDS.practice, false)
  })

  it('remembers several open units, lessons, and folds together', () => {
    const storage = memoryStorage()
    const next: LearningMapSections = {
      units: { 'U1-CN-MODERN': true, 'F4-U2-DRAW-DESIGN': true, 'F4-U1-ORIENT': false },
      lessons: { 'U1-L1': true, 'U1-L2': false },
      folds: { goal: true, steps: false, practice: true },
    }
    saveLearningMapSections(next, storage)
    assert.equal(storage.getItem(LEARNING_MAP_SECTIONS_KEY)?.includes('"practice":true'), true)
    assert.deepEqual(loadLearningMapSections(storage), next)
    assert.equal(sectionOpen(next.units, 'U1-CN-MODERN'), true)
    assert.equal(sectionOpen(next.units, 'missing'), false)
  })

  it('keeps defaults for missing fold flags and drops non-booleans', () => {
    const storage = memoryStorage({
      [LEARNING_MAP_SECTIONS_KEY]: JSON.stringify({
        units: { U1: true, bad: 'yes' },
        lessons: { L1: false },
        folds: { steps: true, goal: 'open' },
      }),
    })
    assert.deepEqual(loadLearningMapSections(storage), {
      units: { U1: true },
      lessons: { L1: false },
      folds: { goal: false, steps: true, practice: false },
    })
  })

  it('falls back to collapsed defaults when storage is corrupt', () => {
    const storage = memoryStorage({ [LEARNING_MAP_SECTIONS_KEY]: '{' })
    assert.deepEqual(loadLearningMapSections(storage), EMPTY)
  })
})

const PEANUTS = {
  en: {
    'map.pageIntro': 'Open the grade, unit, or lesson you need—no need to read it all at once.',
    'map.fold.gradeOrUnit': 'Grade / unit',
    'map.fold.gradeOrUnitHint': 'Expand to see lessons',
    'map.fold.lessons': 'Lessons',
    'map.fold.lessonsHint': 'Pick a lesson to continue',
    'map.lesson.goal': 'Goal',
    'map.lesson.goalHint': 'What this lesson covers',
    'map.lesson.steps': 'Steps',
    'map.lesson.stepsHint': 'Follow along',
    'map.lesson.practice': 'Practice',
    'map.lesson.practiceHint': 'Quiz and practice',
  },
  'zh-Hant': {
    'map.pageIntro': '撳開你要睇嘅級／單元或課；唔使一次睇晒。',
    'map.fold.gradeOrUnit': '級／單元',
    'map.fold.gradeOrUnitHint': '撳開先見課列表',
    'map.fold.lessons': '課列表',
    'map.fold.lessonsHint': '揀一課繼續',
    'map.lesson.goal': '目標',
    'map.lesson.goalHint': '呢課要學咩',
    'map.lesson.steps': '步驟',
    'map.lesson.stepsHint': '跟住做',
    'map.lesson.practice': '練習',
    'map.lesson.practiceHint': '小測同練習',
  },
  'zh-Hans': {
    'map.pageIntro': '点开你要看的年级／单元或课；不必一次看完。',
    'map.fold.gradeOrUnit': '年级／单元',
    'map.fold.gradeOrUnitHint': '点开才见课列表',
    'map.fold.lessons': '课列表',
    'map.fold.lessonsHint': '选一课继续',
    'map.lesson.goal': '目标',
    'map.lesson.goalHint': '这课要学什么',
    'map.lesson.steps': '步骤',
    'map.lesson.stepsHint': '跟着做',
    'map.lesson.practice': '练习',
    'map.lesson.practiceHint': '小测与练习',
  },
} as const

describe('learning map accordion copy', () => {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../i18n')
  for (const [locale, expected] of Object.entries(PEANUTS)) {
    it(`uses the PEANUTS ${locale} strings`, () => {
      const file = JSON.parse(readFileSync(resolve(dir, `${locale}.json`), 'utf8')) as Record<string, string>
      for (const [key, value] of Object.entries(expected)) {
        assert.equal(file[key], value, key)
      }
    })
  }
})
