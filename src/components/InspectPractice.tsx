import { useState } from 'react'
import { useT } from '../i18n'
import { GRADE_LABEL } from '../lib/softGoMaps'
import { useTeacherDraftStore } from '../lib/useTeacherDraftStore'
import {
  attemptsFor,
  chooseInspectMcq,
  INSPECT_GRADES,
  parseInspectBank,
  peekInspectOpen,
  saveInspectDraft,
  submitInspectMcq,
  submitInspectText,
  useInspectPracticeStore,
  type InspectAxis,
  type InspectGrade,
  type InspectItem,
} from '../lib/inspectPractice'
import { contentJson } from '../i18n/content'
import { portfolioKey } from '../lib/teacherDraftBand'

const LETTERS = ['A', 'B', 'C', 'D'] as const

const AXIS_KEY = {
  theme: 'inspect.axis.theme',
  research: 'inspect.axis.research',
  media: 'inspect.axis.media',
  process: 'inspect.axis.process',
  reflect: 'inspect.axis.reflect',
  visual: 'inspect.axis.visual',
} as const satisfies Record<InspectAxis, `inspect.axis.${InspectAxis}`>

const CHIP =
  'rounded-full border font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

export function InspectPractice({ initialGrade }: { initialGrade?: InspectGrade }) {
  const { t } = useT()
  const drafts = useTeacherDraftStore()
  const practice = useInspectPracticeStore()
  const [grade, setGrade] = useState<InspectGrade>(initialGrade ?? peekInspectOpen() ?? 'f4')
  const [openId, setOpenId] = useState<string | null>(null)
  const [writing, setWriting] = useState<Record<string, string>>({})
  const bank = parseInspectBank(contentJson<unknown>(`inspect-${grade}`))
  const answerName = portfolioKey(drafts.activePortfolio)
  const attempts = attemptsFor(practice, answerName)

  function chooseGrade(next: InspectGrade) {
    setGrade(next)
    setOpenId(null)
  }

  return (
    <div data-testid="inspect-practice" data-inspect-grade={grade} data-soft-motion="off" className="space-y-3">
      <div role="radiogroup" aria-label={t('map.gradeLabel')} className="flex flex-wrap gap-1.5">
        {INSPECT_GRADES.map((id) => {
          const selected = grade === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-inspect-grade-chip={id}
              onClick={() => chooseGrade(id)}
              className={
                selected
                  ? `${CHIP} min-h-9 border-[#0D9488] bg-[#0D9488] px-3 py-1 text-sm text-[#FFF9E9]`
                  : `${CHIP} min-h-9 border-[#0D9488] bg-white px-3 py-1 text-sm text-[#0D9488]`
              }
            >
              {t(GRADE_LABEL[id])}
            </button>
          )
        })}
      </div>

      <ul className="m-0 list-none space-y-2 p-0">
        {(bank?.items ?? []).map((item) => {
          const attempt = attempts[item.id]
          const submitted = attempt?.status === 'submitted'
          const open = openId === item.id
          return (
            <li key={item.id} data-inspect-item={item.id} className="rounded-2xl border border-[#0D9488]/30 bg-white">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  {submitted ? (
                    <span className="rounded-full bg-[#e7f7f5] px-2 py-0.5 text-xs font-semibold text-[#0D9488]">
                      {t('inspect.practice.submitted')}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-[#0D9488] px-2 py-0.5 text-xs font-semibold text-[#0D9488]">
                    {t('inspect.practice.label')}
                  </span>
                </span>
              </button>
              {open ? (
                <ItemBody
                  item={item}
                  submitted={submitted}
                  choice={attempt?.choice}
                  text={writing[item.id] ?? attempt?.text ?? ''}
                  answerName={answerName}
                  onText={(value) => setWriting((prev) => ({ ...prev, [item.id]: value }))}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className="text-center text-xs text-slate-500">
        {t(GRADE_LABEL[grade])} · {t('inspect.practice.label')}
      </p>
    </div>
  )
}

function ItemBody({
  item,
  submitted,
  choice,
  text,
  answerName,
  onText,
}: {
  item: InspectItem
  submitted: boolean
  choice: number | undefined
  text: string
  answerName: string
  onText: (value: string) => void
}) {
  const { t } = useT()
  const answerId = `inspect-answer-${item.id}`

  if (item.type === 'mcq' && item.options) {
    return (
      <div className="space-y-3 border-t border-[#0D9488]/20 px-3 py-3">
        <fieldset>
          <legend className="text-sm leading-relaxed text-slate-800">{item.question}</legend>
          <div className="mt-3 space-y-2">
            {item.options.map((option, index) => {
              const selected = choice === index
              const showAnswer = submitted && index === item.answer
              return (
                <label
                  key={`${item.id}-${index}`}
                  className={`flex gap-3 rounded-2xl border px-3 py-3 text-sm ${
                    showAnswer || selected ? 'border-[#0D9488] bg-[#e7f7f5]' : 'border-[#0D9488]/30 bg-white'
                  } ${submitted ? '' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name={`inspect-${item.id}`}
                    value={index}
                    checked={selected}
                    disabled={submitted}
                    onChange={() => chooseInspectMcq(answerName, item.id, index)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-semibold text-[#0D9488]">{LETTERS[index]}</span> {option}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        {submitted && item.explain ? (
          <p role="status" data-testid={`inspect-explain-${item.id}`} className="rounded-2xl bg-[#FFF9E9] px-3 py-3 text-sm leading-relaxed text-slate-700">
            {item.explain}
          </p>
        ) : (
          <button
            type="button"
            data-testid={`inspect-submit-${item.id}`}
            disabled={choice == null}
            onClick={() => {
              if (choice == null) return
              submitInspectMcq(answerName, item.id, choice)
            }}
            className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {t('inspect.practice.submit')}
          </button>
        )}
      </div>
    )
  }

  const hint = item.type === 'long' ? t('inspect.practice.longHint') : t('inspect.practice.processHint')
  return (
    <div className="space-y-3 border-t border-[#0D9488]/20 px-3 py-3">
      {item.axis ? <p className="text-xs font-semibold text-[#0D9488]">{t(AXIS_KEY[item.axis])}</p> : null}
      <label htmlFor={answerId} className="block text-sm leading-relaxed text-slate-800">
        {item.question}
      </label>
      <p className="text-sm text-slate-600">{hint}</p>
      {item.hint ? <p className="text-sm text-slate-600">{item.hint}</p> : null}
      <textarea
        id={answerId}
        value={text}
        disabled={submitted}
        rows={5}
        onChange={(event) => onText(event.target.value)}
        className="w-full rounded-2xl border border-[#0D9488]/30 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 disabled:bg-slate-50"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitted}
          onClick={() => saveInspectDraft(answerName, item.id, text)}
          className="rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488] disabled:opacity-40"
        >
          {t('inspect.practice.saveDraft')}
        </button>
        <button
          type="button"
          data-testid={`inspect-submit-${item.id}`}
          disabled={submitted || text.trim() === ''}
          onClick={() => submitInspectText(answerName, item.id, text)}
          className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitted ? t('inspect.practice.submitted') : t('inspect.practice.submit')}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {submitted ? t('inspect.practice.submitted') : t('inspect.practice.notSubmitted')}
      </p>
    </div>
  )
}
