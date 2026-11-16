#!/usr/bin/env node
// Builds the Next.js public pages and places them next to the Vite student shell.
// Vite still emits dist/index.html. This renames that shell to classroom.html so
// "/" is free for the zh-Hant landing rewrite.
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const publicPages = join(root, 'public-pages')
const dist = join(root, 'dist')
const out = join(publicPages, 'out')

const require = createRequire(join(publicPages, 'package.json'))
const nextBin = join(dirname(require.resolve('next/package.json')), 'dist', 'bin', 'next')
const built = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: publicPages,
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
})
if (built.status !== 0) process.exit(built.status ?? 1)

if (!existsSync(dist)) {
  console.error('dist/ is missing. Run vite build first.')
  process.exit(1)
}

const indexHtml = join(dist, 'index.html')
const classroom = join(dist, 'classroom.html')
if (existsSync(indexHtml)) {
  rmSync(classroom, { force: true })
  renameSync(indexHtml, classroom)
}
if (!existsSync(classroom)) {
  console.error('classroom shell missing at dist/classroom.html')
  process.exit(1)
}

const pagesDir = join(dist, 'pages')
rmSync(pagesDir, { recursive: true, force: true })
mkdirSync(pagesDir, { recursive: true })

function must(rel) {
  const file = join(out, rel)
  if (!existsSync(file)) {
    console.error(`missing Next export ${rel}`)
    console.error(readdirSync(out, { recursive: true }).slice(0, 100).join('\n'))
    process.exit(1)
  }
  return file
}

const exported = [
  ['index.html', 'landing.html'],
  ['curriculum.html', 'curriculum.html'],
  ['en.html', 'en.html'],
  ['en/curriculum.html', 'en-curriculum.html'],
  ['zh-Hans.html', 'zh-Hans.html'],
  ['zh-Hans/curriculum.html', 'zh-Hans-curriculum.html'],
]
for (const [from, to] of exported) cpSync(must(from), join(pagesDir, to))

const nextStatic = join(out, '_next')
if (existsSync(nextStatic)) {
  rmSync(join(dist, '_next'), { recursive: true, force: true })
  cpSync(nextStatic, join(dist, '_next'), { recursive: true })
}
