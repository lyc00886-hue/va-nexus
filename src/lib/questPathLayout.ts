/**
 * Positions for the vertical quest path. Shared by the scene art and the node buttons.
 * Five scene bands reuse one language for every year. The path stays in the open corridor.
 */

export type QuestPathPoint = { x: number; y: number }

export const QUEST_BANDS = ['garden', 'studio', 'classroom', 'frames', 'exam'] as const

export type QuestBandId = (typeof QUEST_BANDS)[number]

export type QuestNodeProgress = 'done' | 'current' | 'locked'

/** Left node, right node, on the phone-width stage. Scene cards sit on the opposite side. */
const NODE_X = [112, 248] as const

/** Phone column the path was drawn in. A wider map frame spreads the same lane out to the frame edges. */
export const QUEST_PATH_STAGE = 360

const WIDTH = QUEST_PATH_STAGE
const TOP = 118
/** Room under a two-line unit name so the tag clears the next scene card. */
const GAP = 236
const BOTTOM = 124

/**
 * Share of the path width used by a unit-name tag.
 * Wide enough for a whole English word or a short Chinese phrase, still clear of the scene cards.
 */
export const QUEST_LABEL_WIDTH_RATIO = 0.56

const LABEL_TOP = 28
const LABEL_HEIGHT = 108

export function questBand(index: number): QuestBandId {
  return QUEST_BANDS[index % QUEST_BANDS.length]
}

/** A framed checkpoint marks the picture-wall band. Other bands use a ring. */
export function questNodeFramed(index: number): boolean {
  return questBand(index) === 'frames'
}

/** Fresh entry starts at the first unit. Earlier units are done; later units stay locked. */
export function questCurrentIndex(completed: number, count: number): number {
  if (count <= 0) return 0
  const done = Math.max(0, Math.floor(completed))
  return Math.min(done, count - 1)
}

export function questNodeProgress(index: number, currentIndex: number): QuestNodeProgress {
  if (index < currentIndex) return 'done'
  if (index === currentIndex) return 'current'
  return 'locked'
}

/** Room for a unit-name tag so a wide frame still keeps the title inside the path. */
function laneInset(): number {
  return (QUEST_PATH_STAGE * QUEST_LABEL_WIDTH_RATIO) / 2 + 12
}

/** Phone stage keeps the drawn lane. A wider frame carries the lane out to both edges. */
function laneX(index: number, stage: number): number {
  if (stage <= QUEST_PATH_STAGE) return NODE_X[index % 2]
  const inset = laneInset()
  return index % 2 === 0 ? inset : stage - inset
}

export function questPathLayout(
  count: number,
  gap = GAP,
  bottom = BOTTOM,
  width = QUEST_PATH_STAGE,
): { width: number; height: number; points: QuestPathPoint[] } {
  const stage = Math.max(QUEST_PATH_STAGE, Math.round(width) || QUEST_PATH_STAGE)
  const step = Math.max(160, gap)
  const tail = Math.max(BOTTOM, bottom)
  const points = Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    x: laneX(index, stage),
    y: TOP + index * step,
  }))
  const height = (points[points.length - 1]?.y ?? TOP) + tail
  return { width: stage, height, points }
}

/** Fraction of the stage taken by a unit-name tag. The tag keeps its phone size on a wide frame. */
export function questLabelSpan(stageWidth: number): number {
  const stage = Math.max(QUEST_PATH_STAGE, stageWidth || QUEST_PATH_STAGE)
  return (QUEST_PATH_STAGE * QUEST_LABEL_WIDTH_RATIO) / stage
}

/**
 * Vertical room for a wrapped official title.
 * Narrow screens and 英中對照 need a longer step so the label stays off the next scene.
 * Wide single-language maps keep the original step.
 */
export function questPathSpacing(pathWidth: number, bilingual: boolean): { gap: number; bottom: number } {
  const width = Math.max(200, pathWidth || WIDTH)
  const scale = width / WIDTH
  if (scale >= 1 && !bilingual) return { gap: GAP, bottom: BOTTOM }
  const labelPx = bilingual ? Math.ceil(16800 / width) : Math.ceil(8000 / width)
  const stepPx = (bilingual ? 86 : 78) + labelPx
  const floor = bilingual ? 176 : GAP
  const gap = Math.max(floor, Math.ceil(stepPx / scale))
  const bottom = Math.max(BOTTOM, Math.ceil((labelPx + 40) / scale))
  return { gap, bottom }
}

/** Scene card on the side opposite the node, inset from the unit-name tag. */
export function questSceneBox(
  index: number,
  point: QuestPathPoint,
  width = QUEST_PATH_STAGE,
): { x: number; y: number; w: number; h: number } {
  const w = 128
  const h = 124
  const y = point.y - 52
  const baseNode = NODE_X[index % 2]
  const baseScene = index % 2 === 0 ? 226 : 6
  const raw = point.x + (baseScene - baseNode)
  const maxX = Math.max(0, width - w)
  return { x: Math.min(Math.max(0, raw), maxX), y, w, h }
}

/** Unit-name tag under the node. The box stays in the path corridor, clear of scene art. */
export function questLabelBox(
  point: QuestPathPoint,
  width = QUEST_PATH_STAGE,
): { x: number; y: number; w: number; h: number } {
  const w = QUEST_PATH_STAGE * QUEST_LABEL_WIDTH_RATIO
  const maxX = Math.max(0, width - w)
  return { x: Math.min(Math.max(0, point.x - w / 2), maxX), y: point.y + LABEL_TOP, w, h: LABEL_HEIGHT }
}
