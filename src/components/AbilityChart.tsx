import { LearningProgressRef } from './LearningProgressRef'

/** Ability section. The 1–4 self-rate chart is retired; this is the read-only progress reference. */
export function AbilityChart() {
  return (
    <section id="ability-chart" className="ability-chart scroll-mt-20" aria-labelledby="ability-chart-title">
      <LearningProgressRef titleId="ability-chart-title" />
    </section>
  )
}
