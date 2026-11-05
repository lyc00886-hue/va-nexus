import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { SOFT_GO_POLISH_PLATES } from './questImage.ts'
import { SOFT_GO_TRACKS } from './softGoMaps.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const PLATES = {
  '01-map-picker.png': 'f560e055158e',
  '02-softmotion-transition.png': 'c9e6b33ef176',
  '03-quest-image-research.png': 'b3a3df6def0b',
  '04-quest-image-critique.png': '396ccc073826',
  '05-quest-image-sba.png': 'ea4996bd1f94',
  '06-quest-image-exam.png': 'd289c37c7aa5',
  'preview-strip.png': 'aa5bb26acb91',
} as const

const NEW_KEYS = [
  'map.pickTip',
  'map.grade.later',
  'map.selected',
  'map.quick',
  'map.card.f4',
  'map.card.islands',
  'map.motion',
  'motion.title',
  'motion.sub',
  'motion.reduce',
  'motion.open',
  'motion.reduceNote',
  'motion.cardTitle',
  'motion.cardBody',
  'motion.keep',
] as const

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

describe('soft go map1 knife 2', () => {
  it('keeps each plate byte-identical under the knife2 folder', () => {
    for (const [name, prefix] of Object.entries(PLATES)) {
      const file = join(root, 'public/content/learning-map-illustrations/soft-go-map1-knife2', name)
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex')
      assert.equal(hash.startsWith(prefix), true, `${name} ${hash}`)
      assert.equal(SOFT_GO_POLISH_PLATES[name as keyof typeof SOFT_GO_POLISH_PLATES], prefix)
    }
  })

  it('uses 原版地圖 and 闖關地圖, and keeps motion off by default in the copy', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const en = messages('src/i18n/en.json')
    assert.match(hant['map.pickTip'], /原版地圖/)
    assert.match(hant['map.pickTip'], /闖關地圖/)
    assert.equal(hant['map.pickTip'].includes('而家地圖殼'), false)
    assert.equal(hant['map.pickTip'].includes('島嶼地圖'), false)
    assert.match(hant['motion.cardBody'], /預設關閉/)
    assert.match(hant['motion.cardBody'], /減少動態/)
    for (const key of NEW_KEYS) {
      assert.equal(/\bSoft\b/.test(hant[key] ?? ''), false, key)
      assert.equal(/\bSoft\b/.test(en[key] ?? ''), false, key)
    }
  })

  it('wires a static pass screen, the tip, and the quest crop without new tracks', () => {
    const motion = read('src/components/game/SoftMotionTransition.tsx')
    const picker = read('src/components/game/SoftMapPicker.tsx')
    const focus = read('src/components/game/SoftIslandFocus.tsx')
    const quest = read('src/components/game/SoftIslandQuest.tsx')
    const image = read('src/components/game/QuestImage.tsx')
    assert.match(motion, /data-soft-motion="off"/)
    assert.equal(motion.includes('animate-'), false)
    assert.match(picker, /data-map-tip/)
    assert.match(picker, /map\.pickTip/)
    assert.match(picker, /data-map-track/)
    assert.match(focus, /QuestImage/)
    assert.match(quest, /QuestImage/)
    assert.deepEqual([...SOFT_GO_TRACKS], ['islands', 'history-cn', 'history-west', 'media', 'f4'])
    const sources = `${picker}\n${motion}\n${image}`
    for (const banned of ['香港藝術', '真題', 'streak', 'hearts', 'gems', 'HKEAA']) {
      assert.equal(sources.includes(banned), false, banned)
    }
    assert.equal(/\bSoft\b/.test(sources), false)
  })
})
