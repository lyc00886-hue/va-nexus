import { X } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { getLocale, t } from '../i18n'
import {
  displayImageUrl,
  mediaTitle,
  safeHttpUrl,
  type ArtistMedia,
  type ArtistMediaBundle,
} from '../lib/artistMedia'
import type { Artist } from '../types'
import { ArtistAvatar } from './ArtistAvatar'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

function trapTab(event: KeyboardEvent, root: HTMLElement | null) {
  if (event.key !== 'Tab' || !root) return
  const nodes = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
  )
  if (nodes.length === 0) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  const active = document.activeElement
  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

export function ArtistDetail({
  artist,
  name,
  secondaryName,
  bundle,
  paragraphs,
  easyRead,
  onClose,
}: {
  artist: Artist
  name: string
  secondaryName: string | null
  bundle: ArtistMediaBundle
  paragraphs: string[]
  easyRead: boolean
  onClose: () => void
}) {
  const [lightbox, setLightbox] = useState<ArtistMedia | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const lightboxRef = useRef<HTMLDivElement>(null)
  const lightboxCloseRef = useRef<HTMLButtonElement>(null)
  const artistSource = safeHttpUrl(artist.source_url)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    backRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (!lightbox) return
    lightboxCloseRef.current?.focus()
  }, [lightbox])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (lightbox) {
          const id = lightbox.id
          setLightbox(null)
          requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(`[data-artwork-open="${CSS.escape(id)}"]`)?.focus()
          })
        } else {
          onClose()
        }
        return
      }
      trapTab(event, lightbox ? lightboxRef.current : panelRef.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, onClose])

  const textCls = easyRead ? 'text-base leading-loose' : 'text-sm leading-relaxed'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={lightbox ? undefined : true}
        aria-labelledby="artist-detail-title"
        inert={lightbox ? true : undefined}
        className="max-h-[100dvh] w-full overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-teal-100 bg-white/95 px-3 py-2 backdrop-blur">
          <button
            ref={backRef}
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
          >
            {t('ac.media.back')}
          </button>
          <h2 id="artist-detail-title" className="min-w-0 flex-1 truncate text-base font-bold text-teal-950">
            {name}
          </h2>
        </div>

        <div className="space-y-5 px-4 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            <Portrait name={name} imageUrl={bundle.portraitUrl} />
            <div className="min-w-0">
              {secondaryName ? <p className="text-sm text-teal-800/80">{secondaryName}</p> : null}
              <p className="mt-1 text-xs text-teal-700/80">
                {[artist.culture_group, artist.era, artist.medium].filter(Boolean).join(' · ')}
              </p>
              {artistSource ? (
                <a
                  href={artistSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
                >
                  {t('ac.source')}
                </a>
              ) : null}
            </div>
          </div>

          {paragraphs.length > 0 ? (
            easyRead ? (
              <ul className={`list-disc space-y-1.5 pl-5 text-teal-950 ${textCls}`}>
                {paragraphs.map((paragraph) => (
                  <li key={paragraph}>{paragraph}</li>
                ))}
              </ul>
            ) : (
              <div className={`space-y-2 text-teal-950/90 ${textCls}`}>
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )
          ) : null}

          {artist.themes.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {artist.themes.map((theme) => (
                <li
                  key={theme}
                  className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800"
                >
                  {theme}
                </li>
              ))}
            </ul>
          ) : null}

          <section aria-labelledby="artist-artworks-title">
            <h3 id="artist-artworks-title" className="text-sm font-bold text-teal-950">
              {t('ac.media.artworks')}
            </h3>
            {bundle.artworks.length > 0 ? (
              <ul className="mt-3 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
                {bundle.artworks.map((item, index) => (
                  <li key={item.id}>
                    <ArtworkFigure item={item} eager={index < 2} onOpen={setLightbox} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-teal-950">{t('ac.media.empty')}</p>
                {artistSource ? (
                  <a
                    href={artistSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-teal-700 underline-offset-2 hover:underline"
                  >
                    {t('ac.source')}
                  </a>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>

      {lightbox ? (
        <ArtworkLightbox
          item={lightbox}
          panelRef={lightboxRef}
          closeRef={lightboxCloseRef}
          onClose={() => {
            const id = lightbox.id
            setLightbox(null)
            requestAnimationFrame(() => {
              document.querySelector<HTMLElement>(`[data-artwork-open="${CSS.escape(id)}"]`)?.focus()
            })
          }}
        />
      ) : null}
    </div>
  )
}

function Portrait({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const show = Boolean(imageUrl) && failedSrc !== imageUrl

  return (
    <figure className="shrink-0">
      <figcaption className="sr-only">{t('ac.media.portrait')}</figcaption>
      {show && imageUrl ? (
        <img
          src={imageUrl}
          alt={t('ac.media.portraitAlt', { name })}
          className="h-28 w-28 rounded-2xl bg-teal-50 object-cover ring-1 ring-teal-200 sm:h-36 sm:w-36"
          decoding="async"
          onError={() => setFailedSrc(imageUrl)}
        />
      ) : (
        <ArtistAvatar name={name} imageUrl={null} size="lg" />
      )}
    </figure>
  )
}

function ArtworkFigure({
  item,
  eager,
  onOpen,
}: {
  item: ArtistMedia
  eager: boolean
  onOpen: (item: ArtistMedia) => void
}) {
  const src = displayImageUrl(item)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const title = mediaTitle(item, getLocale()) || t('ac.media.untitled')
  const show = Boolean(src) && failedSrc !== src

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-teal-100 bg-white p-2 shadow-sm">
      {show && src ? (
        <button
          type="button"
          data-artwork-open={item.id}
          onClick={() => onOpen(item)}
          className="mx-auto flex w-fit max-w-full justify-center overflow-hidden rounded-xl bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <img
            src={src}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="block max-h-72 w-auto max-w-full object-contain"
            onError={() => setFailedSrc(src)}
          />
          <span className="sr-only">{t('ac.media.enlarge', { title })}</span>
        </button>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-teal-200 bg-teal-50/80 px-3 text-center text-xs font-medium text-teal-900 sm:h-56">
          {t('ac.media.empty')}
        </div>
      )}
      <MediaCredit item={item} title={title} />
    </figure>
  )
}

function ArtworkLightbox({
  item,
  panelRef,
  closeRef,
  onClose,
}: {
  item: ArtistMedia
  panelRef: RefObject<HTMLDivElement | null>
  closeRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const src = displayImageUrl(item)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const title = mediaTitle(item, getLocale()) || t('ac.media.untitled')
  const show = Boolean(src) && failedSrc !== src

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/75 sm:items-center sm:p-4"
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="artwork-lightbox-title"
        aria-describedby="artwork-lightbox-note"
        className="max-h-[100dvh] w-full overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-h-[92vh] sm:max-w-3xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-teal-100 bg-white/95 px-3 py-2 backdrop-blur">
          <h2 id="artwork-lightbox-title" className="min-w-0 truncate text-sm font-bold text-teal-950">
            {title}
          </h2>
          <p id="artwork-lightbox-note" className="sr-only">
            {t('ac.media.lightbox')}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-teal-800 hover:bg-teal-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-6">
          {show && src ? (
            <img
              src={src}
              alt=""
              className="mx-auto max-h-[70dvh] w-full object-contain"
              decoding="async"
              onError={() => setFailedSrc(src)}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/80 px-4 py-10 text-center text-sm font-semibold text-teal-950">
              {t('ac.media.empty')}
            </p>
          )}
          <MediaCredit item={item} title={title} />
        </div>
      </div>
    </div>
  )
}

function MediaCredit({ item, title }: { item: ArtistMedia; title: string }) {
  const source = safeHttpUrl(item.source_url)
  return (
    <figcaption className="mt-2 space-y-0.5 px-1 text-[11px] leading-snug text-teal-800/90">
      <span className="block font-semibold text-teal-950">
        {title}
        {item.year != null ? <span className="font-medium text-teal-700"> · {item.year}</span> : null}
      </span>
      {item.credit ? (
        <span className="block">
          <span className="font-medium text-teal-700">{t('ac.media.credit')}: </span>
          {item.credit}
        </span>
      ) : null}
      {item.license ? (
        <span className="block">
          <span className="font-medium text-teal-700">{t('ac.media.license')}: </span>
          {item.license}
        </span>
      ) : null}
      {source ? (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-medium text-teal-700 underline-offset-2 hover:underline"
        >
          {t('ac.media.source')}
        </a>
      ) : null}
    </figcaption>
  )
}
