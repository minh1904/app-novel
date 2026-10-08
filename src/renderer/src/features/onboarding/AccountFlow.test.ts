import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FlowPanel, OtpCode } from './AccountFlow'

/** The login panel in each state it shows (change `subscription-providers`, task 6.2). */

describe('FlowPanel', () => {
  it('says it is asking for a code, with Hủy', () => {
    const html = renderToStaticMarkup(
      createElement(FlowPanel, {
        state: { step: 'starting', provider: 'codex' },
        onCancel: () => undefined
      })
    )
    expect(html).toContain('Đang xin mã đăng nhập ChatGPT / Codex')
    expect(html).toContain('Hủy')
  })

  it('shows the code as boxes, the link to reopen the page, the wait and Hủy', () => {
    const html = renderToStaticMarkup(
      createElement(FlowPanel, {
        state: {
          step: 'polling',
          provider: 'copilot',
          login: {
            sessionId: 's',
            userCode: 'WXYZ-9876',
            verificationUrl: 'https://github.com/login/device',
            expiresAt: 1
          }
        },
        onCancel: () => undefined
      })
    )
    expect(html).toContain('trang xác minh của GitHub Copilot')
    expect(html).toContain('Mã WXYZ-9876, bấm để sao chép')
    expect(html).toContain('Mở lại trang xác minh')
    expect(html).toContain('Đang chờ bạn xác nhận…')
    expect(html).toContain('Hủy')
  })

  it('draws one box per character and a dash between the halves', () => {
    const html = renderToStaticMarkup(createElement(OtpCode, { code: 'AB-CD' }))
    expect(html.match(/font-mono/g)).toHaveLength(4)
    expect(html).toContain('–')
  })
})
