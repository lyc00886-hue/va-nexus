import { Flame, Heart, Lock, Star, Trophy } from 'lucide-react'
import { useGame } from '../../context/GameContext'
import { useSen } from '../../context/SenContext'
import { BADGES, LEVELS } from '../../game/rewards'
import { ActivityLog } from './ActivityLog'

export function Achievements() {
  const { state, level, streak, setHearts, resetGame } = useGame()
  const { supportsOn } = useSen()
  const unlocked = BADGES.filter((b) => state.badges[b.id]).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">成就與徽章</h2>
        <p className="text-sm text-slate-500">已解鎖 {unlocked} / {BADGES.length} 個徽章</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Trophy className="h-4 w-4 text-blue-600" aria-hidden /> 等級
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">Lv.{level.level}</p>
          <p className="text-sm text-slate-600">{level.title}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${level.pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {level.next !== null ? `下一級：${level.next} XP` : '已到最高等級'}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden /> 總經驗值
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{state.xp.toLocaleString()} XP</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Flame className="h-4 w-4 text-orange-500" aria-hidden /> 連續學習
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{streak} 天</p>
          <p className="text-[11px] text-slate-500">最佳 {state.streak.best} 天 · 以香港時間計日</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">徽章</h3>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const ts = state.badges[b.id]
            return (
              <li
                key={b.id}
                className={`rounded-2xl border p-3 text-center ${
                  ts ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className={`block text-3xl ${ts ? '' : 'opacity-30 grayscale'}`} aria-hidden>
                  {b.emoji}
                </span>
                <p className={`mt-1 text-sm font-bold ${ts ? 'text-violet-900' : 'text-slate-500'}`}>
                  {!ts && <Lock className="mr-1 inline h-3 w-3" aria-label="未解鎖" />}
                  {b.title}
                </p>
                <p className="text-[11px] text-slate-500">{b.desc}</p>
                {ts && (
                  <p className="mt-1 text-[10px] text-violet-700">
                    {new Date(ts).toLocaleDateString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}
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
          <h3 className="font-bold text-slate-900">等級表</h3>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            {LEVELS.map((l, i) => (
              <li key={l.min} className={i + 1 === level.level ? 'font-bold text-blue-700' : ''}>
                Lv.{i + 1} {l.title} · {l.min} XP
              </li>
            ))}
          </ul>
          <h3 className="mt-5 font-bold text-slate-900">遊戲設定</h3>
          <label className="mt-2 flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={state.prefs.hearts}
              onChange={(e) => setHearts(e.target.checked)}
              className="h-4 w-4 accent-rose-500"
            />
            <Heart className="h-4 w-4 text-rose-500" aria-hidden /> 小測使用心心（答錯扣一個）
          </label>
          {supportsOn && <p className="mt-1 text-xs text-slate-500">已開啟學習支援，心心會自動停用。</p>}
          <p className="mt-3 text-xs text-slate-500">進度暫時儲存喺呢部裝置；Google 登入整好之後會同步到雲端。</p>
          <button
            type="button"
            onClick={() => {
              if (confirm('確定清除呢部裝置上嘅所有學習進度？')) resetGame()
            }}
            className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
          >
            清除本機進度
          </button>
        </section>
      </div>
    </div>
  )
}
