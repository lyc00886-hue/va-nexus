import { LandingPage, pageMeta } from '../../../lib/pages'

export const metadata = pageMeta('en', 'landing')

export default function Page() {
  return <LandingPage locale="en" />
}
