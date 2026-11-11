import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  applyGuestDraftChoice,
  DESIGN_PAPER_ID,
  emptyPracticeDraft,
  emptyQuestionDraft,
  hasUnclaimedGuestDraft,
  isPracticeDraftBlank,
  loadPracticeDraft,
  PAINT_PAPER_ID,
  PAINT_QUESTION_ID,
  PRACTICE_DRAFT_V1_PREFIX,
  savePracticeDraft,
} from './practiceDraft.ts'
import { isPracticeQuestionOpen } from './practiceLock.ts'
import { PRACTICE_SPLIT_SHA256 } from './practiceScout.ts'

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

  it('keeps questions 2–5 locked on both papers in every locale file', () => {
    const papers = [
      { id: PAINT_PAPER_ID, primary: PAINT_QUESTION_ID, prefix: 'set3-q' },
      { id: DESIGN_PAPER_ID, primary: 'design-set3-q1', prefix: 'design-set3-q' },
    ]
    for (const paper of papers) {
      for (const suffix of ['json', 'en.json', 'zh-Hans.json']) {
        const file = `src/content/${paper.id}.${suffix}`
        const body = JSON.parse(read(file)) as { id: string; primaryQuestionId: string; questions: PaperQuestion[] }
        assert.equal(body.id, paper.id, file)
        assert.equal(body.primaryQuestionId, paper.primary, file)
        assert.deepEqual(
          body.questions.map((q) => q.id),
          [1, 2, 3, 4, 5].map((n) => `${paper.prefix}${n}`),
          file,
        )
        const open = body.questions.filter((q) => isPracticeQuestionOpen(q, body.primaryQuestionId))
        assert.deepEqual(open.map((q) => q.number), [1], file)
        assert.deepEqual(
          body.questions.filter((q) => !isPracticeQuestionOpen(q, body.primaryQuestionId)).map((q) => q.number),
          [2, 3, 4, 5],
          file,
        )
      }
    }
  })
})

describe('practice guest draft', () => {
  it('does not copy a signed-out draft onto an account unless Keep is chosen', () => {
    installStorage()
    const guest = emptyPracticeDraft(PAINT_PAPER_ID)
    guest.questions[PAINT_QUESTION_ID] = { ...emptyQuestionDraft(), responses: { 'part-a:D': 'guest notes' } }
    const account = emptyPracticeDraft(PAINT_PAPER_ID)
    account.questions[PAINT_QUESTION_ID] = { ...emptyQuestionDraft(), statement: 'already mine' }
    savePracticeDraft(null, guest)
    savePracticeDraft('student-a', account)

    assert.equal(hasUnclaimedGuestDraft(), true)
    const later = applyGuestDraftChoice('student-a', 'later')
    assert.equal(later.questions[PAINT_QUESTION_ID]?.statement, 'already mine')
    assert.equal(later.questions[PAINT_QUESTION_ID]?.responses['part-a:D'], undefined)
    assert.equal(loadPracticeDraft(null, PAINT_PAPER_ID).questions[PAINT_QUESTION_ID]?.responses['part-a:D'], 'guest notes')

    const discarded = applyGuestDraftChoice('student-a', 'discard')
    assert.equal(discarded.questions[PAINT_QUESTION_ID]?.statement, 'already mine')
    assert.equal(isPracticeDraftBlank(loadPracticeDraft(null, PAINT_PAPER_ID)), true)
    assert.equal(hasUnclaimedGuestDraft(), false)

    savePracticeDraft(null, guest)
    const accountDesign = emptyPracticeDraft(DESIGN_PAPER_ID)
    accountDesign.questions['design-set3-q1'] = { ...emptyQuestionDraft(), statement: 'design mine' }
    savePracticeDraft('student-a', accountDesign)
    const kept = applyGuestDraftChoice('student-a', 'keep')
    assert.equal(kept.questions[PAINT_QUESTION_ID]?.responses['part-a:D'], 'guest notes')
    assert.equal(isPracticeDraftBlank(loadPracticeDraft(null, PAINT_PAPER_ID)), true)
    assert.equal(loadPracticeDraft('student-b', PAINT_PAPER_ID).questions[PAINT_QUESTION_ID], undefined)
    assert.equal(loadPracticeDraft('student-a', DESIGN_PAPER_ID).questions['design-set3-q1']?.statement, 'design mine')
  })

  it('migrates a v1 draft onto the painting question and leaves the design paper blank', () => {
    installStorage()
    localStorage.setItem(
      `${PRACTICE_DRAFT_V1_PREFIX}guest`,
      JSON.stringify({
        version: 1,
        responses: { 'part-a:D': 'kept notes' },
        checks: { d1: true },
        paper2Checks: { 'p2-c1': true },
        statement: 'painting statement',
        uploadNames: { artwork_image: 'work.png' },
        revealed: true,
        submittedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    )
    const paint = loadPracticeDraft(null, PAINT_PAPER_ID)
    const slot = paint.questions[PAINT_QUESTION_ID]
    assert.ok(slot)
    assert.equal(slot.responses['part-a:D'], 'kept notes')
    assert.equal(slot.checks.d1, true)
    assert.equal(slot.partBChecks['p2-c1'], true)
    assert.equal(slot.statement, 'painting statement')
    assert.equal(slot.uploadNames.artwork_image, 'work.png')
    assert.equal(slot.revealed, true)
    assert.equal(slot.submittedAt, '2026-01-01T00:00:00.000Z')
    assert.equal(localStorage.getItem(`${PRACTICE_DRAFT_V1_PREFIX}guest`), null)

    const design = loadPracticeDraft(null, DESIGN_PAPER_ID)
    assert.equal(isPracticeDraftBlank(design), true)
    assert.equal(design.questions[PAINT_QUESTION_ID], undefined)
    assert.equal(design.paperId, DESIGN_PAPER_ID)
    assert.notEqual(design.questions[PAINT_QUESTION_ID]?.statement, 'painting statement')
  })
})

describe('practice paper boundaries', () => {
  it('keeps English source fields in English and labels the paper as a school mock', () => {
    const cjk = /[\u3400-\u9fff]/
    for (const file of ['src/content/paint-set3.en.json', 'src/content/design-set3.en.json']) {
      const paper = JSON.parse(read(file)) as { source: string; examNote?: string }
      assert.equal(cjk.test(paper.source), false, file)
      assert.match(paper.source, /not an HKEAA paper/)
    }
    const zh = JSON.parse(read('src/content/paint-set3.zh-Hans.json')) as { source: string }
    assert.equal(zh.source.includes('模擬'), false)
    const hant = JSON.parse(read('src/content/paint-set3.json')) as { examNote: string }
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

const LOCALE_LOCK = {
  'zh-Hant': {
    'practice.paperPaint': '畫畫卷（視覺形式表達）',
    'practice.paperPaintShort': '畫畫卷',
    'practice.paperDesign': '設計卷',
    'practice.paper1': '畫畫卷（視覺形式表達）',
    'practice.paper2': '設計卷',
    'practice.partA': '甲部 · 評賞',
    'practice.partB': '乙部 · 創作',
    'practice.openPartB': '前往本卷乙部創作',
    'practice.partBNote': '乙部創作在本卷內：核對清單、撰寫作品自述，並使用上載位置。',
    'map.media.legend': '畫畫卷（視覺形式表達）必須交平面作品。設計卷按題目要求交件。SBA 可以用任何媒介，包括立體。',
    'app.practice.subtitle': '校內模擬練習 · 畫畫卷／設計卷 · 目前每卷只開放第 1 題',
    'practice.designStubNote': '設計卷骨架：甲部評賞同乙部創作結構已齊。完整圖版同其他題稍後開放。',
  },
  'zh-Hans': {
    'practice.paperPaint': '画画卷（视觉形式表达）',
    'practice.paperPaintShort': '画画卷',
    'practice.paperDesign': '设计卷',
    'practice.paper1': '画画卷（视觉形式表达）',
    'practice.paper2': '设计卷',
    'practice.partA': '甲部 · 评赏',
    'practice.partB': '乙部 · 创作',
    'practice.openPartB': '前往本卷乙部创作',
    'practice.partBNote': '乙部创作在本卷内：核对清单、撰写作品自述，并使用上传位置。',
    'map.media.legend': '画画卷（视觉形式表达）必须交平面作品。设计卷按题目要求交件。SBA 可以用任何媒介，包括立体。',
    'app.practice.subtitle': '校内模拟练习 · 画画卷／设计卷 · 目前每卷只开放第 1 题',
    'practice.designStubNote': '设计卷骨架：甲部评赏和乙部创作结构已齐。完整图版和其他题稍后开放。',
  },
  en: {
    'practice.paperPaint': 'Painting paper (visual form)',
    'practice.paperPaintShort': 'Painting paper',
    'practice.paperDesign': 'Design paper',
    'practice.paper1': 'Painting paper (visual form)',
    'practice.paper2': 'Design paper',
    'practice.partA': 'Part A · Criticism',
    'practice.partB': 'Part B · Creation',
    'practice.openPartB': 'Go to Part B creation on this paper',
    'practice.partBNote': 'Part B creation is on this paper: checklist, artist statement, and upload slots.',
    'map.media.legend': 'Painting paper (visual form) must be flat work. Design paper follows the question. SBA can use any medium, including 3D.',
    'app.practice.subtitle': 'School mock practice · painting and design papers · only Question 1 is open on each paper',
    'practice.designStubNote': 'Design paper skeleton: Part A criticism and Part B creation are in place. Full plates and other questions come later.',
  },
} as const

describe('practice paper split', () => {
  it('locks the twelve locale strings and keeps the practice disclaimers', () => {
    const banned = /卷一|卷二|Paper 1|Paper 2/
    for (const locale of Object.keys(LOCALE_LOCK) as (keyof typeof LOCALE_LOCK)[]) {
      const bag = messages(`src/i18n/${locale}.json`)
      for (const [key, value] of Object.entries(LOCALE_LOCK[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.equal(banned.test(value), false, `${locale} ${key}`)
      }
    }
    const hant = messages('src/i18n/zh-Hant.json')
    assert.equal(hant['practice.noAi'], '不設 AI 評分')
    assert.equal(hant['practice.notAiMarking'], '本卷只有自我檢查與評分參考，沒有 AI 試改。')
    assert.equal(hant['qtype.practiceOnly'], '練習結構 · 唔係真題')
    assert.equal(hant['island.chip.sba'], 'SBA 實驗室')
    assert.equal(hant['island.chip.exam'], '應試練習場')
    assert.equal(hant['atlas.card.compare.title'], '藝術評賞比較')
  })

  it('gives each paper Part A criticism and Part B creation, with no fake second paper', () => {
    for (const name of ['paper1-set3', 'paper2-set3']) {
      for (const suffix of ['json', 'en.json', 'zh-Hans.json']) {
        assert.equal(existsSync(join(root, 'src/content', `${name}.${suffix}`)), false, name)
      }
    }
    const labels = {
      'paint-set3.json': '畫畫卷（視覺形式表達）模擬練習卷',
      'paint-set3.en.json': 'Painting paper (visual form) mock practice',
      'paint-set3.zh-Hans.json': '画画卷（视觉形式表达）模拟练习卷',
      'design-set3.json': '設計卷模擬練習卷',
      'design-set3.en.json': 'Design paper mock practice',
      'design-set3.zh-Hans.json': '设计卷模拟练习卷',
    }
    for (const [file, paperLabel] of Object.entries(labels)) {
      const raw = read(`src/content/${file}`)
      assert.equal(raw.includes('linkedPaper2Id'), false, file)
      assert.equal(/卷一|卷二|Paper 1|Paper 2/.test(raw), false, file)
      const paper = JSON.parse(raw) as {
        label: string
        paperLabel: string
        questions: { id: string; status: string; parts: { id: string; key: string; marks: number; prompt?: string; checklist?: unknown[]; theme?: string }[] }[]
      }
      assert.equal(paper.paperLabel, paperLabel, file)
      assert.match(paper.label, /模擬練習卷|模拟练习卷|Mock practice paper/)
      for (const question of paper.questions) {
        const criticism = question.parts.find((part) => part.id === 'part-a' && part.key === 'criticism')
        const creation = question.parts.find((part) => part.id === 'part-b' && part.key === 'creation')
        assert.ok(criticism, `${file} ${question.id} part-a`)
        assert.ok(creation, `${file} ${question.id} part-b`)
        assert.equal(criticism?.marks, 20)
        assert.equal(creation?.marks, 80)
      }
      const q1 = paper.questions[0]
      if (file.startsWith('design-set3')) {
        assert.equal(q1.status, 'complete')
        assert.ok(q1.parts[0].prompt && q1.parts[0].prompt.length > 0, `${file} text stub`)
        assert.ok((q1.parts[1].checklist?.length ?? 0) > 0, `${file} creation skeleton`)
      }
      if (file.startsWith('paint-set3')) {
        assert.equal(q1.id, 'set3-q1')
        assert.ok(q1.parts[1].theme)
      }
    }
  })

  it('keeps Part B on this paper in the practice screen', () => {
    const ui = read('src/components/PracticePapers.tsx')
    const content = read('src/lib/practiceContent.ts')
    assert.match(ui, /practice\.paperPaint/)
    assert.match(ui, /practice\.paperPaintShort/)
    assert.match(ui, /practice\.paperDesign/)
    assert.match(ui, /practice\.partB/)
    assert.match(ui, /practice\.designStubNote/)
    assert.match(ui, /data-part-b-open/)
    assert.match(ui, /creation\.label \?\? t\('practice\.partB'\)/)
    assert.equal(ui.includes('data-paper2-open'), false)
    assert.equal(ui.includes('practice.paper2'), false)
    assert.equal(ui.includes('linkedPaper2Id'), false)
    assert.equal(/setWhich\(/.test(ui.replace(/setWhich\(tab\.id\)/, '')), false)
    assert.match(content, /function loadPaintPaper/)
    assert.match(content, /function loadDesignPaper/)
    assert.equal(content.includes('function loadPaper1'), false)
    assert.equal(content.includes('function loadPaper2'), false)
    assert.equal(content.includes('Paper2File'), false)
  })

  it('keeps the practice-paper split scout bytes', () => {
    for (const [name, hex] of Object.entries(PRACTICE_SPLIT_SHA256)) {
      const bytes = readFileSync(
        join(root, 'public/content/learning-map-illustrations/soft-scout/practice-papers-split-paint-design-2611', name),
      )
      const hash = createHash('sha256').update(bytes).digest('hex')
      assert.equal(hash, hex, name)
      assert.equal(hash.startsWith(hex.slice(0, 12)), true, name)
    }
  })
})
