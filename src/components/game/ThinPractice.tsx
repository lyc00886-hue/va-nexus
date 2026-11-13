import { useEffect, useMemo, useState } from 'react'
import { moveItem, shuffledItems } from '../../game/thinPractice'
import type { DualReadQuestion, OrderQuestion, ShortQuestion } from '../../game/types'
import { t } from '../../i18n'
import { LessonCardArt } from './LessonCardArt'

const HINT = {
  order: 'qtype.hint.order',
  dualRead: 'qtype.hint.dualRead',
  short: 'qtype.hint.short',
} as const

export function ThinHint({ type }: { type: keyof typeof HINT }) {
  return (
    <div className="mt-3 space-y-2" data-thin-hint={type}>
      <p className="text-sm font-semibold text-[#0D9488]">{t(HINT[type])}</p>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{t('qtype.practiceOnly')}</p>
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
  onChange,
}: {
  q: OrderQuestion
  order: string[] | null
  revealed: boolean
  easyRead?: boolean
  onChange: (next: string[]) => void
}) {
  const initial = useMemo(() => shuffledItems(q.items, q.id), [q])
  const current = order && order.length === q.items.length ? order : initial
  useEffect(() => {
    if (!order || order.length !== q.items.length) onChange(initial)
  }, [initial, onChange, order, q.items.length])

  return (
    <div data-thin-practice="order">
      <ThinHint type="order" />
      <p className={`mt-3 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>{q.prompt}</p>
      <LessonCardArt image={q.image} credit={q.imageCredit} />
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
      <ThinPace />
    </div>
  )
}

export function DualReadBoard({
  q,
  lines,
  revealed,
  easyRead = false,
  onChange,
}: {
  q: DualReadQuestion
  lines: string[]
  revealed: boolean
  easyRead?: boolean
  onChange: (next: string[]) => void
}) {
  const values = [lines[0] ?? '', lines[1] ?? '']
  return (
    <div data-thin-practice="dualRead">
      <ThinHint type="dualRead" />
      <p className={`mt-3 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>{q.prompt}</p>
      <DualReadFrame image={q.image} credit={q.imageCredit} />
      <LineFields labels={q.labels} values={values} revealed={revealed} onChange={onChange} />
      <ThinPace />
    </div>
  )
}

export function ShortBoard({
  q,
  line,
  revealed,
  easyRead = false,
  onChange,
}: {
  q: ShortQuestion
  line: string
  revealed: boolean
  easyRead?: boolean
  onChange: (next: string[]) => void
}) {
  return (
    <div data-thin-practice="short">
      <ThinHint type="short" />
      <p className={`mt-3 font-semibold text-slate-900 ${easyRead ? 'text-xl' : 'text-lg'}`}>{q.prompt}</p>
      <LessonCardArt image={q.image} credit={q.imageCredit} />
      <LineFields labels={[t('qtype.write')]} values={[line]} revealed={revealed} onChange={onChange} />
      <ThinPace />
    </div>
  )
}

function DualReadFrame({ image, credit }: { image?: string; credit?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [image])
  if (!image || failed) return null
  return (
    <figure className="mt-3" data-testid="dualread-frame">
      <div className="overflow-hidden rounded-2xl border border-[#b7e4df] bg-[#FFF9E9]">
        <img
          src={image}
          alt=""
          width={900}
          height={1600}
          loading="lazy"
          decoding="async"
          className="aspect-[5/3] w-full object-cover object-[center_40%]"
          onError={() => setFailed(true)}
        />
      </div>
      {credit ? <figcaption className="mt-1 text-[11px] leading-snug text-slate-500">{credit}</figcaption> : null}
    </figure>
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
