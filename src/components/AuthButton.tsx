import { Loader2, LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { avatarUrl, displayName, signInWithGoogle, signOut, useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { t } from '../i18n'

export function AuthButton() {
  const { ready, user } = useAuth()
  const [busy, setBusy] = useState(false)

  if (!isSupabaseConfigured) return null

  if (!ready) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      </span>
    )
  }

  if (!user) {
    return (
      <button
        type="button"
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-60"
        onClick={async () => {
          setBusy(true)
          try {
            await signInWithGoogle()
          } catch (e) {
            console.warn('[auth] sign-in failed', e)
            alert(t('auth.unavailable'))
            setBusy(false)
          }
        }}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <LogIn className="h-3.5 w-3.5" aria-hidden />}
        {t('auth.signIn')}
      </button>
    )
  }

  const name = displayName(user)
  const pic = avatarUrl(user)
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2">
      {pic ? (
        <img src={pic} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="max-w-[9rem] truncate text-xs font-semibold text-slate-800" title={user.email ?? name}>
        {name}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await signOut()
          } finally {
            setBusy(false)
          }
        }}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
        title={t('auth.signOut')}
      >
        <LogOut className="h-3 w-3" aria-hidden />
        {t('auth.signOut')}
      </button>
    </div>
  )
}
