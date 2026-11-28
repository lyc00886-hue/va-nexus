import { Contrast, Focus, RotateCcw, Sparkles, Type, Wind, X, BookOpenText, Volume2, ClipboardList, Palette, Ruler } from 'lucide-react'
import { EasyReadBar } from './easy-read/EasyReadBar'
import { useSenSupport } from '../context/SenSupportContext'
import { useEffect, useRef, type ReactNode } from 'react'
import { useSen, type FontSizeLevel } from '../context/SenContext'
import { t, type MessageKey } from '../i18n'
import { contentJson } from '../i18n/content'
import { primeSpeechEngine, stopGestureAutoRead } from '../lib/gestureAutoRead'
import { nextContainedScrollTop, wheelDeltaPixels, wheelHitsPanel } from '../lib/panelWheel'
import { FOCUS_MINUTE_CHOICES, READING_TINT_HEX, type FocusMinutes, type ReadingTint } from '../lib/readingSettings'
import type { SenMode } from '../types'

type EasyReadStudentCopy = {
  disclaimer: string
  settingsHint: string
  privacyLine: string
}

const FONT_LEVELS: { id: FontSizeLevel; label: MessageKey }[] = [
  { id: 'md', label: 'sen.font.md' },
  { id: 'lg', label: 'sen.font.lg' },
  { id: 'xl', label: 'sen.font.xl' },
]

const PRESET_CHOICES: { id: Exclude<SenMode, 'standard'>; label: MessageKey; hint: MessageKey }[] = [
  { id: 'spld', label: 'sen.preset.spld', hint: 'sen.preset.spld.hint' },
  { id: 'adhd', label: 'sen.preset.adhd', hint: 'sen.preset.adhd.hint' },
  { id: 'lowSensory', label: 'sen.preset.lowSensory', hint: 'sen.preset.lowSensory.hint' },
]

const TINT_CHOICES: { id: ReadingTint; label: MessageKey }[] = [
  { id: 'cream', label: 'sen.tint.cream' },
  { id: 'green', label: 'sen.tint.green' },
  { id: 'blue', label: 'sen.tint.blue' },
]

const DURATION_LABEL: Record<FocusMinutes, MessageKey> = {
  5: 'sen.focus.duration.5',
  10: 'sen.focus.duration.10',
  15: 'sen.focus.duration.15',
  25: 'sen.focus.duration.25',
}

function lineBox(el: HTMLElement): number {
  const style = getComputedStyle(el)
  const parsed = Number.parseFloat(style.lineHeight)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  const font = Number.parseFloat(style.fontSize)
  return Number.isFinite(font) && font > 0 ? font * 1.5 : 16
}

/** Nested overflow, else the panel itself. Touch scroll is left to the browser. */
function wheelScroller(panel: HTMLElement, target: EventTarget | null): HTMLElement {
  let node: Element | null =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  while (node && node !== panel) {
    if (node instanceof HTMLElement) {
      const oy = getComputedStyle(node).overflowY
      if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollHeight > node.clientHeight + 1) {
        return node
      }
    }
    node = node.parentElement
  }
  return panel
}

function Toggle({
  icon,
  label,
  desc,
  checked,
  onChange,
  flag,
}: {
  icon: ReactNode
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
  flag?: string
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
        data-reduce-motion={flag === 'reduce-motion' ? (checked ? 'on' : 'off') : undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative mt-1 inline-flex h-5 w-9 shrink-0 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400 ${
          checked ? 'bg-teal-700' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </label>
  )
}

export function SenSettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update, reset, setMode, mode, applyMany } = useSen()
  const { openCheckIn } = useSenSupport()
  const easyCopy = contentJson<EasyReadStudentCopy>('easy-read-mode')
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

  useEffect(() => {
    const panel = ref.current
    if (!panel) return
    // React's onWheel is passive, so preventDefault there cannot stop the page.
    // Capture on window also catches a wheel whose hit target is the page behind
    // this absolute panel (sticky header). Touch swipes do not fire wheel.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const rect = panel.getBoundingClientRect()
      if (
        !wheelHitsPanel(
          {
            contains: (node) => node instanceof Node && panel.contains(node),
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
          },
          event,
        )
      ) {
        return
      }
      const scroller = wheelScroller(panel, event.target)
      const delta = wheelDeltaPixels(event.deltaY, event.deltaMode, lineBox(scroller), scroller.clientHeight)
      event.preventDefault()
      event.stopPropagation()
      if (delta === 0) return
      scroller.scrollTop = nextContainedScrollTop(
        scroller.scrollTop,
        scroller.scrollHeight,
        scroller.clientHeight,
        delta,
      )
    }
    window.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [])

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={t('sen.title')}
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
        <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-teal-800/80" data-testid="easy-read-student-copy">
          <p data-testid="easy-read-disclaimer">{easyCopy.disclaimer}</p>
          <p data-testid="easy-read-settings-hint">{easyCopy.settingsHint}</p>
          <p data-testid="easy-read-privacy-line">{easyCopy.privacyLine}</p>
        </div>
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

      <div className="mt-4" data-testid="one-tap-presets">
        <p className="text-sm font-semibold text-teal-950">{t('sen.presets')}</p>
        <p className="mt-1 text-xs text-teal-800/80">{t('sen.presets.desc')}</p>
        <div className="mt-2 space-y-1.5">
          {PRESET_CHOICES.map((preset) => {
            const selected = mode === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                data-preset={preset.id}
                aria-pressed={selected}
                onClick={() => {
                  if (preset.id === 'spld') primeSpeechEngine()
                  else stopGestureAutoRead()
                  setMode(preset.id)
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left ${
                  selected ? 'border-teal-700 bg-teal-50' : 'border-teal-200 bg-white hover:bg-teal-50'
                }`}
              >
                <span className="block text-sm font-semibold text-teal-950">{t(preset.label)}</span>
                <span className="mt-0.5 block text-xs font-normal text-teal-800/80">{t(preset.hint)}</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            stopGestureAutoRead()
            reset()
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {t('sen.reset')}
        </button>
      </div>

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
        <div data-a11y-pair="spacing-contrast" className="space-y-0.5">
          <Toggle
            icon={<BookOpenText className="h-4 w-4" />}
            label={t('sen.toggle.dyslexia')}
            desc={t('sen.toggle.dyslexia.desc')}
            checked={settings.dyslexia}
            onChange={(v) => update('dyslexia', v)}
          />
          <Toggle
            icon={<Contrast className="h-4 w-4" />}
            label={t('support.contrast')}
            desc={t('sen.toggle.contrast.desc')}
            checked={settings.highContrast}
            onChange={(v) => update('highContrast', v)}
          />
        </div>
        <div className="px-2 py-2" data-testid="reading-tint">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-950">
            <Palette className="h-4 w-4 text-teal-700" aria-hidden /> {t('sen.tint')}
          </p>
          <p className="mt-1 text-xs text-teal-800/80">{t('sen.tint.desc')}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t('sen.tint')}>
            {TINT_CHOICES.map((tint) => {
              const selected = !settings.highContrast && settings.tint === tint.id
              return (
                <button
                  key={tint.id}
                  type="button"
                  role="radio"
                  data-tint={tint.id}
                  data-tint-swatch=""
                  aria-checked={selected}
                  onClick={() => applyMany({ tint: tint.id, highContrast: false })}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold text-teal-950 ${
                    selected ? 'border-teal-700 ring-2 ring-teal-600' : 'border-teal-200'
                  }`}
                  style={{ backgroundColor: READING_TINT_HEX[tint.id] }}
                >
                  {t(tint.label)}
                </button>
              )
            })}
          </div>
        </div>
        <Toggle
          icon={<Sparkles className="h-4 w-4" />}
          label={t('settings.soundMotion')}
          desc={t('settings.soundMotion.desc')}
          checked={settings.soundMotion}
          onChange={(v) => update('soundMotion', v)}
        />
        <Toggle
          icon={<Wind className="h-4 w-4" />}
          label={t('support.reduceMotion')}
          desc={t('sen.toggle.motion.desc')}
          checked={settings.reduceMotion}
          onChange={(v) => update('reduceMotion', v)}
          flag="reduce-motion"
        />
        <Toggle
          icon={<Ruler className="h-4 w-4" />}
          label={t('sen.toggle.ruler')}
          desc={t('sen.toggle.ruler.desc')}
          checked={settings.ruler}
          onChange={(v) => update('ruler', v)}
        />
        <Toggle
          icon={<Focus className="h-4 w-4" />}
          label={t('support.focus')}
          desc={t('sen.toggle.focus.desc')}
          checked={settings.focusTunnel}
          onChange={(v) => update('focusTunnel', v)}
        />
        <div className="px-2 py-2" data-testid="focus-duration">
          <p className="text-sm font-semibold text-teal-950">{t('sen.focus.duration')}</p>
          <p className="mt-1 text-xs text-teal-800/80">{t('sen.focus.duration.desc')}</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t('sen.focus.duration')}>
            {FOCUS_MINUTE_CHOICES.map((minutes) => {
              const selected = settings.focusMinutes === minutes
              return (
                <button
                  key={minutes}
                  type="button"
                  role="radio"
                  data-focus-minutes={minutes}
                  aria-checked={selected}
                  onClick={() => update('focusMinutes', minutes)}
                  className={`rounded-xl border px-1 py-1.5 text-xs font-semibold ${
                    selected
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-teal-200 bg-white text-teal-900 hover:bg-teal-50'
                  }`}
                >
                  {t(DURATION_LABEL[minutes])}
                </button>
              )
            })}
          </div>
        </div>
        <Toggle
          icon={<Focus className="h-4 w-4" />}
          label={t('sen.toggle.hideTimer')}
          desc={t('sen.toggle.hideTimer.desc')}
          checked={settings.hideTimer}
          onChange={(v) => update('hideTimer', v)}
        />
        <Toggle
          icon={<Volume2 className="h-4 w-4" />}
          label={t('support.readAloud')}
          desc={t('sen.toggle.read.desc')}
          checked={settings.readAloud}
          onChange={(v) => {
            if (v) primeSpeechEngine()
            else stopGestureAutoRead()
            update('readAloud', v)
          }}
        />
      </div>

      <p className="mt-3 text-[11px] text-teal-800/70">{t('sen.savedNote')}</p>
    </div>
  )
}
