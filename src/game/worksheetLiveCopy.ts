/**
 * Live reading switch for classroom-activity download HTML.
 * The language module publishes it. The HTML builder reads it.
 * Download files cannot render React, so they follow this snapshot at click time.
 */

export type WorksheetLiveCopy = {
  isBilingual: () => boolean
  zhSide: () => 'zh-Hant' | 'zh-Hans'
  english: (key: string) => string
}

let live: WorksheetLiveCopy | null = null

export function bindWorksheetLiveCopy(copy: WorksheetLiveCopy | null) {
  live = copy
}

export function worksheetLiveCopy(): WorksheetLiveCopy | null {
  return live
}
