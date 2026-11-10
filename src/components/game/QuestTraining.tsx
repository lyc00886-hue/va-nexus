import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import { isSequentialUnlocked } from '../../game/mediaCatalog'
import type { Unit } from '../../game/types'
import { t } from '../../i18n'
import { LessonPlayer } from './LessonPlayer'

type Training = {
  id: 'art' | 'media'
  title: string
  units: Unit[]
}

/**
 * Enterable art-history and media-intro training on the quest map.
 * Lessons open in the existing player, so the questions can be answered.
 */
export function QuestTraining({ art, media }: { art: Unit[]; media: Unit[] }) {
  const { state } = useGame()
  const completed = (id: string) => Boolean(state.nodes[id]?.completed)
  const tracks: Training[] = [
    { id: 'art', title: t('map.train.art'), units: art },
    { id: 'media', title: t('map.train.media'), units: media },
  ]
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const visible = tracks.filter((track) => track.units.length > 0)
  if (visible.length === 0) return null

  return (
    <div data-quest-training className="space-y-4">
      {visible.map((track) => (
        <section key={track.id} data-quest-training={track.id} className="space-y-3">
          <h2 className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-bold text-[#FFF9E9]">{track.title}</h2>
          {track.units.map((unit) => (
            <article key={unit.id} data-quest-unit={unit.id} className="rounded-[1.5rem] border border-[#0D9488]/40 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-900">{unit.title}</h3>
              {unit.subtitle ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{unit.subtitle}</p> : null}
              <ul className="mt-3 space-y-3">
                {unit.nodes.map((lesson) => {
                  const ids = unit.nodes.map((node) => node.id)
                  const unlocked = isSequentialUnlocked(ids, lesson.id, completed)
                  const shown = Boolean(open[lesson.id]) && unlocked
                  return (
                    <li key={lesson.id} data-quest-lesson={lesson.id}>
                      <button
                        type="button"
                        disabled={!unlocked}
                        aria-expanded={shown}
                        onClick={() => setOpen((prev) => ({ ...prev, [lesson.id]: !prev[lesson.id] }))}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#e7f7f5] px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="block text-sm font-bold text-slate-900">{lesson.title}</span>
                        <span className="text-xs font-semibold text-[#0D9488]">
                          {completed(lesson.id) ? t('map.status.done') : t('map.media.open')}
                        </span>
                      </button>
                      {shown ? (
                        <div className="mt-3">
                          <LessonPlayer
                            lesson={lesson}
                            kind="lesson"
                            exitLabel={t('map.train.back')}
                            onExit={() => setOpen((prev) => ({ ...prev, [lesson.id]: false }))}
                          />
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </article>
          ))}
        </section>
      ))}
    </div>
  )
}
