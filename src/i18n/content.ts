/**
 * Locale-aware content loader.
 * PEANUTS delivers `<name>.en.json` / `<name>.zh-Hans.json` next to `<name>.json`
 * (same structure, keys and ids; the original is zh-Hant). We pick the variant for
 * the active locale when present, otherwise fall back to the zh-Hant original.
 */
import { getLocale, type Locale } from './index'

const JSON_FILES = import.meta.glob('../content/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
const MD_FILES = import.meta.glob('../content/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<
  string,
  string
>

function pick<T>(files: Record<string, T>, name: string, ext: string, locale: Locale): { value: T; locale: Locale } {
  if (locale !== 'zh-Hant') {
    const v = files[`../content/${name}.${locale}.${ext}`]
    if (v !== undefined) return { value: v, locale }
  }
  const base = files[`../content/${name}.${ext}`]
  if (base === undefined) throw new Error(`[content] missing ../content/${name}.${ext}`)
  return { value: base, locale: 'zh-Hant' }
}

/** Content JSON for the active locale (falls back to the zh-Hant original). */
export function contentJson<T>(name: string, locale: Locale = getLocale()): T {
  return pick(JSON_FILES, name, 'json', locale).value as T
}

/** Which locale a content file actually resolved to (to flag untranslated content). */
export function contentLocale(name: string, locale: Locale = getLocale()): Locale {
  return pick(JSON_FILES, name, 'json', locale).locale
}

export function contentMarkdown(name: string, locale: Locale = getLocale()): string {
  return pick(MD_FILES, name, 'md', locale).value
}

export function contentMarkdownLocale(name: string, locale: Locale = getLocale()): Locale {
  return pick(MD_FILES, name, 'md', locale).locale
}
