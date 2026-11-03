import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { GameProvider } from './context/GameContext'
import { EasyReadProvider } from './context/EasyReadContext'
import { SenProvider } from './context/SenContext'
import { SenSupportProvider } from './context/SenSupportContext'
import { LocaleProvider } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
    <SenProvider>
      <EasyReadProvider>
      <SenSupportProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </SenSupportProvider>
      </EasyReadProvider>
    </SenProvider>
    </LocaleProvider>
  </StrictMode>,
)
