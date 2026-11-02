import { CheckCircle2, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSen } from '../../context/SenContext'
import {
  CHECK_IN,
  recommendFromAnswers,
  SUPPORTS,
  useSenSupport,
  type CheckInAnswers,
} from '../../context/SenSupportContext'

export function CheckInModal() {
  const { checkInOpen, closeCheckIn, saveCheckIn, stored, clearSupportData, openPrivacy } = useSenSupport()
  const { settings, applyMany } = useSen()
  const [respondent, setRespondent] = useState<'student' | 'adult'>('student')
  const [answers, setAnswers] = useState<CheckInAnswers>({})
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (checkInOpen) {
      setAnswers(stored.checkIn?.answers ?? {})
      setRespondent(stored.checkIn?.respondent ?? 'student')
      setShowResult(false)
    }
    // only when opened
  }, [checkInOpen])

  useEffect(() => {
    if (!checkInOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCheckIn()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [checkInOpen, closeCheckIn])

  const recs = useMemo(() => recommendFromAnswers(answers), [answers])

  if (!checkInOpen) return null

  const enableAll = () => {
    const patch = recs.reduce((acc, k) => ({ ...acc, ...SUPPORTS[k].patch }), {})
    applyMany(patch)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="checkin-title" className="text-lg font-bold text-slate-900">
              自選支援問卷 · {CHECK_IN.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{CHECK_IN.intro}</p>
            <p className="mt-2 rounded-xl bg-emerald-50 p-2.5 text-xs leading-relaxed text-emerald-900">
              {CHECK_IN.disclaimer}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCheckIn}
            aria-label="關閉"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!showResult ? (
          <>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold text-slate-500">邊個填？</legend>
              <div className="mt-1 inline-flex rounded-full bg-slate-100 p-1">
                {(
                  [
                    ['student', '學生自己'],
                    ['adult', '老師 / 家長陪同'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={respondent === id}
                    onClick={() => setRespondent(id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      respondent === id ? 'bg-white text-blue-700 shadow' : 'text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <ol className="mt-4 space-y-3">
              {CHECK_IN.questions.map((q, i) => (
                <li key={q.id} className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800">
                    {i + 1}. {q.question}
                  </p>
                  {respondent === 'adult' && i === 0 && (
                    <p className="text-[11px] text-slate-500">（請同學生一齊睇，由學生揀最似佢嘅答案）</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={q.question}>
                    {q.options.map((c, oi) => (
                      <button
                        key={c.label}
                        type="button"
                        role="radio"
                        aria-checked={answers[q.id] === oi}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        className={`flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold ${
                          answers[q.id] === oi
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                saveCheckIn(answers, respondent)
                setShowResult(true)
              }}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
            >
              睇建議
            </button>
          </>
        ) : (
          <div className="mt-4">
            {recs.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                睇落而家嘅設定已經幾啱用。之後想試其他工具，可以喺「SEN 設定」隨時開。
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-700">{CHECK_IN.resultText}</p>
                <ul className="mt-3 space-y-2">
                  {recs.map((k) => {
                    const s = SUPPORTS[k]
                    const on = s.isOn(settings)
                    return (
                      <li key={k} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{s.label}</p>
                          <p className="text-xs text-slate-500">{s.desc}</p>
                        </div>
                        {on ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" /> 已開
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => applyMany(s.patch)}
                            className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                          >
                            開啟
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <button
                  type="button"
                  onClick={enableAll}
                  className="mt-3 w-full rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
                >
                  一鍵開啟全部建議
                </button>
              </>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setShowResult(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                改答案
              </button>
              <button
                type="button"
                onClick={closeCheckIn}
                className="flex-1 rounded-2xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                完成
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          答案只會儲存喺呢部裝置（localStorage），唔會傳送去伺服器，老師亦睇唔到。
          <button type="button" onClick={openPrivacy} className="shrink-0 font-semibold text-blue-700 hover:underline">
            私隱說明
          </button>
          <button
            type="button"
            onClick={() => {
              clearSupportData()
              setAnswers({})
              setShowResult(false)
            }}
            className="ml-auto shrink-0 font-semibold text-rose-600 hover:underline"
          >
            清除問卷資料
          </button>
        </p>
      </div>
    </div>
  )
}
