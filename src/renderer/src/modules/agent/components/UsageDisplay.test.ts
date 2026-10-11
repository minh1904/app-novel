import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { TokenUsage } from '../../../../../shared/contracts/usage'
import { UsageDisplay } from './UsageDisplay'

describe('UsageDisplay (Task 7.1 & 7.4)', () => {
  it('renders — when usage is null or undefined (provider reported no usage)', () => {
    const htmlNull = renderToStaticMarkup(createElement(UsageDisplay, { usage: null }))
    expect(htmlNull).toContain('— (Provider không báo lượng dùng)')

    const htmlUndefined = renderToStaticMarkup(createElement(UsageDisplay, { usage: undefined }))
    expect(htmlUndefined).toContain('— (Provider không báo lượng dùng)')
  })

  it('renders complete usage with cache, reasoning and price estimate', () => {
    const fullUsage: TokenUsage = {
      inputTokens: 1200,
      outputTokens: 450,
      cacheReadTokens: 300,
      cacheWriteTokens: 100,
      reasoningTokens: 250,
      source: 'provider',
      complete: true
    }

    const html = renderToStaticMarkup(
      createElement(UsageDisplay, {
        usage: fullUsage,
        costUsd: 0.0054
      })
    )

    expect(html).toContain('1.200 vào')
    expect(html).toContain('450 ra')
    expect(html).toContain('300 đọc cache')
    expect(html).toContain('100 ghi cache')
    expect(html).toContain('250 suy luận')
    expect(html).toContain('Ước tính theo bảng giá')
    expect(html).not.toContain('Chưa đầy đủ')
  })

  it('displays "Chưa đầy đủ" warning when complete is false', () => {
    const partialUsage: TokenUsage = {
      inputTokens: 800,
      outputTokens: 120,
      source: 'provider',
      complete: false
    }

    const html = renderToStaticMarkup(
      createElement(UsageDisplay, {
        usage: partialUsage
      })
    )

    expect(html).toContain('800 vào')
    expect(html).toContain('120 ra')
    expect(html).toContain('Chưa đầy đủ')
  })
})
