import { useState } from 'react'
import type { Unit } from '../../game/types'
import { t, type MessageKey } from '../../i18n'
import { UnitImageCard, LessonTrail } from './ClassroomTrail'
import { F4SlidesEntry } from './F4SlidesEntry'
import { LessonPlayer } from './LessonPlayer'
import { OfficialUnitHeader } from './OfficialFormat'

/**
 * Classic map year list. Units sit on full-width image rows.
 * A lesson opens in the player.
 */
export function F4YearList({
  units,
  gradeKey = 'map.grade.f4',
  subtitleKey,
}: {
  units: Unit[]
  gradeKey?: MessageKey
  subtitleKey?: MessageKey
}) {
  const [unitId, setUnitId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const open = units.find((unit) => unit.id === unitId) ?? null
  const lesson = open?.nodes.find((node) => node.id === lessonId) ?? null

  return (
    <div data-f4-year-list data-year-grade={gradeKey} className="space-y-3 rounded-[1.75rem] border-2 border-[#0D9488] bg-white p-3 sm:p-4">
      {subtitleKey ? (
        <p data-year-subtitle className="px-1 text-sm leading-relaxed text-[#0F766E]">
          {t(subtitleKey)}
        </p>
      ) : null}
      {gradeKey === 'map.grade.f4' ? <F4SlidesEntry /> : null}
      <ol data-classroom-units className="space-y-2">
        {units.map((unit) => {
          const selected = unit.id === open?.id
          return (
            <li key={unit.id} className="min-w-0 space-y-2">
              <UnitImageCard
                data-f4-unit={unit.id}
                aria-expanded={selected}
                selected={selected}
                cover={unit.coverImage}
                title={unit.title}
                onClick={() => {
                  setLessonId(null)
                  setUnitId(selected ? null : unit.id)
                }}
              />
              {selected ? (
                <div className="space-y-2">
                  <OfficialUnitHeader unitId={unit.id} />
                  <LessonTrail
                    lessons={unit.nodes}
                    focusId={lessonId}
                    onOpen={(id) => {
                      setUnitId(unit.id)
                      setLessonId(id)
                    }}
                  />
                  {lesson ? (
                    <LessonPlayer lesson={lesson} kind="lesson" exitLabel={t('map.media.back')} onExit={() => setLessonId(null)} />
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
