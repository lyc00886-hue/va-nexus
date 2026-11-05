import { t } from '../../i18n'
import { QUEST_IMAGE } from '../../lib/questImage'
import { ISLAND_LINE, type QuestIslandId } from '../../lib/softIslands'

/** Locked plate, cropped to the illustration panel (x 66–834, y 322–718 on a 900×1600 plate). */
export function QuestImage({ id }: { id: QuestIslandId }) {
  return (
    <figure data-quest-image={id} className="mt-3">
      <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '768 / 396' }}>
        <img
          src={QUEST_IMAGE[id]}
          alt={t(ISLAND_LINE[id])}
          width={900}
          height={1600}
          decoding="async"
          className="absolute h-auto max-w-none"
          style={{ width: '117.1875%', left: '-8.59375%', top: '-81.3131%' }}
        />
      </div>
    </figure>
  )
}
