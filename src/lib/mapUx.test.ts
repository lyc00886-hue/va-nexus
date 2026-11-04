import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { isAiFeedbackPaused } from './aiFeedbackPause.ts'
import {
  lessonChunks,
  mapOneEnabled,
  mapUxPersist,
  mapUxQuery,
  nextLessonId,
  stepChunk,
} from './mapUx.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** PEANUTS doc 1MJ2KISY… — empty / celebrate / Map–AI busy. DICK COPY PASS. */
const COPY = {
  en: {
    'empty.nextLesson': 'Next lesson soon',
    'empty.noContent': 'Nothing here yet',
    'empty.nextLesson.cta': 'Back to map',
    'empty.noContent.cta': 'Go research',
    'celebrate.soft': 'Nice work!',
    'celebrate.soft.sub': 'Lesson done',
    'celebrate.soft.cta': 'Next lesson',
    'map.chunk.cta': 'Continue',
    'map.chunk.done': 'Section done',
    'ai.title': 'AI learning tip',
    'ai.busy': 'Thinking…',
    'ai.busy.fallback': 'Use checklist',
    'ai.fold.more': 'More',
    'ai.fold.less': 'Less',
  },
  'zh-Hant': {
    'empty.nextLesson': '下一課稍後開放',
    'empty.noContent': '未有內容',
    'empty.nextLesson.cta': '返地圖',
    'empty.noContent.cta': '去研究室',
    'celebrate.soft': '做得好！',
    'celebrate.soft.sub': '這一課完成',
    'celebrate.soft.cta': '下一課',
    'map.chunk.cta': '繼續',
    'map.chunk.done': '完成本段',
    'ai.title': 'AI 學習建議',
    'ai.busy': '想緊建議…',
    'ai.busy.fallback': '用清單繼續',
    'ai.fold.more': '更多',
    'ai.fold.less': '收起',
  },
  'zh-Hans': {
    'empty.nextLesson': '下一课稍后开放',
    'empty.noContent': '暂无内容',
    'empty.nextLesson.cta': '回地图',
    'empty.noContent.cta': '去研究室',
    'celebrate.soft': '做得好！',
    'celebrate.soft.sub': '这一课完成',
    'celebrate.soft.cta': '下一课',
    'map.chunk.cta': '继续',
    'map.chunk.done': '完成本段',
    'ai.title': 'AI 学习建议',
    'ai.busy': '正在想建议…',
    'ai.busy.fallback': '用清单继续',
    'ai.fold.more': '更多',
    'ai.fold.less': '收起',
  },
} as const

const BANNED = ['HKEAA', '考評局', '考评局', 'Super', '心心', 'SEN', 'IQ', '付費', '付费', 'FOMO']

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

function hanCount(value: string): number {
  return [...value].filter((ch) => /\p{Script=Han}/u.test(ch)).length
}

function englishWords(value: string): number {
  return value.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length
}

describe('map one-lesson preview flag', () => {
  it('stays off unless the query or a stored opt-in says map1', () => {
    assert.equal(mapUxQuery(''), null)
    assert.equal(mapUxQuery('?ux=map1'), 'map1')
    assert.equal(mapUxQuery('?ux=steps'), null)
    assert.equal(mapUxQuery('?ux=classic'), 'classic')
    assert.equal(mapUxQuery('ux=off'), 'off')

    assert.equal(mapOneEnabled('', null), false)
    assert.equal(mapOneEnabled('?ux=steps', null), false)
    assert.equal(mapOneEnabled('?ux=map1', null), true)
    assert.equal(mapOneEnabled('', 'map1'), true)
    assert.equal(mapOneEnabled('?ux=steps', 'map1'), true)
    assert.equal(mapOneEnabled('?ux=classic', 'map1'), false)
    assert.equal(mapOneEnabled('?ux=off', 'map1'), false)

    assert.equal(mapUxPersist('?ux=map1'), 'set')
    assert.equal(mapUxPersist('?ux=classic'), 'clear')
    assert.equal(mapUxPersist('?ux=off'), 'clear')
    assert.equal(mapUxPersist('?ux=steps'), 'keep')
    assert.equal(mapUxPersist(''), 'keep')
  })

  it('walks one chunk at a time and finds the following lesson', () => {
    assert.deepEqual(lessonChunks(2, 1), [
      { kind: 'read', index: 0 },
      { kind: 'read', index: 1 },
      { kind: 'practice', index: 0 },
    ])
    assert.deepEqual(lessonChunks(0, 0), [])
    assert.deepEqual(stepChunk(0, 3), { index: 1, done: false })
    assert.deepEqual(stepChunk(2, 3), { index: 2, done: true })
    assert.deepEqual(stepChunk(0, 0), { index: 0, done: true })

    const units = [{ nodes: [{ id: 'a' }, { id: 'b' }] }, { nodes: [{ id: 'c' }] }]
    assert.equal(nextLessonId(units, 'a'), 'b')
    assert.equal(nextLessonId(units, 'b'), 'c')
    assert.equal(nextLessonId(units, 'c'), null)
    assert.equal(nextLessonId(units, 'missing'), null)
  })
})

describe('map / AI preview copy', () => {
  it('matches the PEANUTS trilingual short copy', () => {
    const files = {
      en: 'src/i18n/en.json',
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = messages(files[locale])
      for (const [key, value] of Object.entries(COPY[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.ok([...value].length <= 16, value)
        if (locale === 'en') assert.ok(englishWords(value) <= 8, value)
        else assert.ok(hanCount(value) <= 12, value)
        for (const banned of BANNED) assert.equal(value.includes(banned), false, `${key} ${banned}`)
      }
      assert.equal(bag['ai.title'], bag['rs.ai.title'])
    }
  })

  it('keeps the classic map as the default and shares one AI screen', () => {
    const map = read('src/components/game/LearningMap.tsx')
    const lesson = read('src/components/game/MapOneLesson.tsx')
    const motion = read('src/game/softMotion.ts')
    const frames = read('src/components/game/SoftMotion.tsx')
    const screen = read('src/components/game/AiLearningTipScreen.tsx')
    const shell = read('src/components/game/ResearchStepShell.tsx')
    const feedback = read('api/feedback.ts')

    assert.match(map, /useMapOneShell/)
    assert.match(map, /if \(mapOne\)/)
    assert.match(map, /HistoryTrack/)
    assert.match(map, /CommitmentBanner/)
    assert.match(map, /data-map-shell="one"/)

    assert.match(lesson, /t\('map\.chunk\.cta'\)/)
    assert.match(lesson, /t\('map\.chunk\.done'\)/)
    assert.match(lesson, /t\('celebrate\.soft'\)/)
    assert.match(lesson, /t\('celebrate\.soft\.sub'\)/)
    assert.match(lesson, /t\('empty\.nextLesson'\)/)
    assert.match(lesson, /t\('empty\.noContent'\)/)
    assert.match(lesson, /postFeldmanFeedback/)
    assert.match(lesson, /LessonCompleteFrame/)
    assert.match(lesson, /MOOD_EMPTY_MAP/)
    assert.match(lesson, /data-map-cta="primary"/)
    assert.match(motion, /mood-lessonComplete/)
    assert.match(motion, /mood-otter-peek/)
    assert.match(motion, /mood-empty-map/)
    assert.match(frames, /data-otter="peek"/)
    assert.equal(frames.includes('infinite'), false)
    assert.match(lesson, /AiLearningTipScreen/)
    assert.equal(lesson.includes('/api/feedback'), false)
    for (const banned of ['Heart', 'Lock', 'Trophy', 'HKEAA', 'Super', '心心', 'SEN']) {
      assert.equal(lesson.includes(banned), false, banned)
    }

    assert.match(screen, /t\('ai\.title'\)/)
    assert.match(screen, /t\('ai\.busy'\)/)
    assert.match(screen, /t\('ai\.busy\.fallback'\)/)
    assert.match(screen, /t\('ai\.fold\.more'\)/)
    assert.match(screen, /t\('ai\.fold\.less'\)/)
    assert.match(shell, /AiLearningTipScreen/)
    assert.equal(screen.includes('/api/feedback'), false)
    assert.equal(feedback.includes('map1'), false)
    assert.equal(feedback.includes('ai.busy'), false)
  })
})

describe('feldman feedback pause', () => {
  it('treats quota, 503, and high demand as one notice', () => {
    assert.equal(isAiFeedbackPaused(503, {}), true)
    assert.equal(isAiFeedbackPaused(200, { code: 'gemini_quota' }), true)
    assert.equal(isAiFeedbackPaused(500, { error: 'UNAVAILABLE' }), true)
    assert.equal(isAiFeedbackPaused(429, { error: 'high demand' }), true)
    assert.equal(isAiFeedbackPaused(500, { error: 'overloaded' }), true)
    assert.equal(isAiFeedbackPaused(400, { error: 'bad request' }), false)
    assert.equal(isAiFeedbackPaused(200, { feedback: 'ok' }), false)
  })
})
