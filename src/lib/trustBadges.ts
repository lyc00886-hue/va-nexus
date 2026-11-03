/**
 * PEANUTS trust / commitment labels (#34).
 * These are product commitments, not official seals or certification marks.
 */

export const TRUST_BADGE_IDS = ['academic-integrity', 'privacy-deidentify', 'support-direction'] as const

export type TrustBadgeId = (typeof TRUST_BADGE_IDS)[number]

export type TrustBadge = {
  id: TrustBadgeId
  shortTitle: string
  body: string
}

export type TrustBadgesFile = {
  meta: {
    id: string
    claimType: string
    locale: string
  }
  bannerIntro: string
  badges: TrustBadge[]
  footerDisclaimer: string
}

/** Hover or keyboard preview wins; otherwise the chip the reader pinned open. */
export function activeCommitmentId(pinned: string | null, preview: string | null): string | null {
  return preview || pinned || null
}

export function parseTrustBadges(value: unknown): TrustBadgesFile {
  if (!value || typeof value !== 'object') throw new Error('trust badges must be an object')
  const file = value as TrustBadgesFile
  if (file.meta?.claimType !== 'commitment-labels-only') {
    throw new Error('trust badges must stay commitment-labels-only')
  }
  if (typeof file.bannerIntro !== 'string' || file.bannerIntro.trim() === '') {
    throw new Error('trust badges need bannerIntro')
  }
  if (typeof file.footerDisclaimer !== 'string' || file.footerDisclaimer.trim() === '') {
    throw new Error('trust badges need footerDisclaimer')
  }
  if (!Array.isArray(file.badges) || file.badges.length !== TRUST_BADGE_IDS.length) {
    throw new Error('trust badges need exactly 3 labels')
  }
  file.badges.forEach((badge, index) => {
    if (badge?.id !== TRUST_BADGE_IDS[index]) {
      throw new Error(`trust badge ${index} must be ${TRUST_BADGE_IDS[index]}`)
    }
    if (typeof badge.shortTitle !== 'string' || badge.shortTitle.trim() === '') {
      throw new Error(`trust badge ${badge.id} needs a shortTitle`)
    }
    if (typeof badge.body !== 'string' || badge.body.trim() === '') {
      throw new Error(`trust badge ${badge.id} needs a body`)
    }
  })
  return file
}
