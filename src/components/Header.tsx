import { Accessibility } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useSen } from '../context/SenContext'
import { LOCALE_NAME, LOCALE_SHORT, LOCALES, useT, type MessageKey } from '../i18n'
import type { SenMode } from '../types'
import { AuthButton } from './AuthButton'
import { ProgressSync } from './ProgressSync'
import { SenSettingsPanel } from './SenSettingsPanel'

const MODES: { id: SenMode; label: MessageKey; hint: MessageKey }[] = [
  { id: 'standard', label: 'mode.standard', hint: 'mode.standard.hint' },
  { id: 'spld', label: 'mode.spld', hint: 'mode.spld.hint' },
  { id: 'adhd', label: 'mode.adhd', hint: 'mode.adhd.hint' },
]

function LanguageSwitcher() {
  const { locale, setLocale, t } = useT()
  return (
    <div
      className="inline-flex rounded-full bg-slate-100 p-1 ring-1 ring-slate-200"
      role="group"
      aria-label={t('lang.switch')}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l === 'en' ? 'en' : l}
          title={LOCALE_NAME[l]}
          aria-label={LOCALE_NAME[l]}
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className={
            locale === l
              ? 'rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow'
              : 'rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200'
          }
        >
          {LOCALE_SHORT[l]}
        </button>
      ))}
    </div>
  )
}

export function Header() {
  const { mode, setMode } = useSen()
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <header className="sticky top-0 z-40 border-b border-teal-100 bg-white/90 backdrop-blur">
      <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <p className="text-base font-extrabold tracking-tight text-teal-700 sm:text-lg">VA-Nexus</p>
            <p className="truncate text-[11px] text-slate-500">{t('header.subtitle')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <div
            className="inline-flex rounded-full bg-teal-50 p-1 ring-1 ring-teal-100"
            role="group"
            aria-label={t('header.senModes')}
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                title={t(m.hint)}
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={
                  mode === m.id
                    ? 'rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white shadow'
                    : 'rounded-full px-3 py-1 text-xs font-medium text-slate-600 hover:bg-teal-100'
                }
              >
                {t(m.label)}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-sen-trigger
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              open || mode === 'custom'
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-teal-200 bg-white text-slate-700 hover:bg-teal-50'
            }`}
          >
            <Accessibility className="h-3.5 w-3.5" aria-hidden />
            {t('header.a11y')}
          </button>

          <AuthButton />
          <ProgressSync />
        </div>

        {open && <SenSettingsPanel onClose={close} />}
      </div>
    </header>
  )
}
