import { LandingPage, pageMeta } from '../../lib/pages'

export const metadata = pageMeta('zh-Hant', 'landing')

export default function Page() {
  return <LandingPage locale="zh-Hant" />
}
