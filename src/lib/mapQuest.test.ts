import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  QUEST_CHROME,
  QUEST_COLORS,
  QUEST_SECTIONS,
  questActiveId,
  questCalmFromStored,
  questFormFromSearch,
  questLane,
  questNodes,
  questUnitFace,
  questUnits,
  questXpMoves,
  withQuestForm,
} from './mapQuest.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const PLATES: Record<string, string> = {
  '01-map-home-declutter.png': '57498df014b9',
  '02-unit-banner-nodes.png': '42bc5a79d6a2',
  '03-header-drawer-lesson-popover.png': '04b8f296b1ba',
}

const BANNED = [
  '真題',
  '真题',
  '奪星',
  '夺星',
  '競技場',
  '竞技场',
  '大魔王',
  '護盾',
  '护盾',
  '3★',
  'SEN',
  'Soft',
  '火焰',
  '稍後開放',
  '稍后开放',
  '揀地圖',
  '打开地图',
  '地圖一開即見',
  '單元微關',
  '地圖底距',
  '參觀',
  '博物馆',
  '博物館',
  '故宮',
  '虛白齋',
  'hearts',
  'gems',
  'claim',
  'HKEAA',
  '考評局',
  '考评局',
]

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('quest map structure', () => {
  it('locks 3 sections, 5 units, 4 nodes, and a chest on every fourth node', () => {
    assert.equal(QUEST_SECTIONS.length, 3)
    assert.deepEqual(
      QUEST_SECTIONS.map((section) => section.chip),
      ['S4', 'S5', 'S6'],
    )
    const units = questUnits()
    const nodes = questNodes()
    assert.equal(units.length, 15)
    assert.equal(nodes.length, 60)
    for (const unit of units) {
      assert.equal(unit.nodes.length, 4)
      assert.equal(unit.nodes[3].chest, true)
      assert.deepEqual(
        unit.nodes.slice(0, 3).map((node) => node.chest),
        [false, false, false],
      )
    }
    assert.equal(units[0].color, QUEST_COLORS.teal)
    assert.equal(units[0].color, '#0D9488')
    assert.equal(units[1].color, '#D97706')
    assert.equal(units[2].color, '#4F46E5')
    assert.equal(units[3].color, '#E11D48')
    assert.equal(units[4].color, '#7C3AED')
    assert.equal(units[0].code, 'S4-U1')
    assert.equal(units[0].title['zh-Hant'].includes('視覺眼睛開光'), true)
    assert.equal(units[0].nodes[0].name['zh-Hant'], '表象描述')
    assert.equal(units[0].nodes[3].name['zh-Hant'], '單元寶箱')
    assert.equal(questActiveId(QUEST_SECTIONS[0]), 's4-u1-n1')
    assert.deepEqual([0, 1, 2, 3].map(questLane), [22, 50, 78, 50])
    assert.equal(QUEST_SECTIONS[0].units.length, 5)
    assert.equal(QUEST_SECTIONS[1].units.length, 5)
    assert.equal(QUEST_SECTIONS[2].units.length, 5)
    const face = questUnitFace(QUEST_SECTIONS[0].units[0], 'zh-Hant')
    assert.equal(face.title, '視覺眼睛開光')
    assert.equal(face.subtitle, '費德曼四步同詞彙')
    assert.equal(questUnitFace(QUEST_SECTIONS[0].units[1], 'zh-Hant').title, '素描 · 美感 · 設計思維')
    assert.equal(questUnitFace(QUEST_SECTIONS[0].units[1], 'zh-Hant').subtitle, '')
    const s5 = QUEST_SECTIONS[1].units[0].title['zh-Hant']
    assert.equal(s5, '唔係美感 · 評賞加深')
    assert.equal(s5.codePointAt(0), 0x5514)
  })

  it('keeps the student-safe names and leaves visit nodes out', () => {
    const blob = JSON.stringify({ QUEST_SECTIONS, QUEST_CHROME })
    assert.equal(QUEST_SECTIONS[0].name['zh-Hant'], '中四築基')
    assert.equal(QUEST_SECTIONS[1].name['zh-Hant'], '中五實戰')
    assert.equal(QUEST_SECTIONS[2].name['zh-Hant'], '中六練習')
    assert.match(blob, /SBA 實驗室/)
    assert.match(blob, /應試練習場/)
    assert.match(blob, /雙圖對讀/)
    assert.equal(QUEST_CHROME['zh-Hant'].startXp, '開始 +10 XP')
    assert.equal(QUEST_CHROME['zh-Hant'].streak, '連勝')
    assert.equal(QUEST_CHROME['zh-Hant'].inspiration, '靈感')
    for (const banned of BANNED) assert.equal(blob.includes(banned), false, banned)
    assert.equal(/field trip|museum/i.test(blob), false)
  })

  it('defaults the year to S4 and keeps the start bubble still', () => {
    assert.equal(questFormFromSearch('?ux=map1'), 's4')
    assert.equal(questFormFromSearch('?form=s6'), 's6')
    assert.equal(questFormFromSearch('?form=shop'), 's4')
    const query = withQuestForm('?ux=map1&island=history', 's5')
    const params = new URLSearchParams(query.slice(1))
    assert.equal(params.get('ux'), 'map1')
    assert.equal(params.get('form'), 's5')
    assert.equal(params.get('island'), 'history')
    assert.equal(withQuestForm('?ux=map1&form=s6', 's4'), '?ux=map1')
    assert.equal(questCalmFromStored(null), true)
    assert.equal(questCalmFromStored('1'), true)
    assert.equal(questCalmFromStored('0'), false)
    assert.equal(questXpMoves(), false)
  })

  it('keeps the scout plates by hash and off the student surface', () => {
    const dir = 'public/content/learning-map-illustrations/soft-scout/map1-declutter-2611'
    for (const [file, prefix] of Object.entries(PLATES)) {
      const buf = readFileSync(join(root, dir, file))
      assert.equal(createHash('sha256').update(buf).digest('hex').slice(0, 12), prefix, file)
    }
    const surface = [
      'src/components/game/MapQuest.tsx',
      'src/components/game/MapQuestChrome.tsx',
      'src/components/Header.tsx',
      'src/components/game/LearningMap.tsx',
    ]
      .map(read)
      .join('\n')
    assert.match(surface, /pb-32/)
    assert.match(surface, /data-quest-path="illustrated"/)
    assert.match(surface, /data-quest-entry="path"/)
    assert.match(surface, /data-quest-xp="static"/)
    assert.match(surface, /data-quest-slot="empty"/)
    assert.match(surface, /data-quest-drawer/)
    assert.match(surface, /data-quest-gear/)
    assert.match(surface, /map\.grade\.f4/)
    assert.match(surface, /map\.grade\.f5/)
    assert.match(surface, /map\.grade\.f6/)
    assert.equal(read('src/components/game/MapQuest.tsx').includes('otter-map-idle'), false)
    assert.equal(surface.includes('{item.chip}'), false)
    assert.equal(surface.includes('{current.chip}'), false)
    assert.equal(surface.includes('animate-bounce'), false)
    assert.equal(surface.includes('strokeWidth="16"'), false)
    assert.equal(surface.includes('data-illu-legend'), false)
    assert.equal(surface.includes('data-island-chip'), false)
    assert.equal(surface.includes('map1-declutter-2611'), false)
    for (const banned of ['地圖一開即見', '單元微關', '地圖底距', '稍後開放', '揀地圖', '打開地圖', '真題', '奪星', 'Flame']) {
      assert.equal(surface.includes(banned), false, banned)
    }
  })
})
