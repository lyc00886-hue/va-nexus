import { CheckCircle2, ChevronRight, PenLine } from 'lucide-react'
import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import { lessonExerciseIds } from '../../game/exerciseLogos'
import { getResearchQuests } from '../../game/research'
import { getBadgeById } from '../../game/rewards'
import { getLocale, t } from '../../i18n'
import type { ResearchQuest } from '../../game/types'
import { FeldmanWriter } from '../FeldmanWriter'
import { ResearchToolPair } from './ResearchToolPair'
import { useEasyRead } from '../../context/EasyReadContext'
import { useResearchStepsShell } from '../../lib/useResearchStepsShell'
import { EasyReadBar } from '../easy-read/EasyReadBar'
import { StepResearch } from '../easy-read/StepPath'
import { DemoBadge } from './DemoBadge'
import { ExerciseMarks } from './ExerciseMark'
import { LessonPlayer } from './LessonPlayer'

export function ResearchLab() {
  const { state } = useGame()
  const steps = useResearchStepsShell()
  const easy = useEasyRead()
  const [open, setOpen] = useState<ResearchQuest | null>(null)
  const [writer, setWriter] = useState(false)
  const [hideEmbed, setHideEmbed] = useState(false)
  if (easy.on) return <StepResearch />

  if (open) {
    return (
      <LessonPlayer
        lesson={open}
        kind="quest"
        exitLabel={steps && getLocale() === 'en' ? t('lp.exit') : undefined}
        onExit={() => {
          setHideEmbed(false)
          setOpen(null)
        }}
        after={
          open.embedFeldman ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              {steps && hideEmbed ? (
                <button
                  type="button"
                  onClick={() => setHideEmbed(false)}
                  className="text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
                >
                  {t('rs.step.write')}
                </button>
              ) : (
                <FeldmanWriter
                  shell={steps ? 'steps' : undefined}
                  onLater={steps ? () => setHideEmbed(true) : undefined}
                />
              )}
            </div>
          ) : undefined
        }
      />
    )
  }

  const RESEARCH_QUESTS = getResearchQuests()
  const done = RESEARCH_QUESTS.filter((q) => state.quests[q.id]?.completed).length

  return (
    <div className="space-y-5">
      {easy.preview ? <EasyReadBar /> : null}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('tab.research')}</h2>
        <p className="text-sm text-slate-500">{t('research.subtitle', { done, total: RESEARCH_QUESTS.length })}</p>
      </div>

      <ResearchToolPair />

      <div className="grid gap-4 sm:grid-cols-2">
        {RESEARCH_QUESTS.map((q) => {
          const completed = state.quests[q.id]?.completed
          const badge = getBadgeById().get(q.badgeId)
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setHideEmbed(false)
                setOpen(q)
              }}
              className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
                    completed ? 'bg-violet-100' : 'bg-slate-100 grayscale'
                  }`}
                  aria-hidden
                >
                  {badge?.emoji}
                </span>
                {completed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {t('research.earned')}
                  </span>
                ) : (
                  q.demo && <DemoBadge />
                )}
              </div>
              <p className="mt-3 text-xs font-semibold text-blue-600">{q.skill}</p>
              <p className="text-lg font-bold text-slate-900">{q.title}</p>
              <p className="text-sm text-slate-500">{q.subtitle}</p>
              <ExerciseMarks
                ids={lessonExerciseIds({
                  questions: q.questions,
                  artists: q.artists,
                  embedFeldman: q.embedFeldman,
                })}
              />
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 group-hover:underline">
                {completed ? t('research.retry') : t('research.start')} · {t('common.aboutMin', { n: q.minutes })}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          )
        })}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={() => setWriter((w) => !w)}
          aria-expanded={writer}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 font-bold text-slate-900">
            <PenLine className="h-5 w-5 text-blue-600" aria-hidden /> {t('research.feldmanBench')}
          </span>
          <ChevronRight className={`h-5 w-5 text-slate-400 ${writer ? 'rotate-90' : ''}`} aria-hidden />
        </button>
        {writer && (
          <div className="mt-4">
            <FeldmanWriter
              shell={steps ? 'steps' : undefined}
              onLater={steps ? () => setWriter(false) : undefined}
            />
          </div>
        )}
      </section>
    </div>
  )
}
