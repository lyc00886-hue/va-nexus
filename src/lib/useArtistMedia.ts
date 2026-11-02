import { useEffect, useState } from 'react'
import {
  indexArtistMedia,
  parseArtistMedia,
  type ArtistMedia,
  type ArtistMediaBundle,
} from './artistMedia'
import { supabase } from './supabase'

/**
 * Load every artist_media row once.
 * If the table is missing, the request fails, or Supabase is not configured,
 * the map stays empty and the UI shows initials / the empty-gallery placeholder.
 */
export function useArtistMedia(): Map<string, ArtistMediaBundle> {
  const [bundles, setBundles] = useState<Map<string, ArtistMediaBundle>>(() => {
    const preview = readDevPreview()
    return preview ? indexArtistMedia(preview) : new Map()
  })

  useEffect(() => {
    if (readDevPreview() || !supabase) return

    let cancelled = false
    const client = supabase
    void (async () => {
      try {
        const { data, error } = await client.from('artist_media').select('*')
        if (cancelled) return
        if (error) {
          console.warn(
            '[artist_media] unavailable; showing initials and placeholders',
            error.code,
            error.message,
          )
          setBundles(new Map())
          return
        }
        const rows = (Array.isArray(data) ? data : [])
          .map((item) => parseArtistMedia(item))
          .filter((item): item is ArtistMedia => item !== null)
        setBundles(indexArtistMedia(rows))
      } catch (err) {
        if (cancelled) return
        console.warn('[artist_media] unavailable; showing initials and placeholders', err)
        setBundles(new Map())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return bundles
}

/**
 * Local preview only (`npm run dev` + `?mediaPreview=1`).
 * Dead-code eliminated from production builds. Not a substitute for the SQL sample.
 */
function readDevPreview(): ArtistMedia[] | null {
  if (!import.meta.env.DEV) return null
  if (typeof window === 'undefined') return null
  if (new URLSearchParams(window.location.search).get('mediaPreview') !== '1') return null
  const fanKuan = 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Fan_K%27uan_001.jpg'
  const source = 'https://commons.wikimedia.org/wiki/File:Fan_K%27uan_001.jpg'
  return [
    {
      id: 'preview-portrait-blocked',
      artist_id: 'a01',
      kind: 'portrait',
      status: 'no_legal_image',
      image_url: fanKuan,
      source_url: source,
      license: 'Public domain',
      credit: 'Must not render: status is no_legal_image',
      title_en: null,
      title_zh_hant: null,
      title_zh_hans: null,
      year: null,
      sort_order: 0,
    },
    {
      id: 'preview-travelers',
      artist_id: 'a01',
      kind: 'artwork',
      status: 'ok',
      image_url: fanKuan,
      source_url: source,
      license: 'Public domain',
      credit:
        'Fan Kuan; National Palace Museum, Taipei. Image: The Yorck Project (2002), via Wikimedia Commons.',
      title_en: 'Travelers among Mountains and Streams',
      title_zh_hant: '谿山行旅圖',
      title_zh_hans: '溪山行旅图',
      year: 1000,
      sort_order: 1,
    },
    {
      id: 'preview-null-url',
      artist_id: 'a01',
      kind: 'artwork',
      status: 'ok',
      image_url: null,
      source_url: source,
      license: 'Public domain',
      credit: 'Must not render: image_url is null',
      title_en: 'Missing file',
      title_zh_hant: '沒有圖檔',
      title_zh_hans: '没有图档',
      year: null,
      sort_order: 2,
    },
    {
      id: 'preview-broken',
      artist_id: 'a01',
      kind: 'artwork',
      status: 'ok',
      image_url: 'https://example.invalid/not-a-real-image.jpg',
      source_url: source,
      license: 'Public domain',
      credit: 'Must fall back when the file fails to load',
      title_en: 'Unreachable file',
      title_zh_hant: '無法載入的圖',
      title_zh_hans: '无法载入的图',
      year: null,
      sort_order: 3,
    },
    {
      id: 'preview-needs-review',
      artist_id: 'a01',
      kind: 'artwork',
      status: 'needs_review',
      image_url: fanKuan,
      source_url: source,
      license: 'Public domain',
      credit: 'Must not render: status is needs_review',
      title_en: 'Unreviewed file',
      title_zh_hant: '待審圖片',
      title_zh_hans: '待审图片',
      year: null,
      sort_order: 4,
    },
    {
      id: 'preview-a02-blocked',
      artist_id: 'a02',
      kind: 'artwork',
      status: 'needs_review',
      image_url: fanKuan,
      source_url: null,
      license: null,
      credit: null,
      title_en: null,
      title_zh_hant: null,
      title_zh_hans: null,
      year: null,
      sort_order: 0,
    },
  ]
}
