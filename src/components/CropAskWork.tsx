import { Camera, Upload } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useT, type MessageKey } from '../i18n'
import {
  displayPhase,
  existingUploadedImage,
  findCropAskDraft,
  normalizeCrop,
  postCropAsk,
  requestGuard,
  speculationDisplay,
  understoodBringText,
  type CropAskAxis,
  type CropAskBackgroundStatus,
  type CropAskGrade,
  type CropAskMeta,
  type CropAskPhase,
  type CropRect,
} from '../lib/cropAsk'
import { captureFrameDataUrl, fileToDataUrl, fullJpegBase64, regionJpegBase64, resizeImageToDataUrl } from '../lib/cropAskImage'
import { BRING_CHOICES, type CropSectionId, type FeldmanStepId } from '../lib/feldmanDraft'
import { bringFeldmanStep } from '../lib/useFeldmanDraft'
import {
  cancelCropAskRequest,
  clearCropAskRegion,
  commitCropAskAnalysis,
  failCropAsk,
  getCropAskStore,
  markCropAskGenerating,
  saveCropAskCrop,
  saveCropAskImage,
  useCropAskStore,
  useCropAskStudent,
} from '../lib/useCropAsk'
import { useSchoolScoreLater } from '../lib/useSchoolScoreLater'

const AXIS_LABEL: Record<CropAskAxis, MessageKey> = {
  theme: 'inspect.axis.theme',
  research: 'inspect.axis.research',
  media: 'inspect.axis.media',
  process: 'inspect.axis.process',
  reflect: 'inspect.axis.reflect',
  visual: 'inspect.axis.visual',
}

const STATUS_LABEL: Partial<Record<CropAskPhase, MessageKey>> = {
  noImage: 'cropask.status.noImage',
  needCrop: 'cropask.status.needCrop',
  generating: 'cropask.status.generating',
  pending: 'cropask.status.pending',
  edited: 'cropask.status.edited',
  confirmed: 'cropask.status.confirmed',
  failed: 'cropask.status.failed',
}

const STEP_LABEL: Record<FeldmanStepId, MessageKey> = {
  describe: 'practice.layer.D',
  analyse: 'practice.layer.A',
  interpret: 'practice.layer.I',
  judge: 'practice.layer.E',
}

const BUTTON = 'rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]'
const FILLED = `${BUTTON} bg-[#0D9488] text-white disabled:opacity-40`
const OUTLINE = `${BUTTON} border border-[#0D9488] bg-white text-[#0D9488] disabled:opacity-40`

export function CropAskDisclaimer() {
  const { t } = useT()
  return (
    <p
      role="note"
      data-testid="crop-ask-disclaimer"
      className="rounded-2xl border border-amber-200 bg-[#FFE6C2] px-4 py-3 text-sm leading-relaxed text-amber-950"
    >
      {t('cropask.disclaimer')}
    </p>
  )
}

function boxStyle(rect: CropRect): { left: string; top: string; width: string; height: string } {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  }
}

function pointerPoint(event: PointerEvent<HTMLDivElement>): { x: number; y: number } {
  const box = event.currentTarget.getBoundingClientRect()
  const x = box.width > 0 ? (event.clientX - box.left) / box.width : 0
  const y = box.height > 0 ? (event.clientY - box.top) / box.height : 0
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }
}

export function CropAskWork({
  grade,
  unit,
  onOpenWriting,
}: {
  grade: CropAskGrade
  unit: { id: string; title: string }
  onOpenWriting?: () => void
}) {
  const { locale, t } = useT()
  const store = useCropAskStore()
  const later = useSchoolScoreLater()
  const binding = useCropAskStudent()
  const meta: CropAskMeta = useMemo(
    () => ({
      unitId: unit.id,
      unitTitle: unit.title,
      grade,
      studentId: binding.studentId,
      studentKey: binding.studentKey,
      demoId: binding.demoId,
    }),
    [unit.id, unit.title, grade, binding],
  )
  const draft = findCropAskDraft(store, unit.id, binding.studentId)
  const reused = draft?.imageDataUrl
    ? null
    : existingUploadedImage({ previewUrl: later.previewUrl, mime: later.draft?.mime ?? null })
  const shown = draft?.imageDataUrl ?? reused
  const phase = displayPhase(draft ?? null, Boolean(shown))
  const statusKey = STATUS_LABEL[phase]
  const fileId = useId()
  const imgRef = useRef<HTMLImageElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const metaRef = useRef(meta)
  const abortRef = useRef<AbortController | null>(null)
  const originRef = useRef<{ x: number; y: number } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [drag, setDrag] = useState<CropRect | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [note, setNote] = useState<'denied' | 'type' | 'large' | 'required' | null>(null)

  useEffect(() => {
    metaRef.current = meta
  }, [meta])

  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    if (draft?.imageDataUrl || !reused) return
    const img = imgRef.current
    if (!img) return
    const save = () => {
      if (img.naturalWidth < 2) return
      const dataUrl = resizeImageToDataUrl(img)
      if (!dataUrl) return
      saveCropAskImage(metaRef.current, dataUrl, 'keep')
    }
    if (img.complete) save()
    else img.addEventListener('load', save, { once: true })
  }, [draft?.imageDataUrl, reused])

  function stopCamera() {
    stream?.getTracks().forEach((track) => track.stop())
    setStream(null)
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setNote('denied')
      return
    }
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setNote(null)
      setStream(next)
    } catch {
      setNote('denied')
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const dataUrl = captureFrameDataUrl(video)
    stopCamera()
    if (!dataUrl) {
      setNote('type')
      return
    }
    setNote(null)
    saveCropAskImage(metaRef.current, dataUrl, 'replace')
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    const loaded = await fileToDataUrl(file)
    if ('error' in loaded) {
      setNote(loaded.error)
      return
    }
    setNote(null)
    saveCropAskImage(metaRef.current, loaded.dataUrl, 'replace')
  }

  async function onRequest() {
    const current = metaRef.current
    const live = findCropAskDraft(getCropAskStore(), current.unitId, current.studentId)
    const crop = live?.crop ?? null
    const guard = requestGuard({ hasImage: Boolean(shown), crop })
    if (guard !== 'ok') {
      if (guard === 'needCrop') setNote('required')
      return
    }
    const img = imgRef.current
    if (!img || !crop) {
      setNote('required')
      return
    }
    const bytes = regionJpegBase64(img, crop)
    if (!bytes) {
      setNote('required')
      return
    }
    const source = fullJpegBase64(img)
    const resume = live?.status ?? 'ready'
    setNote(null)
    markCropAskGenerating(current)
    const controller = new AbortController()
    abortRef.current = controller
    const result = await postCropAsk({
      locale,
      unitTitle: current.unitTitle,
      imageBase64: bytes,
      sourceImageBase64: source ?? undefined,
      signal: controller.signal,
    })
    abortRef.current = null
    if (result.ok) {
      commitCropAskAnalysis(current, result.sections, result.background, result.speculation)
      return
    }
    if (result.reason === 'aborted') {
      cancelCropAskRequest(current, resume)
      return
    }
    failCropAsk(current, result.reason, resume)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (phase === 'generating' || stream) return
    originRef.current = pointerPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = originRef.current
    if (!origin) return
    const end = pointerPoint(event)
    setDrag({
      x: Math.min(origin.x, end.x),
      y: Math.min(origin.y, end.y),
      w: Math.abs(end.x - origin.x),
      h: Math.abs(end.y - origin.y),
    })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const origin = originRef.current
    originRef.current = null
    setDrag(null)
    if (!origin || phase === 'generating') return
    const end = pointerPoint(event)
    const rect = {
      x: Math.min(origin.x, end.x),
      y: Math.min(origin.y, end.y),
      w: Math.abs(end.x - origin.x),
      h: Math.abs(end.y - origin.y),
    }
    if (!normalizeCrop(rect)) {
      setNote('required')
      return
    }
    setNote(null)
    saveCropAskCrop(metaRef.current, rect)
  }

  const box = drag ?? draft?.crop ?? null
  const showSections = Boolean(draft?.sections) && phase !== 'generating' && phase !== 'failed'
  const noteText =
    note === 'denied'
      ? t('cropask.cameraDenied')
      : note === 'type'
        ? t('cropask.imageTypeError')
        : note === 'large'
          ? t('cropask.imageTooLarge')
          : note === 'required'
            ? t('cropask.crop.required')
            : null

  return (
    <div data-testid="crop-ask-work" className="mt-4 space-y-3">
      {statusKey ? (
        <p className="text-sm text-slate-700">
          <span className="rounded-full bg-[#FFF4D6] px-2 py-0.5 text-xs font-semibold text-amber-950">{t(statusKey)}</span>
        </p>
      ) : null}

      {stream ? (
        <div className="space-y-2">
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl bg-slate-900" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={FILLED} onClick={capture}>
              {t('cropask.done')}
            </button>
            <button type="button" className={OUTLINE} onClick={stopCamera}>
              {t('cropask.close')}
            </button>
          </div>
        </div>
      ) : shown ? (
        <div className="space-y-2">
          <div
            ref={frameRef}
            role="group"
            tabIndex={0}
            aria-label={t('cropask.crop.instruction')}
            data-testid="crop-ask-frame"
            className="relative touch-none overflow-hidden rounded-2xl border border-[#0D9488]/40"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img ref={imgRef} src={shown} alt="" draggable={false} className="block h-auto w-full select-none" />
            {box ? (
              <div
                data-testid="crop-ask-region"
                className="pointer-events-none absolute border-2 border-[#0D9488]"
                style={boxStyle(box)}
              >
                <span className="absolute -left-1 -top-1 h-2.5 w-2.5 bg-[#0D9488]" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 bg-[#0D9488]" />
                <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 bg-[#0D9488]" />
                <span className="absolute -right-1 -bottom-1 h-2.5 w-2.5 bg-[#0D9488]" />
              </div>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{t('cropask.crop.instruction')}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#0D9488]/40 bg-[#f4fbfa] px-4 py-8 text-center">
          <span className="mx-auto mb-3 flex h-16 w-20 items-center justify-center rounded-xl border border-[#0D9488]/50 text-[#0D9488]">
            <svg viewBox="0 0 64 48" aria-hidden="true" className="h-10 w-14">
              <rect x="4" y="6" width="56" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="24" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M10 36l14-12 8 8 6-6 16 10" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <p className="text-sm text-slate-700">{t('cropask.noImage')}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          id={fileId}
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label={t('cropask.upload')}
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void onFile(file)
          }}
        />
        <button type="button" className={shown ? OUTLINE : FILLED} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 inline h-4 w-4" aria-hidden />
          {shown ? t('cropask.replaceImage') : t('cropask.upload')}
        </button>
        <button type="button" className={OUTLINE} onClick={() => void openCamera()}>
          <Camera className="mr-1 inline h-4 w-4" aria-hidden />
          {t('cropask.camera')}
        </button>
      </div>

      {shown ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={OUTLINE}
            onClick={() => frameRef.current?.focus()}
          >
            {t('cropask.crop.adjust')}
          </button>
          <button
            type="button"
            className={OUTLINE}
            disabled={!draft?.crop || phase === 'generating'}
            onClick={() => clearCropAskRegion(metaRef.current)}
          >
            {t('cropask.crop.clear')}
          </button>
          {phase === 'generating' ? (
            <button type="button" className={OUTLINE} onClick={() => abortRef.current?.abort()}>
              {t('cropask.cancelRequest')}
            </button>
          ) : (
            <button
              type="button"
              data-testid="crop-ask-request"
              className={FILLED}
              disabled={!shown}
              onClick={() => void onRequest()}
            >
              {t('cropask.request')}
            </button>
          )}
        </div>
      ) : null}

      {noteText ? (
        <p role="status" data-testid="crop-ask-note" className="rounded-2xl bg-[#FFF9E9] px-3 py-2 text-sm leading-relaxed text-slate-700">
          {noteText}
        </p>
      ) : null}
      {shown && !showSections ? (
        <p data-testid="crop-ask-background-hint" className="text-sm leading-relaxed text-slate-600">
          {t('cropask.background.hint')}
        </p>
      ) : null}
      {phase === 'generating' ? (
        <div role="status" className="space-y-1">
          <p data-testid="crop-ask-background-checking" className="text-sm leading-relaxed text-slate-600">
            {t('cropask.background.checking')}
          </p>
          <p className="text-sm text-slate-700">{t('cropask.generating')}</p>
        </div>
      ) : null}
      {draft?.failReason ? (
        <div className="space-y-2" data-testid="crop-ask-failure">
          <p role="status" className="rounded-2xl bg-[#FFF9E9] px-3 py-2 text-sm leading-relaxed text-slate-700">
            {draft.failReason === 'unavailable' ? t('cropask.unavailable') : t('cropask.failed')}
          </p>
          <button type="button" className={OUTLINE} onClick={() => void onRequest()}>
            {t('cropask.retry')}
          </button>
        </div>
      ) : null}

      {showSections && draft?.sections ? (
        <div className="space-y-3">
          <CropAskDisclaimer />
          <p className="text-sm leading-relaxed text-slate-700">
            {phase === 'confirmed' ? t('cropask.confirmedNote') : t('cropask.pendingNote')}
          </p>
          <Section
            title={t('cropask.section.seen')}
            body={draft.sections.seen}
            extra={canBring(phase) ? <BringInto section="seen" text={draft.sections.seen} /> : null}
          />
          <UnderstoodSection
            title={t('cropask.section.understood')}
            body={draft.sections.understood}
            background={draft.background}
            speculation={draft.speculation}
            extra={
              canBring(phase) ? (
                <BringInto
                  section="understood"
                  text={understoodBringText({
                    understood: draft.sections.understood,
                    background: draft.background,
                    speculation: draft.speculation,
                    note: t('cropask.speculation.note'),
                    pending: t('cropask.speculation.pending'),
                  })}
                />
              ) : null
            }
          />
          <Section
            title={t('cropask.section.evidence')}
            body={draft.sections.evidence}
            extra={canBring(phase) ? <BringInto section="evidence" text={draft.sections.evidence} /> : null}
          />
          {onOpenWriting ? (
            <button type="button" data-testid="crop-to-writing" className={OUTLINE} onClick={onOpenWriting}>
              {t('cropask.toWriting')}
            </button>
          ) : null}
          <div>
            <p className="text-sm font-semibold text-slate-800">{t('cropask.axisHint')}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {draft.axes.map((id) => (
                <li key={id} className="rounded-full border border-[#0D9488] px-3 py-1 text-sm text-[#0D9488]">
                  {t(AXIS_LABEL[id])}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : phase === 'ready' ? (
        <p className="text-sm text-slate-600">{t('cropask.emptyDraft')}</p>
      ) : null}
    </div>
  )
}

function canBring(phase: CropAskPhase): boolean {
  return phase === 'pending' || phase === 'edited' || phase === 'confirmed'
}

function Section({ title, body, extra }: { title: string; body: string; extra?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#0D9488]/30 bg-white px-4 py-3">
      <h3 className="font-bold text-[#0D9488]">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{body}</p>
      {extra}
    </section>
  )
}

export function SpeculationBlock({
  display,
  note,
  pending,
}: {
  display: ReturnType<typeof speculationDisplay>
  note: string
  pending: string
}) {
  if (display.kind === 'estimate') {
    return (
      <div data-testid="crop-ask-speculation" className="mt-2 space-y-1">
        <p data-testid="crop-ask-speculation-note" className="text-sm leading-relaxed text-slate-600">
          {note}
        </p>
        <p data-testid="crop-ask-speculation-text" className="text-sm leading-relaxed text-slate-800">
          {display.text}
        </p>
      </div>
    )
  }
  if (display.kind === 'pending') {
    return (
      <p data-testid="crop-ask-speculation-pending" className="mt-2 text-sm leading-relaxed text-slate-600">
        {pending}
      </p>
    )
  }
  return null
}

function UnderstoodSection({
  title,
  body,
  background,
  speculation,
  extra,
}: {
  title: string
  body: string
  background: CropAskBackgroundStatus | null
  speculation: string | null
  extra?: ReactNode
}) {
  const { t } = useT()
  const pale = background === 'notFound' || background === 'failed'
  const display = speculationDisplay(background, speculation)
  const note =
    background === 'found'
      ? t('cropask.background.foundNote')
      : background === 'notFound'
        ? t('cropask.background.notFound')
        : background === 'failed'
          ? t('cropask.background.failed')
          : null
  return (
    <section
      data-testid="crop-ask-understood"
      data-background={background ?? 'none'}
      className={
        pale
          ? 'rounded-2xl border border-[#E7D7A8] bg-[#FFF9E9] px-4 py-3'
          : 'rounded-2xl border border-[#0D9488]/30 bg-white px-4 py-3'
      }
    >
      <h3 className={pale ? 'font-bold text-slate-600' : 'font-bold text-[#0D9488]'}>{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('cropask.background.hint')}</p>
      {note ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{note}</p> : null}
      <SpeculationBlock display={display} note={t('cropask.speculation.note')} pending={t('cropask.speculation.pending')} />
      <p className="mt-2 text-sm leading-relaxed text-slate-800">{body}</p>
      {extra}
    </section>
  )
}

function BringInto({ section, text }: { section: CropSectionId; text: string }) {
  const { t } = useT()
  const choices = BRING_CHOICES[section]
  const [step, setStep] = useState<FeldmanStepId>(choices[0])
  const [armed, setArmed] = useState(false)
  const [notice, setNotice] = useState<'done' | 'empty' | null>(null)
  const [openChoices, setOpenChoices] = useState(false)
  const stepLabel = t(STEP_LABEL[step])

  function run(confirm: boolean) {
    const result = bringFeldmanStep(step, text, confirm)
    if (result === 'empty') {
      setArmed(false)
      setNotice('empty')
      return
    }
    if (result === 'needConfirm') {
      setNotice(null)
      setArmed(true)
      return
    }
    setArmed(false)
    setNotice('done')
  }

  return (
    <div data-bring-section={section} className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid={`crop-bring-${section}`} className={FILLED} onClick={() => run(armed)}>
          {t('cropask.bringInto', { step: stepLabel })}
        </button>
        {choices.length > 1 ? (
          <button type="button" className={OUTLINE} onClick={() => setOpenChoices((open) => !open)}>
            {t('cropask.bringIntoOther')}
          </button>
        ) : null}
      </div>
      {openChoices ? (
        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={OUTLINE}
              onClick={() => {
                setStep(choice)
                setArmed(false)
                setNotice(null)
                setOpenChoices(false)
              }}
            >
              {t('cropask.bringInto', { step: t(STEP_LABEL[choice]) })}
            </button>
          ))}
        </div>
      ) : null}
      {armed ? (
        <p
          role="status"
          data-testid={`crop-bring-confirm-${section}`}
          className="rounded-2xl bg-[#FFF9E9] px-3 py-2 text-sm leading-relaxed text-slate-700"
        >
          {t('cropask.bringIntoConfirm', { step: stepLabel })}
        </p>
      ) : null}
      {notice === 'done' ? (
        <p role="status" className="text-sm text-slate-700">
          {t('cropask.bringIntoDone', { step: stepLabel })}
        </p>
      ) : null}
      {notice === 'empty' ? <p role="status" className="text-sm text-slate-600">{t('cropask.bringIntoEmpty')}</p> : null}
    </div>
  )
}
