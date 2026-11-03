import { getLocale, t, type Locale } from '../i18n'
import type { LessonArtistRef } from './types'

/** Display names for F.4 demo artistIds. Unknown ids fall back to the id. No image is implied. */
const NAMES: Record<string, Record<Locale, string>> = {
  'WEST-KAHLO-01': { en: 'Frida Kahlo', 'zh-Hant': '弗里達·卡蘿', 'zh-Hans': '弗里达·卡罗' },
  'HK-SHIEH-01': { en: 'Wilson Shieh', 'zh-Hant': '石家豪', 'zh-Hans': '石家豪' },
  'WEST-HOCKNEY-01': { en: 'David Hockney', 'zh-Hant': '大衛·霍克尼', 'zh-Hans': '大卫·霍克尼' },
  'HK-WUCIUS-01': { en: 'Wucius Wong', 'zh-Hant': '王無邪', 'zh-Hans': '王无邪' },
  'HK-PAK-01': { en: 'Pak Sheung Chuen', 'zh-Hant': '白雙全', 'zh-Hans': '白双全' },
  'HK-LEEKIT-01': { en: 'Lee Kit', 'zh-Hant': '李傑', 'zh-Hans': '李杰' },
}

export function artistName(artistId: string): string {
  return NAMES[artistId]?.[getLocale()] ?? artistId
}

/** Spoken summary for the lesson button: credit when a thumb exists, otherwise the empty-image label. */
export function artistCreditSummary(artists: LessonArtistRef[]): string {
  return artists
    .map((artist) => {
      const name = artistName(artist.artistId)
      const detail = artist.thumb && artist.credit ? artist.credit : t('ac.media.empty')
      return `${name}: ${detail}`
    })
    .join('; ')
}
