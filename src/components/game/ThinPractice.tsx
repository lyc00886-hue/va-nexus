import { useEffect, useMemo, useState } from 'react'
import { moveItem, shuffledItems } from '../../game/thinPractice'
import type { ComparePlate, ConceptProfile, DualReadQuestion, OrderQuestion, ShortQuestion } from '../../game/types'
import { t } from '../../i18n'
import { imageDecision } from '../../lib/imageLicence'
import { LessonCardArt } from './LessonCardArt'
import { MetWorkFacts } from './MetWorkFacts'
import { ImageBlockedFace } from './ClassroomFaces'

const HINT = {
  order: 'qtype.hint.order',
  dualRead: 'qtype.hint.dualRead',
  short: 'qtype.hint.short',
} as const

export function PracticeOnlyBar() {
  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{t('qtype.practiceOnly')}</p>
  )
}

export function ThinHint({ type }: { type: keyof typeof HINT }) {
  return (
    <div className="mt-3 space-y-2" data-thin-hint={type}>
      <p className="text-sm font-semibold text-[#0D9488]">{t(HINT[type])}</p>
      <PracticeOnlyBar />
    </div>
  )
}

export function ThinPace() {
  return <p className="mt-3 text-xs text-slate-500">{t('qtype.pace')}</p>
}

export function OrderBoard({
  q,
  order,
  revealed,
  easyRead = false,
  stage = false,
  onChange,
}: {
  q: OrderQuestion
  order: string[] | null
  revealed: boolean
  easyRead?: boolean
  stage?: boolean
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
          const tone = placed
            ? 'border-[#0D9488] bg-teal-50'
            : missed
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-[#FFF9E9]'
          return (
            <li key={item} className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 ${tone}`}>
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{item}</span>
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
  if (stage) {
    return (
      <div data-thin-practice="order" className="flex min-h-0 flex-1 flex-col">
        {q.image ? (
          <div data-art-slot className="min-h-[16rem] flex-[3] overflow-y-auto px-4">
            <LessonCardArt image={q.image} credit={q.imageCredit} />
            <MetWorkFacts image={q.image} />
          </div>
        ) : null}
        <div className="min-h-0 flex-[2] overflow-y-auto px-4 pb-2">
          <div className="mt-3">
            <PracticeOnlyBar />
          </div>
          <p className="mt-3 text-xl font-semibold leading-relaxed text-slate-900">{q.prompt}</p>
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
  onChange,
}: {
  q: DualReadQuestion
  lines: string[]
  revealed: boolean
  easyRead?: boolean
  stage?: boolean
  onChange: (next: string[]) => void
}) {
  const values = [lines[0] ?? '', lines[1] ?? '']
  const compared = q.plate != null || q.right != null || q.profile != null
  const blocked =
    (q.image != null && imageDecision({ image: q.image, role: 'appreciation' }) === 'block') ||
    [q.plate, q.right].some(
      (plate) =>
        plate != null &&
        imageDecision({ image: plate.image, artist: plate.artist, source: plate.source, role: 'appreciation' }) === 'block',
    )
  if (blocked) return <ImageBlockedFace />
  const art = compared ? (
    <CompareSides q={q} values={values} revealed={revealed} onChange={onChange} part="art" fill={stage} />
  ) : (
    <DualReadFrame image={q.image} credit={q.imageCredit} fill={stage} />
  )
  const fields = compared ? (
    <CompareSides q={q} values={values} revealed={revealed} onChange={onChange} part="fields" />
  ) : (
    <LineFields labels={q.labels} values={values} revealed={revealed} onChange={onChange} />
  )
  const prompt = (
    <p className={`font-semibold text-slate-900 ${stage || easyRead ? 'text-xl leading-relaxed' : 'text-lg'}`}>{q.prompt}</p>
  )
  if (stage) {
    return (
      <div data-thin-practice="dualRead" className="min-h-0 flex-1 overflow-y-auto">
        <div data-art-slot className="px-4">
          {art}
        </div>
        <div className="px-4 pb-2">
          <div className="mt-3">
            <PracticeOnlyBar />
          </div>
          <div className="mt-3">{prompt}</div>
          {fields}
        </div>
      </div>
    )
  }
  return (
    <div data-thin-practice="dualRead">
      <ThinHint type="dualRead" />
      <div className="mt-3">{prompt}</div>
      {compared ? (
        <CompareSides q={q} values={values} revealed={revealed} onChange={onChange} />
      ) : (
        <>
          <DualReadFrame image={q.image} credit={q.imageCredit} />
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
  onChange,
}: {
  q: ShortQuestion
  line: string
  revealed: boolean
  easyRead?: boolean
  stage?: boolean
  onChange: (next: string[]) => void
}) {
  const fields = <LineFields labels={[t('qtype.write')]} values={[line]} revealed={revealed} onChange={onChange} />
  if (stage) {
    const diagramBlocked = Boolean(q.image && imageDecision({ image: q.image, role: 'teaching' }) === 'block')
    if (diagramBlocked) return <ImageBlockedFace />
    return (
      <div data-thin-practice="short" className="flex min-h-0 flex-1 flex-col">
        {q.image ? (
          <div data-art-slot className="min-h-[16rem] flex-[3] overflow-y-auto px-4">
            <LessonCardArt image={q.image} credit={q.imageCredit} />
            <MetWorkFacts image={q.image} />
          </div>
        ) : null}
        <div className="min-h-0 flex-[2] overflow-y-auto px-4 pb-2">
          <div className="mt-3">
            <PracticeOnlyBar />
          </div>
          <p className="mt-3 text-xl font-semibold leading-relaxed text-slate-900">{q.prompt}</p>
          {fields}
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
}: {
  q: DualReadQuestion
  values: string[]
  revealed: boolean
  onChange: (next: string[]) => void
  part?: 'all' | 'art' | 'fields'
  fill?: boolean
}) {
  const showArt = part !== 'fields'
  const showFields = part !== 'art'
  return (
    <div className={`grid gap-3 ${part === 'art' ? 'h-full md:grid-cols-2' : 'mt-3 md:grid-cols-2'}`} data-testid="dualread-compare">
      <div data-testid="dualread-plate">
        {showArt && q.plate ? <PlateFigure plate={q.plate} fill={fill} /> : null}
        {showFields ? (
          <SideLine
            label={q.labels[0]}
            value={values[0] ?? ''}
            revealed={revealed}
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
          className={fill ? 'max-h-64 w-full rounded-xl bg-[#FFF9E9] object-contain' : 'max-h-72 w-full rounded-xl bg-[#FFF9E9] object-contain'}
          onError={() => setFailed(true)}
        />
      )}
      <figcaption className="mt-2">
        <AttrLine label={t('art.attr.title')} value={plate.title} />
        <AttrLine label={t('art.attr.artist')} value={plate.artist} />
        <AttrLine label={t('art.attr.year')} value={plate.year} />
        <AttrLine label={t('art.attr.source')} value={plate.source} />
        <AttrLine label={t('art.attr.license')} value={t('art.attr.pd')} />
        {plate.intro ? <AttrLine label={t('art.intro')} value={plate.intro} /> : null}
      </figcaption>
    </figure>
  )
}

function ProfileCard({ profile }: { profile: ConceptProfile }) {
  return (
    <div className="rounded-2xl border border-[#b7e4df] bg-white p-3">
      <p className="text-sm font-bold text-[#0D9488]">{t('art.profile.title')}</p>
      <AttrLine label={t('art.profile.name')} value={profile.name} />
      <AttrLine label={t('art.profile.nationality')} value={profile.nationality} />
      <AttrLine label={t('art.profile.active')} value={profile.active} />
      <AttrLine label={t('art.profile.movement')} value={profile.movement} />
      <AttrLine label={t('art.profile.technique')} value={profile.technique} />
      <AttrLine label={t('art.profile.search')} value={profile.search} />
      <AttrLine label={t('art.attr.license')} value={t('art.attr.omitted')} />
    </div>
  )
}

function AttrLine({ label, value }: { label: string; value: string }) {
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
  onChange,
}: {
  label: string
  value: string
  revealed: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="mt-3 grid gap-1">
      <span className="text-sm font-semibold text-[#0D9488]">{label}</span>
      <textarea
        value={value}
        readOnly={revealed}
        rows={2}
        placeholder={t('qtype.write')}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-2xl border-2 border-slate-200 bg-[#FFF9E9] px-3 py-2 text-base text-slate-900 outline-none focus:border-[#0D9488]"
      />
    </label>
  )
}

function LineFields({
  labels,
  values,
  revealed,
  onChange,
}: {
  labels: readonly string[]
  values: string[]
  revealed: boolean
  onChange: (next: string[]) => void
}) {
  return (
    <div className="mt-3 grid gap-3">
      {labels.map((label, index) => (
        <label key={label} className="grid gap-1">
          <span className="text-sm font-semibold text-[#0D9488]">{label}</span>
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
            className="w-full resize-y rounded-2xl border-2 border-slate-200 bg-[#FFF9E9] px-3 py-2 text-base text-slate-900 outline-none focus:border-[#0D9488]"
          />
        </label>
      ))}
    </div>
  )
}
