#!/usr/bin/env node
// Generates src/i18n/zh-Hans.json from zh-Hant.json with OpenCC (HK → mainland CN),
// then applies hand-written overrides (zh-Hans.overrides.json) for strings that need
// rewriting from Cantonese into standard written Chinese. Fails if any Cantonese
// marker remains so new strings can't slip through unreviewed.
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as OpenCC from 'opencc-js'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/i18n')
const read = (f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8'))

const hant = read('zh-Hant.json')
const overrides = read('zh-Hans.overrides.json')
const convert = OpenCC.Converter({ from: 'hk', to: 'cn' })

// Checked on the converted (simplified) text, so include simplified forms too.
const CANTONESE = /[嘅咗唔係喺嘢冇啲佢咁噉嚟睇揀撳揿啱拎搵揾乜呢俾畀嗰哋晒]|點樣|点样|屋企|返学|返學|寫低|写低|而家|边个|邊個|心心/

// Official locale supplement for the classroom-card line. These zh-Hans
// strings are BYTE-IDENTICAL to the pack, including 搵 U+6435, 嗰, 嚟, and 嘅.
const OFFICIAL_LOCALE_SUPPLEMENT = new Set([
  'settings.reading',
  'critique.title',
  'critique.lead',
  'critique.flex',
  'critique.object',
  'critique.nudge',
  'image.rule',
  'image.sources',
  'image.blocked',
  'image.homemade',
  'image.school',
  'image.blockedTitle',
  'image.ruleTitle',
  'image.empty',
  'present.standard',
  'present.easy',
  'present.choose',
  'kw.ink',
  'kw.brush',
  'kw.theme',
  'kw.rain',
  'kw.window',
  'kw.env',
  'dir.feel',
  'dir.surface',
  'dir.form',
  'dir.meaning',
  'dir.value',
  'chip.feel',
  'chip.surface',
  'chip.form',
  'chip.meaning',
  'chip.value',
  'builder.assembled',
  'builder.title',
  'builder.lead',
  'builder.read',
  'builder.hint',
  'builder.voice',
  'write.title',
  'image.examples',
  'image.tate',
  'image.noStandIn',
  'class.staff.presentTitle',
  'class.staff.presentHint',
  'class.staff.presentSaved',
  'hw.staff.compareTitle',
  'hw.staff.reviewPairIntro',
  'hw.staff.submittedWork',
  'hw.staff.compareWork',
  'hw.staff.pickCompare',
  'hw.staff.pickCompareHint',
  'hw.staff.studentCritique',
  'hw.staff.studentCritiqueValue',
  'hw.staff.autoCommentLabel',
  'hw.staff.autoCommentValue',
  'hw.staff.editComment',
  'hw.staff.replaceComment',
  'hw.staff.commentHint',
  'hw.staff.teacherCommentLabel',
  'hw.staff.teacherCommentValue',
  'inspect.evidence.title',
  'inspect.evidence.intro',
  'inspect.evidence.studentWork',
  'inspect.evidence.studentCritique',
  'inspect.evidence.teacherComment',
  'report.staff.teacherComment',
  // Official locale supplement for the community observation line. zh-Hans stays BYTE-IDENTICAL, including 嘅 / 嚟 / 呢.
  'ci.tip.medium.alt',
  'ci.tip.medium.body',
  'lesson.f4u3l3.card.insight.body',
  'lesson.f4u3l3.card.observe.body',
  'lesson.f4u3l3.card.practice.body',
  'lesson.f4u3l3.card.theme.body',
  'lesson.f4u3l3.goal.2',
  'lesson.f4u3l3.part.expression',
  'lesson.f4u3l3.part.making',
  'lesson.f4u3l3.part.principle',
  'lesson.f4u3l4.card.make.body',
  'lesson.f4u3l4.part.principle',
  'unit.f4u3.strand.appreciate',
  'unit.f4u3.themeMessage',
  'visual.principles.near',
  'visual.trial',
  'worksheet.intro',
  'worksheet.l3.q2',
  'worksheet.l3.q3',
  'worksheet.l3.q4',
  'worksheet.l4.q2',
  // Official locale table for the community-art activity papers. zh-Hans stays BYTE-IDENTICAL, including 嘅 / 唔 / 喺 / 咗 / 睇.
  'worksheet.l3.intro',
  'worksheet.l4.intro',
  'worksheet.l3.prompt',
  'worksheet.l3.what',
  'worksheet.l3.case1.work',
  'worksheet.l3.case1.q',
  'worksheet.l3.case2.who',
  'worksheet.l3.case2.q',
  'worksheet.l3.contrast',
  'worksheet.l3.compare',
  'worksheet.section.notice',
  'worksheet.l3.notice',
  'worksheet.l3.vocab.communityArt',
  'worksheet.l3.vocab.publicArt',
  'worksheet.l3.vocab.audience',
  'worksheet.l3.vocab.senseOfPlace',
  'worksheet.l4.sketch',
  'worksheet.l4.reflect',
  'worksheet.l4.diary',
  'worksheet.l4.compare',
  'worksheet.l4.further',
])

const out = {}
const problems = []
for (const [key, value] of Object.entries(hant)) {
  const v = key in overrides ? overrides[key] : convert(value)
  if (CANTONESE.test(v) && !OFFICIAL_LOCALE_SUPPLEMENT.has(key)) problems.push(`${key}: ${v}`)
  out[key] = v
}
for (const key of Object.keys(overrides)) {
  if (!(key in hant)) problems.push(`override for unknown key: ${key}`)
}

if (problems.length) {
  console.error(`[gen-zh-hans] ${problems.length} string(s) need a zh-Hans override:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

const target = resolve(dir, 'zh-Hans.json')
const tmp = resolve(dir, '.zh-Hans.json.tmp')
writeFileSync(tmp, `${JSON.stringify(out, null, 2)}\n`)
renameSync(tmp, target)
console.log(`[gen-zh-hans] wrote ${Object.keys(out).length} strings (${Object.keys(overrides).length} hand-written overrides)`)
