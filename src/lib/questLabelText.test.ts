import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { questLabelTokens } from './questLabelText.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('quest label tokens', () => {
  it('keeps the official words whole and restores the live title', () => {
    const samples = [
      '主題：自我、關係、故事',
      '主题：自我、关系、故事',
      'Role-taking: re-presenting a person in a Chinese context',
      '中四視藝入門：課程同 SBA 作品集',
      '中四视艺入门：课程与 SBA 作品集',
      '寫生、美感同設計思維',
      '写生、美感与设计思维',
      'Form 4 VA Intro: Course and SBA Portfolio',
      'Drawing, Aesthetics and Design Thinking',
    ]
    for (const sample of samples) {
      const tokens = questLabelTokens(sample)
      assert.equal(tokens.join(''), sample, sample)
      assert.equal(tokens.some((token) => token === '故' || token === '事'), false, sample)
      assert.equal(tokens.some((token) => token === '作' || token === '品集'), false, sample)
      assert.equal(tokens.some((token) => token === '設' || token === '计' || token === '計'), false, sample)
      assert.equal(tokens.some((token) => token === 're-' || token === 'presenting'), false, sample)
    }
    const role = questLabelTokens('Role-taking: re-presenting a person in a Chinese context')
    assert.ok(role.some((token) => token.includes('re-presenting')))
    assert.equal(role.some((token) => token === 're-' || token === 'presenting'), false)
    assert.ok(questLabelTokens('寫生、美感同設計思維').includes('設計思維'))
    assert.ok(questLabelTokens('写生、美感与设计思维').includes('设计思维'))
    assert.ok(questLabelTokens('中四視藝入門：課程同 SBA 作品集').includes('作品集'))
    assert.ok(questLabelTokens('主題：自我、關係、故事').includes('故事'))
  })

  it('uses word-safe labels on the quest map and the classroom trail', () => {
    const quest = read('src/components/game/MapQuest.tsx')
    const trail = read('src/components/game/ClassroomTrail.tsx')
    const css = read('src/index.css')
    assert.match(quest, /keepWords/)
    assert.match(trail, /keepWords/)
    assert.equal(quest.includes('wrap-anywhere'), false)
    assert.equal(trail.includes('wrap-anywhere'), false)
    assert.match(css, /\.quest-label-token/)
    assert.match(css, /word-break:\s*keep-all/)
    assert.equal(css.includes('overflow-wrap: anywhere'), false)
  })
})
