import { Lightbulb, X } from 'lucide-react'
import { getSupports, useSenSupport } from '../../context/SenSupportContext'
import { t } from '../../i18n'

export function NudgeToast() {
  const { nudge, acceptNudge, dismissNudge } = useSenSupport()
  if (!nudge) return null
  const s = getSupports()[nudge.support]
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-2xl border border-blue-200 bg-white p-4 shadow-lg md:bottom-6 md:left-auto md:right-6 md:mx-0"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Lightbulb className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-sm text-slate-700">{nudge.reason}</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{t('nudge.try', { label: s.label })}</p>
          <p className="text-xs text-slate-500">{s.desc}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptNudge}
              className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
            >
              {t('nudge.accept')}
            </button>
            <button
              type="button"
              onClick={() => dismissNudge(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('nudge.later')}
            </button>
            <button
              type="button"
              onClick={() => dismissNudge(true)}
              className="px-1 py-1.5 text-xs font-semibold text-slate-500 hover:underline"
            >
              {t('nudge.never')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dismissNudge(false)}
          aria-label={t('nudge.close')}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
