import { useId, useState } from 'react'
import { contentJson } from '../i18n/content'
import { activeCommitmentId, type TrustBadgesFile } from '../lib/trustBadges'
import { PrivacyLink } from './PrivacyModal'

/** Plain text chips. Not seals, medals, or certification marks. */
const CHIP = 'cursor-pointer rounded-full border px-3 py-1 text-left text-xs font-medium text-slate-700'

export function CommitmentBanner({ embedded = false }: { embedded?: boolean }) {
  const file = contentJson<TrustBadgesFile>('trust-badges')
  const introId = useId()
  const bodyId = useId()
  const [pinned, setPinned] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const activeId = activeCommitmentId(pinned, preview)
  const active = file.badges.find((badge) => badge.id === activeId) ?? null

  return (
    <section
      aria-labelledby={introId}
      data-testid="commitment-banner"
      className={embedded ? '' : 'rounded-2xl border border-slate-200 bg-white px-3 py-2.5'}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        setPinned(null)
        setPreview(null)
      }}
    >
      <p id={introId} className="text-xs font-medium text-slate-600">
        {file.bannerIntro}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {file.badges.map((badge) => {
          const open = active?.id === badge.id
          return (
            <li key={badge.id}>
              <button
                type="button"
                data-badge-id={badge.id}
                data-open={open ? 'true' : 'false'}
                aria-expanded={open}
                aria-controls={open ? bodyId : undefined}
                onClick={() => setPinned((current) => (current === badge.id ? null : badge.id))}
                onMouseEnter={() => setPreview(badge.id)}
                onMouseLeave={() => setPreview((current) => (current === badge.id ? null : current))}
                onFocus={() => setPreview(badge.id)}
                onBlur={() => setPreview((current) => (current === badge.id ? null : current))}
                className={
                  open
                    ? `${CHIP} border-slate-400 bg-slate-100 font-semibold text-slate-900`
                    : `${CHIP} border-slate-300 bg-white hover:bg-slate-50`
                }
              >
                {badge.shortTitle}
              </button>
            </li>
          )
        })}
      </ul>
      {active && (
        <p id={bodyId} data-testid="commitment-banner-body" className="mt-2 text-sm leading-relaxed text-slate-700">
          {active.body}
        </p>
      )}
      <p data-testid="commitment-banner-disclaimer" className="mt-2 text-[11px] leading-relaxed text-slate-500">
        {file.footerDisclaimer}
      </p>
    </section>
  )
}

export function CommitmentFooter({ dataLine }: { dataLine: string }) {
  const file = contentJson<TrustBadgesFile>('trust-badges')
  const introId = useId()

  return (
    <footer className="mt-8 border-t border-slate-200 pt-5" data-testid="site-footer">
      <section aria-labelledby={introId} data-testid="commitment-footer">
        <p id={introId} className="text-xs font-semibold text-slate-600">
          {file.bannerIntro}
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {file.badges.map((badge) => (
            <li
              key={badge.id}
              data-badge-id={badge.id}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
            >
              <p className="text-sm font-semibold text-slate-800">{badge.shortTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{badge.body}</p>
            </li>
          ))}
        </ul>
        <p data-testid="commitment-footer-disclaimer" className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {file.footerDisclaimer}
        </p>
      </section>
      <p className="mt-4 text-center text-[11px] text-slate-400">
        {dataLine} · <PrivacyLink />
      </p>
    </footer>
  )
}
