import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
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
      'ability-chart.json': '數據只儲存在學生自己的裝置╱帳戶；圖表唔會為你貼上任何標籤。',
      'ability-chart.zh-Hans.json': '数据只储存在学生自己的设备╱账户；图表不会为你贴上任何标签。',
      'ability-chart.en.json':
        "Data stays on the student's own device / account; the chart never labels you.",
    } as const
    for (const [file, expected] of Object.entries(privacy)) {
      const chart = JSON.parse(read(`src/content/${file}`)) as { meta: { privacy: string; no_sen_labels: boolean } }
      assert.equal(chart.meta.privacy, expected)
      assert.equal(chart.meta.no_sen_labels, true)
    }

    const disclaimer = {
      'sen-checkin.json':
        '呢個問卷唔係醫學判斷，亦唔會定性你有冇任何學習困難。佢只係幫你揀用得舒服啲嘅顯示同閱讀方式。答案只會存喺你部裝置，唔會傳俾老師或者學校。如果你覺得讀書有困難，可以同老師、社工或者學校嘅支援老師傾。',
      'sen-checkin.zh-Hans.json':
        '这份问卷不是医学判断，也不会定性你是否有任何学习困难。它只是帮助你选择更舒适的显示与阅读方式。答案只会保存在你的设备上，不会传送给老师或学校。如果你觉得学习有困难，可以和老师、社工或学校的支援老师商量。',
      'sen-checkin.en.json':
        "This questionnaire is not a medical judgment, and it will not label you or decide whether you have any learning difficulty. It only helps you choose display and reading options that feel more comfortable. Your answers stay on your device and are never sent to teachers or your school. If you find schoolwork hard, talk to a teacher, a social worker, or your school's support teacher.",
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

  it('wires easy-read student lines and keeps the AI feedback gate', () => {
    const easy = {
      'easy-read-mode.json': {
        locale: 'zh-Hant',
        disclaimer: '呢個係學習顯示方式，唔係醫學判斷、亦唔會定性你。同一套任務，路徑更短、更清楚。',
        settingsHint: '喺設定隨時開關。唔會為你寫入任何標籤。',
        privacyLine: '我哋唔會為你儲存任何標籤。只記住你開咗邊啲顯示選項。',
      },
      'easy-read-mode.zh-Hans.json': {
        locale: 'zh-Hans',
        disclaimer: '这是学习显示方式，不是医学判断、也不会定性你。同一套任务，路径更短、更清楚。',
        settingsHint: '在设置里随时开关。不会为你写入任何标签。',
        privacyLine: '我们不会为你存储任何标签。只记住你打开了哪些显示选项。',
      },
      'easy-read-mode.en.json': {
        locale: 'en',
        disclaimer:
          'This is a display and reading preference — not a medical judgment, and it will not label you. Same tasks, clearer path.',
        settingsHint: 'Toggle anytime in Settings. No labels are stored about you.',
        privacyLine: 'We do not store any labels about you. We only remember which display options you turned on.',
      },
    } as const
    for (const [file, expected] of Object.entries(easy)) {
      const pack = JSON.parse(read(`src/content/${file}`)) as {
        locale: string
        disclaimer: string
        settingsHint: string
        privacyLine: string
      }
      assert.equal(pack.locale, expected.locale)
      assert.equal(pack.disclaimer, expected.disclaimer)
      assert.equal(pack.settingsHint, expected.settingsHint)
      assert.equal(pack.privacyLine, expected.privacyLine)
    }

    const panel = read('src/components/SenSettingsPanel.tsx')
    assert.match(panel, /contentJson<EasyReadStudentCopy>\('easy-read-mode'\)/)
    assert.match(panel, /data-testid="easy-read-disclaimer"/)
    assert.match(panel, /data-testid="easy-read-settings-hint"/)
    assert.match(panel, /data-testid="easy-read-privacy-line"/)
    assert.match(panel, /t\('sen\.toggle\.dyslexia'\)/)

    const gates = {
      'privacy-notice.md': '**AI 回饋（只限 18 歲或以上帳戶）**',
      'privacy-notice.zh-Hans.md': '**AI 反馈（仅限 18 岁或以上账户）**',
      'privacy-notice.en.md': '**AI feedback (18+ accounts only)**',
    } as const
    for (const [file, title] of Object.entries(gates)) {
      const notice = read(`src/content/${file}`)
      assert.equal(notice.includes(title), true, file)
      assert.equal(/學習困難|学习困难|learning difficulty/.test(notice), true, file)
    }
    assert.equal(
      read('src/content/privacy-notice.en.md').includes('Ability charts never label you.'),
      true,
    )

    const notes = {
      'zh-Hant': '呢個唔係醫學判斷，只係幫你揀合適工具',
      'zh-Hans': '这不是医学判断，只是帮你选择合适的工具',
      en: 'This is not a medical judgment — it just helps you choose suitable tools',
    } as const
    for (const locale of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const bag = messages(FILES[locale])
      assert.equal(bag['sen.checkin.note'], notes[locale])
      assert.equal(bag['header.a11y'], COPY[locale]['header.a11y'])
      assert.equal(bag['er.mode.standard'].length > 0, true)
      assert.equal(bag['er.mode.step'].length > 0, true)
    }
  })
})

const DIAGNOSIS = /診斷|诊断|臨床診斷|临床诊断|diagnos(?:is|tic)/i

function studentStrings(value: unknown, path: string, hits: string[]) {
  if (typeof value === 'string') {
    if (DIAGNOSIS.test(value)) hits.push(`${path}: ${value}`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => studentStrings(item, `${path}[${index}]`, hits))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'teacherUse' || key === 'outOfScope') continue
    studentStrings(child, `${path}.${key}`, hits)
  }
}

describe('student chrome diagnosis glyphs', () => {
  it('keeps diagnosis words out of student-facing copy', () => {
    const hits: string[] = []
    for (const file of [
      'src/i18n/zh-Hant.json',
      'src/i18n/zh-Hans.json',
      'src/i18n/zh-Hans.overrides.json',
      'src/i18n/en.json',
    ]) {
      studentStrings(JSON.parse(read(file)), file, hits)
    }
    const contentDir = join(root, 'src/content')
    for (const name of readdirSync(contentDir)) {
      if (name.startsWith('teacher-draft-band')) continue
      if (!name.endsWith('.json') && !name.startsWith('privacy-notice')) continue
      if (name.endsWith('.md') && !name.startsWith('privacy-notice')) continue
      const full = `src/content/${name}`
      if (name.endsWith('.json')) studentStrings(JSON.parse(read(full)), full, hits)
      else if (DIAGNOSIS.test(read(full))) hits.push(full)
    }
    const panel = read('src/components/SenSettingsPanel.tsx').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    if (DIAGNOSIS.test(panel)) hits.push('src/components/SenSettingsPanel.tsx')
    assert.deepEqual(hits, [])
  })
})
