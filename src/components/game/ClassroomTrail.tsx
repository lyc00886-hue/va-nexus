import type { ButtonHTMLAttributes } from 'react'
import type { Lesson } from '../../game/types'
import { BiSpan } from './BilingualText'
import { QuestionTypeChips } from './QuestionTypeChips'

/** Full-width unit row. The cover is the image button; the official title stays inside the frame. */
export function UnitImageCard({
  selected,
  cover,
  title,
  ...rest
}: { selected: boolean; cover?: string; title: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={
        selected
          ? 'flex w-full min-w-0 items-center gap-3 rounded-3xl border-2 border-[#0D9488] bg-[#E7F6F3] px-3 py-2.5 text-left'
          : 'flex w-full min-w-0 items-center gap-3 rounded-3xl border-2 border-[#0D9488] bg-white px-3 py-2.5 text-left'
      }
    >
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#0D9488]/40 bg-[#FFF9E9]">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
      </span>
      <span className="quest-label min-w-0 flex-1 text-sm font-bold leading-snug text-slate-900">
        <BiSpan text={title} keepWords />
      </span>
    </button>
  )
}

/** Lessons under the selected unit. One lesson shows its question types; the others stay one line each. */
export function LessonTrail({
  lessons,
  focusId,
  onOpen,
}: {
  lessons: Lesson[]
  focusId: string | null
  onOpen: (id: string) => void
}) {
  const focus = focusId && lessons.some((lesson) => lesson.id === focusId) ? focusId : lessons[0]?.id
  return (
    <div data-classroom-lessons className="space-y-2">
      {lessons.map((lesson) => {
        const active = lesson.id === focus
        return (
          <button
            key={lesson.id}
            type="button"
            data-classroom-lesson={lesson.id}
            data-classroom-focus={active ? 'on' : 'off'}
            onClick={() => onOpen(lesson.id)}
            className={
              active
                ? 'block w-full min-w-0 rounded-2xl bg-[#E7F6F3] px-3 py-3 text-left'
                : 'block w-full min-w-0 rounded-2xl border border-[#d7efe9] bg-[#FFF9E9] px-3 py-3 text-left'
            }
          >
            <span className="quest-label block min-w-0 text-sm font-bold text-slate-900">
              <BiSpan text={lesson.title} keepWords />
            </span>
            {active ? (
              <span className="mt-2 block">
                <QuestionTypeChips types={lesson.questions.map((question) => question.type)} variant="outline" />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
