import { ShieldCheck, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, type ReactNode } from 'react'
import { useSenSupport } from '../context/SenSupportContext'
import { useT } from '../i18n'
import { contentMarkdown, contentMarkdownLocale } from '../i18n/content'

/** Minimal renderer for the privacy notice: # heading, **bold** lines, - bullets, paragraphs. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

function renderMarkdown(md: string): ReactNode[] {
  const out: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="ml-5 list-disc space-y-1">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('- ')) {
      list.push(line.slice(2))
      continue
    }
    flush()
    if (!line) continue
    if (line.startsWith('# ')) continue // title rendered separately
    if (/^\*\*[^*]+\*\*$/.test(line))
      out.push(
        <h3 key={out.length} className="mt-3 font-bold text-slate-900">
          {line.slice(2, -2)}
        </h3>,
      )
    else out.push(<p key={out.length}>{inline(line)}</p>)
  }
  flush()
  return out
}


export function PrivacyModal() {
  const { privacyOpen, closePrivacy } = useSenSupport()
  const { t, locale } = useT()
  const { title, body, fallback } = useMemo(() => {
    const md = contentMarkdown('privacy-notice', locale)
    return {
      title: md.match(/^#\s+(.+)$/m)?.[1] ?? t('privacy.title'),
      body: renderMarkdown(md),
      fallback: contentMarkdownLocale('privacy-notice', locale) !== locale,
    }
  }, [locale, t])
  useEffect(() => {
    if (!privacyOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePrivacy()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [privacyOpen, closePrivacy])
  if (!privacyOpen) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={closePrivacy}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="privacy-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
            {title}
          </h2>
          <button type="button" onClick={closePrivacy} aria-label={t('common.close')} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {fallback && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900 ring-1 ring-amber-100">
            {t('content.zhHantOnly')}
          </p>
        )}
        <div lang={fallback ? 'zh-Hant-HK' : undefined} className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
          {body}
        </div>
      </div>
    </div>
  )
}

export function PrivacyLink({ className = '' }: { className?: string }) {
  const { openPrivacy } = useSenSupport()
  const { t } = useT()
  return (
    <button type="button" onClick={openPrivacy} className={`font-semibold text-blue-700 hover:underline ${className}`}>
      {t('privacy.title')}
    </button>
  )
}
