import { LandingPage, pageMeta } from '../../../lib/pages'

export const metadata = pageMeta('zh-Hans', 'landing')

export default function Page() {
  return <LandingPage locale="zh-Hans" />
}
