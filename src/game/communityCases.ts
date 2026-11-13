/**
 * Slice ② classroom cases for F4-U3-L3 and F4-U3-L4.
 * Copy comes from the locale keys. Hill has no verified classroom YouTube.
 * Playback is an official YouTube embed only — no download, upload, or rehost.
 */
import { easyReadLines } from '../lib/lessonReadingSurface.ts'

export const COMMUNITY_CASE_LESSON_IDS = ['F4-U3-L3', 'F4-U3-L4'] as const

export type CommunityCaseLessonId = (typeof COMMUNITY_CASE_LESSON_IDS)[number]

export const HILL_PAGE_URL = 'https://www.apo.hk/tc/web/apo/hi_hill.html'
export const HILL_BROCHURE_URL =
  'https://www.apo.hk/documents/27096998/30098408/180326_hihill_brochure_web.pdf'
export const DEEPFOOD_PAGE_URL = 'https://www.apo.hk/tc/web/apo/oi_the_unexplored_flavour_x.html'

/** Official overview. The only embedded classroom playback. */
export const OVERVIEW_VIDEO_ID = 'hR9X0Ce2r9o'

const FLAVOUR_X = '\u{1D465}'

export const FURTHER_CLASSROOM_VIDEOS = [
  {
    id: 'ne_jKi_E1m8',
    title: `【喚味：${FLAVOUR_X} | 個體 ${FLAVOUR_X}】【The Unexplored Flavour: ${FLAVOUR_X} | People ${FLAVOUR_X}】`,
  },
  {
    id: 'bNRkL39iQQc',
    title: `【喚味：${FLAVOUR_X} | 時間 ${FLAVOUR_X}】【The Unexplored Flavour: ${FLAVOUR_X} | Time ${FLAVOUR_X}】`,
  },
  {
    id: 'THsKZTXt-sk',
    title: `【喚味：${FLAVOUR_X} | 空間 ${FLAVOUR_X}】【The Unexplored Flavour: ${FLAVOUR_X} | Space ${FLAVOUR_X}】`,
  },
] as const

/** No official classroom-playable YouTube was verified for 邂逅！山 川 人. */
export const HILL_VIDEO_ID = null

export const OFFICIAL_VIDEO_IDS = [
  OVERVIEW_VIDEO_ID,
  ...FURTHER_CLASSROOM_VIDEOS.map((video) => video.id),
] as const

export function isCommunityCaseLesson(id: string): id is CommunityCaseLessonId {
  return id === 'F4-U3-L3' || id === 'F4-U3-L4'
}

export function classroomWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}

export function classroomEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`
}

const L3_BODY_KEYS = [
  'lesson.f4u3l3.card.theme.body',
  'lesson.f4u3l3.card.observe.body',
  'lesson.f4u3l3.card.interview.body',
  'lesson.f4u3l3.card.insight.body',
  'lesson.f4u3l3.card.practice.body',
] as const

const L4_BODY_KEYS = [
  'lesson.f4u3l4.card.make.body',
  null,
  null,
  'lesson.f4u3l4.card.three.body',
  'lesson.f4u3l4.card.practice.body',
] as const

type CopyCard = { body: string; easy: string[] }

export function applyCommunityLessonCopy<T extends { id: string; title: string; subtitle: string; cards: CopyCard[] }>(
  lesson: T,
  text: (key: string) => string,
): T {
  if (lesson.id === 'F4-U3-L3') {
    return {
      ...lesson,
      title: text('lesson.f4u3l3.title'),
      subtitle: text('lesson.f4u3l3.subtitle'),
      cards: lesson.cards.map((card, index) => replaceBody(card, L3_BODY_KEYS[index], text)),
    }
  }
  if (lesson.id === 'F4-U3-L4') {
    return {
      ...lesson,
      title: text('lesson.f4u3l4.title'),
      subtitle: text('lesson.f4u3l4.subtitle'),
      cards: lesson.cards.map((card, index) => replaceBody(card, L4_BODY_KEYS[index], text)),
    }
  }
  return lesson
}

function replaceBody<T extends CopyCard>(card: T, key: string | null | undefined, text: (key: string) => string): T {
  if (!key) return card
  const body = text(key)
  return { ...card, body, easy: easyReadLines(body) }
}
