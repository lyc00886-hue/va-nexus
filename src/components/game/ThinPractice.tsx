import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { moveItem, shuffledItems } from '../../game/thinPractice'
import type { ComparePlate, ConceptProfile, DualReadQuestion, OrderQuestion, ShortQuestion } from '../../game/types'
import { t, tIn, type MessageKey } from '../../i18n'
import { imageDecision } from '../../lib/imageLicence'
import { appreciationScope, comparisonChipKeys, easyPromptLines, type PresentationMode } from '../../lib/lessonPresentation'
import { BiKey, BiSpan } from './BilingualText'
import { LessonCardArt } from './LessonCardArt'
import { MetWorkFacts } from './MetWorkFacts'
import { ImageBlockedFace } from './ClassroomFaces'
import { SentenceBuilder, StandardWritingNote } from './SentenceBuilder'

const HINT = {
  order: 'qtype.hint.order',
  dualRead: 'qtype.hint.dualRead',
  short: 'qtype.hint.short',
} as const

export function PracticeOnlyBar() {
  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <BiKey name="qtype.practiceOnly" />
    </p>
  )
}

export function ThinHint({ type }: { type: keyof typeof HINT }) {
  return (
    <div className="mt-3 space-y-2" data-thin-hint={type}>
      <p className="text-sm font-semibold text-[#0D9488]">
        <BiKey name={HINT[type]} />
      </p>
      <PracticeOnlyBar />
    </div>
  )
}

export function ThinPace() {
  return (
    <p className="mt-3 text-xs text-slate-500">
      <BiKey name="qtype.pace" />
    </p>
  )
}

function PromptText({ text, easy }: { text: string; easy: boolean }) {
  if (!easy) return (
    <p className="mt-3 text-xl font-bold leading-relaxed text-slate-900">
      <BiSpan text={text} />
    </p>
  )
  return (
    <div className="mt-3 space-y-2">
      {easyPromptLines(text).map((line, index) => (
        <p key={`${index}-${line}`} className="text-2xl font-bold leading-loose text-slate-900">
          <BiSpan text={line} />
        </p>
      ))}
    </div>
  )
}

function KeywordRow({ keys, onPick }: { keys: MessageKey[]; onPick: (text: string) => void }) {
  if (keys.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2" data-keyword-chips="">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(t(key))}
          className="rounded-full border border-[#0D9488] bg-white px-3 py-1.5 text-base font-semibold text-[#0D9488]"
        >
          {t(key)}
        </button>
      ))}
    </div>
  )
}

function fillEmptyLine(values: string[], text: string, width: number): string[] {
  const next = Array.from({ length: width }, (_, index) => values[index] ?? '')
  const slot = next.findIndex((line) => !line.trim())
  if (slot === -1) return next
  next[slot] = text
  return next
}

export function OrderBoard({
  q,
  order,
  revealed,
  easyRead = false,
  stage = false,
  presentation = 'standard',
  onChange,
}: {
  q: OrderQuestion
  order: string[] | null
  revealed: boolean
  easyRead?: boolean
  stage?: boolean
  presentation?: PresentationMode
  onChange: (next: string[]) => void
}) {
  const initial = useMemo(() => shuffledItems(q.items, q.id), [q])
  const current = order && order.length === q.items.length ? order : initial
  useEffect(() => {
    if (!order || order.length !== q.items.length) onChange(initial)
  }, [initial, onChange, order, q.items.length])

  const list = (
      <ol className="mt-3 grid gap-2">
        {current.map((item, index) => {
          const placed = revealed && item === q.items[index]
          const missed = revealed && item !== q.items[index]
          const gentle = presentation === 'easy'
          const tone = placed
            ? 'border-[#0D9488] bg-teal-50'
            : missed
              ? gentle
                ? 'border-[#E7C98A] bg-[#FFF9E9]'
                : 'border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-[#FFF9E9]'
          return (
            <li key={item} className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 ${tone}`}>
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
            <BiSpan text={item} />
          </span>
              <button
                type="button"
                disabled={revealed || index === 0}
                aria-label={t('qtype.up', { item })}
                onClick={() => onChange(moveItem(current, index, -1))}
                className="min-h-11 rounded-xl px-2 text-sm font-semibold text-[#0D9488] disabled:opacity-30"
              >
                {t('qtype.upShort')}
              </button>
              <button
                type="button"
                disabled={revealed || index === current.length - 1}
                aria-label={t('qtype.down', { item })}
                onClick={() => onChange(moveItem(current, index, 1))}
                className="min-h-11 rounded-xl px-2 text-sm font-semibold text-[#0D9488] disabled:opacity-30"
              >
                {t('qtype.downShort')}
              </button>
            </li>
          )
        })}
      </ol>
  )
  const easy = presentation === 'easy' || easyRead
  if (stage) {
    return (
      <div data-thin-practice="order" data-presentation={presentation} className="flex min-h-0 flex-1 flex-col">
        {q.image ? (
          <div data-lesson-scroll="art" data-art-slot className={presentation === 'easy' ? 'min-h-[16rem] flex-[5] overflow-y-auto px-4' : 'min-h-[16rem] flex-[3] overflow-y-auto px-4'}>
            <LessonCardArt image={q.image} credit={q.imageCredit} />
            <MetWorkFacts image={q.image} />
          </div>
        ) : null}
        <div data-lesson-scroll="body" className="min-h-0 flex-[2] overflow-y-auto px-4 pb-2">
          <div className="mt-3">
            <PracticeOnlyBar />
          </div>
          <PromptText text={q.prompt} easy={easy} />
          {list}
        </div>
      </div>
    )
  }
  return (
    <div data-thin-practice="order">
      <ThinHint type="order" />
      <p className={`mt-3 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>{q.prompt}</p>
      <LessonCardArt image={q.image} credit={q.imageCredit} />
      <MetWorkFacts image={q.image} />
      {list}
      <ThinPace />
    </div>
  )
}

export function DualReadBoard({
  q,
  lines,
  revealed,
  easyRead = false,
  stage = false,
  presentation = 'standard',
  lessonId = '',
  onChange,
}: {
  q: DualReadQuestion
  lines: string[]
  revealed: boolean
  easyRead?: boolean
  stage?: boolean
  presentation?: PresentationMode
  lessonId?: string
  onChange: (next: string[]) => void
}) {
  const values = [lines[0] ?? '', lines[1] ?? '']
  const structured = q.structure === 'practice' || q.structure === 'school'
  const compared = !structured && (q.plate != null || q.right != null || q.profile != null)
  const blocked =
    !structured &&
    ((q.image != null && imageDecision({ image: q.image, role: 'appreciation' }) === 'block') ||
      [q.plate, q.right].some(
        (plate) =>
          plate != null &&
          imageDecision({ image: plate.image, artist: plate.artist, source: plate.source, role: 'appreciation' }) === 'block',
      ))
  if (blocked) return <ImageBlockedFace />
  const structure = structured ? <StructurePanels kind={q.structure === 'school' ? 'school' : 'practice'} labels={q.labels} /> : null
  const art = compared ? (
    <CompareSides q={q} values={values} revealed={revealed} onChange={onChange} part="art" />
  ) : structured ? (
    structure
  ) : (
    <DualReadFrame image={q.image} credit={q.imageCredit} fill={stage} />
  )
  const easy = presentation === 'easy' || easyRead
  const scoped = appreciationScope(lessonId)
  const applyText = (text: string) => onChange(fillEmptyLine(values, text, 2))
  const fields = compared ? (
    <CompareSides q={q} values={values} revealed={revealed} onChange={onChange} part="fields" easy={easy} />
  ) : (
    <LineFields labels={q.labels} values={values} revealed={revealed} onChange={onChange} easy={easy} />
  )
  const prompt = <PromptText text={q.prompt} easy={easy} />
  const writing =
    stage && scoped && presentation === 'easy' ? (
      <SentenceBuilder lessonId={lessonId} onUse={applyText} />
    ) : stage && scoped && presentation === 'standard' ? (
      <StandardWritingNote />
    ) : null
  if (stage) {
    return (
      <div
        data-thin-practice="dualRead"
        data-presentation={presentation}
        data-soft-motion="off"
        data-lesson-scroll="body"
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-2"
      >
        <p className="mt-3">
          <span data-qtype-chip="dualRead" className="inline-flex rounded-full bg-[#0D9488] px-4 py-1.5 text-base font-bold text-white">
            {t('qtype.chip.dualRead')}
          </span>
        </p>
        <ThinHint type="dualRead" />
        {prompt}
        {presentation === 'easy' ? <KeywordRow keys={comparisonChipKeys(lessonId)} onPick={applyText} /> : null}
        {art}
        {fields}
        {writing}
        <ThinPace />
      </div>
    )
  }
  return (
    <div data-thin-practice="dualRead" data-soft-motion="off">
      <ThinHint type="dualRead" />
      <div className="mt-3">{prompt}</div>
      {compared ? (
        <CompareSides q={q} values={values} revealed={revealed} onChange={onChange} />
      ) : (
        <>
          {structured ? structure : <DualReadFrame image={q.image} credit={q.imageCredit} />}
          {fields}
        </>
      )}
      <ThinPace />
    </div>
  )
}

export function ShortBoard({
  q,
  line,
  revealed,
  easyRead = false,
  stage = false,
  presentation = 'standard',
  lessonId = '',
  onChange,
}: {
  q: ShortQuestion
  line: string
  revealed: boolean
  easyRead?: boolean
  stage?: boolean
  presentation?: PresentationMode
  lessonId?: string
  onChange: (next: string[]) => void
}) {
  const easy = presentation === 'easy' || easyRead
  const scoped = appreciationScope(lessonId)
  const applyText = (text: string) => onChange(fillEmptyLine([line], text, 1))
  const fields = <LineFields labels={[t('qtype.write')]} values={[line]} revealed={revealed} onChange={onChange} easy={easy} />
  const writing =
    stage && scoped && presentation === 'easy' ? (
      <SentenceBuilder lessonId={lessonId} onUse={applyText} />
    ) : stage && scoped && presentation === 'standard' ? (
      <StandardWritingNote />
    ) : null
  if (stage) {
    const diagramBlocked = Boolean(q.image && imageDecision({ image: q.image, role: 'teaching' }) === 'block')
    if (diagramBlocked) return <ImageBlockedFace />
    return (
      <div data-thin-practice="short" data-presentation={presentation} className="flex min-h-0 flex-1 flex-col">
        {q.image ? (
          <div data-lesson-scroll="art" data-art-slot className={presentation === 'easy' ? 'min-h-[16rem] flex-[5] overflow-y-auto px-4' : 'min-h-[16rem] flex-[3] overflow-y-auto px-4'}>
            <LessonCardArt image={q.image} credit={q.imageCredit} />
            <MetWorkFacts image={q.image} />
          </div>
        ) : null}
        <div data-lesson-scroll="body" className={q.image ? 'min-h-0 flex-[2] overflow-y-auto px-4 pb-2' : 'min-h-0 flex-1 overflow-y-auto px-4 pb-2'}>
          <div className="mt-3">
            <PracticeOnlyBar />
          </div>
          <PromptText text={q.prompt} easy={easy} />
          {presentation === 'standard' ? writing : null}
          {fields}
          {presentation === 'easy' ? writing : null}
        </div>
      </div>
    )
  }
  return (
    <div data-thin-practice="short">
      <ThinHint type="short" />
      <p className={`mt-3 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>{q.prompt}</p>
      <LessonCardArt image={q.image} credit={q.imageCredit} />
      <MetWorkFacts image={q.image} />
      {fields}
      <ThinPace />
    </div>
  )
}

function StructurePanels({ kind, labels }: { kind: 'practice' | 'school'; labels: readonly string[] }) {
  const heading = t(kind === 'school' ? 'lesson.structure.schoolWork' : 'lesson.structure.banner')
  return (
    <div className="mt-3" data-testid="dualread-structure" data-structure={kind}>
      <p className="text-sm font-bold text-[#0D9488]">{heading}</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {labels.map((label) => (
          <div
            key={label}
            className="min-h-36 rounded-2xl border-2 border-[#0D9488] bg-white px-3 py-4 text-left text-sm font-semibold leading-snug text-slate-900"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

function DualReadFrame({ image, credit, fill = false }: { image?: string; credit?: string; fill?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [image])
  if (image && imageDecision({ image, role: 'appreciation' }) === 'block') return <ImageBlockedFace />
  if (!image || failed) return null
  return (
    <figure className={fill ? 'flex h-full min-h-0 flex-col' : 'mt-3'} data-testid="dualread-frame">
      <div className="overflow-hidden rounded-2xl border border-[#b7e4df] bg-[#FFF9E9]">
        <img
          src={image}
          alt=""
          width={900}
          height={1600}
          loading="lazy"
          decoding="async"
          className={fill ? 'min-h-64 w-full object-contain' : 'aspect-[5/3] w-full object-cover object-[center_40%]'}
          onError={() => setFailed(true)}
        />
      </div>
      {credit ? <figcaption className="mt-1 text-[11px] leading-snug text-slate-500">{credit}</figcaption> : null}
    </figure>
  )
}

function CompareSides({
  q,
  values,
  revealed,
  onChange,
  part = 'all',
  fill = false,
  easy = false,
}: {
  q: DualReadQuestion
  values: string[]
  revealed: boolean
  onChange: (next: string[]) => void
  part?: 'all' | 'art' | 'fields'
  fill?: boolean
  easy?: boolean
}) {
  const showArt = part !== 'fields'
  const showFields = part !== 'art'
  return (
    <div
      className={
        part === 'art'
          ? 'grid h-full grid-cols-2 gap-2'
          : part === 'fields'
            ? 'mt-3 grid gap-3'
            : 'mt-3 grid gap-3 md:grid-cols-2'
      }
      data-testid="dualread-compare"
    >
      <div data-testid="dualread-plate">
        {showArt && q.plate ? <PlateFigure plate={q.plate} fill={fill} /> : null}
        {showFields ? (
          <SideLine
            label={q.labels[0]}
            value={values[0] ?? ''}
            revealed={revealed}
            easy={easy}
            onChange={(value) => onChange([value, values[1] ?? ''])}
          />
        ) : null}
      </div>
      {q.right ? (
        <div data-testid="dualread-plate-right">
          {showArt ? <PlateFigure plate={q.right} fill={fill} /> : null}
          {showFields ? (
            <SideLine
              label={q.labels[1]}
              value={values[1] ?? ''}
              revealed={revealed}
              easy={easy}
              onChange={(value) => onChange([values[0] ?? '', value])}
            />
          ) : null}
        </div>
      ) : (
        <div data-testid="dualread-profile" data-image="omitted">
          {showArt && q.profile ? <ProfileCard profile={q.profile} /> : null}
          {showFields ? (
            <SideLine
              label={q.labels[1]}
              value={values[1] ?? ''}
              revealed={revealed}
              easy={easy}
              onChange={(value) => onChange([values[0] ?? '', value])}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

function PlateFigure({ plate, fill = false }: { plate: ComparePlate; fill?: boolean }) {
  return <PlateImage key={plate.image} plate={plate} fill={fill} />
}

function PlateImage({ plate, fill = false }: { plate: ComparePlate; fill?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (imageDecision({ image: plate.image, artist: plate.artist, source: plate.source, role: 'appreciation' }) === 'block') {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border-2 border-slate-200 bg-[#FFF9E9] px-3 py-6 text-center text-sm font-semibold text-slate-500">
        {t('image.empty')}
      </div>
    )
  }
  return (
    <figure className="rounded-2xl border border-[#b7e4df] bg-[#FFF9E9] p-3">
      {failed ? null : (
        <img
          src={plate.image}
          alt={plate.title}
          width={1855}
          height={1080}
          loading="lazy"
          decoding="async"
          className={fill ? 'max-h-40 w-full rounded-xl bg-[#FFF9E9] object-contain md:max-h-64' : 'max-h-72 w-full rounded-xl bg-[#FFF9E9] object-contain'}
          onError={() => setFailed(true)}
        />
      )}
      <figcaption className="mt-2">
        <AttrLine label={<BiKey name="art.attr.title" />} value={<BiSpan text={plate.title} />} />
        <AttrLine label={<BiKey name="art.attr.artist" />} value={<BiSpan text={plate.artist} />} />
        <AttrLine label={<BiKey name="art.attr.year" />} value={<BiSpan text={plate.year} />} />
        <AttrLine label={<BiKey name="art.attr.source" />} value={<BiSpan text={plate.source} />} />
        <AttrLine label={<BiKey name="art.attr.license" />} value={<BiSpan text={t('art.attr.pd')} alt={tIn('en', 'art.attr.pd')} />} />
        {plate.intro ? <AttrLine label={<BiSpan text={t('art.intro')} alt={tIn('en', 'art.intro')} />} value={<BiSpan text={plate.intro} />} /> : null}
      </figcaption>
    </figure>
  )
}

function ProfileCard({ profile }: { profile: ConceptProfile }) {
  return (
    <div className="rounded-2xl border border-[#b7e4df] bg-white p-3">
      <p className="text-sm font-bold text-[#0D9488]">
        <BiKey name="art.profile.title" />
      </p>
      <AttrLine label={<BiKey name="art.profile.name" />} value={<BiSpan text={profile.name} />} />
      <AttrLine label={<BiKey name="art.profile.nationality" />} value={<BiSpan text={profile.nationality} />} />
      <AttrLine label={<BiKey name="art.profile.active" />} value={<BiSpan text={profile.active} />} />
      <AttrLine label={<BiKey name="art.profile.movement" />} value={<BiSpan text={profile.movement} />} />
      <AttrLine label={<BiKey name="art.profile.technique" />} value={<BiSpan text={profile.technique} />} />
      <AttrLine label={<BiKey name="art.profile.search" />} value={<BiSpan text={profile.search} />} />
      <AttrLine label={<BiKey name="art.attr.license" />} value={<BiKey name="art.attr.omitted" />} />
    </div>
  )
}

function AttrLine({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <p className="mt-1 text-xs leading-snug text-slate-600">
      <span className="font-semibold text-[#0D9488]">{label}</span> {value}
    </p>
  )
}

function SideLine({
  label,
  value,
  revealed,
  easy = false,
  onChange,
}: {
  label: string
  value: string
  revealed: boolean
  easy?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="mt-3 grid gap-1">
      <span className={`font-semibold text-[#0D9488] ${easy ? 'text-lg' : 'text-sm'}`}>
        <BiSpan text={label} />
      </span>
      <textarea
        value={value}
        readOnly={revealed}
        rows={2}
        placeholder={t('qtype.write')}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-y rounded-2xl border-2 border-slate-200 bg-[#FFF9E9] px-3 py-2 text-slate-900 outline-none focus:border-[#0D9488] ${
          easy ? 'text-xl leading-loose' : 'text-base'
        }`}
      />
    </label>
  )
}

function LineFields({
  labels,
  values,
  revealed,
  easy = false,
  onChange,
}: {
  labels: readonly string[]
  values: string[]
  revealed: boolean
  easy?: boolean
  onChange: (next: string[]) => void
}) {
  return (
    <div className="mt-3 grid gap-3">
      {labels.map((label, index) => (
        <label key={label} className="grid gap-1">
          <span className={`font-semibold text-[#0D9488] ${easy ? 'text-lg' : 'text-sm'}`}>
        <BiSpan text={label} />
      </span>
          <textarea
            value={values[index] ?? ''}
            readOnly={revealed}
            rows={2}
            placeholder={t('qtype.write')}
            onChange={(event) => {
              const next = labels.map((_, slot) => values[slot] ?? '')
              next[index] = event.target.value
              onChange(next)
            }}
            className={`w-full resize-y rounded-2xl border-2 border-slate-200 bg-[#FFF9E9] px-3 py-2 text-slate-900 outline-none focus:border-[#0D9488] ${
              easy ? 'text-xl leading-loose' : 'text-base'
            }`}
          />
        </label>
      ))}
    </div>
  )
}
