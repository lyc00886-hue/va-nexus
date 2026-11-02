import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { GameProvider } from './context/GameContext'
import { SenProvider } from './context/SenContext'
import { SenSupportProvider } from './context/SenSupportContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SenProvider>
      <SenSupportProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </SenSupportProvider>
    </SenProvider>
  </StrictMode>,
)
