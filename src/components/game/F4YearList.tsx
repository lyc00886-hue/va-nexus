import { useState } from 'react'
import type { Unit } from '../../game/types'
import { t } from '../../i18n'
import { LessonPlayer } from './LessonPlayer'
import { QuestionTypeChips } from './QuestionTypeChips'

/**
 * Classic map, Form 4. Every unit in the completed set is listed.
 * A unit opens onto its lessons. A lesson opens in the player. Entry does not.
 */
export function F4YearList({ units }: { units: Unit[] }) {
  const [unitId, setUnitId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const open = units.find((unit) => unit.id === unitId) ?? null
  const lesson = open?.nodes.find((node) => node.id === lessonId) ?? null

  return (
    <div data-f4-year-list className="space-y-3">
      {units.map((unit) => {
        const selected = unit.id === unitId
        return (
          <article key={unit.id} data-f4-unit={unit.id} className="rounded-3xl border border-[#0D9488]/45 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0D9488] px-2.5 py-0.5 text-xs font-bold text-[#FFF9E9]">{t('map.grade.f4')}</span>
              <span className="rounded-full bg-[#e7f7f5] px-2.5 py-0.5 text-xs font-semibold text-[#0F766E]">
                {t('map.f4.lessonCount', { n: unit.nodes.length })}
              </span>
            </div>
            <button
              type="button"
              aria-expanded={selected}
              onClick={() => {
                setLessonId(null)
                setUnitId(selected ? null : unit.id)
              }}
              className="mt-2 block w-full text-left text-base font-bold leading-snug text-slate-900"
            >
              {unit.title}
            </button>
            {selected ? (
              <ul className="mt-3 space-y-2">
                {unit.nodes.map((node) => {
                  const shown = node.id === lessonId
                  return (
                    <li key={node.id} data-f4-lesson={node.id} className="rounded-2xl bg-[#f7fffe] px-3 py-2 ring-1 ring-[#d7efe9]">
                      <button
                        type="button"
                        aria-expanded={shown}
                        onClick={() => setLessonId(shown ? null : node.id)}
                        className="block w-full text-left text-sm font-bold text-slate-900"
                      >
                        {node.title}
                      </button>
                      <span className="mt-1 block">
                        <QuestionTypeChips types={node.questions.map((question) => question.type)} />
                      </span>
                      {shown && lesson ? (
                        <div className="mt-3">
                          <LessonPlayer lesson={lesson} kind="lesson" exitLabel={t('map.media.back')} onExit={() => setLessonId(null)} />
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
