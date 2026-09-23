import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

function contentSecurityPolicy(): Plugin {
  return {
    name: 'miyati-content-security-policy',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const development = Boolean(context.server)
        const policy = [
          "default-src 'self'",
          development ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self'",
          "img-src 'self' data:",
          development
            ? "connect-src 'self' ws://localhost:* ws://127.0.0.1:*"
            : "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'none'",
          "frame-src 'none'"
        ].join('; ')

        return html.replace(
          '<head>',
          '<head><meta http-equiv="Content-Security-Policy" content="' + policy + '">'
        )
      }
    }
  }
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react(), tailwindcss(), contentSecurityPolicy()]
  }
})
