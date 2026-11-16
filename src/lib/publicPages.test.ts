import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { OFFICIAL_PUBLIC_COPY, PUBLIC_KEYS, type PublicLocale } from '../public/officialCopy.ts'
import { resolvePublicRoute } from '../../scripts/resolve-public-route.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dist = join(root, 'dist')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const messages = (path: string) => JSON.parse(read(path)) as Record<string, string>

const ORIGIN = 'https://va-nexus.vercel.app'
const OG_IMAGE = `${ORIGIN}/icons/icon-512.png`
const ICON_SHA = '554eb43194344df745c7cbab06b78d6d86cf7a250ea3d9925304c72fd19a4f3d'
const THEMES = ['hkdse', 'ib', 'igcse', 'ap', 'socratic', 'udl'] as const
const LOCALES = ['zh-Hant', 'en', 'zh-Hans'] as const satisfies readonly PublicLocale[]
const PATHS: Record<PublicLocale, { landing: string; curriculum: string }> = {
  'zh-Hant': { landing: '/', curriculum: '/curriculum' },
  en: { landing: '/en', curriculum: '/en/curriculum' },
  'zh-Hans': { landing: '/zh-Hans', curriculum: '/zh-Hans/curriculum' },
}
const OG_LOCALE: Record<PublicLocale, string> = { 'zh-Hant': 'zh_HK', en: 'en_US', 'zh-Hans': 'zh_CN' }
const HREFLANG: Record<PublicLocale, string> = { 'zh-Hant': 'zh-Hant', en: 'en', 'zh-Hans': 'zh-Hans' }
const SWITCH: Record<PublicLocale, string> = { 'zh-Hant': '繁', en: 'EN', 'zh-Hans': '简' }

const FORBIDDEN = [
  'ArtInSight',
  '洞察艺术',
  '洞察藝術',
  'ArtGPT',
  'Unlock the limit',
  '評分校準',
  '评分校准',
  '開閘',
  '开闸',
  'RELAY',
  'raiders',
  '學生面',
  '学生面',
  '教師面',
  '教师面',
  'Soft Coord',
  'Soft QA',
  'Soft SCOUT',
  '课游記',
  '課游記',
  '课游记',
  'keyouji',
  'Grok AI',
  'Grok',
  '奪星',
  '夺星',
  '競技場',
  '竞技场',
  '3★',
]

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
}

function attrs(source: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([^\s=/>]+)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) out[match[1].toLowerCase()] = decode(match[2])
  return out
}

function tags(html: string, name: string): Record<string, string>[] {
  const out: Record<string, string>[] = []
  const re = new RegExp(`<${name}\\b([^>]*)>`, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) out.push(attrs(match[1] ?? ''))
  return out
}

function visibleText(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? ''
  const without = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  return decode(without.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function absolute(path: string): string {
  return path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`
}

function tsFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...tsFiles(path))
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(path.slice(dir.length + 1))
  }
  return out.sort()
}

describe('official public copy', () => {
  const hant = messages('src/i18n/zh-Hant.json')
  const en = messages('src/i18n/en.json')
  const hans = messages('src/i18n/zh-Hans.json')
  const overrides = messages('src/i18n/zh-Hans.overrides.json')

  it('keeps the 25 keys byte-exact in zh-Hant, en, zh-Hans, and overrides', () => {
    assert.equal(PUBLIC_KEYS.length, 25)
    for (const key of PUBLIC_KEYS) {
      assert.equal(hant[key], OFFICIAL_PUBLIC_COPY['zh-Hant'][key], key)
      assert.equal(en[key], OFFICIAL_PUBLIC_COPY.en[key], key)
      assert.equal(hans[key], OFFICIAL_PUBLIC_COPY['zh-Hans'][key], key)
      assert.equal(overrides[key], OFFICIAL_PUBLIC_COPY['zh-Hans'][key], key)
      assert.equal(/[\u7684\u628A\u5572]/.test(hant[key]), false, key)
    }
  })

  it('keeps the web manifest bytes except start_url', () => {
    const original = spawnSync('git', ['show', 'HEAD:public/site.webmanifest'], { cwd: root, encoding: 'utf8' })
    assert.equal(original.status, 0)
    const current = read('public/site.webmanifest')
    assert.equal(current, original.stdout.replace('"start_url": "/"', '"start_url": "/?ux=map1"'))
    const manifest = JSON.parse(current) as {
      name: string
      short_name: string
      start_url: string
      theme_color: string
      background_color: string
    }
    assert.equal(manifest.start_url, '/?ux=map1')
    assert.equal(manifest.name, 'VA-Nexus AI')
    assert.equal(manifest.short_name, 'VA-Nexus')
    assert.equal(manifest.theme_color, '#0D9488')
    assert.equal(manifest.background_color, '#FFF9E9')
  })

  it('leaves the 512 icon byte-identical and keeps 11 api TypeScript files', () => {
    const icon = readFileSync(join(root, 'public/icons/icon-512.png'))
    assert.equal(icon.length, 184664)
    assert.equal(createHash('sha256').update(icon).digest('hex'), ICON_SHA)
    const fromGit = spawnSync('git', ['show', 'HEAD:public/icons/icon-512.png'], { cwd: root })
    assert.equal(fromGit.status, 0)
    assert.deepEqual(icon, fromGit.stdout)
    const now = tsFiles(join(root, 'api'))
    assert.equal(now.length, 11)
    const listed = spawnSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', 'api'], { cwd: root, encoding: 'utf8' })
    assert.equal(listed.status, 0)
    const before = listed.stdout
      .split('\n')
      .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
      .map((name) => name.slice('api/'.length))
      .sort()
    assert.deepEqual(now, before)
  })
})

describe('no-JS first HTML', () => {
  let base = ''
  let server: Server | null = null

  before(async () => {
    const built = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })
    assert.equal(built.status, 0)
    assert.equal(existsSync(join(dist, 'index.html')), false)
    assert.equal(existsSync(join(dist, 'classroom.html')), true)
    const vercel = JSON.parse(read('vercel.json')) as { rewrites: { source: string; destination: string }[] }
    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const hit = resolvePublicRoute(dist, url, vercel.rewrites)
      if (hit.status === 308 && hit.location) {
        res.writeHead(308, { Location: hit.location })
        res.end()
        return
      }
      if (hit.status !== 200 || !hit.file) {
        res.writeHead(hit.status)
        res.end()
        return
      }
      const body = readFileSync(hit.file)
      const type = hit.file.endsWith('.html')
        ? 'text/html; charset=utf-8'
        : hit.file.endsWith('.xml')
          ? 'application/xml; charset=utf-8'
          : hit.file.endsWith('.txt')
            ? 'text/plain; charset=utf-8'
            : hit.file.endsWith('.png')
              ? 'image/png'
              : 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': type })
      res.end(body)
    })
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (address == null || typeof address === 'string') throw new Error('no port')
    base = `http://127.0.0.1:${address.port}`
  }, { timeout: 300_000 })

  after(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()))
    })
  })

  async function html(path: string): Promise<{ status: number; body: string; type: string }> {
    const response = await fetch(`${base}${path}`)
    return {
      status: response.status,
      type: response.headers.get('content-type') ?? '',
      body: await response.text(),
    }
  }

  function assertPage(body: string, locale: PublicLocale, kind: 'landing' | 'curriculum') {
    const bag = OFFICIAL_PUBLIC_COPY[locale]
    const path = PATHS[locale][kind]
    const title = bag[kind === 'landing' ? 'public.landing.title' : 'public.curriculum.title']
    const description = bag[kind === 'landing' ? 'public.landing.metaDescription' : 'public.curriculum.metaDescription']
    const decoded = decode(body)
    assert.equal(decoded.includes('<title>') && body.match(/<title>([^<]*)<\/title>/)?.[1] && decode(body.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''), title)
    const meta = tags(body, 'meta').find((tag) => tag.name === 'description')
    assert.equal(meta?.content, description)
    const og = (property: string) => tags(body, 'meta').find((tag) => tag.property === property)
    assert.equal(og('og:title')?.content, title)
    assert.equal(og('og:description')?.content, description)
    assert.equal(og('og:type')?.content, 'website')
    assert.equal(og('og:url')?.content, absolute(path))
    assert.equal(og('og:image')?.content, OG_IMAGE)
    assert.equal(og('og:image:alt')?.content, bag['public.og.imageAlt'])
    assert.equal(og('og:locale')?.content, OG_LOCALE[locale])
    assert.equal(og('og:site_name')?.content, 'VA-Nexus')
    const link = tags(body, 'link')
    assert.equal(link.find((tag) => tag.rel === 'canonical')?.href, absolute(path))
    for (const item of LOCALES) {
      const alternate = link.find((tag) => tag.rel === 'alternate' && tag.hreflang === HREFLANG[item])
      assert.equal(alternate?.href, absolute(PATHS[item][kind]), item)
    }
    const blocks = [...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    assert.equal(blocks.length > 0, true)
    const graph = JSON.parse(blocks.map((block) => block[1]).join('')) as {
      '@graph': { '@type': string; name?: string; url?: string; aggregateRating?: unknown }[]
    }
    const types = graph['@graph'].map((node) => node['@type'])
    assert.equal(types.includes('EducationalOrganization'), true)
    assert.equal(types.includes('SoftwareApplication'), true)
    for (const node of graph['@graph']) {
      assert.equal(node.name, 'VA-Nexus')
      assert.equal(node.url, `${ORIGIN}/`)
      assert.equal(node.aggregateRating, undefined)
    }
    assert.equal(decoded.includes('aggregateRating'), false)
    const text = visibleText(body)
    for (const id of THEMES) assert.equal(text.includes(bag[`public.curriculum.${id}.title`]), true, id)
    if (kind === 'landing') {
      for (const key of [
        'public.landing.headline',
        'public.landing.intro',
        'public.landing.ctaClassroom',
        'public.landing.ctaCurriculum',
      ] as const) {
        assert.equal(text.includes(bag[key]), true, key)
      }
    } else {
      for (const key of ['public.curriculum.headline', 'public.curriculum.intro', 'public.curriculum.disclaimer'] as const) {
        assert.equal(text.includes(bag[key]), true, key)
      }
      for (const id of THEMES) assert.equal(text.includes(bag[`public.curriculum.${id}.body`]), true, id)
    }
    assert.equal(text.includes(bag['public.siteName']), true)
    const anchors = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
      href: attrs(match[1] ?? '').href,
      text: decode((match[2] ?? '').replace(/<[^>]+>/g, '')).trim(),
    }))
    assert.equal(anchors.find((anchor) => anchor.text === bag['public.landing.ctaClassroom'])?.href, '/?ux=map1')
    if (kind === 'landing') {
      assert.equal(anchors.find((anchor) => anchor.text === bag['public.landing.ctaCurriculum'])?.href, PATHS[locale].curriculum)
    }
    for (const item of LOCALES) {
      assert.equal(anchors.find((anchor) => anchor.text === SWITCH[item])?.href, PATHS[item][kind])
    }
    assert.equal(body.includes('id="root"'), false)
    assert.equal(/@keyframes|animation\s*:|transition\s*:/i.test(body), false)
    for (const token of FORBIDDEN) assert.equal(text.includes(token), false, token)
    assert.equal(/\bSoft\b/.test(text), false)
    assert.equal(/\bSEN\b/.test(text), false)
    assert.equal(/\bgenerate\b/.test(text), false)
    assert.equal(/\bclaim\b/.test(text), false)
  }

  for (const locale of LOCALES) {
    for (const kind of ['landing', 'curriculum'] as const) {
      it(`serves ${locale} ${kind} copy without JavaScript`, async () => {
        const response = await html(PATHS[locale][kind])
        assert.equal(response.status, 200)
        assert.match(response.type, /text\/html/)
        assertPage(response.body, locale, kind)
      })
    }
  }

  it('keeps ux query modes on the Vite student shell', async () => {
    for (const path of ['/?ux=map1', '/?ux=classic', '/?ux=off', '/?ux=steps', '/?ux=map1&track=f4', '/about', '/overview']) {
      const response = await html(path)
      assert.equal(response.status, 200, path)
      assert.match(response.body, /<div id="root"><\/div>/, path)
      assert.match(response.body, /<title>VA-Nexus<\/title>/, path)
      assert.match(response.body, /name="theme-color" content="#0D9488"/, path)
      assert.equal(response.body.includes('og:title'), false, path)
      assert.equal(response.body.includes('EducationalOrganization'), false, path)
      assert.equal(response.body.includes(OFFICIAL_PUBLIC_COPY['zh-Hant']['public.landing.headline']), false, path)
    }
  })

  it('serves robots.txt and sitemap.xml instead of the shell', async () => {
    const robots = await html('/robots.txt')
    assert.equal(robots.status, 200)
    assert.equal(robots.body.includes('<div id="root">'), false)
    assert.match(robots.body, /Sitemap: https:\/\/va-nexus\.vercel\.app\/sitemap\.xml/)
    const sitemap = await html('/sitemap.xml')
    assert.equal(sitemap.status, 200)
    assert.equal(sitemap.body.includes('<div id="root">'), false)
    for (const locale of LOCALES) {
      for (const kind of ['landing', 'curriculum'] as const) {
        assert.equal(sitemap.body.includes(`<loc>${absolute(PATHS[locale][kind])}</loc>`), true, PATHS[locale][kind])
      }
    }
    const slash = await fetch(`${base}/curriculum/`, { redirect: 'manual' })
    assert.equal(slash.status, 308)
    assert.equal(slash.headers.get('location'), '/curriculum')
  })

  it('keeps the brand icon on its public URL', async () => {
    const response = await fetch(`${base}/icons/icon-512.png`)
    assert.equal(response.status, 200)
    const bytes = Buffer.from(await response.arrayBuffer())
    assert.equal(bytes.length, 184664)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), ICON_SHA)
  })
})
