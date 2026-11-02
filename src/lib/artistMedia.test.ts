import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  avatarPalette,
  displayImageUrl,
  indexArtistMedia,
  initialsFromName,
  mediaTitle,
  parseArtistMedia,
  type ArtistMedia,
} from './artistMedia.ts'

const FAN_KUAN =
  'https://upload.wikimedia.org/wikipedia/commons/2/2d/Fan_K%27uan_001.jpg'

function row(partial: Partial<ArtistMedia> & Pick<ArtistMedia, 'id' | 'artist_id' | 'kind'>): ArtistMedia {
  return {
    status: 'ok',
    image_url: null,
    source_url: null,
    license: null,
    credit: null,
    title_en: null,
    title_zh_hant: null,
    title_zh_hans: null,
    year: null,
    sort_order: 0,
    ...partial,
  }
}

describe('displayImageUrl', () => {
  it('hides no_legal_image and needs_review even when a URL is stored', () => {
    assert.equal(
      displayImageUrl({ status: 'no_legal_image', image_url: FAN_KUAN }),
      null,
    )
    assert.equal(
      displayImageUrl({ status: 'needs_review', image_url: FAN_KUAN }),
      null,
    )
  })

  it('hides null, blank, and non-http urls', () => {
    assert.equal(displayImageUrl({ status: 'ok', image_url: null }), null)
    assert.equal(displayImageUrl({ status: 'ok', image_url: '   ' }), null)
    assert.equal(displayImageUrl({ status: 'ok', image_url: 'javascript:alert(1)' }), null)
  })

  it('keeps an http(s) url when status is ok', () => {
    assert.equal(displayImageUrl({ status: 'ok', image_url: `  ${FAN_KUAN}  ` }), FAN_KUAN)
  })
})

describe('parseArtistMedia', () => {
  it('treats a missing status as ok and still drops a null image', () => {
    const parsed = parseArtistMedia({
      id: '1',
      artist_id: 'CN-SHENZHOU-01',
      kind: 'Artwork',
      image_url: null,
      sort_order: '2',
    })
    assert.ok(parsed)
    assert.equal(parsed.kind, 'artwork')
    assert.equal(parsed.status, 'ok')
    assert.equal(parsed.sort_order, 2)
    assert.equal(displayImageUrl(parsed), null)
  })

  it('keeps blocked statuses and ignores a stored url', () => {
    const blocked = parseArtistMedia({
      artist_id: 'CN-WENZM-01',
      kind: 'portrait',
      status: 'no_legal_image',
      image_url: FAN_KUAN,
    })
    assert.ok(blocked)
    assert.equal(blocked.status, 'no_legal_image')
    assert.equal(displayImageUrl(blocked), null)
    assert.equal(blocked.id, 'CN-WENZM-01:portrait:0')

    const review = parseArtistMedia({
      id: 'r1',
      artist_id: 'CN-SHENZHOU-01',
      kind: 'artwork',
      status: 'needs_review',
      image_url: FAN_KUAN,
    })
    assert.ok(review)
    assert.equal(review.status, 'needs_review')
    assert.equal(displayImageUrl(review), null)
  })

  it('treats a missing status with a url as a legacy ok row', () => {
    const parsed = parseArtistMedia({
      id: 'legacy',
      artist_id: 'CN-SHENZHOU-01',
      kind: 'artwork',
      image_url: FAN_KUAN,
    })
    assert.ok(parsed)
    assert.equal(parsed.status, 'ok')
    assert.equal(displayImageUrl(parsed), FAN_KUAN)
  })

  it('drops unknown kinds', () => {
    assert.equal(parseArtistMedia({ artist_id: 'a', kind: 'photo', image_url: FAN_KUAN }), null)
  })
})

describe('indexArtistMedia', () => {
  it('uses the first legal portrait and only legal artworks, in sort order', () => {
    const bundles = indexArtistMedia([
      row({
        id: 'p-blocked',
        artist_id: 'a01',
        kind: 'portrait',
        status: 'no_legal_image',
        image_url: FAN_KUAN,
        sort_order: 0,
      }),
      row({
        id: 'p-ok',
        artist_id: 'a01',
        kind: 'portrait',
        image_url: 'https://example.com/portrait.jpg',
        sort_order: 1,
      }),
      row({
        id: 'w2',
        artist_id: 'a01',
        kind: 'artwork',
        image_url: FAN_KUAN,
        sort_order: 2,
        title_en: 'Travelers among Mountains and Streams',
      }),
      row({
        id: 'w0',
        artist_id: 'a01',
        kind: 'artwork',
        image_url: null,
        sort_order: 0,
      }),
      row({
        id: 'review',
        artist_id: 'a01',
        kind: 'artwork',
        status: 'needs_review',
        image_url: FAN_KUAN,
        sort_order: 3,
      }),
      row({
        id: 'w1',
        artist_id: 'a01',
        kind: 'artwork',
        image_url: 'https://example.com/b.jpg',
        sort_order: 1,
      }),
    ])
    const bundle = bundles.get('a01')
    assert.ok(bundle)
    assert.equal(bundle.portraitUrl, 'https://example.com/portrait.jpg')
    assert.deepEqual(
      bundle.artworks.map((item) => item.id),
      ['w1', 'w2'],
    )
  })

  it('omits artists who have no displayable image', () => {
    const bundles = indexArtistMedia([
      row({
        id: 'x',
        artist_id: 'a02',
        kind: 'artwork',
        status: 'no_legal_image',
        image_url: FAN_KUAN,
      }),
    ])
    assert.equal(bundles.has('a02'), false)
  })
})

describe('names', () => {
  it('builds initials from the current-language name', () => {
    assert.equal(initialsFromName('Edward Hopper'), 'EH')
    assert.equal(initialsFromName('Vincent van Gogh'), 'VG')
    assert.equal(initialsFromName('范寬'), '范寬')
    assert.equal(initialsFromName('愛德華·霍普'), '愛德')
  })

  it('picks a stable palette swatch', () => {
    assert.equal(avatarPalette('范寬'), avatarPalette('范寬'))
    assert.notEqual(avatarPalette(''), '')
  })

  it('picks the title for the active locale', () => {
    const item = row({
      id: 'w',
      artist_id: 'a',
      kind: 'artwork',
      title_en: 'Travelers among Mountains and Streams',
      title_zh_hant: '谿山行旅圖',
      title_zh_hans: '溪山行旅图',
    })
    assert.equal(mediaTitle(item, 'en'), 'Travelers among Mountains and Streams')
    assert.equal(mediaTitle(item, 'zh-Hant'), '谿山行旅圖')
    assert.equal(mediaTitle(item, 'zh-Hans'), '溪山行旅图')
  })
})
