/**
 * Feldman formative feedback. Same `/api/feedback` body the classic writer uses.
 * Callers still enforce the 18+ gate before asking.
 */
import { t } from '../i18n'
import { isAiFeedbackPaused } from './aiFeedbackPause'
import { feedbackFailureText, feedbackLocaleHeaders } from './feedbackLocale'
import { supabase } from './supabase'

export type FeldmanAiStage = 'describe' | 'analyze' | 'interpret' | 'judge'

export type FeldmanAiOutcome =
  | { status: 'done'; text: string }
  | { status: 'notice' }
  | { status: 'error'; text: string }

export async function postFeldmanFeedback(input: {
  stage: FeldmanAiStage
  text: string
  artwork?: string
  locale: string
}): Promise<FeldmanAiOutcome> {
  if (!supabase) return { status: 'error', text: t('fw.err.network') }
  try {
    const { data: sess } = await supabase.auth.getSession()
    const accessToken = sess.session?.access_token
    if (!accessToken) return { status: 'error', text: t('fw.ai.signIn') }
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...feedbackLocaleHeaders(input.locale),
      },
      body: JSON.stringify({
        stage: input.stage,
        text: input.text.slice(0, 2000),
        artwork: input.artwork?.trim() || undefined,
        locale: input.locale,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      feedback?: string
      error?: string
      code?: string
    }
    if (isAiFeedbackPaused(res.status, data)) return { status: 'notice' }
    if (!res.ok || !data.feedback) {
      return { status: 'error', text: feedbackFailureText(data, t('fw.err.status', { status: res.status })) }
    }
    return { status: 'done', text: data.feedback }
  } catch (err) {
    console.warn('[feedback] request failed', err)
    return { status: 'error', text: t('fw.err.network') }
  }
}
