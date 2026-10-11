import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import { resetAllStores } from '../../../lib/testing/resetStores'
import { AccountsPage, ConnectedCard, UsageChip } from './AccountsPage'

/** Kiểm thử các trạng thái của trang Cài đặt › Kết nối AI › Tài khoản. */

function account(provider: 'codex' | 'copilot', state: 'ok' | 'relogin'): ConnectionView {
  return {
    id: 'c-' + provider,
    name: provider === 'codex' ? 'ChatGPT / Codex' : 'GitHub Copilot',
    baseUrl: 'https://x',
    enabled: true,
    authKind: 'oauth',
    oauthProvider: provider,
    apiMode: 'auto',
    account: { label: 'minh@example.com', state, expiresAt: null },
    providerId: null,
    defaultEntryId: null,
    checkedAt: null,
    keys: [],
    models: []
  }
}

const render = (): string => renderToStaticMarkup(createElement(AccountsPage))

describe('AccountsPage', () => {
  beforeEach(() => resetAllStores())

  it('offers both logins and leads Claude to the Anthropic key, with the terms note', () => {
    const html = render()
    expect(html).toContain('ChatGPT / Codex')
    expect(html).toContain('GitHub Copilot')
    expect(html).toContain('Mira không đăng nhập bằng gói Claude Pro/Max')
    expect(html).toContain('nhà cung cấp có thể đổi hoặc chặn cách này')
    expect(html).not.toContain('Sắp có')
  })

  // Render tĩnh đọc trạng thái ban đầu của store nên thẻ đã kết nối được render độc lập.
  const card = (provider: 'codex' | 'copilot', state: 'ok' | 'relogin'): string =>
    renderToStaticMarkup(
      createElement(ConnectedCard, {
        provider,
        connection: account(provider, state),
        onRelogin: () => undefined
      })
    )

  it('lists a connected account with a check, who it is, and a disconnect button', () => {
    const html = card('codex', 'ok')
    expect(html).toContain('Đã kết nối')
    expect(html).toContain('minh@example.com')
    expect(html).toContain('aria-label="Ngắt ChatGPT / Codex"')
    expect(html).not.toContain('Cần đăng nhập lại')
  })

  it('says a refused login needs logging in again, with the button for it', () => {
    const html = card('copilot', 'relogin')
    expect(html).toContain('Cần đăng nhập lại')
    expect(html).toContain('Đăng nhập lại')
  })
})

describe('UsageChip', () => {
  const chip = (windows: Parameters<typeof UsageChip>[0]['windows']): string =>
    renderToStaticMarkup(createElement(UsageChip, { windows }))

  it('shows nothing above 20 percent', () => {
    expect(chip([{ kind: 'week', remainingPercent: 45, resetsAt: null }])).toBe('')
  })

  it('shows the lowest window below 20 percent, and warns below 10', () => {
    const low = chip([{ kind: 'session', remainingPercent: 15, resetsAt: null }])
    expect(low).toContain('Phiên: Còn 15 %')
    expect(low).not.toContain('text-warning')
    const warn = chip([
      { kind: 'session', remainingPercent: 60, resetsAt: null },
      { kind: 'week', remainingPercent: 8, resetsAt: Date.UTC(2030, 2, 17, 5) }
    ])
    expect(warn).toContain('Tuần: Còn 8 % · đặt lại')
    expect(warn).toContain('text-warning')
  })
})
