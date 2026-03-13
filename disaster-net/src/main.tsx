import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
  
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a toast or banner: "App update available — tap to refresh"
    // For now just call updateSW(true) automatically
    updateSW(true)
  },
  onOfflineReady() {
    console.log('DisasterNet is ready for offline use')
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
