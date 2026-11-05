import type { QuestIslandId } from './softIslands'

export const QUEST_IMAGE_DIR = '/content/learning-map-illustrations/soft-go-map1-knife2'

export const SOFT_GO_POLISH_PLATES = {
  '01-map-picker.png': 'f560e055158e',
  '02-softmotion-transition.png': 'c9e6b33ef176',
  '03-quest-image-research.png': 'b3a3df6def0b',
  '04-quest-image-critique.png': '396ccc073826',
  '05-quest-image-sba.png': 'ea4996bd1f94',
  '06-quest-image-exam.png': 'd289c37c7aa5',
  'preview-strip.png': 'aa5bb26acb91',
} as const

export const QUEST_IMAGE: Record<QuestIslandId, string> = {
  research: `${QUEST_IMAGE_DIR}/03-quest-image-research.png`,
  critique: `${QUEST_IMAGE_DIR}/04-quest-image-critique.png`,
  sba: `${QUEST_IMAGE_DIR}/05-quest-image-sba.png`,
  exam: `${QUEST_IMAGE_DIR}/06-quest-image-exam.png`,
}
