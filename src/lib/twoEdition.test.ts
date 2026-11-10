import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { CLASSIC_GRADE_UNITS, QUEST_ART_UNITS, QUEST_MEDIA_UNITS } from './softGoMaps.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const CUT = ['U11-EXHIBIT-REVIEW', 'F5-U6-PORTFOLIO', 'F6-U6-MUSEUM'] as const

const FIND = '\u6435'

const LOCK = {
  'f4-demo.json': {
    intro:
      '對齊 F.4 社區觀察、每週視覺日記、同「同社區相關嘅設計／創作」。學習由日常環境嘅相片、物件或教師提供嘅材料，在課室變成主題種子；連繫香港藝術家對日常空間嘅關注。唔要求外出或參觀展覽。（內容待老師審閱）',
    title: `社區觀察：由環境${FIND}主題`,
    card0: '課堂觀察：用教師提供或已有嘅相片、短片、物件、速寫，在課室記錄環境同學習。唔要求外出或參觀展覽。',
    quiz: '課堂觀察嘅材料可以包括？',
    correct: '教師提供或已有嘅相片、短片、物件、速寫',
    wrong: '必須外出／導賞',
    insight: '由課堂觀察材料拎「洞察」：一件你以前冇留意、但同社區有關嘅細節。',
  },
  'f4-demo.zh-Hans.json': {
    intro:
      '对齐 F.4 社区观察、每周视觉日记，以及「与社区相关的设计／创作」。学习用日常环境的照片、物件或教师提供的材料，在课室变成主题种子；连系香港艺术家对日常空间的关注。不要求外出或参观展览。（内容待老师审阅）',
    title: '社区观察：由环境找主题',
    card0: '课堂观察：用教师提供或已有的照片、短片、物件、速写，在课室记录环境与学习。不要求外出或参观展览。',
    quiz: '课堂观察的材料可以包括？',
    correct: '教师提供或已有的照片、短片、物件、速写',
    wrong: '必须外出／导赏',
    insight: '由课堂观察材料拿「洞察」：一件你以前没留意、但与社区有关的细节。',
  },
  'f4-demo.en.json': {
    intro:
      'Aligns with F.4 community observation, the weekly visual diary, and community-related design／making. Students use photos, objects, or teacher-provided materials in class to grow theme seeds, linking to how Hong Kong artists attend to everyday space. No outing or exhibition visit is required. (Pending teacher review)',
    title: 'Community observation: finding a theme from the environment',
    card0:
      'Classroom observation: use teacher-provided or already available photos, clips, objects, or sketches in class to record the environment and your learning. No outing or exhibition visit is required.',
    quiz: 'What can classroom observation materials include?',
    correct: 'Photos, clips, objects, or sketches provided by the teacher or already available',
    wrong: 'You must go on an outing or a guided tour',
    insight: 'From classroom observation materials, take one insight: a community-related detail you had not noticed before.',
  },
} as const

type Quiz = { type: string; question: string; options?: string[]; answer?: string }
type Card = string | { body?: string }
type Lesson = { id: string; title: string; cards: Card[]; quiz: Quiz[] }
type Unit = { id: string; title: string; intro?: string; lessons: Lesson[] }

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function pack(name: string): { units: Unit[] } {
  return JSON.parse(read(`src/content/${name}`)) as { units: Unit[] }
}

function cardText(card: Card): string {
  return typeof card === 'string' ? card : (card.body ?? '')
}

describe('two-edition thin slice', () => {
  it('keeps the quest and classic hang lists thin and off the exhibition unit', () => {
    assert.deepEqual(QUEST_ART_UNITS, ['U1-CN-MODERN'])
    assert.deepEqual(QUEST_MEDIA_UNITS, ['M1-PAINTING'])
    assert.deepEqual(CLASSIC_GRADE_UNITS.f5, ['U6-MQ-WUMEN'])
    assert.deepEqual(CLASSIC_GRADE_UNITS.f6, ['U7-SELF-HERITAGE'])
    const hung = [...QUEST_ART_UNITS, ...QUEST_MEDIA_UNITS, ...CLASSIC_GRADE_UNITS.f5, ...CLASSIC_GRADE_UNITS.f6]
    for (const id of CUT) assert.equal(hung.includes(id), false, id)
  })

  it('drops the exhibition units from the student content banks', () => {
    const files = [
      'art-history-map.json',
      'art-history-map.en.json',
      'art-history-map.zh-Hans.json',
      'media-intro.json',
      'media-intro.en.json',
      'media-intro.zh-Hans.json',
      'f4-demo.json',
      'f4-demo.en.json',
      'f4-demo.zh-Hans.json',
    ]
    for (const name of files) {
      const blob = read(`src/content/${name}`)
      for (const id of CUT) assert.equal(blob.includes(id), false, `${name} ${id}`)
    }
    const history = pack('art-history-map.json')
    assert.equal(history.units.some((unit) => unit.id === 'U1-CN-MODERN'), true)
    assert.equal(history.units.some((unit) => unit.id === 'U6-MQ-WUMEN'), true)
    assert.equal(history.units.some((unit) => unit.id === 'U7-SELF-HERITAGE'), true)
    const u1 = history.units.find((unit) => unit.id === 'U1-CN-MODERN')
    const u6 = history.units.find((unit) => unit.id === 'U6-MQ-WUMEN')
    const u7 = history.units.find((unit) => unit.id === 'U7-SELF-HERITAGE')
    const l1 = u1?.lessons.find((lesson) => lesson.id === 'U1-L1')
    assert.equal(l1?.title, '嶺南畫派的革新')
    assert.equal(l1?.quiz[0]?.type, 'mcq')
    assert.equal(l1?.quiz[0]?.question.includes('二高一陳'), true)
    assert.ok((u6?.lessons[0]?.quiz.length ?? 0) > 0)
    assert.ok((u7?.lessons[0]?.quiz.length ?? 0) > 0)
    const media = pack('media-intro.json')
    const m1 = media.units.find((unit) => unit.id === 'M1-PAINTING')
    const paint = m1?.lessons.find((lesson) => lesson.id === 'M1-L1')
    assert.equal(paint?.title, '顏料同工具：點樣開始')
    assert.equal(paint?.quiz[0]?.type, 'mcq')
    assert.equal(paint?.quiz[0]?.question.includes('壓克力'), true)
  })

  it('rewrites F4-U3 outing copy in all three locales and keeps the short name', () => {
    for (const [name, lock] of Object.entries(LOCK)) {
      const unit = pack(name).units.find((item) => item.id === 'F4-U3-COMMUNITY')
      assert.ok(unit, name)
      assert.equal(unit.intro, lock.intro, name)
      assert.equal(unit.title.includes('導賞') || unit.title.includes('导赏') || /tour/i.test(unit.title), false, name)
      const l2 = unit.lessons.find((lesson) => lesson.id === 'F4-U3-L2')
      const l3 = unit.lessons.find((lesson) => lesson.id === 'F4-U3-L3')
      assert.equal(l2?.title, lock.title, name)
      assert.equal(cardText(l2!.cards[0]), lock.card0, name)
      assert.equal(l2?.coverImage?.endsWith('F4-U3-L2.png'), true, name)
      const quiz = l2?.quiz[0]
      assert.equal(quiz?.question, lock.quiz, name)
      assert.equal(quiz?.answer, lock.correct, name)
      assert.equal(quiz?.answer === lock.wrong, false, name)
      assert.equal(quiz?.options?.includes(lock.wrong), true, name)
      const insight = l3?.cards.map(cardText).find((text) => text.includes(lock.insight.slice(0, 8)))
      assert.equal(insight, lock.insight, name)
      const blob = JSON.stringify(unit)
      const outside = blob.split(lock.wrong).join('')
      for (const word of ['導賞', '导赏', '走訪', '走访', 'tour', 'Tour']) {
        assert.equal(outside.includes(word), false, `${name} ${word}`)
      }
    }
    const hantTitle = LOCK['f4-demo.json'].title
    assert.equal(hantTitle.includes(FIND), true)
    assert.equal(hantTitle.codePointAt(hantTitle.indexOf(FIND)), 0x6435)
  })

  it('mounts the training and year chips without scout annotations', () => {
    const surface = [
      'src/components/game/LearningMap.tsx',
      'src/components/game/QuestTraining.tsx',
      'src/components/game/ClassicGrades.tsx',
    ]
      .map(read)
      .join('\n')
    assert.match(surface, /QuestTraining/)
    assert.match(surface, /ClassicGrades/)
    assert.match(surface, /data-quest-training/)
    assert.match(surface, /data-map-grade/)
    assert.match(surface, /data-classic-unit/)
    assert.match(surface, /MapQuest/)
    assert.equal(read('src/components/game/LearningMap.tsx').includes('<QuestTraining'), false)
    assert.equal(read('src/components/game/QuestTraining.tsx').includes('[id, true]'), false)
    assert.equal(surface.includes('SoftMapPicker'), false)
    for (const banned of ['ux.map1', 'ux.classic', '拎走', '守則', '唔一次搬晒', 'P0 各', '拔走', '拆走']) {
      assert.equal(surface.includes(banned), false, banned)
    }
    const hant = JSON.parse(read('src/i18n/zh-Hant.json')) as Record<string, string>
    assert.equal(hant['map.f4.chrome.u3'], '社區藝術視覺日記')
    assert.equal(hant['ux.map1'], '闖關地圖')
    assert.equal(hant['map.train.art'], '藝術史訓練')
    assert.equal(hant['map.train.media'], '媒介入門訓練')
    assert.equal(hant['map.grade.f5'], '中五')
    assert.equal(hant['map.grade.f6'], '中六')
    assert.equal(hant['ux.map1'].includes('\u95D6\u95DC'), true)
  })
})
