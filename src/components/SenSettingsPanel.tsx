import { Contrast, Focus, RotateCcw, Type, Wind, X, BookOpenText, Volume2, ClipboardList } from 'lucide-react'
import { EasyReadBar } from './easy-read/EasyReadBar'
import { useSenSupport } from '../context/SenSupportContext'
import { useEffect, useRef, type ReactNode } from 'react'
import { useSen, type FontSizeLevel } from '../context/SenContext'
import { t, type MessageKey } from '../i18n'

const FONT_LEVELS: { id: FontSizeLevel; label: MessageKey }[] = [
  { id: 'md', label: 'sen.font.md' },
  { id: 'lg', label: 'sen.font.lg' },
  { id: 'xl', label: 'sen.font.xl' },
]

function Toggle({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: ReactNode
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-teal-50">
      <span className="mt-0.5 text-teal-700" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-teal-950">{label}</span>
        <span className="block text-xs text-teal-800/80">{desc}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative mt-1 inline-flex h-5 w-9 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400 ${
          checked ? 'bg-teal-700' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </label>
  )
}

export function SenSettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update, reset } = useSen()
  const { openCheckIn } = useSenSupport()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (ref.current && !ref.current.contains(el) && !el.closest('[data-sen-trigger]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={t('header.a11y')}
      className="sen-settings-panel absolute right-4 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-teal-100 bg-white p-4 text-left shadow-xl outline-none"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-teal-950">{t('sen.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-teal-800 hover:bg-teal-50"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <EasyReadBar />
      </div>

      <button
        type="button"
        onClick={() => {
          openCheckIn()
          onClose()
        }}
        className="mt-3 flex w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-900 hover:bg-blue-100"
      >
        <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          {t('sen.checkin.cta')}
          <span className="block font-normal text-blue-800/80">{t('sen.checkin.note')}</span>
        </span>
      </button>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-950">
          <Type className="h-4 w-4 text-teal-700" aria-hidden /> {t('sen.font')}
        </p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t('sen.font')}>
          {FONT_LEVELS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={settings.fontSize === f.id}
              onClick={() => update('fontSize', f.id)}
              className={`rounded-xl border px-2 py-1.5 font-semibold ${
                settings.fontSize === f.id
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-teal-200 bg-white text-teal-900 hover:bg-teal-50'
              }`}
              style={{ fontSize: `${0.8 + i * 0.15}rem` }}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-0.5">
        <Toggle
          icon={<Contrast className="h-4 w-4" />}
          label={t('support.contrast')}
          desc={t('sen.toggle.contrast.desc')}
          checked={settings.highContrast}
          onChange={(v) => update('highContrast', v)}
        />
        <Toggle
          icon={<BookOpenText className="h-4 w-4" />}
          label={t('sen.toggle.dyslexia')}
          desc={t('sen.toggle.dyslexia.desc')}
          checked={settings.dyslexia}
          onChange={(v) => update('dyslexia', v)}
        />
        <Toggle
          icon={<Wind className="h-4 w-4" />}
          label={t('support.reduceMotion')}
          desc={t('sen.toggle.motion.desc')}
          checked={settings.reduceMotion}
          onChange={(v) => update('reduceMotion', v)}
        />
        <Toggle
          icon={<Focus className="h-4 w-4" />}
          label={t('support.focus')}
          desc={t('sen.toggle.focus.desc')}
          checked={settings.focusTunnel}
          onChange={(v) => update('focusTunnel', v)}
        />
        <Toggle
          icon={<Volume2 className="h-4 w-4" />}
          label={t('support.readAloud')}
          desc={t('sen.toggle.read.desc')}
          checked={settings.readAloud}
          onChange={(v) => update('readAloud', v)}
        />
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {t('sen.reset')}
      </button>
      <p className="mt-2 text-[11px] text-teal-800/70">{t('sen.savedNote')}</p>
    </div>
  )
}
