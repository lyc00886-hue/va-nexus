import researchQuests from '../content/research-quests.json'
import { adaptCards, adaptQuiz, fillAnswersOf, type ContentLesson } from './content'
import type { ResearchQuest } from './types'

/** Research-skill quests — content by PEANUTS (src/content/research-quests.json). */
type ContentQuest = ContentLesson & { badge: string }

const QUESTS = (researchQuests as unknown as { quests: ContentQuest[] }).quests
const POOL = fillAnswersOf(QUESTS)

/** Small presentation extras keyed by position (content JSON has no skill / emoji fields) */
const SKILLS = ['資料搜集', '學術誠信', '研究方法', '視覺分析']
export const QUEST_EMOJI = ['🔍', '🛡️', '❓', '🖼️']

export const RESEARCH_QUESTS: ResearchQuest[] = QUESTS.map((q, i) => ({
  id: q.id,
  title: q.title,
  subtitle: `${q.cards.length} 張短課卡 · ${q.quiz.length} 題小測 · 徽章「${q.badge}」`,
  minutes: Math.max(3, Math.round((q.cards.length + q.quiz.length) / 2)),
  demo: true,
  cards: adaptCards(q.cards),
  questions: adaptQuiz(q.id, q.quiz, POOL),
  badgeId: `quest-${q.id}`,
  badgeTitle: q.badge,
  skill: SKILLS[i] ?? '研究技巧',
  embedFeldman: /費德曼/.test(q.title),
}))
