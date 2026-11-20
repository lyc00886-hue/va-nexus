import { LOCALE_SHORT, tIn, useT, type MessageKey, type Vars } from '../../i18n'
import { englishAlt } from '../../lib/bilingualCatalog'

function LangChip({ children }: { children: string }) {
  return (
    <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-[#0D9488] bg-white px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#0D9488]">
      {children}
    </span>
  )
}

/**
 * English above Chinese. Single-language modes render the active string only.
 * Identical English and Chinese stay one line.
 */
export function BiSpan({ text, alt, englishOnly = false }: { text: string; alt?: string; englishOnly?: boolean }) {
  const { bilingual, zhSide } = useT()
  const english = !bilingual ? undefined : (alt ?? englishAlt(zhSide, text))
  if (!bilingual || !english || english === text) return englishOnly ? null : <>{text}</>
  const zhLang = zhSide === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant'
  if (englishOnly) {
    return (
      <span data-bilingual="en" className="mb-1 flex w-full items-start gap-2">
        <LangChip>{LOCALE_SHORT.en}</LangChip>
        <span lang="en" className="min-w-0 flex-1">
          {english}
        </span>
      </span>
    )
  }
  return (
    <span data-bilingual="stack" className="flex w-full flex-col items-start gap-1">
      <span className="flex w-full items-start gap-2">
        <LangChip>{LOCALE_SHORT.en}</LangChip>
        <span lang="en" className="min-w-0 flex-1">
          {english}
        </span>
      </span>
      <span className="flex w-full items-start gap-2">
        <LangChip>{LOCALE_SHORT[zhSide]}</LangChip>
        <span lang={zhLang} className="min-w-0 flex-1">
          {text}
        </span>
      </span>
    </span>
  )
}

export function BiKey({ name, vars }: { name: MessageKey; vars?: Vars }) {
  const { locale } = useT()
  return <BiSpan text={tIn(locale, name, vars)} alt={tIn('en', name, vars)} />
}
