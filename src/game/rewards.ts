import { UNITS } from './curriculum'
import { QUEST_EMOJI, RESEARCH_QUESTS } from './research'
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
export const LEVELS: { min: number; title: string }[] = [
  { min: 0, title: '初心觀察者' },
  { min: 100, title: '素描學徒' },
  { min: 250, title: '色彩探索者' },
  { min: 500, title: '構圖能手' },
  { min: 900, title: '藝術史偵探' },
  { min: 1400, title: '評賞達人' },
  { min: 2000, title: '研究策展人' },
  { min: 2800, title: '創作實驗家' },
  { min: 3800, title: '視藝大師' },
  { min: 5000, title: 'VA-Nexus 傳奇' },
]

export function levelFor(xp: number) {
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

export const MASTERY_LABEL: Record<Mastery, string> = {
  none: '未開始',
  attempted: '嘗試過',
  familiar: '熟悉',
  proficient: '精通',
  mastered: '掌握',
}

export const MASTERY_HINT: Record<Mastery, string> = {
  none: '完成短課同小測開始',
  attempted: '再試一次，答啱六成或以上就「熟悉」',
  familiar: '答啱九成或以上就「精通」',
  proficient: '再拎多次全對就「掌握」',
  mastered: '你已經掌握呢一課！',
}

/** A node counts as passed (unlocks next) at 熟悉 or above. */
export const PASS_ACCURACY = 0.6

export type BadgeDef = { id: string; title: string; desc: string; emoji: string }

export const BADGES: BadgeDef[] = [
  { id: 'first-lesson', title: '第一步', desc: '完成第一課', emoji: '🎨' },
  { id: 'perfect-quiz', title: '一擊即中', desc: '一次小測全部第一次就答啱', emoji: '🎯' },
  ...UNITS.map((u, i) => ({
    id: `unit-${u.id}`,
    title: i === 0 ? '尋路者' : `單元 ${i + 1} 完成`,
    desc: `完成「${u.title}」`,
    emoji: ['🏮', '🌅', '🗺️'][i] ?? '🗺️',
  })),
  { id: 'mastery', title: '真正掌握', desc: '任何一課達到「掌握」', emoji: '🏆' },
  { id: 'streak-3', title: '三日連續', desc: '連續學習 3 天', emoji: '🔥' },
  { id: 'streak-7', title: '一週不斷', desc: '連續學習 7 天', emoji: '⚡' },
  { id: 'xp-500', title: '經驗豐富', desc: '累積 500 XP', emoji: '⭐' },
  ...RESEARCH_QUESTS.map((q, i) => ({
    id: q.badgeId,
    title: q.badgeTitle,
    desc: `完成研究任務「${q.title}」`,
    emoji: QUEST_EMOJI[i] ?? '🏅',
  })),
  { id: 'sba-starter', title: 'SBA 起步', desc: '完成 SBA 第一步', emoji: '✏️' },
  { id: 'sba-complete', title: 'SBA 六步全通', desc: '完成 SBA 全部六步', emoji: '🎓' },
]

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]))
