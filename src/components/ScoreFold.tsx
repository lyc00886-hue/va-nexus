import { useId, type ReactNode } from 'react'
import { useT } from '../i18n'

type Props = {
  testId: 'score-fold-now' | 'score-fold-later'
  level: 'h3' | 'h4'
  open: boolean
  manual: boolean
  hasResults: boolean
  onToggle: () => void
  /** Official title lines. Each stays its own heading. No combined label. */
  titles: string[]
  children: ReactNode
}

/**
 * Shows or hides the group body by mounting it.
 * SoftMotion off and prefers-reduced-motion still toggle, because visibility
 * does not wait on motion.
 */
export function ScoreFold({ testId, level, open, manual, hasResults, onToggle, titles, children }: Props) {
  const { t } = useT()
  const panelId = useId()
  const Heading = level
  const action = open ? t('score.fold.close') : t('score.fold.open')

  return (
    <section
      data-testid={testId}
      data-open={open ? 'true' : 'false'}
      data-has-results={hasResults ? 'true' : 'false'}
      data-manual={manual ? 'true' : 'false'}
      className="rounded-2xl border border-[#0D9488] bg-white px-4 py-3"
    >
      <div className={`flex gap-3 ${open ? 'items-start' : 'items-center'}`}>
        <div className="min-w-0 flex-1">
          {open ? null : (
            <div className="space-y-1">
              {titles.map((text) => (
                <Heading key={text} className="text-sm font-bold text-[#0D9488]">
                  {text}
                </Heading>
              ))}
            </div>
          )}
          <div id={panelId} hidden={!open} className={open ? 'space-y-4' : undefined}>
            {open ? children : null}
          </div>
        </div>
        <button
          type="button"
          data-testid={`${testId}-toggle`}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${action} · ${titles.join(' · ')}`}
          onClick={onToggle}
          className="shrink-0 rounded-full border border-[#0D9488] bg-white px-4 py-1.5 text-sm font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
        >
          {action}
        </button>
      </div>
    </section>
  )
}
