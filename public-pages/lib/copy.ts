import en from '../../src/i18n/en.json'
import zhHans from '../../src/i18n/zh-Hans.json'
import zhHant from '../../src/i18n/zh-Hant.json'

export type PublicLocale = 'zh-Hant' | 'en' | 'zh-Hans'

const ALL = {
  'zh-Hant': zhHant,
  en,
  'zh-Hans': zhHans,
} as const

export function messages(locale: PublicLocale): Record<string, string> {
  return ALL[locale]
}
