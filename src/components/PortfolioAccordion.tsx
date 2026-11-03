import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useSen } from '../context/SenContext'
import { t, type MessageKey } from '../i18n'
import {
  OPEN_ABILITY_CHART_EVENT,
  PORTFOLIO_SECTION_IDS,
  loadPortfolioSections,
  savePortfolioSections,
  type PortfolioSectionId,
  type PortfolioSectionOpen,
} from '../lib/portfolioSections'

const COPY: Record<PortfolioSectionId, { title: MessageKey; hint: MessageKey }> = {
  evidence: {
    title: 'portfolio.section.evidence',
    hint: 'portfolio.section.evidence.hint',
  },
  outline: {
    title: 'portfolio.section.outline',
    hint: 'portfolio.section.outline.hint',
  },
  ability: {
    title: 'portfolio.section.ability',
    hint: 'portfolio.section.ability.hint',
  },
}

type Props = {
  evidence: ReactNode
  outline: ReactNode
  ability: ReactNode
}

export function PortfolioAccordion({ evidence, outline, ability }: Props) {
  const { settings } = useSen()
  const motion = !settings.reduceMotion
  const baseId = useId()
  const [open, setOpen] = useState<PortfolioSectionOpen>(loadPortfolioSections)
  const scrollPending = useRef(false)
  const reduceMotionRef = useRef(settings.reduceMotion)
  const buttonRefs = useRef<Partial<Record<PortfolioSectionId, HTMLButtonElement | null>>>({})

  useEffect(() => {
    reduceMotionRef.current = settings.reduceMotion
  }, [settings.reduceMotion])

  const panels: Record<PortfolioSectionId, ReactNode> = { evidence, outline, ability }

  function toggle(id: PortfolioSectionId) {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      savePortfolioSections(next)
      return next
    })
  }

  function scrollToChart() {
    document.getElementById('ability-chart')?.scrollIntoView({
      behavior: reduceMotionRef.current ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  useEffect(() => {
    function onOpenChart() {
      if (document.getElementById('ability-chart')) {
        scrollToChart()
        return
      }
      scrollPending.current = true
      setOpen((prev) => {
        if (prev.ability) return prev
        const next = { ...prev, ability: true }
        savePortfolioSections(next)
        return next
      })
    }
    window.addEventListener(OPEN_ABILITY_CHART_EVENT, onOpenChart)
    if (window.location.hash === '#ability-chart') onOpenChart()
    return () => window.removeEventListener(OPEN_ABILITY_CHART_EVENT, onOpenChart)
  }, [])

  useEffect(() => {
    if (!open.ability || !scrollPending.current) return
    scrollPending.current = false
    const frame = window.requestAnimationFrame(scrollToChart)
    return () => window.cancelAnimationFrame(frame)
  }, [open.ability])

  function onHeaderKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = PORTFOLIO_SECTION_IDS.length - 1
    let next = index
    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    const id = PORTFOLIO_SECTION_IDS[next]
    buttonRefs.current[id]?.focus()
  }

  return (
    <div className="space-y-3">
      {PORTFOLIO_SECTION_IDS.map((id, index) => {
        const isOpen = open[id]
        const buttonId = `${baseId}-${id}-button`
        const panelId = `${baseId}-${id}-panel`
        const copy = COPY[id]
        return (
          <section
            key={id}
            data-testid={`portfolio-section-${id}`}
            data-open={isOpen ? 'true' : 'false'}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <h3 className="m-0 text-base">
              <button
                ref={(node) => {
                  buttonRefs.current[id] = node
                }}
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(id)}
                onKeyDown={(event) => onHeaderKeyDown(event, index)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:px-5 sm:py-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-900">{t(copy.title)}</span>
                  <span className="mt-0.5 block text-sm font-normal text-slate-500">{t(copy.hint)}</span>
                </span>
                <ChevronDown
                  className={`portfolio-section-chevron mt-0.5 h-5 w-5 shrink-0 text-slate-500 ${
                    isOpen ? 'rotate-180' : ''
                  } ${motion ? 'transition-transform' : ''}`}
                  aria-hidden
                />
              </button>
            </h3>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="border-t border-slate-200 px-4 py-4 sm:px-5"
              >
                {panels[id]}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
