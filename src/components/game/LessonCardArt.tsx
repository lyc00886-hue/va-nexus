import { useEffect, useState } from 'react'

/**
 * Optional in-lesson card illustration. No image (or a failed load) renders nothing,
 * so cards that have no `image` stay title + body.
 */
export function LessonCardArt({ image, credit }: { image?: string; credit?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [image])
  if (!image || failed) return null
  return (
    <figure className="mt-3" data-testid="lesson-card-art">
      <img
        src={image}
        alt=""
        width={1024}
        height={1024}
        loading="lazy"
        decoding="async"
        className="mx-auto max-h-80 w-full rounded-2xl bg-[#FFF9E9] object-contain"
        onError={() => setFailed(true)}
      />
      {credit ? <figcaption className="mt-1 text-[11px] leading-snug text-slate-500">{credit}</figcaption> : null}
    </figure>
  )
}
