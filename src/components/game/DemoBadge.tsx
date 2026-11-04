import { t } from '../../i18n'

/** Quiet chrome keeps the demo flag without an amber pill beside the lesson flow. */
export function DemoBadge({ quiet = false }: { quiet?: boolean }) {
  return (
    <span
      title={t('demo.title')}
      data-demo-quiet={quiet ? 'true' : undefined}
      className={
        quiet
          ? 'inline-flex items-center text-[10px] font-medium text-slate-400'
          : 'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800'
      }
    >
      {t('demo.label')}
    </span>
  )
}
