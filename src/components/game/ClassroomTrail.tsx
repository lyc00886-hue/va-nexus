import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Lesson } from '../../game/types'
import { BiSpan } from './BilingualText'
import { QuestionTypeChips } from './QuestionTypeChips'

export function TrailCard({
  selected,
  children,
  ...rest
}: { selected: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={
        selected
          ? 'flex h-full min-h-24 w-full items-start gap-2 rounded-2xl border-2 border-[#0D9488] bg-[#0D9488] px-3 py-3 text-left text-white'
          : 'flex h-full min-h-24 w-full items-start gap-2 rounded-2xl border-2 border-[#0D9488] bg-white px-3 py-3 text-left text-slate-900'
      }
    >
      {children}
    </button>
  )
}

export function TrailIndex({ n, selected }: { n: number; selected: boolean }) {
  return (
    <span
      className={
        selected
          ? 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#0D9488]'
          : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0D9488] text-sm font-bold text-[#FFF9E9]'
      }
    >
      {n}
    </span>
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
                ? 'block w-full rounded-2xl bg-[#E7F6F3] px-3 py-3 text-left'
                : 'block w-full rounded-2xl border border-[#d7efe9] bg-[#FFF9E9] px-3 py-3 text-left'
            }
          >
            <span className="block text-sm font-bold text-slate-900">
              <BiSpan text={lesson.title} />
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
