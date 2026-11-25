import { t } from '../../i18n'
import { selectMapVersion } from '../../lib/useMapOneShell'

const CHIP =
  'min-h-9 rounded-full px-3 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

/**
 * Thin 原版 / 闖關 switch. Does not touch motion or the atlas.
 * Short labels sit on narrow screens. The full names stay in the control.
 * bar puts the title and the two tabs on one sticky row. The hint stays available to assistive tech.
 */
export function MapVersionToggle({ mapOne, bar = false }: { mapOne: boolean; bar?: boolean }) {
  const version = mapOne ? 'map1' : 'classic'
  const title = mapOne ? t('ux.map1') : t('ux.classic')
  const pills = (
    <div
      role="radiogroup"
      aria-label={t('ux.modeLabel')}
      className="inline-flex max-w-full rounded-full bg-white p-1 ring-1 ring-[#0D9488]"
    >
          <button
            type="button"
            role="radio"
            aria-checked={mapOne}
            aria-label={t('ux.switchToMap1')}
            data-ux-choice="map1"
            onClick={() => selectMapVersion('map1')}
            className={
              mapOne
                ? `${CHIP} bg-[#0D9488] text-[#FFF9E9]`
                : `${CHIP} text-[#0D9488]`
            }
          >
            <span>{t('ux.map1')}</span>
            <span className="hidden" aria-hidden="true">{t('ux.map1Short')}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!mapOne}
            aria-label={t('ux.switchToClassic')}
            data-ux-choice="classic"
            onClick={() => selectMapVersion('classic')}
            className={
              mapOne
                ? `${CHIP} text-[#0D9488]`
                : `${CHIP} bg-[#0D9488] text-[#FFF9E9]`
            }
          >
            <span>{t('ux.classic')}</span>
            <span className="hidden" aria-hidden="true">{t('ux.classicShort')}</span>
          </button>
    </div>
  )
  if (bar) {
    return (
      <div data-ux-toggle="" data-ux-mode={version} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {pills}
        <p className="sr-only">{t('ux.hint')}</p>
      </div>
    )
  }
  return (
    <div data-ux-toggle="" data-ux-mode={version} className="space-y-3">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <div className="space-y-1">
        {pills}
        <p className="text-xs text-slate-500">{t('ux.hint')}</p>
      </div>
    </div>
  )
}
