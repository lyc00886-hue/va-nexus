import { BookOpen, Images, PenLine } from 'lucide-react'
import type { TabId } from '../types'

const TABS: { id: TabId; label: string; icon: typeof Images }[] = [
  { id: 'artists', label: '藝術家對比', icon: Images },
  { id: 'sba', label: 'SBA 六步', icon: BookOpen },
  { id: 'feldman', label: '費德曼寫作', icon: PenLine },
]

export function TabNav({
  active,
  onChange,
}: {
  active: TabId
  onChange: (t: TabId) => void
}) {
  return (
    <nav
      className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pt-3"
      aria-label="Main tabs"
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={
            active === id
              ? 'inline-flex shrink-0 items-center gap-1.5 rounded-t-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white'
              : 'inline-flex shrink-0 items-center gap-1.5 rounded-t-xl px-4 py-2 text-sm font-medium text-teal-900/70 hover:bg-teal-50'
          }
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  )
}
