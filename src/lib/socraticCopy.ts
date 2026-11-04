import { getLocale, t, type MessageKey } from '../i18n'
import type { FeldmanStageId } from '../types'

/**
 * zh-HK / zh-Hant PEANUTS chrome.
 * English and zh-Hans keep the existing short copy until a later table.
 */
export function socraticZh(key: MessageKey): string | null {
  if (getLocale() !== 'zh-Hant') return null
  return t(key)
}

const STAGE_KEY: Record<FeldmanStageId, MessageKey> = {
  describe: 'research.socratic.stage.describe',
  analyse: 'research.socratic.stage.analyse',
  interpret: 'research.socratic.stage.interpret',
  judge: 'research.socratic.stage.judge',
}

export function socraticStageZh(id: FeldmanStageId): string | null {
  return socraticZh(STAGE_KEY[id])
}
