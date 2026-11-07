import type { TabId } from '../types'

export const OPEN_TAB_EVENT = 'va-nexus:open-tab'

const STUDENT_TABS: readonly TabId[] = ['map', 'research', 'portfolio', 'library', 'practice', 'achievements']

export function requestOpenTab(tab: TabId) {
  if (!STUDENT_TABS.includes(tab)) return
  window.dispatchEvent(new CustomEvent(OPEN_TAB_EVENT, { detail: tab }))
}

export function isStudentTab(value: unknown): value is TabId {
  return typeof value === 'string' && STUDENT_TABS.includes(value as TabId)
}
