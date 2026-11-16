import type { Metadata } from 'next'
import { messages, type PublicLocale } from './copy'

export const ORIGIN = 'https://va-nexus.vercel.app'
export const OG_IMAGE = `${ORIGIN}/icons/icon-512.png`

export const PAGES = {
  'zh-Hant': { htmlLang: 'zh-Hant', ogLocale: 'zh_HK', landing: '/', curriculum: '/curriculum' },
  en: { htmlLang: 'en', ogLocale: 'en_US', landing: '/en', curriculum: '/en/curriculum' },
  'zh-Hans': { htmlLang: 'zh-Hans', ogLocale: 'zh_CN', landing: '/zh-Hans', curriculum: '/zh-Hans/curriculum' },
} as const

const SWITCH = [
  ['zh-Hant', '繁'],
  ['en', 'EN'],
  ['zh-Hans', '简'],
] as const

const THEMES = ['hkdse', 'ib', 'igcse', 'ap', 'socratic', 'udl'] as const

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalOrganization',
      name: 'VA-Nexus',
      url: 'https://va-nexus.vercel.app/',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'VA-Nexus',
      url: 'https://va-nexus.vercel.app/',
    },
  ],
}

function absolute(path: string): string {
  return path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`
}

export function pageMeta(locale: PublicLocale, kind: 'landing' | 'curriculum'): Metadata {
  const bag = messages(locale)
  const path = PAGES[locale][kind]
  const title = bag[kind === 'landing' ? 'public.landing.title' : 'public.curriculum.title']
  const description = bag[kind === 'landing' ? 'public.landing.metaDescription' : 'public.curriculum.metaDescription']
  const url = absolute(path)
  return {
    title: { absolute: title ?? '' },
    description,
    alternates: {
      canonical: url,
      languages: {
        'zh-Hant': absolute(PAGES['zh-Hant'][kind]),
        en: absolute(PAGES.en[kind]),
        'zh-Hans': absolute(PAGES['zh-Hans'][kind]),
        'x-default': absolute(PAGES['zh-Hant'][kind]),
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: 'VA-Nexus',
      locale: PAGES[locale].ogLocale,
      images: [{ url: OG_IMAGE, alt: bag['public.og.imageAlt'] }],
    },
  }
}

function JsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
}

function Chrome({ locale, kind }: { locale: PublicLocale; kind: 'landing' | 'curriculum' }) {
  const bag = messages(locale)
  return (
    <header className="top">
      <a className="site" href={PAGES[locale].landing}>
        {bag['public.siteName']}
      </a>
      <nav className="langs">
        {SWITCH.map(([id, label], index) => (
          <span key={id}>
            {index > 0 ? <span aria-hidden="true"> / </span> : null}
            <a
              href={PAGES[id][kind]}
              hrefLang={PAGES[id].htmlLang}
              lang={PAGES[id].htmlLang}
              aria-current={id === locale ? 'page' : undefined}
            >
              {label}
            </a>
          </span>
        ))}
      </nav>
    </header>
  )
}

export function LandingPage({ locale }: { locale: PublicLocale }) {
  const bag = messages(locale)
  const curriculum = PAGES[locale].curriculum
  return (
    <>
      <JsonLd />
      <div className="wrap">
        <Chrome locale={locale} kind="landing" />
        <main>
          <h1>{bag['public.landing.headline']}</h1>
          <p>{bag['public.landing.intro']}</p>
          <p className="actions">
            <a className="cta" href="/?ux=map1">
              {bag['public.landing.ctaClassroom']}
            </a>
            <a className="cta secondary" href={curriculum}>
              {bag['public.landing.ctaCurriculum']}
            </a>
          </p>
          <ul className="themes">
            {THEMES.map((id) => (
              <li key={id}>
                <a href={curriculum}>{bag[`public.curriculum.${id}.title`]}</a>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </>
  )
}

export function CurriculumPage({ locale }: { locale: PublicLocale }) {
  const bag = messages(locale)
  return (
    <>
      <JsonLd />
      <div className="wrap">
        <Chrome locale={locale} kind="curriculum" />
        <main>
          <h1>{bag['public.curriculum.headline']}</h1>
          <p>{bag['public.curriculum.intro']}</p>
          {THEMES.map((id) => (
            <section key={id}>
              <h2>{bag[`public.curriculum.${id}.title`]}</h2>
              <p>{bag[`public.curriculum.${id}.body`]}</p>
            </section>
          ))}
          <p className="disclaimer">{bag['public.curriculum.disclaimer']}</p>
          <p className="actions">
            <a className="cta" href="/?ux=map1">
              {bag['public.landing.ctaClassroom']}
            </a>
          </p>
        </main>
      </div>
    </>
  )
}
