import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SenMode } from '../types'

type SenContextValue = {
  mode: SenMode
  setMode: (m: SenMode) => void
  fontScale: number
  cardPadding: string
  focusTunnel: boolean
}

const SenContext = createContext<SenContextValue | null>(null)

export function SenProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SenMode>('standard')

  const value = useMemo<SenContextValue>(() => {
    if (mode === 'spld') {
      return {
        mode,
        setMode,
        fontScale: 1.2,
        cardPadding: 'p-5',
        focusTunnel: false,
      }
    }
    if (mode === 'adhd') {
      return {
        mode,
        setMode,
        fontScale: 1.05,
        cardPadding: 'p-4',
        focusTunnel: true,
      }
    }
    return {
      mode,
      setMode,
      fontScale: 1,
      cardPadding: 'p-4',
      focusTunnel: false,
    }
  }, [mode])

  return <SenContext.Provider value={value}>{children}</SenContext.Provider>
}

export function useSen() {
  const ctx = useContext(SenContext)
  if (!ctx) throw new Error('useSen must be used within SenProvider')
  return ctx
}
