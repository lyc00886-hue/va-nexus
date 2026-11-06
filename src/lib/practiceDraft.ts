/**
 * Practice-paper drafts.
 *
 * Stored on this device only (`localStorage`), keyed by the signed-in user id
 * or `guest`. Signed-in game progress (`user_progress.game`) is XP / lessons
 * and must not carry essay text, so these drafts are not merged into it and
 * are never sent to `/api/feedback` or any AI marker.
 *
 * A guest draft is never copied onto a signed-in account unless that student
 * explicitly chooses Keep. Discard deletes it. Doing neither leaves it in the
 * guest key and does not attach it to the account.
 */

/** Fired after an explicit keep or discard so open editors reload from storage. */
export const PRACTICE_DRAFT_EVENT = 'va-nexus:practice-draft'

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

export function isPracticeDraftBlank(draft: PracticeDraftV1): boolean {
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

export type GuestDraftChoice = 'keep' | 'discard' | 'later'

function notifyPracticeDraftChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PRACTICE_DRAFT_EVENT))
}

export function clearGuestPracticeDraft(): void {
  try {
    localStorage.removeItem(practiceDraftKey(null))
  } catch {
    /* ignore */
  }
}

/**
 * Explicit Keep: copy the guest draft onto this account, then remove the guest copy.
 * A non-blank account draft is replaced only because the student chose Keep.
 */
export function claimGuestPracticeDraft(uid: string): PracticeDraftV1 {
  const guest = loadPracticeDraft(null)
  if (!isPracticeDraftBlank(guest)) savePracticeDraft(uid, guest)
  clearGuestPracticeDraft()
  notifyPracticeDraftChange()
  return loadPracticeDraft(uid)
}

/** Explicit Discard: delete the guest draft and leave the account draft untouched. */
export function discardGuestPracticeDraft(uid: string): PracticeDraftV1 {
  clearGuestPracticeDraft()
  notifyPracticeDraftChange()
  return loadPracticeDraft(uid)
}

/**
 * Apply the sign-in prompt. `later` does not merge and does not delete.
 * The returned draft is always the account copy, never the guest copy.
 */
export function applyGuestDraftChoice(uid: string, choice: GuestDraftChoice): PracticeDraftV1 {
  if (choice === 'keep') return claimGuestPracticeDraft(uid)
  if (choice === 'discard') return discardGuestPracticeDraft(uid)
  return loadPracticeDraft(uid)
}

/** True when a signed-out draft is sitting on this device and must not be auto-merged. */
export function hasUnclaimedGuestDraft(): boolean {
  return !isPracticeDraftBlank(loadPracticeDraft(null))
}
