import { useState } from 'react'
import { avatarPalette, initialsFromName } from '../lib/artistMedia'

const SIZE_CLASS = {
  sm: 'h-9 w-9 text-[11px]',
  md: 'h-14 w-14 text-base',
  lg: 'h-28 w-28 text-3xl',
} as const

type AvatarSize = keyof typeof SIZE_CLASS

/**
 * Round portrait thumbnail, or a brand-coloured initials mark.
 * Never a generated or look-alike face. A failed image falls back to initials.
 */
export function ArtistAvatar({
  name,
  imageUrl,
  size = 'sm',
}: {
  name: string
  imageUrl: string | null
  size?: AvatarSize
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const show = Boolean(imageUrl) && failedSrc !== imageUrl

  const frame = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-teal-200 ${SIZE_CLASS[size]}`
  if (show && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${frame} object-cover`}
        loading={size === 'sm' ? 'lazy' : 'eager'}
        decoding="async"
        onError={() => setFailedSrc(imageUrl)}
      />
    )
  }

  return (
    <span aria-hidden className={`${frame} font-semibold leading-none ${avatarPalette(name)}`}>
      {initialsFromName(name)}
    </span>
  )
}
