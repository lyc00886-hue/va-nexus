import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { atlasCard, atlasCardsFor, ATLAS_CARDS, softShellFromSearch } from './softAtlas.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const COPY = {
  'zh-Hant': {
    'atlas.title': '大師卡牌圖鑑',
    'atlas.sub': '藝術史／研究／評賞',
    'atlas.chip.all': '全部',
    'atlas.chip.history': '藝術史',
    'atlas.chip.research': '研究',
    'atlas.chip.critique': '評賞',
    'atlas.chip.sba': 'SBA 實驗室',
    'atlas.chip.exam': '應試練習場',
    'atlas.unlocked': '已解鎖',
    'atlas.locked': '稍後開放',
    'atlas.related': '相關卡牌',
    'atlas.note': '教育圖鑑 · 慢慢讀解難方法',
    'atlas.card.lingnan.title': '嶺南畫派',
    'atlas.card.lingnan.tip': '撞水撞粉同折衷中西——睇點樣用濕潤過渡解決空氣感。傳統筆墨 × 西方透視／光影。\n慢慢讀就得——重點係解難方法，唔使一次記晒。',
    'atlas.card.expression.title': '表現主義',
    'atlas.card.feldman.title': '費德曼四步',
    'atlas.card.observe.title': '一手觀察',
    'atlas.card.sketch.title': '草圖捨棄',
    'atlas.card.compare.title': '雙圖對讀',
    'atlas.card.compare.sub': '應試・練習',
    'atlas.nav.map': '地圖',
    'atlas.nav.path': '闖關',
    'atlas.nav.atlas': '圖鑑',
    'atlas.nav.mine': '我的',
  },
  en: {
    'atlas.chip.sba': 'SBA lab',
    'atlas.chip.exam': 'Exam skills',
    'atlas.card.compare.title': 'Read two works',
    'atlas.card.compare.sub': 'Exam · practice',
    'atlas.locked': 'Later',
    'atlas.unlocked': 'Unlocked',
    'atlas.nav.atlas': 'Atlas',
  },
  'zh-Hans': {
    'atlas.chip.sba': 'SBA 实验室',
    'atlas.chip.exam': '应试练习场',
    'atlas.card.compare.title': '双图对读',
    'atlas.card.compare.sub': '应试・练习',
    'atlas.card.lingnan.tip': '撞水撞粉和折衷中西——看怎样用湿润过渡解决空气感。传统笔墨 × 西方透视／光影。\n慢慢读就好——重点是解题方法，不用一次记完。',
    'atlas.card.feldman.title': '费德曼四步',
    'atlas.locked': '稍后开放',
    'atlas.related': '相关卡牌',
    'atlas.mine.body': '学习记录留在这台设备。',
  },
} as const

const BANNED = [
  '真題',
  '真题',
  '應試對讀',
  '应试对读',
  '真題對讀',
  '真题对读',
  'HKEAA',
  '考評局',
  '考评局',
  '奪星',
  '夺星',
  'FOMO',
  'streak',
  'hearts',
  'gems',
  'claim',
  '領取',
  '领取',
  '3★',
  'SEN',
  '5**',
  '降分',
  '經驗值',
  '经验值',
  '寶石',
  '宝石',
  '稀有',
]

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

describe('soft atlas cards', () => {
  it('locks 雙圖對讀 on the exam topic and keeps the other five cards', () => {
    assert.deepEqual(
      ATLAS_CARDS.map((card) => card.id),
      ['lingnan', 'expression', 'feldman', 'observe', 'sketch', 'compare'],
    )
    const compare = atlasCard('compare')
    assert.equal(compare.locked, true)
    assert.equal(compare.category, 'exam')
    assert.equal(compare.tip, undefined)
    assert.equal(atlasCard('lingnan').locked, false)
    assert.equal(atlasCard('expression').locked, false)
    assert.equal(atlasCard('feldman').locked, false)
    assert.equal(atlasCard('observe').locked, true)
    assert.equal(atlasCard('sketch').locked, true)
    assert.deepEqual(atlasCardsFor('all').map((card) => card.id), ATLAS_CARDS.map((card) => card.id))
    assert.deepEqual(atlasCardsFor('exam').map((card) => card.id), ['compare'])
    assert.deepEqual(atlasCardsFor('history').map((card) => card.id), ['lingnan', 'expression'])
    assert.deepEqual(atlasCardsFor('critique').map((card) => card.id), ['feldman'])
    assert.deepEqual(atlasCardsFor('research').map((card) => card.id), ['observe'])
    assert.deepEqual(atlasCardsFor('sba').map((card) => card.id), ['sketch'])
    assert.deepEqual(atlasCard('lingnan').related, ['expression', 'feldman', 'observe'])
    assert.equal(softShellFromSearch('?ux=map1'), 'map')
    assert.equal(softShellFromSearch('?shell=atlas'), 'atlas')
    assert.equal(softShellFromSearch('?shell=path'), 'path')
    assert.equal(softShellFromSearch('?shell=mine'), 'mine')
    assert.equal(softShellFromSearch('?shell=shop'), 'map')
  })

  it('matches the Soft atlas copy and keeps shop language out', () => {
    const files = {
      'zh-Hant': 'src/i18n/zh-Hant.json',
      en: 'src/i18n/en.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = messages(files[locale])
      for (const [key, value] of Object.entries(COPY[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      assert.match(bag['atlas.card.lingnan.tip'], locale === 'zh-Hans' ? /慢慢读就好/ : /慢慢讀就得|Read slowly/)
      for (const key of Object.keys(bag).filter((item) => item.startsWith('atlas.'))) {
        for (const banned of BANNED) assert.equal(bag[key].includes(banned), false, `${locale} ${key} ${banned}`)
        assert.equal(/\bSoft\b/i.test(bag[key]), false, `${locale} ${key} Soft`)
        assert.equal(/\bXP\b/.test(bag[key]), false, key)
      }
    }
    const hant = messages('src/i18n/zh-Hant.json')
    assert.match(hant['atlas.card.lingnan.tip'], /慢慢讀就得/)
    assert.equal(hant['atlas.card.compare.sub'].includes('對讀'), false)
  })

  it('opens the atlas from the map shell and leaves celebrate, tray, islands, and the quest alone', () => {
    const map = read('src/components/game/LearningMap.tsx')
    const atlas = read('src/components/game/SoftAtlas.tsx')
    const islands = read('src/components/game/SoftIslandChrome.tsx')
    const quest = read('src/components/game/SoftHistoryQuest.tsx')
    const lesson = read('src/components/game/MapOneLesson.tsx')
    const motion = read('src/components/game/SoftMotion.tsx')
    assert.match(map, /SoftAtlas/)
    assert.match(atlas, /SoftShellNav/)
    assert.match(map, /data-soft-shell=\{shell\}/)
    assert.match(map, /shell === 'atlas'/)
    assert.match(atlas, /data-soft-plate="atlas"/)
    assert.match(atlas, /data-atlas-card/)
    assert.match(atlas, /data-atlas-locked/)
    assert.match(atlas, /data-atlas-tip/)
    assert.match(atlas, /data-atlas-related/)
    assert.match(atlas, /data-soft-motion="off"/)
    assert.match(atlas, /grid-cols-3/)
    assert.match(atlas, /text-\[#FFF9E9\]/)
    assert.match(atlas, /bg-\[#0D9488\]/)
    assert.match(atlas, /bg-white/)
    assert.match(atlas, /bg-\[#FFE6C2\]/)
    assert.match(atlas, /data-atlas-note/)
    assert.match(atlas, /atlas\.locked/)
    assert.match(atlas, /<Lock /)
    assert.equal(atlas.includes('useSoftMotion'), false)
    assert.equal(atlas.includes('SoftMotion'), false)
    assert.equal(atlas.includes('finishLesson'), false)
    assert.equal(atlas.includes('useGame'), false)
    assert.equal(/animate-|transition/.test(atlas), false)
    for (const banned of ['真題', '應試對讀', 'HKEAA', '奪星', 'FOMO', 'streak', 'hearts', 'gems', 'claim', '3★', 'SEN', '經驗值']) {
      assert.equal(atlas.includes(banned), false, banned)
      assert.equal(map.includes(banned), false, banned)
    }
    assert.equal(islands.includes('雙圖對讀'), false)
    assert.equal(quest.includes('雙圖對讀'), false)
    assert.equal(islands.includes('data-soft-plate="atlas"'), false)
    assert.equal(quest.includes('data-soft-plate="atlas"'), false)
    assert.match(lesson, /LessonCompleteFrame/)
    assert.match(lesson, /t\('tray\.complete\.title'\)/)
    assert.match(motion, /data-otter-celebrate/)
    assert.equal(atlas.includes('LessonCompleteFrame'), false)
    assert.equal(atlas.includes('tray.complete'), false)
  })
})
