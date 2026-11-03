import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { activeCommitmentId, parseTrustBadges, TRUST_BADGE_IDS } from './trustBadges.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const contentDir = join(root, 'src/content')

const EXPECTED = {
  en: {
    file: 'trust-badges.en.json',
    bannerIntro: 'Our commitments (not official certification)',
    footerDisclaimer: 'These are product commitment labels — not HKEAA, EDB, or any official seal or approval.',
    badges: [
      {
        id: 'academic-integrity',
        shortTitle: 'Academic integrity',
        body: 'Learning support uses Socratic questions and vocabulary scaffolds. No one-click full-essay ghostwriting.',
      },
      {
        id: 'privacy-deidentify',
        shortTitle: 'Privacy & de-identification',
        body: 'Data is de-identified before it is sent to AI. The ability chart is a classroom self-assessment reference, not a clinical diagnosis. No SEN lists or SEN labels in product chrome.',
      },
      {
        id: 'support-direction',
        shortTitle: 'Learning-support direction',
        body: 'Designed to align with learning-support and smart-teaching directions. Not an EDB, Learning Support Grant (LSG), or HKEAA endorsement or certification.',
      },
    ],
  },
  'zh-Hant': {
    file: 'trust-badges.json',
    bannerIntro: '產品承諾（非官方認證）',
    footerDisclaimer: '以上為產品承諾標籤，非考評局、教育局或任何官方認證／批核。',
    badges: [
      {
        id: 'academic-integrity',
        shortTitle: '學術誠信',
        body: '以蘇格拉底式提問與詞彙鷹架協助學習；不提供一鍵代寫全文。',
      },
      {
        id: 'privacy-deidentify',
        shortTitle: '私隱與去識別',
        body: '傳送至 AI 前會去除可辨識姓名。能力圖只供課堂自我檢視參考，非臨床診斷。本站不設 SEN 名單或 SEN 標籤顯示。',
      },
      {
        id: 'support-direction',
        shortTitle: '學習支援方向',
        body: '設計對齊學習支援與智教方向；並非教育局、學習支援津貼（LSG）或考評局批核／認證。',
      },
    ],
  },
  'zh-Hans': {
    file: 'trust-badges.zh-Hans.json',
    bannerIntro: '产品承诺（非官方认证）',
    footerDisclaimer: '以上为产品承诺标签，非考评局、教育局或任何官方认证／批核。',
    badges: [
      {
        id: 'academic-integrity',
        shortTitle: '学术诚信',
        body: '以苏格拉底式提问与词汇鹰架协助学习；不提供一键代写全文。',
      },
      {
        id: 'privacy-deidentify',
        shortTitle: '隐私与去识别',
        body: '传送至 AI 前会去除可辨识姓名。能力图只供课堂自我检视参考，非临床诊断。本站不设 SEN 名单或 SEN 标签显示。',
      },
      {
        id: 'support-direction',
        shortTitle: '学习支援方向',
        body: '设计对齐学习支援与智教方向；并非教育局、学习支援津贴（LSG）或考评局批核／认证。',
      },
    ],
  },
} as const

describe('trust badge copy', () => {
  for (const [locale, expected] of Object.entries(EXPECTED)) {
    it(`${locale} matches the PEANUTS commitment pack`, () => {
      const file = parseTrustBadges(JSON.parse(readFileSync(join(contentDir, expected.file), 'utf8')))
      assert.equal(file.meta.claimType, 'commitment-labels-only')
      assert.equal(file.meta.locale, locale)
      assert.equal(file.bannerIntro, expected.bannerIntro)
      assert.equal(file.footerDisclaimer, expected.footerDisclaimer)
      assert.deepEqual(
        file.badges.map((badge) => badge.id),
        [...TRUST_BADGE_IDS],
      )
      assert.deepEqual(
        file.badges.map((badge) => ({ id: badge.id, shortTitle: badge.shortTitle, body: badge.body })),
        expected.badges.map((badge) => ({ ...badge })),
      )
    })
  }
})

describe('activeCommitmentId', () => {
  it('prefers the chip under the pointer or keyboard focus', () => {
    assert.equal(activeCommitmentId(null, null), null)
    assert.equal(activeCommitmentId('academic-integrity', null), 'academic-integrity')
    assert.equal(activeCommitmentId('academic-integrity', 'privacy-deidentify'), 'privacy-deidentify')
    assert.equal(activeCommitmentId(null, ''), null)
  })
})

describe('commitment chrome', () => {
  it('hangs a plain footer on every page and a homepage banner without seal icons', () => {
    const banner = readFileSync(join(root, 'src/components/CommitmentBadges.tsx'), 'utf8')
    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
    const map = readFileSync(join(root, 'src/components/game/LearningMap.tsx'), 'utf8')
    assert.match(app, /CommitmentFooter/)
    assert.match(map, /CommitmentBanner/)
    assert.match(banner, /footerDisclaimer/)
    assert.match(banner, /shortTitle/)
    assert.match(banner, /badge\.body/)
    assert.doesNotMatch(banner, /lucide-react|Shield|BadgeCheck|Award|Stamp|Medal|Seal/)
  })
})
