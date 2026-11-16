import type { ReactNode } from 'react'
import '../globals.css'
import { Document, publicIcons, publicViewport } from '../../lib/document'

export const metadata = publicIcons
export const viewport = publicViewport

export default function Layout({ children }: { children: ReactNode }) {
  return <Document lang="zh-Hant">{children}</Document>
}
