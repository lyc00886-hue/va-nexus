import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** PEANUTS soft leftover PASS (Drive 1Nnt6ndj) plus the designer gear / group names. */
const COPY = {
  en: {
    'header.senModes': 'Display settings',
    'header.displayMode': 'Display mode',
    'header.a11y': 'Accessibility',
    'sen.quick': 'Display settings',
    'sen.title': 'Display & reading settings',
    'chrome.xp': '{n} learning points',
    'chrome.xpGain': '+{n} learning points',
    'chrome.level': 'Level {n}',
    'chrome.levelTitle': 'Level {n} {title}',
    'chrome.levelXpRow': 'Level {n} {title} · {xp} learning points',
    'rs.step.ai': 'AI learning tip',
  },
  'zh-Hant': {
    'header.senModes': '顯示設定',
    'header.displayMode': '顯示模式',
    'header.a11y': '無障礙',
    'sen.quick': '顯示設定',
    'sen.title': '顯示同閱讀設定',
    'chrome.xp': '{n} 學習點',
    'chrome.xpGain': '+{n} 學習點',
    'chrome.level': '第 {n} 級',
    'chrome.levelTitle': '第 {n} 級 {title}',
    'chrome.levelXpRow': '第 {n} 級 {title} · {xp} 學習點',
    'rs.step.ai': 'AI 學習建議',
  },
  'zh-Hans': {
    'header.senModes': '显示设置',
    'header.displayMode': '显示模式',
    'header.a11y': '无障碍',
    'sen.quick': '显示设置',
    'sen.title': '显示与阅读设置',
    'chrome.xp': '{n} 学习点',
    'chrome.xpGain': '+{n} 学习点',
    'chrome.level': '第 {n} 级',
    'chrome.levelTitle': '第 {n} 级 {title}',
    'chrome.levelXpRow': '第 {n} 级 {title} · {xp} 学习点',
    'rs.step.ai': 'AI 学习建议',
  },
} as const

const FILES = {
  en: 'src/i18n/en.json',
  'zh-Hant': 'src/i18n/zh-Hant.json',
  'zh-Hans': 'src/i18n/zh-Hans.json',
} as const

const CHROME = [
  'src/components/Sidebar.tsx',
  'src/components/game/StatCards.tsx',
  'src/components/game/Achievements.tsx',
  'src/components/game/LessonPlayer.tsx',
  'src/components/game/ActivityLog.tsx',
]

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

describe('soft leftover display chrome', () => {
  it('matches the PASS strings, designer gear, and display-mode group name', () => {
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      for (const [key, value] of Object.entries(COPY[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.equal(value.includes('SEN'), false, `${locale} ${key}`)
      }
      assert.equal(bag['checkin.noRecs'].includes('SEN'), false)
    }
  })

  it('keeps the header as two segments and replaces hardcoded XP / Lv labels', () => {
    const header = read('src/components/Header.tsx')
    assert.match(header, /role="radiogroup"/)
    assert.match(header, /aria-label=\{t\('header\.displayMode'\)\}/)
    assert.match(header, /t\('er\.mode\.standard'\)/)
    assert.match(header, /t\('er\.mode\.step'\)/)
    assert.match(header, /t\('header\.a11y'\)/)
    assert.match(header, /bg-\[#0D9488\]/)
    assert.equal(header.includes('header.senModes'), false)
    assert.equal(header.includes('mode.spld'), false)
    assert.equal(header.includes('mode.adhd'), false)
    assert.equal(header.includes('er.mode.literacy'), false)
    assert.equal(header.includes('er.mode.focus'), false)
    assert.equal(/SEN/.test(header), false)

    for (const file of CHROME) {
      const source = read(file)
      assert.equal(/\bLv\./.test(source), false, file)
      assert.equal(/ XP/.test(source), false, file)
      assert.match(source, /chrome\.(xp|xpGain|level|levelTitle|levelXpRow)/)
    }

    const panel = read('src/components/SenSettingsPanel.tsx')
    assert.match(panel, /EasyReadBar/)
    assert.equal(panel.includes('sen.preset.spld'), false)
    assert.equal(panel.includes('sen.preset.adhd'), false)
    assert.equal(/SEN/.test(panel), false)

    const feedback = read('api/feedback.ts')
    assert.match(feedback, /AI 回饋/)
  })

  it('clears student-facing SENCO, SEN chart labels, and dyslexia spacing names', () => {
    const privacy = {
      'ability-chart.json': '數據只儲存在學生自己的裝置╱帳戶；圖表不顯示任何診斷標籤。',
      'ability-chart.zh-Hans.json': '数据只储存在学生自己的设备╱账户；图表不显示任何诊断标签。',
      'ability-chart.en.json':
        "Data stays on the student's own device / account; the chart never shows any diagnostic label.",
    } as const
    for (const [file, expected] of Object.entries(privacy)) {
      const chart = JSON.parse(read(`src/content/${file}`)) as { meta: { privacy: string; no_sen_labels: boolean } }
      assert.equal(chart.meta.privacy, expected)
      assert.equal(chart.meta.no_sen_labels, true)
    }

    const disclaimer = {
      'sen-checkin.json':
        '呢個問卷唔係診斷，亦唔會判斷你有冇任何學習困難。佢只係幫你揀用得舒服啲嘅顯示同閱讀方式。答案只會存喺你部裝置，唔會傳俾老師或者學校。如果你覺得讀書有困難，可以同老師、社工或者學校嘅支援老師傾。',
      'sen-checkin.zh-Hans.json':
        '这份问卷不是诊断，也不会判断你是否有任何学习困难。它只是帮助你选择更舒适的显示与阅读方式。答案只会保存在你的设备上，不会传送给老师或学校。如果你觉得学习有困难，可以和老师、社工或学校的支援老师商量。',
      'sen-checkin.en.json':
        "This questionnaire is not a diagnosis, and it does not decide whether you have any learning difficulty. It only helps you choose display and reading options that feel more comfortable. Your answers stay on your device and are never sent to teachers or your school. If you find schoolwork hard, talk to a teacher, a social worker, or your school's support teacher.",
    } as const
    for (const [file, expected] of Object.entries(disclaimer)) {
      const pack = JSON.parse(read(`src/content/${file}`)) as { disclaimer: string }
      assert.equal(pack.disclaimer, expected)
      assert.equal(pack.disclaimer.includes('SENCO'), false)
    }

    const labels = {
      'zh-Hant': '寬鬆間距',
      'zh-Hans': '宽松间距',
      en: 'Wider spacing',
    } as const
    const desc = {
      'zh-Hant': '加大字距、行距同段落間距',
      'zh-Hans': '加大字距、行距和段落间距',
      en: 'Wider letter, line and paragraph spacing',
    } as const
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      assert.equal(bag['sen.toggle.dyslexia'], labels[locale])
      assert.equal(bag['sen.toggle.dyslexia.desc'], desc[locale])
    }

    const studentCopy = [
      'src/i18n/zh-Hant.json',
      'src/i18n/zh-Hans.json',
      'src/i18n/en.json',
      'src/content/ability-chart.json',
      'src/content/ability-chart.zh-Hans.json',
      'src/content/ability-chart.en.json',
      'src/content/sen-checkin.json',
      'src/content/sen-checkin.zh-Hans.json',
      'src/content/sen-checkin.en.json',
    ]
      .map(read)
      .join('\n')
    assert.equal(studentCopy.includes('SENCO'), false)
    assert.equal(studentCopy.includes('學習需要（SEN）'), false)
    assert.equal(studentCopy.includes('学习需要（SEN）'), false)
    assert.equal(studentCopy.includes('Dyslexia-friendly'), false)
    assert.equal(studentCopy.includes('讀寫障礙'), false)
    assert.equal(studentCopy.includes('读写障碍'), false)

    const panel = read('src/components/SenSettingsPanel.tsx')
    const css = read('src/index.css')
    const sen = read('src/context/SenContext.tsx')
    assert.match(panel, /settings\.dyslexia/)
    assert.match(css, /\.sen-dyslexia/)
    assert.match(sen, /settings\.dyslexia/)
    assert.equal(css.includes('Dyslexia-friendly'), false)
  })

  it('does not wire sound-effect playback', () => {
    const header = read('src/components/Header.tsx')
    const app = read('src/App.tsx')
    assert.equal(/sfx\.|new Audio|HTMLAudioElement/.test(header + app), false)
  })
})
