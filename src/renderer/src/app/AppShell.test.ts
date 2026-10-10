import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppShell, type AppShellProps } from './AppShell'

function renderShell(
  nav: ReactNode | null = createElement('aside', { 'data-testid': 'nav' }, 'Navigation')
): string {
  const props: AppShellProps = {
    nav,
    sidebar: null,
    sidebarOpen: false,
    onToggleSidebar: () => undefined,
    theme: 'light',
    onToggleTheme: () => undefined,
    onOpenSettings: () => undefined,
    children: createElement('p', null, 'Content')
  }
  return renderToStaticMarkup(createElement(AppShell, props))
}

describe('AppShell', () => {
  it('keeps the app title bar above both navigation and the page bar', () => {
    const html = renderShell()
    const titleBar = html.indexOf('data-slot="app-titlebar"')
    const workspace = html.indexOf('data-slot="app-workspace"')
    const nav = html.indexOf('data-testid="nav"')
    const pageBar = html.indexOf('data-slot="page-topbar"')

    expect(titleBar).toBeGreaterThanOrEqual(0)
    expect(workspace).toBeGreaterThan(titleBar)
    expect(nav).toBeGreaterThan(workspace)
    expect(pageBar).toBeGreaterThan(nav)
  })

  it.each([
    ['app navigation', renderShell()],
    ['chapter controls', renderShell(null)]
  ])('keeps one banner and right-edge spacing with %s', (_name, html) => {
    const pageBar = /<header[^>]*data-slot="page-topbar"[^>]*>/.exec(html)?.[0]

    expect(html.match(/<header\b/g)).toHaveLength(1)
    expect(pageBar).toContain('pr-sm')
  })
})
