import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  HISTORY_QUEST_ANSWER,
  historyQuestFeedback,
  ISLAND_QUEST_ANSWER,
  islandKeepsLesson,
  islandNodeState,
  islandQuestFeedback,
  softIslandFromSearch,
  softPlateFromSearch,
} from './softIslands.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const PLATE = {
  'zh-Hant': {
    'island.home.title': '「五大冒險島」',
    'island.home.sub': '選島探索',
    'island.start': '揀島開始',
    'island.start.note': '{name} · 可再試',
    'island.map.heading': '地圖 · {name}',
    'island.map.sub': '選島 · 地圖路徑',
    'island.chip.all': '全部',
    'island.chip.history': '藝術史對決',
    'island.chip.research': '一手研究局',
    'island.chip.critique': '評賞迷宮',
    'island.chip.sba': 'SBA 實驗室',
    'island.chip.exam': '應試練習場',
    'island.short.history': '藝術史',
    'island.short.research': '研究',
    'island.short.critique': '評賞',
    'island.short.sba': 'SBA 實驗室',
    'island.short.exam': '應試練習場',
    'island.quest.tag': '藝術史 · 視覺解難',
    'island.quest.title': '借鑑筆觸，唔抄畫面',
    'island.quest.sub': '約 3 分鐘微關 · 可再試',
    'island.quest.tipTitle': '小提示',
    'island.quest.tip': '呂壽琨常用大面積留白同焦墨；梵高常用急促交錯筆觸同互補色。重點係「點解決情緒」，唔係臨摹成幅畫。',
    'island.quest.q': '如果想表達「壓抑入面想透氣」，邊個做法較似個人轉化？',
    'island.quest.a': '把《星夜》整幅貼上，再加一朵荷花。',
    'island.quest.b': '急促筆觸寫焦慮，再留白同單點高彩度留出喘息位。',
    'island.quest.c': '抄兩位畫家生平同出生年份。',
    'island.quest.ok': '做得好——你攞走嘅係解難方法，唔係表面拼貼。',
    'island.quest.gain': '＋1 學習點',
    'island.quest.check': '檢查',
    'island.quest.choice': '選擇',
    'island.quest.skill': '視覺解難',
  },
  en: {
    'island.start.note': '{name} · Try again',
    'island.map.sub': 'Islands · Map path',
    'island.chip.sba': 'SBA lab',
    'island.chip.exam': 'Exam skills',
    'island.short.sba': 'SBA lab',
    'island.short.exam': 'Exam skills',
    'island.quest.sub': '~3 min quest · Try again',
    'island.quest.check': 'Check',
    'island.quest.gain': '+1 learning point',
  },
  'zh-Hans': {
    'island.start.note': '{name} · 可再试',
    'island.map.sub': '选岛 · 地图路径',
    'island.chip.sba': 'SBA 实验室',
    'island.chip.exam': '应试练习场',
    'island.short.sba': 'SBA 实验室',
    'island.short.exam': '应试练习场',
    'island.quest.check': '检查',
    'island.quest.gain': '＋1 学习点',
    'island.quest.title': '借鉴笔触，不抄画面',
    'island.quest.sub': '约 3 分钟微关 · 可再试',
  },
} as const

const BANNED = ['真題', '真题', '奪星', '夺星', '競技場', '竞技场', 'HKEAA', '考評局', '考评局', 'FOMO', 'streak', 'hearts', 'gems', 'XP', '經驗值', '经验值', '領取', '领取', '3★']

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

describe('soft island plates', () => {
  it('keeps the main path on 全部 and only the history line on 藝術史', () => {
    assert.equal(islandKeepsLesson('all', 'U1-L1'), true)
    assert.equal(islandKeepsLesson('history', 'U1-L1'), true)
    assert.equal(islandKeepsLesson('research', 'U1-L1'), false)
    assert.equal(islandKeepsLesson('critique', 'U1-L1'), false)
    assert.equal(islandKeepsLesson('sba', 'U1-L1'), false)
    assert.equal(islandKeepsLesson('exam', 'U1-L1'), false)
    assert.equal(HISTORY_QUEST_ANSWER, 1)
    assert.equal(historyQuestFeedback(1), 'island.quest.ok')
    assert.equal(historyQuestFeedback(0), 'island.quest.missA')
    assert.equal(historyQuestFeedback(2), 'island.quest.missC')
    assert.equal(softIslandFromSearch(''), 'history')
    assert.equal(softIslandFromSearch('?island=all'), 'all')
    assert.equal(softIslandFromSearch('?island=exam'), 'exam')
    assert.equal(softIslandFromSearch('?island=atlas'), 'history')
    assert.equal(softPlateFromSearch(''), 'home')
    assert.equal(softPlateFromSearch('?plate=path'), 'path')
    assert.equal(softPlateFromSearch('?plate=quest'), 'quest')
    assert.equal(softPlateFromSearch('?ux=map1'), 'home')
    assert.equal(softPlateFromSearch('?plate=focus'), 'focus')
    assert.equal(islandNodeState('history', 'research'), 'done')
    assert.equal(islandNodeState('research', 'research'), 'progress')
    assert.equal(islandNodeState('critique', 'research'), 'later')
    assert.equal(islandNodeState('sba', 'all'), 'progress')
    assert.equal(islandNodeState('exam', 'all'), 'progress')
    assert.equal(ISLAND_QUEST_ANSWER, 1)
    assert.equal(islandQuestFeedback('research', 1), 'island.mq.research.ok')
    assert.equal(islandQuestFeedback('critique', 0), 'island.mq.critique.missA')
    assert.equal(islandQuestFeedback('sba', 2), 'island.mq.sba.missC')
    assert.equal(islandQuestFeedback('exam', 1), 'island.mq.exam.ok')
  })

  it('matches the Soft QA plate copy and the name lock', () => {
    const files = {
      'zh-Hant': 'src/i18n/zh-Hant.json',
      en: 'src/i18n/en.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = messages(files[locale])
      for (const [key, value] of Object.entries(PLATE[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      for (const key of Object.keys(bag).filter((item) => item.startsWith('island.'))) {
        for (const banned of BANNED) assert.equal(bag[key].includes(banned), false, `${locale} ${key} ${banned}`)
        assert.equal(/\bSoft\b/.test(bag[key]), false, `${locale} ${key} Soft`)
      }
    }
    for (const file of ['src/i18n/zh-Hant.json', 'src/i18n/zh-Hans.json', 'src/i18n/zh-Hans.overrides.json', 'src/i18n/en.json']) {
      const bag = messages(file)
      for (const [key, value] of Object.entries(bag)) {
        assert.equal(/\bSoft\b/.test(value), false, `${file} ${key}`)
      }
    }
  })

  it('wires the three plates on the map1 shell and leaves celebrate and the tray alone', () => {
    const map = read('src/components/game/LearningMap.tsx')
    const home = read('src/components/game/SoftIslandChrome.tsx')
    const quest = read('src/components/game/SoftHistoryQuest.tsx')
    const illu = read('src/components/game/SoftIllustrationMap.tsx')
    const focus = read('src/components/game/SoftIslandFocus.tsx')
    const micro = read('src/components/game/SoftIslandQuest.tsx')
    const plates = `${home}\n${quest}`
    const added = `${illu}\n${focus}\n${micro}\n${map}`
    assert.match(map, /data-map-shell="one"/)
    assert.match(map, /MapQuest/)
    assert.equal(map.includes('SoftIllustrationMap'), false)
    assert.equal(map.includes('SoftMapPicker'), false)
    assert.match(map, /HistoryTrack/)
    assert.match(map, /shell === 'atlas'/)
    assert.equal(map.includes('SoftIslandHome'), false)
    assert.match(home, /data-soft-plate="home"/)
    assert.match(home, /data-soft-plate="path"/)
    assert.match(home, /data-history-node/)
    assert.match(quest, /data-soft-plate="quest"/)
    assert.match(quest, /island\.quest\.check/)
    assert.match(quest, /data-soft-gain/)
    assert.match(illu, /data-illu-map/)
    assert.match(illu, /data-island-node/)
    assert.match(focus, /data-island-start/)
    assert.match(focus, /island\.focus\.start/)
    assert.match(micro, /data-island-quest/)
    assert.match(micro, /island\.mq\.check/)
    assert.match(micro, /data-soft-gain/)
    assert.match(micro, /data-exam-form/)
    assert.equal(quest.includes('finishLesson'), false)
    assert.equal(micro.includes('finishLesson'), false)
    assert.equal(quest.includes('SoftMotion'), false)
    assert.equal(home.includes('SoftMotion'), false)
    assert.equal(illu.includes('SoftMotion'), false)
    assert.equal(focus.includes('SoftMotion'), false)
    assert.equal(micro.includes('SoftMotion'), false)
    assert.equal(home.includes('moods/motion-v2'), false)
    assert.equal(added.includes('animate-'), false)
    for (const banned of ['真題', '奪星', 'HKEAA', 'FOMO', 'streak', 'hearts', 'gems', '經驗值', 'atlas', '雙圖對讀']) {
      assert.equal(plates.includes(banned), false, banned)
    }
    for (const banned of ['真題', '奪星', '競技場', 'HKEAA', 'FOMO', 'streak', 'hearts', 'gems', '經驗值', 'claim', '雙圖對讀']) {
      assert.equal(added.includes(banned), false, banned)
    }
    assert.equal(/\bXP\b/.test(`${map}\n${plates}\n${added}`), false)
    const hant = messages('src/i18n/zh-Hant.json')
    assert.equal(hant['island.illu.title'], '選島 · 地圖路徑')
    assert.equal(hant['island.illu.sub'], '五大冒險島 · 插圖路徑')
    assert.equal(hant['island.focus.start'], '開始')
    assert.equal(hant['island.short.exam'], '應試練習場')
    assert.equal(hant['island.short.sba'], 'SBA 實驗室')
    assert.equal(hant['island.chip.sba'], 'SBA 實驗室')
    assert.equal(hant['island.chip.exam'], '應試練習場')
    assert.equal(hant['island.exam.form'], '雙圖對讀')
    assert.equal(hant['island.mq.research.title'], '邊組先算一手證據？')
    assert.equal(hant['island.mq.critique.b'], '用低明度、低彩度冷色，配合急促交錯筆觸，構圖逼近，加強壓抑感。')
    assert.equal(hant['island.mq.sba.b'].includes('熱熔膠'), true)
    assert.equal(hant['island.mq.exam.b'].includes('負空間'), true)
    assert.equal(hant['island.node.later'], '稍後開放')
  })
})
