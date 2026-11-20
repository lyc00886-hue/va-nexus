import { getUnits } from '../game/curriculum'
import { getF4Units } from '../game/f4Demo'
import { getF5Units } from '../game/f5Demo'
import { getF6Units } from '../game/f6Demo'
import { getMediaUnits } from '../game/mediaIntro'
import type { Unit } from '../game/types'
import { withLocale, type Locale } from '../i18n'
import type { ZhSide } from './langMode'
import { pairUnitCopy } from './lessonCopyPairs'

function unitsFor(locale: Locale): Unit[] {
  return withLocale(locale, () => {
    const packs: Unit[][] = []
    for (const load of [getUnits, getF4Units, getF5Units, getF6Units, getMediaUnits]) {
      try {
        packs.push(load())
      } catch {
        /* one pack missing should not hide the others */
      }
    }
    return packs.flat()
  })
}

const cache = new Map<ZhSide, Map<string, string>>()

/** English line for a Chinese lesson string, when this Chinese side has a different English twin. */
export function englishAlt(zhSide: ZhSide, text: string): string | undefined {
  let map = cache.get(zhSide)
  if (!map) {
    map = pairUnitCopy(unitsFor(zhSide), unitsFor('en'))
    cache.set(zhSide, map)
  }
  return map.get(text)
}
