import { t, useT } from '../../i18n'
import type { PresentationMode } from '../../lib/lessonPresentation'
import { ReadAloudButton } from './ReadAloudButton'

const PILL = 'inline-flex items-center rounded-full border border-[#0D9488] px-3 py-1.5 text-base font-semibold'

/** 閱讀設定 on the lesson card: standard or easier-reading, with 朗讀 kept beside them. */
export function PresentationBar({
  mode,
  onMode,
  readText,
  auto = false,
  autoKey,
}: {
  mode: PresentationMode
  onMode: (mode: PresentationMode) => void
  readText: string
  auto?: boolean
  autoKey?: string
}) {
  const { bilingual, locale, setLangMode } = useT()
  return (
    <div className="shrink-0 px-4 pt-4">
      <p className="text-sm font-bold text-[#0D9488]">
        {t('settings.reading')} · {t('present.choose')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('present.choose')}>
        <button
          type="button"
          aria-pressed={mode === 'standard'}
          onClick={() => onMode('standard')}
          className={`${PILL} ${mode === 'standard' ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'}`}
        >
          {t('present.standard')}
        </button>
        <button
          type="button"
          aria-pressed={mode === 'easy'}
          onClick={() => onMode('easy')}
          className={`${PILL} ${mode === 'easy' ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'}`}
        >
          {t('present.easy')}
        </button>
        <ReadAloudButton text={readText} auto={auto} autoKey={autoKey} pill />
        <button
          type="button"
          aria-pressed={bilingual}
          onClick={() => setLangMode(bilingual ? locale : 'bilingual')}
          className={`${PILL} ${bilingual ? 'bg-[#0D9488] text-white' : 'bg-white text-[#0D9488]'}`}
        >
          {t('lang.mode.bilingual')}
        </button>
      </div>
    </div>
  )
}
