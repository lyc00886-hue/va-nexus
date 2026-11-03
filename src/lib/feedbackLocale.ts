/**
 * UI locale for `/api/feedback`.
 * The handler reads `X-VA-Locale` before the body (auth and bad JSON).
 * `body.locale` still selects the model language and later errors.
 */

export const FEEDBACK_ERROR_CODES = [
  'method',
  'json',
  'stage',
  'empty',
  'too_long',
  'no_key',
  'gemini_upstream',
  'gemini_quota',
  'auth_required',
  'auth_down',
  'under18',
] as const

const CODE_SET = new Set<string>(FEEDBACK_ERROR_CODES)

export function feedbackLocaleHeaders(locale: string): { 'X-VA-Locale': string; 'Accept-Language': string } {
  const tag = locale === 'en' || locale === 'zh-Hans' || locale === 'zh-Hant' ? locale : 'zh-Hant'
  return { 'X-VA-Locale': tag, 'Accept-Language': tag }
}

/**
 * Student-visible API failure.
 * Trust `error` only when this server set a known code (the string follows the UI locale).
 * Gateway / HTML bodies have no code — use the UI fallback instead of their English text.
 *
 * Gemini abort/timeout and model unavailable share `gemini_upstream` (see api/feedback.ts).
 * A browser abort of this fetch uses `fw.err.network` via the caller.
 * TODO(PEANUTS): `fw.err.timeout` in zh-Hant / zh-Hans / en if a timeout should not reuse
 * `fw.err.network` / `fw.err.status` / the server `gemini` line.
 */
export function feedbackFailureText(
  data: { error?: string; code?: string },
  fallback: string,
): string {
  const code = data.code ?? ''
  const error = data.error?.trim() ?? ''
  if (CODE_SET.has(code) && error) return error
  return fallback
}
