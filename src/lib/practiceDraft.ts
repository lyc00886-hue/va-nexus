/**
 * Practice-paper drafts.
 *
 * Stored on this device only (`localStorage`). v2 is one record per paper,
 * keyed `va-nexus:practice-draft:v2:{owner}:{paperId}`, with a slot per question.
 * A signed-in game progress record must not carry essay text, so these drafts
 * are not merged into it and are never sent to any AI marker.
 *
 * v1 was a single blob shared by both papers. On read it migrates into the
 * painting paper question `set3-q1`. The design paper stays blank.
 *
 * A guest draft is never copied onto a signed-in account unless that student
 * explicitly chooses Keep. Discard deletes it. Doing neither leaves it in the
 * guest key and does not attach it to the account.
 */

/** Fired after an explicit keep or discard so open editors reload from storage. */
export const PRACTICE_DRAFT_EVENT = 'va-nexus:practice-draft'

export const PRACTICE_DRAFT_V1_PREFIX = 'va-nexus:practice-draft:v1:'
export const PRACTICE_DRAFT_PREFIX = 'va-nexus:practice-draft:v2:'

/** Locked paper ids. Kept here so draft storage does not load content JSON. */
export const PAINT_PAPER_ID = 'paint-set3'
export const DESIGN_PAPER_ID = 'design-set3'

/** v1 responses land on this painting question so Part B checklists are not lost. */
export const PAINT_QUESTION_ID = 'set3-q1'

const DRAFT_PAPER_IDS = [PAINT_PAPER_ID, DESIGN_PAPER_ID] as const

export type PracticeQuestionDraft = {
  responses: Record<string, string>
  checks: Record<string, boolean>
  partBChecks: Record<string, boolean>
  statement: string
  /** Chosen file names only. Bytes are not stored. */
  uploadNames: Record<string, string>
  revealed: boolean
  submittedAt: string | null
}

export type PracticeDraftV2 = {
  version: 2
  paperId: string
  questions: Record<string, PracticeQuestionDraft>
  updatedAt: string
}

type PracticeDraftV1 = {
  version: 1
  responses?: Record<string, string>
  checks?: Record<string, boolean>
  paper2Checks?: Record<string, boolean>
  statement?: string
  uploadNames?: Record<string, string>
  revealed?: boolean
  submittedAt?: string | null
  updatedAt?: string
}

export function emptyQuestionDraft(): PracticeQuestionDraft {
  return {
    responses: {},
    checks: {},
    partBChecks: {},
    statement: '',
    uploadNames: {},
    revealed: false,
    submittedAt: null,
  }
}

export function emptyPracticeDraft(paperId: string): PracticeDraftV2 {
  return {
    version: 2,
    paperId,
    questions: {},
    updatedAt: '',
  }
}

export function questionDraft(draft: PracticeDraftV2, questionId: string): PracticeQuestionDraft {
  return draft.questions[questionId] ?? emptyQuestionDraft()
}

export function practiceDraftKey(owner: string | null, paperId: string): string {
  return `${PRACTICE_DRAFT_PREFIX}${owner ?? 'guest'}:${paperId}`
}

function v1Key(owner: string | null): string {
  return PRACTICE_DRAFT_V1_PREFIX + (owner ?? 'guest')
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

function isQuestionBlank(draft: PracticeQuestionDraft): boolean {
  if (draft.statement.trim()) return false
  if (draft.submittedAt) return false
  if (draft.revealed) return false
  if (Object.values(draft.responses).some((s) => s.trim())) return false
  if (Object.values(draft.checks).some(Boolean)) return false
  if (Object.values(draft.partBChecks).some(Boolean)) return false
  if (Object.values(draft.uploadNames).some((s) => s.trim())) return false
  return true
}

export function isPracticeDraftBlank(draft: PracticeDraftV2): boolean {
  return Object.values(draft.questions).every(isQuestionBlank)
}

function readQuestion(value: Partial<PracticeQuestionDraft> | undefined): PracticeQuestionDraft {
  return {
    responses: value?.responses ?? {},
    checks: value?.checks ?? {},
    partBChecks: value?.partBChecks ?? {},
    statement: typeof value?.statement === 'string' ? value.statement : '',
    uploadNames: value?.uploadNames ?? {},
    revealed: Boolean(value?.revealed),
    submittedAt: typeof value?.submittedAt === 'string' ? value.submittedAt : null,
  }
}

function readV2(owner: string | null, paperId: string): PracticeDraftV2 | null {
  try {
    const raw = localStorage.getItem(practiceDraftKey(owner, paperId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PracticeDraftV2>
    if (!parsed || parsed.version !== 2 || parsed.paperId !== paperId) return null
    const questions: Record<string, PracticeQuestionDraft> = {}
    for (const [id, value] of Object.entries(parsed.questions ?? {})) {
      if (!value || typeof value !== 'object') continue
      questions[id] = readQuestion(value)
    }
    return {
      version: 2,
      paperId,
      questions,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return null
  }
}

/**
 * Move a v1 blob onto the painting paper's question 1.
 * If that paper already has a v2 record, the older blob is dropped.
 * The design paper is never filled from v1.
 */
function migrateV1(owner: string | null): void {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(v1Key(owner))
  } catch {
    return
  }
  if (!raw) return
  let parsed: PracticeDraftV1 | null = null
  try {
    parsed = JSON.parse(raw) as PracticeDraftV1
  } catch {
    parsed = null
  }
  const paintKey = practiceDraftKey(owner, PAINT_PAPER_ID)
  let existing: string | null = null
  try {
    existing = localStorage.getItem(paintKey)
  } catch {
    existing = null
  }
  if (!existing && parsed && parsed.version === 1) {
    const draft = emptyPracticeDraft(PAINT_PAPER_ID)
    draft.updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : ''
    draft.questions[PAINT_QUESTION_ID] = {
      responses: parsed.responses ?? {},
      checks: parsed.checks ?? {},
      partBChecks: parsed.paper2Checks ?? {},
      statement: typeof parsed.statement === 'string' ? parsed.statement : '',
      uploadNames: parsed.uploadNames ?? {},
      revealed: Boolean(parsed.revealed),
      submittedAt: typeof parsed.submittedAt === 'string' ? parsed.submittedAt : null,
    }
    try {
      localStorage.setItem(paintKey, JSON.stringify(draft))
    } catch {
      return
    }
  }
  try {
    localStorage.removeItem(v1Key(owner))
  } catch {
    /* ignore */
  }
}

export function loadPracticeDraft(owner: string | null, paperId: string): PracticeDraftV2 {
  migrateV1(owner)
  return readV2(owner, paperId) ?? emptyPracticeDraft(paperId)
}

export function savePracticeDraft(owner: string | null, draft: PracticeDraftV2): void {
  try {
    const next: PracticeDraftV2 = { ...draft, version: 2, updatedAt: new Date().toISOString() }
    localStorage.setItem(practiceDraftKey(owner, draft.paperId), JSON.stringify(next))
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
    localStorage.removeItem(v1Key(null))
    for (const paperId of DRAFT_PAPER_IDS) {
      localStorage.removeItem(practiceDraftKey(null, paperId))
    }
  } catch {
    /* ignore */
  }
}

/** True when any paper on this owner has text, checks, a statement, or an upload name. */
export function ownerHasPracticeDraft(owner: string | null): boolean {
  migrateV1(owner)
  return DRAFT_PAPER_IDS.some((paperId) => {
    const draft = readV2(owner, paperId)
    return draft ? !isPracticeDraftBlank(draft) : false
  })
}

/**
 * Explicit Keep: copy each non-blank guest paper onto this account, then remove the guest copies.
 * A blank guest paper does not wipe that paper's account draft.
 */
export function claimGuestPracticeDraft(uid: string): PracticeDraftV2 {
  migrateV1(null)
  migrateV1(uid)
  for (const paperId of DRAFT_PAPER_IDS) {
    const guest = readV2(null, paperId)
    if (guest && !isPracticeDraftBlank(guest)) savePracticeDraft(uid, guest)
  }
  clearGuestPracticeDraft()
  notifyPracticeDraftChange()
  return loadPracticeDraft(uid, PAINT_PAPER_ID)
}

/** Explicit Discard: delete the guest drafts and leave the account drafts untouched. */
export function discardGuestPracticeDraft(uid: string): PracticeDraftV2 {
  clearGuestPracticeDraft()
  notifyPracticeDraftChange()
  return loadPracticeDraft(uid, PAINT_PAPER_ID)
}

/**
 * Apply the sign-in prompt. `later` does not merge and does not delete.
 * The returned draft is always the account painting paper, never the guest copy.
 */
export function applyGuestDraftChoice(uid: string, choice: GuestDraftChoice): PracticeDraftV2 {
  if (choice === 'keep') return claimGuestPracticeDraft(uid)
  if (choice === 'discard') return discardGuestPracticeDraft(uid)
  return loadPracticeDraft(uid, PAINT_PAPER_ID)
}

/** True when a signed-out draft is sitting on this device and must not be auto-merged. */
export function hasUnclaimedGuestDraft(): boolean {
  return ownerHasPracticeDraft(null)
}
