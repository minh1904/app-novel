import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { TooltipProvider } from './components/ui/Tooltip'
import { applyThemeEffect, useUiStore } from './stores/uiStore'
import './styles/index.css'

// The theme the person chose in Settings (or the system's), before the first render; it also tells main
// which colour the window buttons should wear.
applyThemeEffect(useUiStore.getState().theme)

const root = document.getElementById('root')

if (!root) throw new Error('Missing application root')

createRoot(root).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>
)
