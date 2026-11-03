import { useEffect, type ReactNode } from 'react'
import { holdSoftScreen } from '../../lib/softScreen'

/** Full-width preview surface under the header. Sidebar stays out of the way. */
export function SoftScreen({ children, marker }: { children: ReactNode; marker: string }) {
  useEffect(() => holdSoftScreen(), [])
  return (
    <div
      data-soft-screen={marker}
      className="fixed inset-x-0 bottom-0 top-16 z-[35] overflow-y-auto bg-slate-50 px-4 py-5"
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4">{children}</div>
    </div>
  )
}
