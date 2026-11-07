import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  applyGuestDraftChoice,
  emptyPracticeDraft,
  hasUnclaimedGuestDraft,
  isPracticeDraftBlank,
  loadPracticeDraft,
  savePracticeDraft,
  type PracticeDraftV1,
} from './practiceDraft.ts'
import { isPracticeQuestionOpen } from './practiceLock.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

type PaperQuestion = { id: string; number: number; status: string }

function installStorage() {
  const map = new Map<string, string>()
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  storage.clear()
  return storage
}

describe('practice question lock', () => {
  const primary = 'set3-q1'

  it('opens only question 1 when it is complete and is the primary id', () => {
    assert.equal(isPracticeQuestionOpen({ id: primary, number: 1, status: 'complete' }, primary), true)
    assert.equal(isPracticeQuestionOpen({ id: 'set3-q2', number: 1, status: 'complete' }, primary), false)
    assert.equal(isPracticeQuestionOpen({ id: primary, number: 1, status: 'stub' }, primary), false)
    assert.equal(isPracticeQuestionOpen({ id: primary, number: 2, status: 'complete' }, primary), false)
  })

  it('keeps Set 3 questions 2–5 locked in every locale file', () => {
    for (const file of ['src/content/paper1-set3.json', 'src/content/paper1-set3.en.json', 'src/content/paper1-set3.zh-Hans.json']) {
      const paper = JSON.parse(read(file)) as { primaryQuestionId: string; questions: PaperQuestion[] }
      assert.equal(paper.primaryQuestionId, 'set3-q1')
      const open = paper.questions.filter((q) => isPracticeQuestionOpen(q, paper.primaryQuestionId))
      assert.deepEqual(open.map((q) => q.number), [1])
      assert.deepEqual(
        paper.questions.filter((q) => !isPracticeQuestionOpen(q, paper.primaryQuestionId)).map((q) => q.number),
        [2, 3, 4, 5],
      )
    }
  })
})

describe('practice guest draft', () => {
  it('does not copy a signed-out draft onto an account unless Keep is chosen', () => {
    installStorage()
    const guest: PracticeDraftV1 = { ...emptyPracticeDraft(), responses: { 'part-a:D': 'guest notes' } }
    const account: PracticeDraftV1 = { ...emptyPracticeDraft(), statement: 'already mine' }
    savePracticeDraft(null, guest)
    savePracticeDraft('student-a', account)

    assert.equal(hasUnclaimedGuestDraft(), true)
    const later = applyGuestDraftChoice('student-a', 'later')
    assert.equal(later.statement, 'already mine')
    assert.equal(later.responses['part-a:D'], undefined)
    assert.equal(loadPracticeDraft(null).responses['part-a:D'], 'guest notes')

    const discarded = applyGuestDraftChoice('student-a', 'discard')
    assert.equal(discarded.statement, 'already mine')
    assert.equal(isPracticeDraftBlank(loadPracticeDraft(null)), true)
    assert.equal(hasUnclaimedGuestDraft(), false)

    savePracticeDraft(null, guest)
    const kept = applyGuestDraftChoice('student-a', 'keep')
    assert.equal(kept.responses['part-a:D'], 'guest notes')
    assert.equal(isPracticeDraftBlank(loadPracticeDraft(null)), true)
    assert.equal(loadPracticeDraft('student-b').responses['part-a:D'], undefined)
  })
})

describe('practice paper boundaries', () => {
  it('keeps English source fields in English and labels the paper as a school mock', () => {
    const cjk = /[\u3400-\u9fff]/
    for (const file of ['src/content/paper1-set3.en.json', 'src/content/paper2-set3.en.json']) {
      const paper = JSON.parse(read(file)) as { source: string; examNote?: string }
      assert.equal(cjk.test(paper.source), false, file)
      assert.match(paper.source, /not an HKEAA paper/)
    }
    const zh = JSON.parse(read('src/content/paper1-set3.zh-Hans.json')) as { source: string }
    assert.equal(zh.source.includes('模擬'), false)
    const hant = JSON.parse(read('src/content/paper1-set3.json')) as { examNote: string }
    assert.match(hant.examNote, /非 HKEAA/)
  })

  it('never sends practice drafts to Gemini or /api/feedback', () => {
    const files = [
      'src/components/PracticePapers.tsx',
      'src/components/PracticeGuestDraftPrompt.tsx',
      'src/lib/practiceDraft.ts',
      'src/lib/practiceContent.ts',
      'src/lib/practiceLock.ts',
    ]
    for (const file of files) {
      const text = read(file)
      assert.equal(/fetch\s*\(/.test(text), false, file)
      assert.equal(/['"]\/api\/feedback['"]/.test(text), false, file)
      assert.equal(/from ['"][^'"]*feedback/.test(text), false, file)
      assert.equal(/gemini/i.test(text), false, file)
      assert.equal(/\b(hearts?|gems?|chests?)\b/i.test(text), false, file)
    }
  })

  it('renders locked questions without answer controls and keeps the guest prompt free of draft text', () => {
    const ui = read('src/components/PracticePapers.tsx')
    const locked = ui.slice(ui.indexOf('function LockedQuestion'), ui.indexOf('function checksFor'))
    assert.equal(/<(button|textarea|input|a)\b/.test(locked), false)
    assert.match(locked, /data-practice-locked/)
    assert.match(ui, /isPracticeQuestionOpen/)

    const prompt = read('src/components/PracticeGuestDraftPrompt.tsx')
    assert.match(prompt, /discardRef/)
    assert.equal(prompt.includes('responses'), false)
    assert.equal(prompt.includes('statement'), false)
    assert.equal(prompt.includes('uploadNames'), false)
  })

  it('exposes the practice tab with full accessible names and short mobile labels', () => {
    const sidebar = read('src/components/Sidebar.tsx')
    assert.match(sidebar, /id: 'practice'/)
    assert.match(sidebar, /aria-label=\{full\}/)
    assert.match(sidebar, /tabLabel\(tab\.id, true\)/)
    assert.equal(sidebar.includes('grid-cols-5'), false)
    const app = read('src/App.tsx')
    assert.match(app, /activeTab === 'practice'/)
    assert.match(app, /<PracticeGuestDraftPrompt/)
    const openTab = read('src/lib/openTab.ts')
    assert.match(openTab, /'practice'/)

    const shorts = {
      en: ['Map', 'Lab', 'Work', 'Lib', 'Paper', 'Award'],
      'zh-Hant': ['地圖', '研究', '作品集', '圖書館', '練習', '成就'],
      'zh-Hans': ['地图', '研究', '作品集', '图书馆', '练习', '成就'],
    } as const
    const keys = ['tab.map.short', 'tab.research.short', 'tab.portfolio.short', 'tab.library.short', 'tab.practice.short', 'tab.achievements.short']
    for (const locale of Object.keys(shorts) as (keyof typeof shorts)[]) {
      const bag = messages(`src/i18n/${locale}.json`)
      keys.forEach((key, index) => {
        assert.equal(bag[key], shorts[locale][index], `${locale} ${key}`)
        assert.equal([...bag[key]].length <= (locale === 'en' ? 5 : 3), true, bag[key])
      })
      assert.equal(bag['tab.practice'], locale === 'en' ? 'Practice papers' : locale === 'zh-Hans' ? '练习卷' : '練習卷')
    }
  })
})
