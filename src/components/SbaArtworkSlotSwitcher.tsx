import { Check } from 'lucide-react'
import { useId } from 'react'
import { contentJson } from '../i18n/content'
import {
  SLOT_IDS,
  fillSlotCopy,
  type PieceType,
  type SbaArtworkSlotsCopy,
  type SlotId,
} from '../lib/sbaArtworkSlots'

type Props = {
  active: SlotId
  types: Record<SlotId, PieceType | null>
  started: ReadonlySet<SlotId>
  onSelect: (slot: SlotId) => void
  onType: (slot: SlotId, type: PieceType) => void
}

export function SbaArtworkSlotSwitcher({ active, types, started, onSelect, onType }: Props) {
  const copy = contentJson<SbaArtworkSlotsCopy>('sba-artwork-slots')
  const hintId = useId()
  const activeCopy = copy.slots[String(active)]
  const activeType = types[active]

  return (
    <section
      data-testid="sba-artwork-slots"
      aria-labelledby="sba-artwork-slots-title"
      className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3 sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="sba-artwork-slots-title" className="text-base font-bold text-teal-950">
            {copy.section.title}
          </h3>
          <p className="text-sm text-teal-800/80">{copy.section.subtitle}</p>
        </div>
        <p
          data-testid="sba-artwork-progress"
          aria-live="polite"
          className="shrink-0 rounded-full bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white"
        >
          {fillSlotCopy(copy.switcher.progressOf, active)}
        </p>
      </div>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-teal-800/75">
        {copy.section.hint}
      </p>

      <fieldset className="mt-3" aria-describedby={hintId}>
        <legend className="text-sm font-semibold text-teal-900">{copy.switcher.label}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {SLOT_IDS.map((id) => {
            const slotCopy = copy.slots[String(id)]
            const selected = id === active
            const used = started.has(id)
            const type = types[id]
            const label = used ? slotCopy.short : slotCopy.empty
            return (
              <label
                key={id}
                data-testid={`sba-artwork-slot-${id}`}
                data-selected={selected ? 'true' : 'false'}
                data-empty={used ? 'false' : 'true'}
                className={`relative flex min-h-[4.75rem] cursor-pointer flex-col rounded-2xl border px-3 py-2.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-900 ${
                  selected
                    ? 'border-teal-700 bg-teal-700 text-white shadow-md ring-2 ring-teal-300'
                    : used
                      ? 'border-teal-300 bg-white text-teal-950 hover:border-teal-500'
                      : 'border-dashed border-teal-300 bg-white/80 text-teal-900 hover:border-teal-500'
                }`}
              >
                <input
                  type="radio"
                  name="sba-artwork-slot"
                  value={id}
                  checked={selected}
                  onChange={() => onSelect(id)}
                  aria-label={fillSlotCopy(copy.switcher.aria, id)}
                  className="sr-only"
                />
                <span className="flex items-start justify-between gap-2 text-sm font-semibold leading-snug">
                  <span>{label}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                </span>
                {type ? (
                  <span className={`mt-1 text-[11px] font-medium ${selected ? 'text-teal-100' : 'text-teal-700'}`}>
                    {copy.typeToggle[type]}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>
      </fieldset>

      <p className="mt-3 text-sm font-semibold text-teal-950" data-testid="sba-active-piece">
        {activeCopy.full}
      </p>

      <fieldset className="mt-2">
        <legend className="text-sm font-semibold text-teal-900">{copy.typeToggle.chooseType}</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(['artwork', 'criticalStudy'] as const).map((kind) => {
            const on = activeType === kind
            return (
              <label
                key={kind}
                data-testid={`sba-piece-type-${kind}`}
                data-selected={on ? 'true' : 'false'}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-900 ${
                  on
                    ? 'border-teal-700 bg-teal-700 text-white shadow'
                    : 'border-teal-200 bg-white text-teal-900 hover:border-teal-400'
                }`}
              >
                <input
                  type="radio"
                  name="sba-artwork-piece-type"
                  className="sr-only"
                  checked={on}
                  onChange={() => onType(active, kind)}
                />
                {copy.typeToggle[kind]}
              </label>
            )
          })}
        </div>
      </fieldset>
    </section>
  )
}
