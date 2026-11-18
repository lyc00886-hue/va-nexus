/**
 * Google returns to `/?code=…` on this same host. That URL has no `ux`, so the
 * host would show the marketing page and never exchange the code. Keep the code
 * and put the return on the classroom map before the client reads the URL.
 */
export function oauthReturnToClassroomMap(href: string): string | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (url.pathname !== '/') return null
  const code = url.searchParams.get('code')
  if (!code) return null
  if (url.searchParams.has('ux')) return null
  url.searchParams.set('ux', 'map1')
  return `${url.pathname}${url.search}${url.hash}`
}
