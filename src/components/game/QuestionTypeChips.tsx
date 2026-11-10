import { t, type MessageKey } from '../../i18n'

const CHIP: Record<string, MessageKey> = {
  mcq: 'qtype.chip.mcq',
  fill: 'qtype.chip.fill',
  match: 'qtype.chip.match',
  order: 'qtype.chip.order',
  dualRead: 'qtype.chip.dualRead',
  short: 'qtype.chip.short',
}

const ORDER = ['mcq', 'fill', 'match', 'order', 'dualRead', 'short']

/** Human labels for practice types. Raw keys stay off the student surface. */
export function QuestionTypeChips({ types }: { types: readonly string[] }) {
  const present = ORDER.filter((type) => types.includes(type) && CHIP[type])
  if (present.length === 0) return null
  return (
    <span data-qtype-chips className="flex flex-wrap gap-1">
      {present.map((type) => (
        <span key={type} className="rounded-full bg-[#e7f7f5] px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
          {t(CHIP[type])}
        </span>
      ))}
    </span>
  )
}
