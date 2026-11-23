import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { oauthReturnToClassroomMap } from './oauthReturn.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('google sign-in return from the classroom map', () => {
  it('keeps the code and puts a bare return on the classroom map', () => {
    assert.equal(
      oauthReturnToClassroomMap('https://preview.example/?code=abc'),
      '/?code=abc&ux=map1',
    )
    assert.equal(
      oauthReturnToClassroomMap('https://preview.example/?code=abc#keep'),
      '/?code=abc&ux=map1#keep',
    )
    assert.equal(oauthReturnToClassroomMap('https://preview.example/?ux=map1&code=abc'), null)
    assert.equal(oauthReturnToClassroomMap('https://preview.example/?code='), null)
    assert.equal(oauthReturnToClassroomMap('https://preview.example/'), null)
    assert.equal(oauthReturnToClassroomMap('https://preview.example/practice?code=abc'), null)
  })

  it('does not rewrite the marketing homepage or add an api file', () => {
    const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as {
      rewrites: { source: string; has?: { key: string }[]; destination: string }[]
    }
    const rootRules = vercel.rewrites.filter((rule) => rule.source === '/')
    assert.deepEqual(
      rootRules.map((rule) => ({ has: rule.has?.map((cond) => cond.key) ?? [], destination: rule.destination })),
      [
        { has: ['ux'], destination: '/classroom.html' },
        { has: ['code'], destination: '/classroom.html' },
        { has: [], destination: '/pages/landing.html' },
      ],
    )
    assert.equal(readFileSync(join(root, 'src/lib/auth.ts'), 'utf8').includes('redirectTo: window.location.origin'), true)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 14)
  })
})
