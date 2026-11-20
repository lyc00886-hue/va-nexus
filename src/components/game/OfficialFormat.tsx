import { type MessageKey } from '../../i18n'
import { BiKey } from './BilingualText'
import {
  OFFICIAL_GOAL_KEYS,
  lessonPartsOnPlayer,
  officialTopics,
  officialUnit,
} from '../../game/officialFormat'

function line(key: string) {
  return <BiKey name={key as MessageKey} />
}

export function OfficialGoalChips() {
  return (
    <ul data-official-goals className="flex list-none flex-wrap gap-2 p-0">
      {OFFICIAL_GOAL_KEYS.map((key) => (
        <li
          key={key}
          className="rounded-full border border-[#0D9488] bg-white px-3 py-1.5 text-sm font-semibold text-[#0D9488]"
        >
          {line(key)}
        </li>
      ))}
    </ul>
  )
}

/** Thin stage, theme, and theme-message header for one live senior-secondary unit. */
export function OfficialUnitHeader({ unitId }: { unitId: string }) {
  const format = officialUnit(unitId)
  if (!format) return null
  return (
    <section
      data-official-header={unitId}
      className="mt-3 space-y-3 rounded-2xl border border-[#0D9488] bg-white px-4 py-3"
    >
      <div data-official-stage={unitId}>
        <h3 className="text-sm font-bold text-[#0D9488]">{line('unit.header.stage.label')}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-800">{line(format.stageKey)}</p>
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#0D9488]">{line('unit.f4u3.theme.label')}</h3>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-900">{line(format.themeKey)}</p>
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#0D9488]">{line('unit.f4u3.themeMessage.label')}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-800">{line(format.messageKey)}</p>
      </div>
      <OfficialGoalChips />
    </section>
  )
}

export function OfficialPartList({ lessonId, title }: { lessonId: string; title?: string }) {
  const topics = officialTopics(lessonId)
  if (!topics) return null
  return (
    <section
      data-official-parts={lessonId}
      className="space-y-3 rounded-2xl border border-[#0D9488]/40 bg-[#FFF9E9] p-4"
    >
      {title ? <h3 className="text-base font-bold text-slate-900">{title}</h3> : null}
      {topics.map((topic) => (
        <div key={topic.labelKey || lessonId} data-official-topic={topic.labelKey || lessonId} className="space-y-2">
          {topic.labelKey ? (
            <h4 className="text-sm font-bold text-slate-900">
              {line('part.topic')}：{line(topic.labelKey)}
            </h4>
          ) : null}
          {topic.parts.map((part) => (
            <div key={part.bodyKey} data-official-part={part.slot}>
              <p className="text-sm font-bold text-[#0D9488]">{line(part.label)}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{line(part.bodyKey)}</p>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

/** Five-part objectives on the lesson player. November lessons draw the same list in their frame. */
export function OfficialLessonParts({ lessonId, title }: { lessonId: string; title: string }) {
  if (!lessonPartsOnPlayer(lessonId)) return null
  return <OfficialPartList lessonId={lessonId} title={title} />
}
