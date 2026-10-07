import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button, type ButtonProps } from './Button'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'
import { Tip, type TipProps } from './Tooltip'

describe('Button', () => {
  it('keeps its size classes and shows a spinner while loading', () => {
    const idle = renderToStaticMarkup(
      createElement(Button, { size: 'lg' } as ButtonProps, 'Kết nối')
    )
    const busy = renderToStaticMarkup(
      createElement(Button, { size: 'lg', loading: true } as ButtonProps, 'Kết nối')
    )
    expect(busy).toContain('h-9')
    expect(idle).toContain('h-9')
    expect(busy).toContain('aria-busy="true"')
    expect(busy).toContain('animate-spin')
    // The label stays in the layout, hidden, so the width does not change.
    expect(busy).toMatch(/class="invisible[^"]*">Kết nối/)
    expect(idle).not.toContain('animate-spin')
  })

  it('gives icon buttons the icon radius and text buttons the control radius', () => {
    expect(
      renderToStaticMarkup(createElement(Button, { size: 'icon' } as ButtonProps, 'x'))
    ).toContain('rounded-icon')
    expect(renderToStaticMarkup(createElement(Button, {} as ButtonProps, 'x'))).toContain(
      'rounded-control'
    )
  })
})

describe('TextField', () => {
  it('uses the shared input frame and marks an error invalid', () => {
    const html = renderToStaticMarkup(
      createElement(TextField, { label: 'Khóa API', error: 'Thiếu khóa' })
    )
    expect(html).toContain('input-chrome')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('role="alert"')
  })
})

describe('Tip', () => {
  it('renders the control it describes, unchanged', () => {
    const html = renderToStaticMarkup(
      createElement(
        Tip,
        { label: 'Đổi giao diện' } as TipProps,
        createElement('button', { type: 'button' }, 'A')
      )
    )
    expect(html).toMatch(/^<button[^>]*>A<\/button>$/)
  })
})

describe('SegmentedControl', () => {
  it('presses exactly the chosen option', () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl<'a' | 'b'>, {
        label: 'Chế độ',
        value: 'b',
        options: [
          { value: 'a', label: 'Một' },
          { value: 'b', label: 'Hai' }
        ],
        onChange: () => undefined
      })
    )
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Hai</)
  })
})

// Hermes removes focus marks; Mira keeps one on every shared control (design-system spec, "Focus và chọn
// chữ"). A component that renders an interactive Base UI part must wear `focusRing`; text fields show focus
// through the accent border of `.input-chrome` instead.
describe('keyboard focus', () => {
  const dir = __dirname
  const interactive = /BaseButton|BaseSwitch\.Root|BaseTabs\.Tab\b|BaseSelect\.Trigger|<Toggle\b/
  const files = readdirSync(dir).filter((name) => name.endsWith('.tsx'))

  it.each(files)('%s marks keyboard focus', (name) => {
    const text = readFileSync(resolve(dir, name), 'utf8')
    if (!interactive.test(text)) return
    expect(text).toContain('focusRing')
  })
})

describe('SettingRow', () => {
  it('lays out like Hermes ListRow: container query, control column, no divider', async () => {
    const { SettingRow } = await import('./Setting')
    const html = renderToStaticMarkup(
      createElement(SettingRow, { title: 'Hiệu ứng kính', hint: 'Sidebar trong mờ' }, 'x')
    )
    expect(html).toContain('@container')
    expect(html).toContain('@2xl:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)]')
    expect(html).not.toContain('border-b')
  })
})
