import type { DesktopApi } from '../../shared/desktop-api'

declare global {
  interface Window {
    miyati: DesktopApi
  }
}

export {}
