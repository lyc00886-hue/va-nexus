import { t } from '../../i18n'
import { useEasyRead } from '../../context/EasyReadContext'

function Choice({
  id,
  pressed,
  label,
  onClick,
}: {
  id: 'standard' | 'step'
  pressed: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      data-testid={`easy-read-choice-${id}`}
      onClick={onClick}
      className={`min-h-11 rounded-2xl border px-3 text-base font-bold ${
        pressed ? 'border-teal-700 bg-teal-700 text-white' : 'border-teal-200 bg-white text-teal-950 hover:bg-teal-50'
      }`}
    >
      {label}
    </button>
  )
}

function Assist({
  id,
  label,
  checked,
  onChange,
}: {
  id: 'literacy' | 'focus'
  label: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-teal-50/60 px-3 py-2">
      <span className="text-base font-semibold text-teal-950">{label}</span>
      <input
        type="checkbox"
        role="switch"
        data-testid={`easy-read-assist-${id}`}
        checked={checked}
        aria-checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full ${checked ? 'bg-teal-700' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${checked ? 'left-5' : 'left-0.5'}`} />
      </span>
    </label>
  )
}

/** Two-way display control. Reading help and focus sit underneath, not in the same row. */
export function EasyReadBar({ assist = true }: { assist?: boolean }) {
  const easy = useEasyRead()
  return (
    <section data-testid="easy-read-bar" aria-label={t('er.settings.label')} className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-teal-950">{t('er.settings.label')}</h2>
      <p className="text-sm text-teal-900">{t('er.settings.oneLine')}</p>
      <div role="radiogroup" aria-label={t('er.mode.step')} className="mt-3 grid grid-cols-2 gap-2">
        <Choice id="standard" pressed={!easy.on} label={t('er.mode.standard')} onClick={() => easy.setOn(false)} />
        <Choice id="step" pressed={easy.on} label={t('er.mode.step')} onClick={() => easy.setOn(true)} />
      </div>
      <p className="mt-2 text-sm font-semibold text-teal-900" data-testid="easy-read-state">
        {easy.on ? t('er.mode.on') : t('er.mode.off')}
      </p>
      {easy.on && assist ? (
        <div className="mt-3 space-y-2 border-t border-teal-50 pt-3">
          <p className="text-sm text-slate-600" data-testid="easy-read-minimal">
            {t('er.mode.minimal')}
          </p>
          <Assist id="literacy" label={t('er.mode.literacy')} checked={easy.literacy} onChange={easy.setLiteracy} />
          <Assist id="focus" label={t('er.mode.focus')} checked={easy.focus} onChange={easy.setFocus} />
          {easy.suggestLargeText ? (
            <button
              type="button"
              data-testid="easy-read-large-text"
              onClick={easy.acceptLargeText}
              className="min-h-11 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
            >
              {t('support.largeText')}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
