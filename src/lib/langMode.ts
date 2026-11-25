export type Locale = 'zh-Hant' | 'zh-Hans' | 'en'

/** Short switcher labels. The on-screen bilingual stack uses these same chips. */
export const LOCALE_SHORT: Record<Locale, string> = { en: 'EN', 'zh-Hant': '繁', 'zh-Hans': '简' }

/** navigator.language → locale: zh-HK/zh-TW/zh-MO/zh-Hant → 繁, zh-CN/zh-SG/zh-Hans/zh → 简, else English. */
export function localeFromLanguage(lang: string | undefined | null): Locale {
  const l = (lang ?? '').toLowerCase()
  if (!l.startsWith('zh') && !l.startsWith('yue')) return 'en'
  if (l.startsWith('yue') || /hant|-hk|-tw|-mo/.test(l)) return 'zh-Hant'
  return 'zh-Hans'
}

/** Chinese side paired with English in 英中對照. Default is Traditional Chinese. */
export type ZhSide = 'zh-Hant' | 'zh-Hans'

/** Single-language locales plus the bilingual reading mode. */
export type LangMode = Locale | 'bilingual'

export type LangState = {
  locale: Locale
  bilingual: boolean
  zhSide: ZhSide
}

export function isZhSide(value: string | null | undefined): value is ZhSide {
  return value === 'zh-Hant' || value === 'zh-Hans'
}

/**
 * Restore language from storage.
 * `bilingual` pairs English with the last Chinese choice. That choice stays 繁體中文
 * until the student has chosen 简体中文.
 */
export function resolveLangState(
  savedLocale: string | null,
  savedSide: string | null,
  navigatorLang: string | null,
): LangState {
  const storedSide = isZhSide(savedSide) ? savedSide : null
  if (savedLocale === 'bilingual') {
    const zhSide = storedSide ?? 'zh-Hant'
    return { locale: zhSide, bilingual: true, zhSide }
  }
  if (isZhSide(savedLocale)) return { locale: savedLocale, bilingual: false, zhSide: savedLocale }
  if (savedLocale === 'en') return { locale: 'en', bilingual: false, zhSide: storedSide ?? 'zh-Hant' }
  const detected = localeFromLanguage(navigatorLang)
  if (isZhSide(detected)) return { locale: detected, bilingual: false, zhSide: detected }
  return { locale: 'en', bilingual: false, zhSide: storedSide ?? 'zh-Hant' }
}

/** Choosing 繁 or 简 remembers that Chinese side. Choosing EN keeps it. 對照 uses it. */
export function nextLangState(prev: LangState, mode: LangMode): LangState {
  if (mode === 'bilingual') return { locale: prev.zhSide, bilingual: true, zhSide: prev.zhSide }
  if (mode === 'zh-Hant' || mode === 'zh-Hans') return { locale: mode, bilingual: false, zhSide: mode }
  return { locale: 'en', bilingual: false, zhSide: prev.zhSide }
}
