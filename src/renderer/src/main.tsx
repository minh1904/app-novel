import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { installSmoothWheel } from './app/smoothWheel'
import { TooltipProvider } from './components/ui/Tooltip'
import { applyThemeEffect, useThemeStore } from './components/ui/themeStore'
import './styles/index.css'

// Áp dụng theme người dùng đã chọn trong Cài đặt (hoặc theme hệ thống) trước lần render đầu tiên, đồng thời đồng bộ màu nút cửa sổ.
applyThemeEffect(useThemeStore.getState().theme)

// Cuộn mượt khi dùng con lăn chuột có khấc trong văn bản dài thay vì bị giật khung hình.
installSmoothWheel()

const root = document.getElementById('root')

if (!root) throw new Error('Missing application root')

createRoot(root).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>
)
