import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toast } from '@base-ui/react/toast'
import './index.css'
import App from './App.tsx'
import { Toaster } from './components/ui/sonner.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toast.Provider>
      <App />
      <Toaster />
    </Toast.Provider>
  </StrictMode>,
)
