import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getAllNodes, getUnits } from '../game/curriculum'
import { getF4Units } from '../game/f4Demo'
import { getResearchQuests } from '../game/research'
import { t } from '../i18n'
import {
  getBadgeById,
  levelFor,
  masteryFor,
  PASS_ACCURACY,
  XP,
} from '../game/rewards'
import type { ActivityEntry, GameStateV1, Mastery, SessionResult } from '../game/types'

/**
 * Game state — one versioned object persisted to localStorage.
 * To sync per user later: upsert `state` as JSON into a Supabase row keyed by auth.uid().
 */
export const GAME_STORAGE_KEY = 'va-nexus:game:v1'

const INITIAL: GameStateV1 = {
  version: 1,
  xp: 0,
  streak: { count: 0, best: 0, lastDate: null },
  nodes: {},
  quests: {},
  badges: {},
  activity: [],
  awarded: {},
  prefs: {},
}

/** Local calendar date in Hong Kong time (YYYY-MM-DD). */
export function hktDate(ts = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts))
}

function load(): GameStateV1 {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameStateV1>
      if (parsed.version === 1) {
        return {
          ...INITIAL,
          ...parsed,
          streak: { ...INITIAL.streak, ...parsed.streak },
          prefs: {},
        }
      }
    }
  } catch {
    /* ignore */
  }
  return INITIAL
}

let seq = 0
function entry(kind: ActivityEntry['kind'], text: string, xp?: number): ActivityEntry {
  seq += 1
  return { id: `${Date.now().toString(36)}-${seq}`, ts: Date.now(), kind, text, xp }
}

function pushActivity(s: GameStateV1, ...items: ActivityEntry[]): GameStateV1 {
  return { ...s, activity: [...items.reverse(), ...s.activity].slice(0, 60) }
}

function touchStreak(s: GameStateV1): GameStateV1 {
  const today = hktDate()
  if (s.streak.lastDate === today) return s
  const yesterday = hktDate(Date.now() - 24 * 3600 * 1000)
  const count = s.streak.lastDate === yesterday ? s.streak.count + 1 : 1
  return { ...s, streak: { count, best: Math.max(s.streak.best, count), lastDate: today } }
}

function addXp(s: GameStateV1, amount: number): GameStateV1 {
  if (amount <= 0) return s
  const before = levelFor(s.xp).level
  let next: GameStateV1 = { ...s, xp: s.xp + amount }
  next = touchStreak(next)
  const after = levelFor(next.xp)
  if (after.level > before) next = pushActivity(next, entry('level', t('activity.levelUp', { n: after.level, title: after.title })))
  return next
}

function grantBadge(s: GameStateV1, id: string, out: string[]): GameStateV1 {
  if (s.badges[id]) return s
  const def = getBadgeById().get(id)
  out.push(id)
  return pushActivity(
    { ...s, badges: { ...s.badges, [id]: Date.now() } },
    entry('badge', t('activity.badge', { title: def?.title ?? id })),
  )
}

function checkBadges(s: GameStateV1, out: string[]): GameStateV1 {
  let n = s
  const done = (id: string) => n.nodes[id]?.completed
  const anyDone = Object.values(n.nodes).some((p) => p?.completed)
  if (getAllNodes().some((x) => done(x.id))) n = grantBadge(n, 'first-lesson', out)
  if (anyDone) n = grantBadge(n, 'explorer', out)
  let unitDone = false
  for (const u of getUnits()) {
    if (u.nodes.every((x) => done(x.id))) {
      n = grantBadge(n, `unit-${u.id}`, out)
      unitDone = true
    }
  }
  if (getF4Units().some((u) => u.nodes.length > 0 && u.nodes.every((x) => done(x.id)))) unitDone = true
  if (unitDone) n = grantBadge(n, 'unit-done', out)
  if (
    getF4Units().some((u) =>
      u.nodes.some((node) => done(node.id) && node.questions.some((q) => q.type === 'dualRead')),
    )
  ) {
    n = grantBadge(n, 'dualread', out)
  }
  if (Object.values(n.nodes).some((p) => masteryFor(p) === 'mastered')) n = grantBadge(n, 'mastery', out)
  if (n.xp >= 500) n = grantBadge(n, 'xp-500', out)
  for (const q of getResearchQuests()) if (n.quests[q.id]?.completed) n = grantBadge(n, q.badgeId, out)
  const sbaSteps = Object.keys(n.awarded).filter((k) => k.startsWith('sba-step-')).length
  if (sbaSteps >= 1) n = grantBadge(n, 'sba-starter', out)
  if (sbaSteps >= 6) n = grantBadge(n, 'sba-complete', out)
  return n
}

export type FinishOutcome = {
  xpGained: number
  passed: boolean
  mastery: Mastery
  newBadges: string[]
}

type GameContextValue = {
  state: GameStateV1
  level: ReturnType<typeof levelFor>
  /** streak to display (0 if broken) */
  streak: number
  progressPct: number
  isUnlocked: (nodeId: string) => boolean
  currentNodeId: string | null
  finishLesson: (id: string, title: string, result: SessionResult, kind: 'lesson' | 'quest') => FinishOutcome
  /** Idempotent one-off reward (e.g. `sba-step-2`). Returns XP gained (0 if already awarded). */
  awardOnce: (key: string, xp: number, text: string, kind: ActivityEntry['kind']) => number
  resetGame: () => void
  /** Replace the whole state (used by per-user cloud sync after merging). */
  replaceState: (s: GameStateV1) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameStateV1>(load)
  const ref = useRef(state)
  ref.current = state

  useEffect(() => {
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const commit = useCallback((next: GameStateV1) => {
    ref.current = next
    setState(next)
  }, [])

  const finishLesson = useCallback<GameContextValue['finishLesson']>(
    (id, title, result, kind) => {
      let s = ref.current
      const newBadges: string[] = []
      const passed = result.accuracy >= PASS_ACCURACY
      const perfect = result.firstTryCorrect === result.total && result.total > 0
      const retries = result.total - result.firstTryCorrect

      let xp = result.firstTryCorrect * XP.correctFirstTry + retries * XP.correctRetry
      if (kind === 'lesson') {
        const prev = s.nodes[id]
        const firstPass = passed && !prev?.completed
        if (firstPass) xp += XP.lessonComplete
        if (perfect) xp += XP.perfectBonus
        // replays of a completed lesson earn half (practice still counts, farming less so)
        if (prev?.completed) xp = Math.round(xp / 2)
        s = {
          ...s,
          nodes: {
            ...s.nodes,
            [id]: {
              attempts: (prev?.attempts ?? 0) + 1,
              bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, result.accuracy),
              perfectRuns: (prev?.perfectRuns ?? 0) + (perfect ? 1 : 0),
              completed: Boolean(prev?.completed || passed),
              lastTs: Date.now(),
            },
          },
        }
      } else {
        const prev = s.quests[id]
        if (passed && !prev?.completed) xp += XP.questComplete
        else if (prev?.completed) xp = Math.round(xp / 2)
        s = {
          ...s,
          quests: { ...s.quests, [id]: { completed: Boolean(prev?.completed || passed), ts: Date.now() } },
        }
      }
      if (perfect) s = grantBadge(s, 'perfect-quiz', newBadges)
      s = pushActivity(
        s,
        entry(
          kind,
          t(passed ? 'activity.completed' : 'activity.practised', { title, pct: Math.round(result.accuracy * 100) }),
          xp,
        ),
      )
      s = addXp(s, xp)
      s = checkBadges(s, newBadges)
      commit(s)
      return {
        xpGained: xp,
        passed,
        mastery: kind === 'lesson' ? masteryFor(s.nodes[id]) : passed ? 'proficient' : 'attempted',
        newBadges,
      }
    },
    [commit],
  )

  const awardOnce = useCallback<GameContextValue['awardOnce']>(
    (key, xp, text, kind) => {
      let s = ref.current
      if (s.awarded[key]) return 0
      s = { ...s, awarded: { ...s.awarded, [key]: Date.now() } }
      s = pushActivity(s, entry(kind, text, xp))
      s = addXp(s, xp)
      s = checkBadges(s, [])
      commit(s)
      return xp
    },
    [commit],
  )

  const resetGame = useCallback(() => commit(INITIAL), [commit])

  const value = useMemo<GameContextValue>(() => {
    const today = hktDate()
    const yesterday = hktDate(Date.now() - 24 * 3600 * 1000)
    const alive = state.streak.lastDate === today || state.streak.lastDate === yesterday
    const isUnlocked = (nodeId: string) => {
      for (const u of getUnits()) {
        const i = u.nodes.findIndex((n) => n.id === nodeId)
        if (i === -1) continue
        if (i === 0) return true
        return Boolean(state.nodes[u.nodes[i - 1].id]?.completed)
      }
      return false
    }
    const ALL_NODES = getAllNodes()
    const completedCount = ALL_NODES.filter((n) => state.nodes[n.id]?.completed).length
    const current = ALL_NODES.find((n) => isUnlocked(n.id) && !state.nodes[n.id]?.completed)
    return {
      state,
      level: levelFor(state.xp),
      streak: alive ? state.streak.count : 0,
      progressPct: Math.round((completedCount / ALL_NODES.length) * 100),
      isUnlocked,
      currentNodeId: current?.id ?? null,
      finishLesson,
      awardOnce,
      resetGame,
      replaceState: commit,
    }
  }, [state, finishLesson, awardOnce, resetGame, commit])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
