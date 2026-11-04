import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { feldmanSystemPrompt, formativeLockLine } from './feedback.ts'
import { pickSocraticCue, socraticStageBank, socraticStageNames } from './socraticBank.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const STAGES = ['describe', 'analyze', 'interpret', 'judge'] as const

const BANNED_BANK = ['SEN', '診斷', 'IQ', 'HKEAA', 'streak', 'hearts', 'gems', '價值判斷', '价值判断', '正確詮釋']

describe('PEANUTS Socratic bank', () => {
  test('each stage keeps at least five one-turn prompts and the short name', () => {
    const names = socraticStageNames()
    assert.deepEqual(names, { describe: '描述', analyze: '分析', interpret: '詮釋', judge: '評價' })
    for (const stage of STAGES) {
      const bank = socraticStageBank(stage)
      assert.ok(bank.questions.length >= 5, stage)
      assert.equal(bank.name, names[stage])
      assert.ok(bank.probes.length >= 1, stage)
      assert.ok(bank.frame.includes('＿＿'), stage)
      const blob = JSON.stringify(bank)
      for (const banned of BANNED_BANK) assert.equal(blob.includes(banned), false, `${stage} ${banned}`)
      for (const cue of bank.questions) {
        assert.equal(cue.ask.includes('\n'), false, cue.id)
        assert.equal(cue.ask.includes('？'), true, cue.id)
      }
    }
  })

  test('a turn picks one cue and does not dump the bank', () => {
    const opening = pickSocraticCue('describe', '')
    assert.equal(opening.id, 'D-Q1')
    assert.equal(opening.ask, '你第一眼睇到咩？')
    const follow = pickSocraticCue('describe', '畫面有一大片藍色，主體喺前景。')
    assert.equal(follow.id, 'describe-probe-0')
    assert.notEqual(follow.ask, opening.ask)
    const messy = pickSocraticCue('analyze', '好亂')
    assert.match(messy.ask, /好亂/)
    assert.equal(messy.ask.includes('A-Q2'), false)
    const lonely = pickSocraticCue('interpret', '佢想講孤獨')
    assert.match(lonely.ask, /因為畫面有/)
  })
})

describe('Feldman prompt §B', () => {
  test('zh-Hant asks one bank question and keeps the formative lock', () => {
    const system = feldmanSystemPrompt('describe', 'zh-Hant', '')
    assert.match(system, /你第一眼睇到咩？/)
    assert.equal(system.includes('呢件作品大概用咩媒介做？'), false)
    assert.match(system, /At most one question/)
    assert.match(system, /at most one question mark/)
    assert.match(system, /Do not give a final answer/)
    assert.match(system, /28 Chinese characters/)
    assert.match(system, /Do not jump ahead/)
    assert.equal(system.includes(formativeLockLine()), true)
    assert.equal(system.includes('價值判斷'), false)
    assert.match(system, /描述/)
    assert.match(system, /Description/)
  })

  test('interpret and judgement stay on evidence and do not rename the stage', () => {
    for (const stage of ['interpret', 'judge'] as const) {
      const system = feldmanSystemPrompt(stage, 'zh-Hant', '我覺得好特別，因為個色好暗。')
      assert.match(system, /visual evidence/)
      assert.equal(system.includes('價值判斷'), false)
      assert.equal(system.includes('Value Judgment'), false)
    }
    assert.match(feldmanSystemPrompt('interpret', 'zh-Hant', 'x'), /詮釋/)
    assert.match(feldmanSystemPrompt('judge', 'zh-Hant', 'x'), /評價/)
  })

  test('English and zh-Hans get the behaviour lock without the zh-HK bank', () => {
    for (const locale of ['en', 'zh-Hans'] as const) {
      const system = feldmanSystemPrompt('describe', locale, 'I see a red line.')
      assert.match(system, /Ask exactly one question/)
      assert.match(system, /At most one question/)
      assert.equal(system.includes(formativeLockLine()), true)
      assert.equal(system.includes('你第一眼睇到咩？'), false)
      assert.equal(system.includes('D-Q2'), false)
    }
  })
})

describe('zh-HK Socratic chrome keys', () => {
  test('matches the PEANUTS §A table', () => {
    const bag = JSON.parse(readFileSync(join(root, 'src/i18n/zh-Hant.json'), 'utf8')) as Record<string, string>
    const expected = {
      'research.socratic.gateTitle': 'AI 回饋',
      'research.socratic.tipTitle': 'AI 學習建議',
      'research.socratic.ageGate': '只限 18 歲或以上',
      'research.socratic.ageBody': 'AI 學習建議只開放予已標記年滿 18 歲的帳戶。未滿 18 歲請用檢查清單與句式。',
      'research.socratic.ctaAsk': '問下一題',
      'research.socratic.ctaAgain': '再想一想',
      'research.socratic.ctaSkipStage': '跳過呢一步',
      'research.socratic.ctaDone': '完成呢階',
      'research.socratic.loading': '想緊下一條問題…',
      'research.socratic.empty': '先寫一兩句你睇到嘅，再問下一題。',
      'research.socratic.disclaimer': '只供自我檢視，屬進展性引導；並非正式分數。AI 唔會評分、唔會改圖、唔會給最終答案。',
      'research.socratic.stage.describe': '描述',
      'research.socratic.stage.analyse': '分析',
      'research.socratic.stage.interpret': '詮釋',
      'research.socratic.stage.judge': '評價',
      'research.socratic.progressHint': '而家：{stage} · 一步一問',
    }
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(bag[key], value, key)
      for (const banned of ['SEN', '診斷', 'IQ', 'HKEAA', 'streak', 'hearts', 'gems', 'XP']) {
        assert.equal(value.includes(banned), false, `${key} ${banned}`)
      }
    }
    assert.equal(bag['ai.title'], 'AI 學習建議')
    assert.equal(bag['research.socratic.progressHint'].includes('學習點'), false)
  })
})
