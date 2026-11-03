/** Quota, HTTP 503, and Google UNAVAILABLE / high-demand share one calm notice. */
export function isAiFeedbackPaused(status: number, data: { code?: string; error?: string }): boolean {
  if (status === 503 || data.code === 'gemini_quota') return true
  const error = data.error ?? ''
  if (error.includes('UNAVAILABLE')) return true
  const lower = error.toLowerCase()
  return lower.includes('high demand') || lower.includes('overloaded')
}
