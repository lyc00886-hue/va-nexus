import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

function filesystemFile(distRoot, pathname) {
  const rel = pathname.replace(/^\/+/, '')
  if (!rel) return null
  const direct = join(distRoot, rel)
  if (existsSync(direct) && statSync(direct).isFile()) return direct
  return null
}

function sourceMatches(source, pathname) {
  if (source.includes('(')) return new RegExp(`^${source}$`).test(pathname)
  return source === pathname
}

function hasOk(rule, url) {
  if (!rule.has) return true
  return rule.has.every((cond) => {
    if (cond.type !== 'query') return false
    if (!url.searchParams.has(cond.key)) return false
    if (cond.value == null) return true
    return url.searchParams.get(cond.key) === cond.value
  })
}

/**
 * Filesystem first, then vercel.json rewrites, matching the deployed Vite project.
 * `trailingSlash: false` redirects a trailing slash before that lookup.
 */
export function resolvePublicRoute(distRoot, requestUrl, rewrites) {
  const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl, 'http://127.0.0.1')
  const pathname = url.pathname
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return { status: 308, location: `${pathname.replace(/\/+$/, '')}${url.search}` }
  }
  const file = filesystemFile(distRoot, pathname)
  if (file) return { status: 200, file }
  for (const rule of rewrites) {
    if (!sourceMatches(rule.source, pathname) || !hasOk(rule, url)) continue
    const dest = filesystemFile(distRoot, rule.destination)
    if (!dest) return { status: 404, missing: rule.destination }
    return { status: 200, file: dest, rewrite: rule.destination }
  }
  return { status: 404 }
}
