import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const publicViewport: Viewport = { themeColor: '#0D9488' }

export const publicIcons: Metadata = {
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export function Document({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  )
}
