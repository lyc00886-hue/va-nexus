import { useState } from 'react'
import type { Unit } from '../../game/types'
import { t, type MessageKey } from '../../i18n'
import { BiSpan } from './BilingualText'
import { LessonTrail, TrailCard, TrailIndex } from './ClassroomTrail'
import { F4SlidesEntry } from './F4SlidesEntry'
import { LessonPlayer } from './LessonPlayer'
import { OfficialUnitHeader } from './OfficialFormat'

/**
 * Classic map year list. Units sit on one path. A lesson opens in the player.
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
  const [unitId, setUnitId] = useState<string | null>(units[0]?.id ?? null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const open = units.find((unit) => unit.id === unitId) ?? units[0] ?? null
  const lesson = open?.nodes.find((node) => node.id === lessonId) ?? null

  return (
    <div data-f4-year-list data-year-grade={gradeKey} className="space-y-3 rounded-[1.75rem] border-2 border-[#0D9488] bg-white p-3 sm:p-4">
      {subtitleKey ? (
        <p data-year-subtitle className="px-1 text-sm leading-relaxed text-[#0F766E]">
          {t(subtitleKey)}
        </p>
      ) : null}
      {gradeKey === 'map.grade.f4' ? <F4SlidesEntry /> : null}
      <ol data-classroom-units className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {units.map((unit, index) => {
          const selected = unit.id === open?.id
          return (
            <li key={unit.id} className="min-w-0">
              <TrailCard
                data-f4-unit={unit.id}
                aria-pressed={selected}
                selected={selected}
                onClick={() => {
                  setLessonId(null)
                  setUnitId(unit.id)
                }}
              >
                <TrailIndex n={index + 1} selected={selected} />
                <span className="min-w-0 text-sm font-bold leading-snug">
                  <BiSpan text={unit.title} />
                </span>
              </TrailCard>
            </li>
          )
        })}
      </ol>
      {units.map((unit) =>
        unit.id === open?.id ? (
          <div key={unit.id} className="space-y-2">
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
        ) : null,
      )}
    </div>
  )
}
