#!/usr/bin/env node
// Generates src/i18n/zh-Hans.json from zh-Hant.json with OpenCC (HK → mainland CN),
// then applies hand-written overrides (zh-Hans.overrides.json) for strings that need
// rewriting from Cantonese into standard written Chinese. Fails if any Cantonese
// marker remains so new strings can't slip through unreviewed.
import { readFileSync, writeFileSync } from 'node:fs'
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

const out = {}
const problems = []
for (const [key, value] of Object.entries(hant)) {
  const v = key in overrides ? overrides[key] : convert(value)
  if (CANTONESE.test(v)) problems.push(`${key}: ${v}`)
  out[key] = v
}
for (const key of Object.keys(overrides)) {
  if (!(key in hant)) problems.push(`override for unknown key: ${key}`)
}

if (problems.length) {
  console.error(`[gen-zh-hans] ${problems.length} string(s) need a zh-Hans override:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

writeFileSync(resolve(dir, 'zh-Hans.json'), `${JSON.stringify(out, null, 2)}\n`)
console.log(`[gen-zh-hans] wrote ${Object.keys(out).length} strings (${Object.keys(overrides).length} hand-written overrides)`)
