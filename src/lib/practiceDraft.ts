import { getLocalOwner } from './progressSync'

/**
 * Practice-paper drafts.
 *
 * Stored on this device only (`localStorage`), keyed by the signed-in user id
 * or `guest`. Signed-in game progress (`user_progress.game`) is XP / lessons
 * and must not carry essay text, so these drafts are not merged into it and
 * are never sent to `/api/feedback` or any AI marker.
 *
 * When a signed-in user has an empty draft and this device is not owned by a
 * different account, an unowned guest draft is adopted into their key — the
 * same ownership rule as game progress, without a network write.
 */

export const PRACTICE_DRAFT_PREFIX = 'va-nexus:practice-draft:v1:'

export type PracticeDraftV1 = {
  version: 1
  responses: Record<string, string>
  checks: Record<string, boolean>
  paper2Checks: Record<string, boolean>
  statement: string
  /** Chosen file names only. Bytes are not stored. */
  uploadNames: Record<string, string>
  revealed: boolean
  submittedAt: string | null
  updatedAt: string
}

export function emptyPracticeDraft(): PracticeDraftV1 {
  return {
    version: 1,
    responses: {},
    checks: {},
    paper2Checks: {},
    statement: '',
    uploadNames: {},
    revealed: false,
    submittedAt: null,
    updatedAt: '',
  }
}

export function practiceDraftKey(owner: string | null): string {
  return PRACTICE_DRAFT_PREFIX + (owner ?? 'guest')
}

export function practiceResponseKey(layer: string): string {
  return `part-a:${layer}`
}

export function practiceTextCount(text: string, locale: 'en' | 'zh-Hant' | 'zh-Hans'): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  if (locale === 'en') return trimmed.split(/\s+/).length
  return [...trimmed.replace(/\s+/g, '')].length
}

function isBlank(draft: PracticeDraftV1): boolean {
  if (draft.statement.trim()) return false
  if (draft.submittedAt) return false
  if (draft.revealed) return false
  if (Object.values(draft.responses).some((s) => s.trim())) return false
  if (Object.values(draft.checks).some(Boolean)) return false
  if (Object.values(draft.paper2Checks).some(Boolean)) return false
  if (Object.values(draft.uploadNames).some((s) => s.trim())) return false
  return true
}

export function loadPracticeDraft(owner: string | null): PracticeDraftV1 {
  try {
    const raw = localStorage.getItem(practiceDraftKey(owner))
    if (!raw) return emptyPracticeDraft()
    const parsed = JSON.parse(raw) as Partial<PracticeDraftV1>
    if (!parsed || parsed.version !== 1) return emptyPracticeDraft()
    return {
      ...emptyPracticeDraft(),
      responses: parsed.responses ?? {},
      checks: parsed.checks ?? {},
      paper2Checks: parsed.paper2Checks ?? {},
      statement: typeof parsed.statement === 'string' ? parsed.statement : '',
      uploadNames: parsed.uploadNames ?? {},
      revealed: Boolean(parsed.revealed),
      submittedAt: typeof parsed.submittedAt === 'string' ? parsed.submittedAt : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return emptyPracticeDraft()
  }
}

export function savePracticeDraft(owner: string | null, draft: PracticeDraftV1): void {
  try {
    const next: PracticeDraftV1 = { ...draft, version: 1, updatedAt: new Date().toISOString() }
    localStorage.setItem(practiceDraftKey(owner), JSON.stringify(next))
  } catch {
    /* storage full or disabled — the in-memory draft still works this session */
  }
}

/**
 * Copy an unowned guest draft onto `uid` when that user has nothing stored
 * and the device is not stamped as a different account.
 */
export function adoptGuestPracticeDraft(uid: string, deviceOwner: string | null = getLocalOwner()): PracticeDraftV1 {
  const mine = loadPracticeDraft(uid)
  if (deviceOwner && deviceOwner !== uid) return mine
  if (!isBlank(mine)) return mine
  const guest = loadPracticeDraft(null)
  if (isBlank(guest)) return mine
  savePracticeDraft(uid, guest)
  try {
    localStorage.removeItem(practiceDraftKey(null))
  } catch {
    /* ignore */
  }
  return loadPracticeDraft(uid)
}
