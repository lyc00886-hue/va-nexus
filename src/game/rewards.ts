import { perLocale, t } from '../i18n'
import { getUnits } from './curriculum'
import { getResearchQuests, QUEST_EMOJI } from './research'
import type { Mastery, NodeProgress } from './types'

export const XP = {
  correctFirstTry: 10,
  correctRetry: 3,
  lessonComplete: 20,
  perfectBonus: 15,
  questComplete: 40,
  sbaStep: 50,
  feldmanAi: 15,
  checkIn: 0,
} as const

/** Level thresholds (cumulative XP). */
const LEVEL_MIN = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000]
export const getLevels = perLocale<{ min: number; title: string }[]>(() =>
  LEVEL_MIN.map((min, i) => ({ min, title: t(`level.${i + 1}` as 'level.1') })),
)

export function levelFor(xp: number) {
  const LEVELS = getLevels()
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i
  const cur = LEVELS[idx]
  const next = LEVELS[idx + 1]
  const pct = next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100
  return { level: idx + 1, title: cur.title, min: cur.min, next: next?.min ?? null, pct }
}

/** Khan-style mastery ladder per node. */
export function masteryFor(p: NodeProgress | undefined): Mastery {
  if (!p || p.attempts === 0) return 'none'
  if (p.perfectRuns >= 2) return 'mastered'
  if (p.bestAccuracy >= 0.9) return 'proficient'
  if (p.bestAccuracy >= 0.6) return 'familiar'
  return 'attempted'
}

const MASTERIES: Mastery[] = ['none', 'attempted', 'familiar', 'proficient', 'mastered']
export function masteryLabel(m: Mastery): string {
  return t(`mastery.${m}` as 'mastery.none')
}
export function masteryHint(m: Mastery): string {
  return t(`mastery.${m}.hint` as 'mastery.none.hint')
}
export { MASTERIES }

/** A node counts as passed (unlocks next) at 熟悉 or above. */
export const PASS_ACCURACY = 0.6

export type BadgeDef = { id: string; title: string; desc: string; emoji: string }

export const getBadges = perLocale<BadgeDef[]>(() => [
  { id: 'first-lesson', title: t('badge.first-lesson'), desc: t('badge.first-lesson.desc'), emoji: '🎨' },
  { id: 'perfect-quiz', title: t('badge.perfect-quiz'), desc: t('badge.perfect-quiz.desc'), emoji: '🎯' },
  ...getUnits().map((u, i) => ({
    id: `unit-${u.id}`,
    title: i === 0 ? t('badge.unit.first') : t('badge.unit.n', { n: i + 1 }),
    desc: t('badge.unit.desc', { title: u.title }),
    emoji: ['🏮', '🌅', '🗺️', '🏙️', '⚖️', '🖌️', '🪞', '🧧', '🎭', '🇬🇧', '🏛️'][i] ?? '🗺️',
  })),
  { id: 'mastery', title: t('badge.mastery'), desc: t('badge.mastery.desc'), emoji: '🏆' },
  { id: 'unit-done', title: t('badge.unit-done'), desc: t('badge.unit-done.desc'), emoji: '🗺️' },
  { id: 'xp-500', title: t('badge.xp-500'), desc: t('badge.xp-500.desc'), emoji: '✦' },
  { id: 'explorer', title: t('badge.explorer'), desc: t('badge.explorer.desc'), emoji: '🧭' },
  { id: 'dualread', title: t('badge.dualread'), desc: t('badge.dualread.desc'), emoji: '⧉' },
  ...getResearchQuests().map((q, i) => ({
    id: q.badgeId,
    title: q.badgeTitle,
    desc: t('badge.quest.desc', { title: q.title }),
    emoji: QUEST_EMOJI[i] ?? '🏅',
  })),
  { id: 'sba-starter', title: t('badge.sba-starter'), desc: t('badge.sba-starter.desc'), emoji: '✏️' },
  { id: 'sba-complete', title: t('badge.sba-complete'), desc: t('badge.sba-complete.desc'), emoji: '🎓' },
])

export const getBadgeById = perLocale(() => new Map(getBadges().map((b) => [b.id, b])))
