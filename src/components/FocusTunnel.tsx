import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSen } from '../context/SenContext'
import { t } from '../i18n'
import { focusClock } from '../lib/readingSettings'

const FOCUS_SECONDS = 25 * 60

export function FocusTunnel() {
  const { focusTunnel, settings, update } = useSen()
  const total = settings.focusMinutes === 25 ? FOCUS_SECONDS : settings.focusMinutes * 60
  const sessionKey = `${focusTunnel ? 'on' : 'off'}:${total}`
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState({ key: sessionKey, left: total, running: false })
  const [task, setTask] = useState('')
  if (session.key !== sessionKey) setSession({ key: sessionKey, left: total, running: false })
  const left = session.left
  const running = session.running
  const clock = focusClock(left, settings.hideTimer)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setSession((current) => {
        if (current.left <= 1) return { ...current, left: 0, running: false }
        return { ...current, left: current.left - 1 }
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!focusTunnel) return null

  const timer = (
    <>
      <div
        data-focus-timer=""
        data-countdown={settings.hideTimer ? 'hidden' : 'shown'}
        data-focus-minutes={settings.focusMinutes}
        className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 md:bottom-6"
      >
        <button
          type="button"
          onClick={() => update('focusTunnel', false)}
          className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-teal-900 shadow ring-1 ring-teal-200 hover:bg-teal-50"
          title={t('focus.closeTitle')}
        >
          {t('focus.close')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-amber-600"
        >
          <Timer className="h-4 w-4" aria-hidden />
          {t('focus.timer')}
          {clock ? ` ${clock}` : ''}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('focus.dialog')}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-teal-950/90 p-6 text-center text-white"
        >
          <div className="w-full max-w-sm">
            <p className="text-sm uppercase tracking-widest text-teal-200">{t('focus.kicker')}</p>
            <label className="mt-4 block text-left text-sm text-teal-100">
              {t('focus.oneThing')}
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={t('focus.placeholder')}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-base text-white placeholder:text-teal-200/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            {clock ? (
              <p className="mt-6 font-mono text-5xl font-bold tabular-nums" aria-live="polite">
                {clock}
              </p>
            ) : null}
            {left === 0 && <p className="mt-2 text-amber-300">{t('focus.done')}</p>}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setSession((current) => ({ ...current, running: !current.running }))}
                disabled={left === 0}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
              >
                {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                {running ? t('focus.pause') : t('focus.start')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSession((current) => ({ ...current, running: false, left: total }))
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> {t('focus.reset')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              <X className="h-4 w-4" aria-hidden />
              {t('focus.back')}
            </button>
          </div>
        </div>
      )}
    </>
  )
  if (typeof document === 'undefined') return timer
  return createPortal(timer, document.body)
}
