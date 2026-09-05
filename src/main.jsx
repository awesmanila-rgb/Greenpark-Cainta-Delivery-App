import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Silently keep the app shell up to date in the background. We don't
// prompt the user to reload — for a simple village app, auto-updating
// on the next natural page load is less friction than an "update
// available" popup.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
