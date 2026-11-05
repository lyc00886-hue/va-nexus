import { Lock, Star, Trophy } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import { getAllNodes } from '../../game/curriculum'
import { getBadges, getLevels } from '../../game/rewards'
import { getLocale, INTL_LOCALE, t } from '../../i18n'
import { ActivityLog } from './ActivityLog'

/** Plate set. Day-count and flame badges stay out of this list. */
const MILD_BADGES = ['first-lesson', 'unit-done', 'xp-500', 'explorer', 'dualread', 'sba-starter'] as const

export function Achievements() {
  const { state, level, resetGame, progressPct } = useGame()
  const catalog = getBadges()
  const BADGES = MILD_BADGES.map((id) => catalog.find((badge) => badge.id === id)).filter((badge) => badge != null)
  const LEVELS = getLevels()
  const unlocked = BADGES.filter((b) => state.badges[b.id]).length
  const allNodes = getAllNodes()
  const doneLessons = allNodes.filter((n) => state.nodes[n.id]?.completed).length
  const totalLessons = allNodes.length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('tab.achievements')}</h2>
        <p className="text-sm text-slate-500">{t('ach.pace')}</p>
        <p className="text-sm text-slate-500">{t('ach.unlocked', { n: unlocked, total: BADGES.length })}</p>
      </div>

      <div className="rounded-3xl border border-[#b7e4df] bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">{t('ach.overallProgress')}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {t('ach.overallProgressValue', { pct: progressPct, done: doneLessons, total: totalLessons })}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-[#b7e4df] bg-[#FFF9E9] p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Trophy className="h-4 w-4 text-[#0D9488]" aria-hidden /> {t('ach.level')}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{t('lp.level', { n: level.level })}</p>
          <p className="text-sm text-slate-600">{level.title}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${level.pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {level.next !== null ? t('ach.nextLevel', { n: level.next }) : t('ach.maxLevel')}
          </p>
        </div>
        <div className="rounded-3xl border border-[#b7e4df] bg-[#FFF9E9] p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Star className="h-4 w-4 text-[#0D9488]" aria-hidden /> {t('ach.totalXp')}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{t('chrome.xp', { n: state.xp.toLocaleString() })}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">{t('ach.badges')}</h3>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const ts = state.badges[b.id]
            return (
              <li
                key={b.id}
                className={`rounded-2xl border p-3 text-center ${
                  ts ? 'border-[#0D9488] bg-[#FFF9E9]' : 'border-[#b7e4df] bg-white'
                }`}
              >
                <span
                  className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-[#0D9488] ${
                    ts ? 'border-[#0D9488] bg-white' : 'border-[#b7e4df]'
                  }`}
                  aria-hidden
                >
                  {ts ? '✓' : <Lock className="h-4 w-4" />}
                </span>
                <p className={`mt-1 text-sm font-bold ${ts ? 'text-slate-900' : 'text-slate-500'}`}>
                  {b.title}
                </p>
                <p className="text-[11px] text-slate-500">{b.desc}</p>
                {ts && (
                  <p className="mt-1 text-[10px] text-violet-700">
                    {new Date(ts).toLocaleDateString(INTL_LOCALE[getLocale()], { timeZone: 'Asia/Hong_Kong' })}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ActivityLog limit={15} />
        <section className="rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="font-bold text-slate-900">{t('ach.levelTable')}</h3>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            {LEVELS.map((l, i) => (
              <li key={l.min} className={i + 1 === level.level ? 'font-bold text-blue-700' : ''}>
                {t('chrome.levelXpRow', { n: i + 1, title: l.title, xp: l.min.toLocaleString() })}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 font-bold text-slate-900">{t('ach.gameSettings')}</h3>
          <p className="mt-3 text-xs text-slate-500">{t('ach.syncNote')}</p>
          <button
            type="button"
            onClick={() => {
              if (confirm(t('ach.resetConfirm'))) resetGame()
            }}
            className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
          >
            {t('ach.reset')}
          </button>
        </section>
      </div>
    </div>
  )
}
