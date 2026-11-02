import { t } from '../../i18n'

export function DemoBadge() {
  return (
    <span
      title={t('demo.title')}
      className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
    >
      {t('demo.label')}
    </span>
  )
}
