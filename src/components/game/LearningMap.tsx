import { Check, Crown, Lock, Play, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { useSenSupport } from '../../context/SenSupportContext'
import { getNodeById, getUnits } from '../../game/curriculum'
import { masteryFor, masteryLabel } from '../../game/rewards'
import { t } from '../../i18n'
import type { Lesson, Mastery } from '../../game/types'
import { ActivityLog } from './ActivityLog'
import { DemoBadge } from './DemoBadge'
import { LessonPlayer } from './LessonPlayer'
import { StatCards } from './StatCards'

const MASTERY_CHIP: Record<Mastery, string> = {
  none: 'bg-slate-100 text-slate-500',
  attempted: 'bg-orange-50 text-orange-700',
  familiar: 'bg-sky-50 text-sky-700',
  proficient: 'bg-blue-100 text-blue-800',
  mastered: 'bg-violet-100 text-violet-800',
}

const OFFSETS = ['ml-0', 'ml-10', 'ml-20', 'ml-10']

export function LearningMap() {
  const { state, isUnlocked, currentNodeId } = useGame()
  const { settings, focusTunnel } = useSen()
  const { openCheckIn, stored } = useSenSupport()
  const [open, setOpen] = useState<Lesson | null>(null)
  const motion = !settings.reduceMotion

  if (open) return <LessonPlayer lesson={open} kind="lesson" onExit={() => setOpen(null)} />

  const UNITS = getUnits()
  const current = currentNodeId ? getNodeById().get(currentNodeId) : undefined
  // focus tunnel: show only the unit containing the current node
  const units = focusTunnel && current ? UNITS.filter((u) => u.nodes.some((n) => n.id === current.id)) : UNITS

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('tab.map')}</h2>
        <p className="text-sm text-slate-500">{t('map.subtitle')}</p>
      </div>

      {!focusTunnel && <StatCards />}

      <div className={`grid gap-5 ${focusTunnel ? '' : 'lg:grid-cols-3'}`}>
        <div className="space-y-5 lg:col-span-2">
          {current && (
            <button
              type="button"
              onClick={() => setOpen(current)}
              className="flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-left text-white shadow-md hover:from-blue-500 hover:to-indigo-500"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Play className="h-6 w-6 fill-white" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-blue-100">{t('map.continue')}</span>
                <span className="block text-lg font-bold">{current.title}</span>
                <span className="block text-sm text-blue-100">{current.subtitle} · {t('common.aboutMin', { n: current.minutes })}</span>
              </span>
            </button>
          )}

          {units.map((u) => {
            const done = u.nodes.filter((n) => state.nodes[n.id]?.completed).length
            const total = u.nodes.length
            const pct = total === 0 ? 0 : Math.round((done / total) * 100)
            return (
              <section key={u.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{u.title}</h3>
                    <p className="text-sm text-slate-500">{u.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.nodes.some((n) => n.demo) && <DemoBadge />}
                    <span
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                      aria-label={t('map.unitProgressAria', { title: u.title, done, total, pct })}
                    >
                      {t('map.unitProgress', { done, total, pct })}
                    </span>
                  </div>
                </div>
                <div
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={t('map.unitProgressAria', { title: u.title, done, total, pct })}
                >
                  <div
                    className={`h-full rounded-full bg-blue-600 ${motion ? 'transition-all' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <ol className="mt-5">
                  {u.nodes.map((n, i) => {
                    const p = state.nodes[n.id]
                    const unlocked = isUnlocked(n.id)
                    const completed = Boolean(p?.completed)
                    const isCurrent = n.id === currentNodeId
                    const m = masteryFor(p)
                    const last = i === u.nodes.length - 1
                    return (
                      <li key={n.id} className={`relative ${focusTunnel ? '' : OFFSETS[i % OFFSETS.length]}`}>
                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => setOpen(n)}
                          className="group flex w-full items-center gap-4 rounded-2xl p-1 text-left disabled:cursor-not-allowed"
                          aria-label={t('map.nodeAria', { title: n.title, status: t(completed ? 'map.status.done' : unlocked ? 'map.status.open' : 'map.status.locked') })}
                        >
                          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                            {isCurrent && motion && (
                              <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-40" aria-hidden />
                            )}
                            <span
                              className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-sm ${
                                completed
                                  ? m === 'mastered'
                                    ? 'border-violet-200 bg-violet-500 text-white'
                                    : 'border-emerald-200 bg-emerald-500 text-white'
                                  : isCurrent
                                    ? 'border-blue-200 bg-blue-600 text-white ring-4 ring-blue-300'
                                    : unlocked
                                      ? 'border-blue-100 bg-white text-blue-600'
                                      : 'border-slate-200 bg-slate-100 text-slate-400'
                              }`}
                            >
                              {completed ? (
                                m === 'mastered' ? (
                                  <Crown className="h-7 w-7" aria-hidden />
                                ) : (
                                  <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                                )
                              ) : unlocked ? (
                                <Sparkles className="h-7 w-7" aria-hidden />
                              ) : (
                                <Lock className="h-6 w-6" aria-hidden />
                              )}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block font-bold ${unlocked ? 'text-slate-900 group-hover:text-blue-700' : 'text-slate-400'}`}
                            >
                              {n.title}
                            </span>
                            <span className={`block text-xs ${unlocked ? 'text-slate-500' : 'text-slate-400'}`}>
                              {n.subtitle}
                            </span>
                            {m !== 'none' && (
                              <span
                                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${MASTERY_CHIP[m]}`}
                              >
                                {masteryLabel(m)}
                              </span>
                            )}
                          </span>
                        </button>
                        {!last && (
                          <span
                            className="ml-[2.2rem] block h-8 border-l-4 border-dotted border-slate-300"
                            aria-hidden
                          />
                        )}
                      </li>
                    )
                  })}
                </ol>
              </section>
            )
          })}
          {!current && (
            <p className="rounded-3xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              {t('map.allDone')}
            </p>
          )}
        </div>

        {!focusTunnel && (
          <div className="space-y-5">
            <ActivityLog />
            <section className="rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h3 className="font-bold text-slate-900">{t('map.ladder')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('map.ladder.text')}</p>
              <h3 className="mt-4 font-bold text-slate-900">{t('map.support')}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {t('map.support.text')}
              </p>
              <button
                type="button"
                onClick={openCheckIn}
                className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                {stored.checkIn ? t('map.checkin.redo') : t('map.checkin.start')}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
