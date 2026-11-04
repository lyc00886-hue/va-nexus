import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { MAP_PATH_AHEAD, mapPathVisibleIds, type MapPathViewportNode } from './mapPathViewport.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function nodes(states: Array<'done' | 'current' | 'locked' | 'open'>): MapPathViewportNode[] {
  return states.map((state, index) => ({
    id: `L${index}`,
    done: state === 'done',
    current: state === 'current',
  }))
}

describe('map path viewport', () => {
  it('shows the current lesson, one recent done lesson, and two ahead', () => {
    const year = nodes([
      'done',
      'done',
      'current',
      'locked',
      'locked',
      'locked',
      'open',
      'locked',
    ])
    assert.equal(MAP_PATH_AHEAD, 2)
    assert.deepEqual(mapPathVisibleIds(year), ['L1', 'L2', 'L3', 'L4'])
    assert.equal(mapPathVisibleIds(year).length < year.length, true)
  })

  it('starts at the current lesson when nothing before it is done', () => {
    assert.deepEqual(mapPathVisibleIds(nodes(['current', 'locked', 'locked', 'locked'])), ['L0', 'L1', 'L2'])
    assert.deepEqual(mapPathVisibleIds(nodes(['open', 'locked'])), ['L0', 'L1'])
  })

  it('keeps a short recap when the path is finished, and the whole path when asked', () => {
    const year = nodes(['done', 'done', 'done', 'done', 'done'])
    assert.deepEqual(mapPathVisibleIds(year), ['L3', 'L4'])
    assert.deepEqual(
      mapPathVisibleIds(year, { expanded: true }),
      year.map((node) => node.id),
    )
    assert.deepEqual(mapPathVisibleIds([]), [])
  })

  it('keeps an opened lesson visible without dumping the rest of the year', () => {
    const year = nodes(['done', 'current', 'locked', 'locked', 'locked', 'locked'])
    assert.deepEqual(mapPathVisibleIds(year, { openIds: new Set(['L5']) }), ['L0', 'L1', 'L2', 'L3', 'L5'])
  })
})

describe('soft v3 map chrome', () => {
  const map = readFileSync(join(root, 'src/components/game/LearningMap.tsx'), 'utf8')
  const path = readFileSync(join(root, 'src/components/game/MapPath.tsx'), 'utf8')
  const motion = readFileSync(join(root, 'src/components/game/SoftMotion.tsx'), 'utf8')
  const celebrate = readFileSync(join(root, 'src/game/softMotion.ts'), 'utf8')

  it('keeps the cream path, round nodes, exercise marks, and one primary continue', () => {
    assert.match(map, /data-map-chrome="path"/)
    assert.match(map, /bg-\[#FFF9E9\]/)
    assert.match(map, /data-map-cta="primary"/)
    assert.match(map, /min-h-14/)
    assert.match(map, /bg-\[#0D9488\]/)
    assert.match(map, /role="tablist"/)
    assert.match(path, /rounded-full/)
    assert.match(path, /h-\[5\.5rem\]/)
    assert.match(path, /ExerciseMarks/)
    assert.match(path, /data-map-viewport/)
    assert.match(path, /map\.path\.more/)
    assert.equal(map.includes('StatCards'), false)
    assert.equal(map.includes('ActivityLog'), false)
    assert.equal(map.includes('map.pageIntro'), false)
    assert.equal(map.includes('map.subtitle'), false)
    assert.equal(map.includes('map.ladder'), false)
    assert.equal(map.includes('map.support'), false)
    assert.equal(path.includes('node.subtitle'), false)
    assert.equal(path.includes('masteryLabel'), false)
    assert.equal(path.includes('DemoBadge'), false)
    assert.equal(path.includes('coverCredit'), false)
    assert.equal(path.includes('map.unitProgress'), false)
  })

  it('does not put SEN, FOMO, or out-of-scope work on the map', () => {
    const chrome = `${map}\n${path}`
    for (const banned of ['SENCO', 'Dyslexia', '診斷', '诊断', 'IQ', 'streak', 'hearts', 'FOMO', 'walk-blink', '旅款']) {
      assert.equal(chrome.includes(banned), false, banned)
    }
    assert.equal(/\bXP\b/.test(chrome), false)
    assert.match(map, /CommitmentBanner/)
    assert.match(map, /data-map-chrome="commitments"/)
    assert.equal(path.includes('SoftMotion'), false)
    assert.match(motion, /data-otter-celebrate/)
    assert.match(celebrate, /mood-lessonComplete/)
    const player = readFileSync(join(root, 'src/components/game/LessonPlayer.tsx'), 'utf8')
    assert.equal(/HeartOff|lp\.hearts|prefs\.hearts|<Heart[\s/>]/.test(player), false)
  })
})
