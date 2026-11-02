import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SenProvider } from './context/SenContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SenProvider>
      <App />
    </SenProvider>
  </StrictMode>,
)
