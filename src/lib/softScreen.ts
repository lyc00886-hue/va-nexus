/** Hide map/research chrome while a preview lesson or AI screen is open. */
let holds = 0

export function holdSoftScreen(): () => void {
  holds += 1
  if (typeof document !== 'undefined') document.documentElement.dataset.softScreen = 'focus'
  return () => {
    holds = Math.max(0, holds - 1)
    if (holds === 0 && typeof document !== 'undefined') delete document.documentElement.dataset.softScreen
  }
}
