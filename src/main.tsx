import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionGlobalConfig } from 'motion/react'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { applyTheme } from './lib/theme'
import { useStore } from './store/store'

// Resolve the theme before first paint to avoid a flash.
applyTheme(useStore.getState().theme)

// ?instant disables motion (automated screenshots / demos on slow machines)
if (new URLSearchParams(location.search).has('instant')) MotionGlobalConfig.skipAnimations = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
