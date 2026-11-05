import { t } from '../../i18n'
import { selectMapVersion } from '../../lib/useMapOneShell'

const CHIP =
  'min-h-9 rounded-full px-3 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'

/**
 * Thin 原版 / 闖關 switch. Does not touch motion or the atlas.
 * Short labels sit on narrow screens. The full names stay in the control.
 */
export function MapVersionToggle({ mapOne }: { mapOne: boolean }) {
  const version = mapOne ? 'map1' : 'classic'
  return (
    <div data-ux-toggle="" data-ux-mode={version} className="space-y-1">
      <div
        role="radiogroup"
        aria-label={t('ux.modeLabel')}
        className="inline-flex max-w-full rounded-full bg-[#FFF9E9] p-1 ring-1 ring-[#0D9488]"
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
          <span className="sm:hidden">{t('ux.map1Short')}</span>
          <span className="hidden sm:inline">{t('ux.map1')}</span>
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
          <span className="sm:hidden">{t('ux.classicShort')}</span>
          <span className="hidden sm:inline">{t('ux.classic')}</span>
        </button>
      </div>
      <p className="text-xs text-slate-500">{t('ux.hint')}</p>
    </div>
  )
}
