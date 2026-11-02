import { contentJson } from '../i18n/content'
import { perLocale, t, type MessageKey } from '../i18n'
import { adaptCards, adaptQuiz, fillAnswersOf, type ContentLesson } from './content'
import type { ResearchQuest } from './types'

/** Research-skill quests — content by PEANUTS (src/content/research-quests[.<locale>].json). */
type ContentQuest = ContentLesson & { badge: string }

/** Small presentation extras keyed by position (content JSON has no skill / emoji fields) */
const SKILL_KEYS: MessageKey[] = ['skill.sources', 'skill.integrity', 'skill.method', 'skill.visual']
export const QUEST_EMOJI = ['🔍', '🛡️', '❓', '🖼️']

/** Feldman-writing quest detection uses the zh-Hant original so it is locale-independent. */
const FELDMAN_QUEST_IDS = new Set(
  contentJson<{ quests: ContentQuest[] }>('research-quests', 'zh-Hant')
    .quests.filter((q) => /費德曼/.test(q.title))
    .map((q) => q.id),
)

export const getResearchQuests = perLocale<ResearchQuest[]>(() => {
  const quests = contentJson<{ quests: ContentQuest[] }>('research-quests').quests
  const pool = fillAnswersOf(quests)
  return quests.map((q, i) => ({
    id: q.id,
    title: q.title,
    subtitle: t('quest.subtitle', { cards: q.cards.length, quiz: q.quiz.length, badge: q.badge }),
    minutes: Math.max(3, Math.round((q.cards.length + q.quiz.length) / 2)),
    demo: true,
    cards: adaptCards(q.cards),
    questions: adaptQuiz(q.id, q.quiz, pool),
    badgeId: `quest-${q.id}`,
    badgeTitle: q.badge,
    skill: SKILL_KEYS[i] ? t(SKILL_KEYS[i]) : t('skill.default'),
    embedFeldman: FELDMAN_QUEST_IDS.has(q.id) || /費德曼|费德曼|Feldman/i.test(q.title),
  }))
})
