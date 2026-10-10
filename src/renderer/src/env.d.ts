/// <reference types="vite/client" />

import type { DesktopApi } from '../../shared/contracts/desktopApi'

declare global {
  interface Window {
    mira: DesktopApi
  }
}
