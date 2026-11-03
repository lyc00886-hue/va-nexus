import { ChevronDown } from 'lucide-react'
import { useId, type KeyboardEvent, type ReactNode } from 'react'
import { useSen } from '../../context/SenContext'

type Props = {
  title: string
  hint: string
  /** Small label above the title, e.g. "Grade / unit". */
  eyebrow?: string
  open: boolean
  onToggle: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  buttonRef?: (node: HTMLButtonElement | null) => void
  testId?: string
  level?: 'h3' | 'h4' | 'h5'
  titleClassName?: string
  className?: string
  panelClassName?: string
  trailing?: ReactNode
  children: ReactNode
}

const SECTION =
  'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'

/** Same-page fold used by the learning map. Closed panels are not mounted. */
export function MapFold({
  title,
  hint,
  eyebrow,
  open,
  onToggle,
  onKeyDown,
  buttonRef,
  testId,
  level = 'h3',
  titleClassName = 'block font-bold text-slate-900',
  className = SECTION,
  panelClassName = 'border-t border-slate-200 px-4 py-4 sm:px-5',
  trailing,
  children,
}: Props) {
  const { settings } = useSen()
  const motion = !settings.reduceMotion
  const baseId = useId()
  const buttonId = `${baseId}-button`
  const panelId = `${baseId}-panel`
  const Heading = level

  return (
    <section data-testid={testId} data-open={open ? 'true' : 'false'} className={className}>
      <Heading className="m-0 text-base">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          onKeyDown={onKeyDown}
          className="flex w-full items-start gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-5 sm:py-4"
        >
          <span className="min-w-0 flex-1">
            {eyebrow ? (
              <span className="block text-xs font-semibold tracking-wide text-blue-700">{eyebrow}</span>
            ) : null}
            <span className={titleClassName}>{title}</span>
            <span className="mt-0.5 block text-sm font-normal text-slate-500">{hint}</span>
          </span>
          {trailing ? <span className="flex shrink-0 items-center gap-2">{trailing}</span> : null}
          <ChevronDown
            className={`map-section-chevron mt-0.5 h-5 w-5 shrink-0 text-slate-500 ${open ? 'rotate-180' : ''} ${
              motion ? 'transition-transform' : ''
            }`}
            aria-hidden
          />
        </button>
      </Heading>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={buttonId} className={panelClassName}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
