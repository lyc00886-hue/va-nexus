import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const HASHES: Record<string, string> = {
  '01-achievements-soft-never.png': 'f82cb2d786f8',
  '02-islands-name-lock.png': '8506b048b438',
  '03-soft-never-before-after.png': '8a20c5f9249e',
  'preview-strip.png': 'dce978bcea34',
}

function read(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('soft never knife', () => {
  it('keeps the Soft SCOUT plate hashes', () => {
    const dir = 'public/content/learning-map-illustrations/soft-scout/f4-soft-never-knife'
    for (const [file, prefix] of Object.entries(HASHES)) {
      const buf = readFileSync(resolve(root, dir, file))
      assert.equal(createHash('sha256').update(buf).digest('hex').slice(0, 12), prefix, file)
    }
  })

  it('drops day-count pressure from the student achievement surface', () => {
    const achievements = read('src/components/game/Achievements.tsx')
    const stats = read('src/components/game/StatCards.tsx')
    const rewards = read('src/game/rewards.ts')
    const context = read('src/context/GameContext.tsx')
    for (const source of [achievements, stats]) {
      assert.equal(source.includes('Flame'), false)
      assert.equal(source.includes('stats.streak'), false)
      assert.equal(/三日連續|一週不斷|連續學習|火焰/.test(source), false)
    }
    assert.match(achievements, /first-lesson/)
    assert.match(achievements, /unit-done/)
    assert.match(achievements, /xp-500/)
    assert.match(achievements, /explorer/)
    assert.match(achievements, /dualread/)
    assert.match(achievements, /sba-starter/)
    assert.equal(rewards.includes('streak-3'), false)
    assert.equal(rewards.includes('streak-7'), false)
    assert.equal(context.includes("grantBadge(n, 'streak-3'"), false)
    assert.equal(context.includes('activity.streak'), false)
    const hant = JSON.parse(read('src/i18n/zh-Hant.json')) as Record<string, string>
    assert.equal(hant['badge.unit-done'], '單元完成')
    assert.equal(hant['badge.xp-500'], '學習點')
    assert.equal(hant['badge.explorer'], '探索者')
    assert.equal(hant['badge.dualread'], '評賞比較入門')
    assert.equal(hant['badge.sba-starter'], '實驗室起步')
    assert.equal(hant['ach.pace'].includes('慢慢學就得'), true)
    assert.equal(/收斂|Soft/.test(hant['ach.pace']), false)
  })
})
