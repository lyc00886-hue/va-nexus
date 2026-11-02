import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  CloudOff,
  Camera,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  Unlock,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { useSen } from '../context/SenContext'
import { XP } from '../game/rewards'
import { contentJson } from '../i18n/content'
import { signInWithGoogle, useAuth } from '../lib/auth'
import {
  deleteLocalEvidence,
  deletePrivateEvidence,
  fetchPrivateEvidence,
  loadLocalNotes,
  savePrivateEvidence,
  saveLocal,
  validateImage,
  type DeleteEvidenceMode,
  type SbaEvidence,
} from '../lib/sbaEvidence'
import { isSupabaseConfigured } from '../lib/supabase'
import { t, type MessageKey } from '../i18n'


const STEP_IDS = [1, 2, 3, 4, 5, 6] as const

type SbaGuideCheckItem = { id: string; text: string }
type SbaGuideRedFlag = { id: string; text: string }

type SbaGuideStep = {
  id: number
  key: string
  title?: string
  checklist: SbaGuideCheckItem[]
  guidingQuestions: string[]
  sentenceFrames: string[]
  tip?: string
  redFlagReminders?: SbaGuideRedFlag[]
}

type SbaGuideFile = {
  version: number
  draft?: boolean
  note?: string
  steps: SbaGuideStep[]
}

const GUIDE_CHECKS_KEY = 'va-nexus:sba-guide-checks:v1'

function loadGuideChecks(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(GUIDE_CHECKS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveGuideChecks(map: Record<string, string[]>) {
  try {
    localStorage.setItem(GUIDE_CHECKS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function getGuideForStep(step: number): { guide: SbaGuideStep | undefined; draft: boolean } {
  const file = contentJson<SbaGuideFile>('sba-guide')
  return {
    guide: file.steps.find((s) => s.id === step),
    draft: Boolean(file.draft),
  }
}

function getSteps() {
  return STEP_IDS.map((id) => ({
    id,
    title: t(`sba.step.${id}` as MessageKey),
    hint: t(`sba.step.${id}.hint` as MessageKey),
  }))
}

/**
 * private = signed in → private bucket `sba-private` (owner-only RLS, signed URLs)
 * guest   = signed out → photo upload disabled; notes stay on this device
 * local   = Supabase unavailable → offline/local only
 */
type Source = 'loading' | 'private' | 'guest' | 'local'

export function SbaQuest() {
  const { cardPadding, focusTunnel, settings } = useSen()
  const { awardOnce } = useGame()
  const { ready, user } = useAuth()
  const userId = user?.id ?? null
  const STEPS = useMemo(getSteps, [])
  const [evidence, setEvidence] = useState<SbaEvidence[]>([])
  const [source, setSource] = useState<Source>(isSupabaseConfigured ? 'loading' : 'local')
  const [active, setActive] = useState(1)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<{ file: File; preview: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  type DeleteConfirm =
    | null
    | {
        item: SbaEvidence
        kind: 'note' | 'photo' | 'note-with-photo'
      }
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const [guideOpen, setGuideOpen] = useState(true)
  const [guideChecks, setGuideChecks] = useState<Record<string, string[]>>(loadGuideChecks)
  const [copiedFrame, setCopiedFrame] = useState<string | null>(null)
  const motion = !settings.reduceMotion

  useEffect(() => {
    let cancelled = false
    if (!isSupabaseConfigured) {
      setEvidence(loadLocalNotes())
      setSource('local')
      return
    }
    if (!ready) {
      setSource('loading')
      return
    }
    setSource('loading')
    if (!userId) {
      setEvidence(loadLocalNotes())
      setSource('guest')
      return
    }
    fetchPrivateEvidence(userId)
      .then((rows) => {
        if (cancelled) return
        setEvidence(rows)
        setSource('private')
      })
      .catch((e) => {
        if (cancelled) return
        console.warn('[sba] fetch failed, using local mode', e)
        setEvidence(loadLocalNotes())
        setSource('local')
      })
    return () => {
      cancelled = true
    }
  }, [userId, ready])

  const canUpload = source === 'private'

  useEffect(() => {
    saveGuideChecks(guideChecks)
  }, [guideChecks])

  function toggleGuideCheck(step: number, item: string) {
    const key = String(step)
    setGuideChecks((prev) => {
      const cur = prev[key] ?? []
      const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]
      return { ...prev, [key]: next }
    })
  }

  async function copyFrame(frame: string) {
    try {
      await navigator.clipboard.writeText(frame)
      setCopiedFrame(frame)
      window.setTimeout(() => setCopiedFrame((c) => (c === frame ? null : c)), motion ? 1500 : 0)
    } catch {
      /* ignore */
    }
  }


  function goTo(step: number) {
    if (step === active) return
    pending.forEach((x) => URL.revokeObjectURL(x.preview))
    setPending([])
    setNote('')
    setMessage(null)
    setActive(step)
  }

  const doneSteps = useMemo(() => new Set(evidence.map((e) => e.step)), [evidence])

  const unlocked = useMemo(() => {
    const set = new Set<number>([1])
    for (let i = 1; i <= 6; i++) {
      if (doneSteps.has(i)) set.add(Math.min(6, i + 1))
      else break
    }
    return set
  }, [doneSteps])

  const completed = STEPS.filter((s) => doneSteps.has(s.id)).length
  const pct = Math.round((completed / STEPS.length) * 100)

  function onPick(list: FileList | null) {
    if (!list) return
    const errors: string[] = []
    const ok: { file: File; preview: string }[] = []
    Array.from(list).forEach((f) => {
      const err = validateImage(f)
      if (err) errors.push(err)
      else ok.push({ file: f, preview: URL.createObjectURL(f) })
    })
    setPending((p) => [...p, ...ok])
    setMessage(errors.length ? { kind: 'error', text: errors.join('；') } : null)
  }

  function removePending(preview: string) {
    URL.revokeObjectURL(preview)
    setPending((p) => p.filter((x) => x.preview !== preview))
  }

  async function applyDelete(mode: DeleteEvidenceMode) {
    if (!deleteConfirm) return
    const item = deleteConfirm.item
    setDeleteBusy(true)
    try {
      const isLocal = Boolean(item.local) || source === 'guest' || source === 'local' || !userId
      if (isLocal) {
        if (item.url && mode === 'full') {
          try {
            URL.revokeObjectURL(item.url)
          } catch {
            /* ignore */
          }
        }
        deleteLocalEvidence(item.id, mode)
        setEvidence((list) => {
          if (mode === 'note-only') {
            return list
              .map((e) => (e.id === item.id ? { ...e, note: null } : e))
              .filter((e) => e.note || e.url || e.file_path)
          }
          return list.filter((e) => e.id !== item.id)
        })
      } else {
        await deletePrivateEvidence(userId!, item, mode)
        setEvidence((list) => {
          if (mode === 'note-only') {
            return list.map((e) => (e.id === item.id ? { ...e, note: null } : e))
          }
          return list.filter((e) => e.id !== item.id)
        })
      }
      setMessage({ kind: 'ok', text: t('sba.delete.deleted') })
      setDeleteConfirm(null)
    } catch (e) {
      console.warn('[sba] delete failed', e)
      setMessage({ kind: 'error', text: t('sba.delete.err') })
    } finally {
      setDeleteBusy(false)
    }
  }

  function requestDeleteNote(item: SbaEvidence) {
    const hasPhoto = Boolean(item.file_path || item.url)
    setDeleteConfirm({
      item,
      kind: hasPhoto && item.note ? 'note-with-photo' : 'note',
    })
  }

  function requestDeletePhoto(item: SbaEvidence) {
    setDeleteConfirm({ item, kind: 'photo' })
  }


  async function onSave() {
    const files = canUpload || source === 'local' ? pending.map((p) => p.file) : []
    if (files.length === 0 && !note.trim()) {
      setMessage({ kind: 'error', text: t('sba.msg.empty') })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      let added: SbaEvidence[]
      if (source === 'private' && userId) {
        try {
          added = await savePrivateEvidence(userId, active, files, note)
          pending.forEach((x) => URL.revokeObjectURL(x.preview))
          setMessage({ kind: 'ok', text: t('sba.msg.private') })
        } catch (e) {
          console.warn('[sba] upload failed, saving locally', e)
          added = saveLocal(active, files, note)
          setMessage({ kind: 'error', text: t('sba.msg.uploadFail') })
        }
      } else if (source === 'guest') {
        added = saveLocal(active, [], note)
        setMessage({ kind: 'ok', text: t('sba.msg.guest') })
      } else {
        added = saveLocal(active, files, note)
        setMessage({ kind: 'ok', text: t('sba.msg.local') })
      }
      setEvidence((prev) => [...prev, ...added])
      const stepTitle = STEPS.find((s) => s.id === active)?.title ?? ''
      awardOnce(`sba-step-${active}`, XP.sbaStep, t('sba.award', { n: active, title: stepTitle }), 'sba')
      setNote('')
      setPending([])
    } finally {
      setSaving(false)
    }
  }

  const activeIdx = STEPS.findIndex((s) => s.id === active)
  const prev = STEPS[activeIdx - 1]
  const next = STEPS[activeIdx + 1]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-teal-950">{t('sba.title')}</h2>
        <p className="text-sm text-teal-800/70">{t('sba.subtitle')}</p>
      </div>

      {source === 'private' ? (
        <div
          role="note"
          className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t('sba.banner.private')}
          </span>
        </div>
      ) : (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">
            {source === 'local'
              ? t('sba.banner.local')
              : t('sba.banner.guest')}
          </span>
          {source === 'guest' && (
            <button
              type="button"
              onClick={() => signInWithGoogle().catch((e) => console.warn('[auth] sign-in failed', e))}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden /> {t('auth.signIn')}
            </button>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
          <span>
            {t('sba.progress', { n: completed, total: STEPS.length })}
          </span>
          <span className="inline-flex items-center gap-1 font-normal text-teal-800/70">
            {source === 'loading' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> {t('sba.connecting')}
              </>
            )}
            {source === 'private' && <>{t('sba.private')}</>}
            {source === 'guest' && <>{t('sba.guest')}</>}
            {source === 'local' && (
              <>
                <CloudOff className="h-3 w-3" aria-hidden /> {t('sba.offline')}
              </>
            )}
          </span>
        </div>
        <div
          className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-teal-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t('sba.progressAria')}
        >
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {focusTunnel ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && goTo(prev.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-teal-900 hover:bg-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> {t('sba.prev')}
          </button>
          <span className="font-semibold text-amber-900">
            {t('sba.focus', { n: active, total: STEPS.length })}
          </span>
          <button
            type="button"
            disabled={!next || !unlocked.has(next.id)}
            onClick={() => next && goTo(next.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-teal-900 hover:bg-white disabled:opacity-40"
          >
            {t('sba.next')} <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STEPS.map((s) => {
            const isOpen = unlocked.has(s.id)
            const done = doneSteps.has(s.id)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!isOpen}
                  onClick={() => goTo(s.id)}
                  aria-current={active === s.id ? 'step' : undefined}
                  className={`flex w-full flex-col items-start rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    active === s.id
                      ? 'border-teal-600 bg-teal-700 text-white shadow'
                      : isOpen
                        ? 'border-teal-200 bg-white text-teal-950 hover:border-teal-400'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : isOpen ? (
                      <Unlock className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    Step {s.id}
                  </span>
                  <span className="mt-1 font-semibold">{s.title}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {STEPS.filter((s) => s.id === active).map((s) => {
        const items = evidence.filter((e) => e.step === s.id)
        return (
          <section
            key={s.id}
            className={`rounded-2xl border border-teal-100 bg-white shadow-sm ${cardPadding}`}
          >
            <h3 className="text-lg font-bold text-teal-950">
              {t('sba.stepHeading', { n: s.id, title: s.title })}
            </h3>
            <p className="mt-1 text-sm text-teal-800/70">{s.hint}</p>

            {(() => {
              const { guide, draft } = getGuideForStep(s.id)
              if (!guide) return null
              const checked = new Set(guideChecks[String(s.id)] ?? [])
              return (
                <section
                  className={`mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 ${motion ? 'transition-colors' : ''}`}
                  aria-label={t('sba.guide.aria', { n: s.id })}
                >
                  <button
                    type="button"
                    onClick={() => setGuideOpen((o) => !o)}
                    aria-expanded={guideOpen}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-sky-950"
                  >
                    <span className="inline-flex items-center gap-2">
                      <BookOpenCheck className="h-4 w-4 shrink-0" aria-hidden />
                      {t('sba.guide.title')}
                      {draft && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          draft
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-800">
                      {guideOpen ? t('sba.guide.close') : t('sba.guide.open')}
                      <ChevronDown
                        className={`h-4 w-4 ${guideOpen ? 'rotate-180' : ''} ${motion ? 'transition-transform' : ''}`}
                        aria-hidden
                      />
                    </span>
                  </button>
                  {guideOpen && (
                    <div className="space-y-4 border-t border-sky-100 px-3 py-3">
                      {draft && <p className="text-xs text-amber-800">{t('sba.guide.draft')}</p>}
                      {guide.tip && (
                        <p className="rounded-xl bg-white/80 px-2.5 py-2 text-sm text-sky-950">
                          <span className="font-semibold text-sky-800">{t('sba.guide.tip')} </span>
                          {guide.tip}
                        </p>
                      )}
                      <fieldset>
                        <legend className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                          {t('sba.guide.checklist')}
                        </legend>
                        <ul className="mt-2 space-y-1.5">
                          {guide.checklist.map((item) => {
                            const on = checked.has(item.id)
                            return (
                              <li key={item.id}>
                                <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white/80 px-2.5 py-2 text-sm text-sky-950 hover:bg-white">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 accent-sky-700"
                                    checked={on}
                                    onChange={() => toggleGuideCheck(s.id, item.id)}
                                    aria-label={t('sba.guide.checkAria', { item: item.text })}
                                  />
                                  <span>{item.text}</span>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                      </fieldset>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                          {t('sba.guide.questions')}
                        </p>
                        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-sky-950">
                          {guide.guidingQuestions.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                          {t('sba.guide.frames')}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {guide.sentenceFrames.map((frame) => (
                            <li key={frame} className="flex items-start gap-2 rounded-xl bg-white/80 px-2.5 py-2">
                              <p className="min-w-0 flex-1 text-sm text-sky-950">{frame}</p>
                              <button
                                type="button"
                                onClick={() => void copyFrame(frame)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-900 hover:bg-sky-200"
                                aria-label={`${t('sba.guide.copy')}: ${frame}`}
                              >
                                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                                {copiedFrame === frame ? t('sba.guide.copied') : t('sba.guide.copy')}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {guide.redFlagReminders && guide.redFlagReminders.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
                            {t('sba.guide.redFlags')}
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {guide.redFlagReminders.map((rf) => (
                              <li
                                key={rf.id}
                                className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/80 px-2.5 py-2 text-sm text-rose-950"
                              >
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                                <span>{rf.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )
            })()}

            <label className="mt-4 block text-sm font-medium text-teal-900">
              {t('sba.notes')}
              <textarea
                className="mt-1 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('sba.notes.ph')}
              />
            </label>

            {source === 'guest' ? (
              <div className="mt-4 flex flex-col items-start gap-2">
                <span className="text-sm font-medium text-teal-900">{t('sba.photosLabel')}</span>
                <button
                  type="button"
                  onClick={() => signInWithGoogle().catch((e) => console.warn('[auth] sign-in failed', e))}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
                >
                  <Lock className="h-4 w-4" aria-hidden />
                  {t('sba.signInToUpload')}
                </button>
              </div>
            ) : (
            <label className="mt-4 flex cursor-pointer flex-col items-start gap-2">
              <span className="text-sm font-medium text-teal-900">{t('sba.photos')}</span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-3 text-sm text-teal-800">
                <Camera className="h-4 w-4" aria-hidden />
                {t('sba.pick')}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  onPick(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            )}

            {pending.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3" aria-label={t('sba.pending')}>
                {pending.map((p) => (
                  <li
                    key={p.preview}
                    className="relative w-24 overflow-hidden rounded-xl border border-amber-200 bg-amber-50"
                  >
                    <img src={p.preview} alt={p.file.name} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePending(p.preview)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                      aria-label={t('sba.remove', { name: p.file.name })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || source === 'loading'}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <UploadCloud className="h-4 w-4" aria-hidden />
                )}
                {saving ? t('sba.saving') : t('sba.save')}
              </button>
              {message && (
                <p
                  role="status"
                  className={`text-sm ${message.kind === 'error' ? 'text-rose-700' : 'text-teal-700'}`}
                >
                  {message.text}
                </p>
              )}
            </div>

            {items.length > 0 && (
              <div className="mt-5 border-t border-teal-100 pt-4">
                <h4 className="text-sm font-semibold text-teal-900">{t('sba.saved', { n: items.length })}</h4>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {items.map((e) => (
                    <li key={e.id} className="relative w-32 overflow-hidden rounded-xl border border-teal-100 bg-teal-50">
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noreferrer">
                          <img
                            src={e.url}
                            alt={e.note ?? t('sba.evidenceAlt', { n: e.step })}
                            loading="lazy"
                            className="h-24 w-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-24 items-center justify-center p-2 text-center text-[11px] text-teal-800">
                          {e.file_path ? t('sba.photoExpired') : t('sba.note')}
                        </div>
                      )}
                      {e.note && <p className="line-clamp-3 px-2 py-1 text-[11px] text-teal-900">{e.note}</p>}
                      {e.local && <p className="px-2 pb-1 text-[10px] text-amber-700">{t('sba.localCache')}</p>}
                      <div className="flex flex-wrap gap-1 px-1.5 pb-1.5">
                        {e.note ? (
                          <button
                            type="button"
                            onClick={() => requestDeleteNote(e)}
                            className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden />
                            {t('sba.delete.note')}
                          </button>
                        ) : null}
                        {e.file_path || e.url ? (
                          <button
                            type="button"
                            onClick={() => requestDeletePhoto(e)}
                            className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden />
                            {t('sba.delete.photo')}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}

      {deleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sba-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleteBusy && setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="sba-delete-title" className="text-sm font-bold text-teal-950">
              {deleteConfirm.kind === 'photo'
                ? t('sba.delete.photo')
                : t('sba.delete.note')}
            </h3>
            <p className="mt-2 text-sm text-teal-900">
              {deleteConfirm.kind === 'photo'
                ? t('sba.delete.confirmPhoto')
                : deleteConfirm.kind === 'note-with-photo'
                  ? t('sba.delete.confirmNoteWithPhoto')
                  : t('sba.delete.confirmNote')}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {deleteConfirm.kind === 'note-with-photo' ? (
                <>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => void applyDelete('note-only')}
                    className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50"
                  >
                    {t('sba.delete.keepPhoto')}
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => void applyDelete('full')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                  >
                    {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {t('sba.delete.deleteBoth')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => void applyDelete('full')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                >
                  {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {deleteConfirm.kind === 'photo' ? t('sba.delete.photo') : t('sba.delete.note')}
                </button>
              )}
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-50"
              >
                {t('sba.delete.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
