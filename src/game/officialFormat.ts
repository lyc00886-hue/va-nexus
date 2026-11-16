/**
 * Official format header and five-part objectives for live senior-secondary units.
 * Product wording lives in the locale files. This module only names the keys.
 * F4-U2-L3 stays out: no five-part keys and no part list.
 */

export const OFFICIAL_UNIT_IDS = [
  'F4-U1-ORIENT',
  'F4-U2-DRAW-DESIGN',
  'F4-U3-COMMUNITY',
  'F4-U4-SELF-RESEARCH',
  'F4-U5-ART-HIST',
  'F4-U6-THEME-SEEDS',
  'F4-U7-EXAM-STRUCT',
  'F5-U1-ORIENT',
  'F5-U2-AESTHETIC',
  'F5-U3-HERITAGE',
  'F5-U4-SYMBOL',
  'F5-U5-ROLE',
  'F5-U6-CONTEMP',
  'F5-U7-PORTFOLIO',
  'F6-U1-ORIENT',
  'F6-U2-MINGQING',
  'F6-U3-DAILY',
  'F6-U4-LITERATI',
  'F6-U5-ROLE',
  'F6-U6-PORTFOLIO',
] as const

export const OFFICIAL_GOAL_KEYS = [
  'goal.creativity',
  'goal.skill',
  'goal.appreciate',
  'goal.context',
] as const

export const OFFICIAL_PARTS = [
  { slot: 'element', label: 'part.element' },
  { slot: 'principle', label: 'part.principle' },
  { slot: 'appreciate', label: 'area.appreciate' },
  { slot: 'expression', label: 'part.expression' },
  { slot: 'making', label: 'part.making' },
] as const

export const F4_U6_L1_TOPICS = ['collection', 'family', 'conflict'] as const

/** November lessons keep their existing frame. Parts are drawn there. */
export const THEMATIC_PART_LESSONS = ['F4-U3-L3', 'F4-U3-L4'] as const

export const HELD_LESSON_ID = 'F4-U2-L3'

const UNIT_IDS = new Set<string>(OFFICIAL_UNIT_IDS)

export type OfficialUnitFormat = {
  stageKey: string
  themeKey: string
  messageKey: string
}

export type OfficialTopic = {
  labelKey: string
  parts: { slot: string; label: string; bodyKey: string }[]
}

export function officialUnit(unitId: string): OfficialUnitFormat | null {
  const match = /^(F[456])-U(\d+)-/.exec(unitId)
  if (!match || !UNIT_IDS.has(unitId)) return null
  const form = match[1].toLowerCase()
  const unit = `${form}u${match[2]}`
  return {
    stageKey: `unit.header.stage.value.${form}`,
    themeKey: `unit.${unit}.theme`,
    messageKey: `unit.${unit}.themeMessage`,
  }
}

export function officialTopics(lessonId: string): OfficialTopic[] | null {
  if (lessonId === HELD_LESSON_ID) return null
  const match = /^(F[456])-U(\d+)-L(\d+)$/.exec(lessonId)
  if (!match) return null
  const prefix = `lesson.${match[1].toLowerCase()}u${match[2]}l${match[3]}`
  if (lessonId === 'F4-U6-L1') {
    return F4_U6_L1_TOPICS.map((topic) => ({
      labelKey: `${prefix}.topic.${topic}.label`,
      parts: OFFICIAL_PARTS.map((part) => ({
        slot: part.slot,
        label: part.label,
        bodyKey: `${prefix}.topic.${topic}.part.${part.slot}`,
      })),
    }))
  }
  return [
    {
      labelKey: '',
      parts: OFFICIAL_PARTS.map((part) => ({
        slot: part.slot,
        label: part.label,
        bodyKey: `${prefix}.part.${part.slot}`,
      })),
    },
  ]
}

/** Player draws the part list, except the two November lessons that keep their frame. */
export function lessonPartsOnPlayer(lessonId: string): boolean {
  if (THEMATIC_PART_LESSONS.includes(lessonId as (typeof THEMATIC_PART_LESSONS)[number])) return false
  return officialTopics(lessonId) != null
}
