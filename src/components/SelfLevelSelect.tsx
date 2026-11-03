import { useId } from 'react'

type Option = { value: string; label: string }

type Props = {
  fieldId: string
  label: string
  placeholder: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}

/** 4-level self-assessment select. The blank option means “not rated”, not zero. */
export function SelfLevelSelect({ fieldId, label, placeholder, options, value, onChange }: Props) {
  const selectId = useId()
  return (
    <div className="block text-sm font-medium text-teal-950">
      <label htmlFor={selectId}>{label}</label>
      <select
        id={selectId}
        name={fieldId}
        className="mt-1 w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-normal text-teal-950 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
