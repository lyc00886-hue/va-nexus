import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { artistName } from '../../game/lessonArtistLabels'
import type { LessonArtistRef } from '../../game/types'
import { t } from '../../i18n'

/** Non-interactive chips for inside a lesson-node button. */
export function LessonArtistChips({ artists }: { artists: LessonArtistRef[] }) {
  return (
    <span className="mt-2 flex flex-wrap gap-2">
      {artists.map((artist) => (
        <ArtistChip key={artist.artistId} artist={artist} />
      ))}
    </span>
  )
}

function ArtistChip({ artist }: { artist: LessonArtistRef }) {
  const name = artistName(artist.artistId)
  const [failed, setFailed] = useState(false)
  const show = Boolean(artist.thumb) && !failed
  return (
    <span className="flex w-[7.25rem] max-w-full flex-col gap-1">
      {show && artist.thumb ? (
        <img
          src={artist.thumb}
          alt={t('map.artists.thumbAlt', { name })}
          width={116}
          height={80}
          loading="lazy"
          decoding="async"
          className="h-20 w-full rounded-lg bg-slate-100 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 px-1 text-center text-[10px] font-medium leading-tight text-slate-500">
          {t('ac.media.empty')}
        </span>
      )}
      <span className="text-[11px] font-semibold leading-tight text-slate-800">{name}</span>
      {show && artist.credit ? <span className="line-clamp-3 text-[10px] leading-snug text-slate-500">{artist.credit}</span> : null}
    </span>
  )
}

/** Lesson-player strip: cleared thumbs can enlarge; everyone else stays a placeholder. */
export function LessonArtistPanel({ artists }: { artists: LessonArtistRef[] }) {
  const uid = useId()
  const headingId = `${uid}-artists`
  const [openId, setOpenId] = useState<string | null>(null)
  const openIdRef = useRef<string | null>(null)
  const close = useCallback(() => {
    const id = openIdRef.current
    openIdRef.current = null
    setOpenId(null)
    if (!id) return
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-artist-open="${CSS.escape(`${uid}:${id}`)}"]`)?.focus()
    })
  }, [uid])
  const open = artists.find((artist) => artist.artistId === openId && artist.thumb)
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-sm font-bold text-slate-900">
        {t('map.artists.heading')}
      </h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {artists.map((artist) => (
          <li key={artist.artistId}>
            <ArtistCard
              artist={artist}
              openToken={`${uid}:${artist.artistId}`}
              onOpen={
                artist.thumb
                  ? () => {
                      openIdRef.current = artist.artistId
                      setOpenId(artist.artistId)
                    }
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
      {open ? <ArtistDialog artist={open} onClose={close} /> : null}
    </section>
  )
}

function ArtistCard({
  artist,
  openToken,
  onOpen,
}: {
  artist: LessonArtistRef
  openToken: string
  onOpen?: () => void
}) {
  const name = artistName(artist.artistId)
  const [failed, setFailed] = useState(false)
  const show = Boolean(artist.thumb) && !failed
  const title = artist.credit || name
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-2">
      {show && artist.thumb ? (
        <button
          type="button"
          data-artist-open={openToken}
          onClick={onOpen}
          className="flex min-h-28 items-center justify-center overflow-hidden rounded-xl bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <img
            src={artist.thumb}
            alt=""
            width={678}
            height={860}
            decoding="async"
            className="max-h-40 w-full object-contain"
            onError={() => setFailed(true)}
          />
          <span className="sr-only">{t('ac.media.enlarge', { title })}</span>
        </button>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 text-center text-xs font-medium text-slate-500">
          {t('ac.media.empty')}
        </div>
      )}
      <ArtistCredit artist={artist} name={name} show={show} />
    </figure>
  )
}

function ArtistCredit({ artist, name, show }: { artist: LessonArtistRef; name: string; show: boolean }) {
  return (
    <figcaption className="mt-2 space-y-0.5 px-1 text-[11px] leading-snug text-slate-600">
      <span className="block font-semibold text-slate-900">{name}</span>
      {show && artist.credit ? <span className="block">{artist.credit}</span> : null}
      {show && artist.license ? (
        <span className="block">
          <span className="font-medium text-slate-500">{t('ac.media.license')}: </span>
          {artist.license}
        </span>
      ) : null}
      {show && artist.sourceUrl ? (
        <a
          href={artist.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-medium text-blue-700 underline-offset-2 hover:underline"
        >
          {t('ac.media.source')}
        </a>
      ) : null}
    </figcaption>
  )
}

function ArtistDialog({ artist, onClose }: { artist: LessonArtistRef; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [failed, setFailed] = useState(false)
  const name = artistName(artist.artistId)
  const title = artist.credit || name
  const show = Boolean(artist.thumb) && !failed

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/75 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-artist-dialog-title"
        className="max-h-[100dvh] w-full overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-h-[92vh] sm:max-w-3xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur">
          <h2 id="lesson-artist-dialog-title" className="min-w-0 truncate text-sm font-bold text-slate-900">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-6">
          {show && artist.thumb ? (
            <img
              src={artist.thumb}
              alt={t('map.artists.thumbAlt', { name })}
              className="mx-auto max-h-[70dvh] w-full object-contain"
              decoding="async"
              onError={() => setFailed(true)}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-600">
              {t('ac.media.empty')}
            </p>
          )}
          <ArtistCredit artist={artist} name={name} show={show} />
        </div>
      </div>
    </div>
  )
}
