import { Accessibility } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useEasyRead } from '../context/EasyReadContext'
import { useSen } from '../context/SenContext'
import { LOCALE_NAME, LOCALE_SHORT, LOCALES, useT } from '../i18n'
import { QUEST_CHROME } from '../lib/mapQuest'
import { PLATFORM_HEADER_MOBILE_MQ, PLATFORM_HEADER_PATH_EVENT, stepPlatformHeader } from '../lib/platformHeaderShell'
import { isSupabaseConfigured } from '../lib/supabase'
import { useMapOneShell } from '../lib/useMapOneShell'
import { useQuestCalm } from '../lib/useQuestForm'
import { AuthButton } from './AuthButton'
import { QuestGearButton, QuestOtterMark, QuestStats } from './game/MapQuestChrome'
import { ProgressSync } from './ProgressSync'
import { SenSettingsPanel } from './SenSettingsPanel'

/** Two-segment display control. Reading help and focus stay under the display bar, not in this row. */
function DisplayModeSwitch() {
  const easy = useEasyRead()
  const { t } = useT()
  const choices = [
    { id: 'standard' as const, pressed: !easy.on, label: t('er.mode.standard'), choose: () => easy.setOn(false) },
    { id: 'step' as const, pressed: easy.on, label: t('er.mode.step'), choose: () => easy.setOn(true) },
  ]
  return (
    <div
      role="radiogroup"
      aria-label={t('header.displayMode')}
      data-testid="header-display-mode"
      className="inline-flex rounded-full bg-teal-50 p-1 ring-1 ring-teal-100"
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          role="radio"
          aria-checked={choice.pressed}
          data-testid={`header-display-${choice.id}`}
          onClick={() => {
            if (!choice.pressed) choice.choose()
          }}
          className={
            choice.pressed
              ? 'rounded-full bg-[#0D9488] px-3 py-1 text-xs font-semibold text-white shadow'
              : 'rounded-full bg-white px-3 py-1 text-xs font-medium text-[#0D9488] ring-1 ring-[#0D9488]/30'
          }
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}

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

function usePlatformHeaderCollapsed(panelOpen: boolean) {
  const [collapsed, setCollapsed] = useState(false)
  const collapsedRef = useRef(false)
  const accRef = useRef(0)
  const lastYRef = useRef(0)
  const panelRef = useRef(panelOpen)

  useEffect(() => {
    panelRef.current = panelOpen
    if (!panelOpen) return
    accRef.current = 0
    if (!collapsedRef.current) return
    collapsedRef.current = false
    setCollapsed(false)
  }, [panelOpen])

  useEffect(() => {
    const mq = window.matchMedia(PLATFORM_HEADER_MOBILE_MQ)
    lastYRef.current = window.scrollY

    const apply = (delta: number) => {
      const header = document.querySelector<HTMLElement>('[data-platform-header]')
      const focus = document.documentElement.dataset.softScreen === 'focus'
      const mapOne = !focus && document.querySelector('[data-map-shell="one"]') != null
      const cream = document.querySelector('[data-map-chrome="path"]') != null
      const next = stepPlatformHeader({
        scrollY: window.scrollY,
        delta,
        acc: accRef.current,
        collapsed: collapsedRef.current,
        mobile: mq.matches,
        mapOne,
        path: mapOne || cream,
        anchored: panelRef.current,
        hidePast: header?.offsetHeight ?? 0,
      })
      accRef.current = next.acc
      if (next.collapsed === collapsedRef.current) return
      collapsedRef.current = next.collapsed
      setCollapsed(next.collapsed)
    }

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastYRef.current
      lastYRef.current = y
      apply(delta)
    }

    const onResync = () => {
      lastYRef.current = window.scrollY
      apply(0)
    }

    const shellObserver = new MutationObserver(onResync)
    shellObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-soft-screen'] })

    onResync()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener(PLATFORM_HEADER_PATH_EVENT, onResync)
    mq.addEventListener('change', onResync)
    return () => {
      shellObserver.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener(PLATFORM_HEADER_PATH_EVENT, onResync)
      mq.removeEventListener('change', onResync)
    }
  }, [])

  return collapsed
}

function QuestSettingsDrawer({ onClose }: { onClose: () => void }) {
  const { locale } = useT()
  const { update } = useSen()
  const [calm, setCalm] = useQuestCalm()
  const chrome = QUEST_CHROME[locale]
  return (
    <div className="absolute inset-x-3 top-full z-50 mt-2 sm:inset-x-auto sm:right-3 sm:w-80" role="presentation">
      <div
        role="dialog"
        aria-label={chrome.settings}
        data-quest-drawer
        className="rounded-3xl border border-[#b7e4df] bg-white p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{chrome.settings}</h2>
            <p className="text-xs text-slate-500">{chrome.settingsSub}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-[#0D9488]">
            {chrome.back}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-[#FFF9E9] px-3 py-2">
            <p className="text-sm font-bold text-slate-900">{chrome.language}</p>
            <div className="mt-2">
              <LanguageSwitcher />
            </div>
          </div>
          <div className="rounded-2xl bg-[#FFF9E9] px-3 py-2">
            <p className="text-sm font-bold text-slate-900">{chrome.stepHint}</p>
            <div className="mt-2">
              <DisplayModeSwitch />
            </div>
          </div>
          <div className="rounded-2xl bg-[#FFF9E9] px-3 py-2">
            <p className="text-sm font-bold text-slate-900">{chrome.access}</p>
            <label className="mt-1 flex items-center justify-between gap-3 text-sm text-slate-700">
              <span>{calm ? chrome.calmOn : chrome.calmOff}</span>
              <input
                type="checkbox"
                role="switch"
                data-quest-calm-switch
                checked={calm}
                aria-checked={calm}
                onChange={(event) => {
                  const next = event.target.checked
                  setCalm(next)
                  update('reduceMotion', next)
                }}
              />
            </label>
          </div>
          <div className="rounded-2xl bg-[#FFF9E9] px-3 py-2">
            <p className="text-sm font-bold text-slate-900">{chrome.signIn}</p>
            <div className="mt-2">
              <AuthButton />
              {isSupabaseConfigured ? null : <p className="text-xs text-slate-500">{chrome.guest}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Header() {
  const { mode } = useSen()
  const { t } = useT()
  const mapOne = useMapOneShell()
  const [open, setOpen] = useState(false)
  const [gear, setGear] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const collapsed = usePlatformHeaderCollapsed(open || gear) && !open && !gear

  return (
    <header
      data-testid="platform-header"
      data-platform-header={collapsed ? 'collapsed' : 'visible'}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-hidden={collapsed || undefined}
      inert={collapsed || undefined}
      className={`platform-header sticky top-0 z-40 border-b border-teal-100 backdrop-blur ${
        mapOne ? 'bg-[#FFF9E9]/95' : 'bg-white/90'
      }`}
    >
      <div
        className={
          mapOne
            ? 'relative flex flex-col gap-2 px-4 py-3'
            : 'relative flex flex-wrap items-center justify-between gap-3 px-4 py-3'
        }
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {mapOne ? <QuestOtterMark /> : null}
          <div className="min-w-0">
            <img
              src="/logo.png"
              alt="VA-Nexus"
              width={281}
              height={82}
              className="h-9 w-auto max-w-[11rem] object-contain object-left sm:h-11 sm:max-w-[16rem]"
              decoding="async"
            />
            <p className={mapOne ? 'sr-only' : 'truncate text-[11px] text-slate-500'}>{t('header.subtitle')}</p>
          </div>
        </div>

        <div className={mapOne ? 'flex w-full flex-wrap items-center gap-1.5' : 'flex flex-wrap items-center gap-2'}>
          {mapOne ? <QuestStats /> : <LanguageSwitcher />}
          {mapOne ? null : <DisplayModeSwitch />}

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
            <span className={mapOne ? 'sr-only' : undefined}>{t('header.a11y')}</span>
          </button>

          {mapOne ? <QuestGearButton open={gear} onClick={() => setGear((value) => !value)} /> : <AuthButton />}
          <ProgressSync />
        </div>

        {open && <SenSettingsPanel onClose={close} />}
        {mapOne && gear ? <QuestSettingsDrawer onClose={() => setGear(false)} /> : null}
      </div>
    </header>
  )
}
