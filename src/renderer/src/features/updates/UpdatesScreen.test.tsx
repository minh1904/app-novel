import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SourceUpdateEvent } from '../../../../shared/contracts/sources'
import { UpdatesScreen } from './UpdatesScreen'

const mockEvents: SourceUpdateEvent[] = [
  {
    id: 'ev-1',
    bindingId: 'b-1',
    catalogItemId: 'item-1',
    kind: 'added',
    dedupeKey: 'key-1',
    payload: { title: 'Chương 101: Phong khởi Vân Dũng' },
    detectedAt: 1728500000000,
    seenAt: null,
    actedAt: null
  },
  {
    id: 'ev-2',
    bindingId: 'b-1',
    catalogItemId: 'item-2',
    kind: 'raw_changed',
    dedupeKey: 'key-2',
    payload: { title: 'Chương 10: Kiếm Khí Ngút Trời' },
    detectedAt: 1728500000000,
    seenAt: null,
    actedAt: null
  },
  {
    id: 'ev-3',
    bindingId: 'b-1',
    catalogItemId: 'item-3',
    kind: 'renamed',
    dedupeKey: 'key-3',
    payload: { title: 'Chương 15: Sửa Tiêu Đề' },
    detectedAt: 1728500000000,
    seenAt: 1728500000000,
    actedAt: null
  },
  {
    id: 'ev-4',
    bindingId: 'b-1',
    catalogItemId: 'item-4',
    kind: 'missing_remote',
    dedupeKey: 'key-4',
    payload: { title: 'Chương 22: Tạm Ẩn' },
    detectedAt: 1728500000000,
    seenAt: 1728500000000,
    actedAt: null
  },
  {
    id: 'ev-5',
    bindingId: 'b-1',
    catalogItemId: 'item-5',
    kind: 'reappeared',
    dedupeKey: 'key-5',
    payload: { title: 'Chương 22: Đã Trở Lại' },
    detectedAt: 1728500000000,
    seenAt: 1728500000000,
    actedAt: null
  }
]

describe('UpdatesScreen component (Task 9.4)', () => {
  it('renders five distinct event types with labels and descriptions', () => {
    const html = renderToStaticMarkup(createElement(UpdatesScreen, { initialEvents: mockEvents }))

    // All 5 event types are represented
    expect(html).toContain('Chương 101: Phong khởi Vân Dũng')
    expect(html).toContain('Chương mới')
    expect(html).toContain('Raw sửa đổi')
    expect(html).toContain('Đổi tiêu đề')
    expect(html).toContain('Vắng từ xa (3 lần)')
    expect(html).toContain('Xuất hiện lại')

    // Verifies notification only: raw_changed has diff preview CTA, does not auto queue translation
    expect(html).toContain('Xem &amp; Áp dụng')
    expect(html).toContain('Mira không tự tải nội dung hay xếp hàng dịch')
  })

  it('renders empty state when there are no update events', () => {
    const html = renderToStaticMarkup(createElement(UpdatesScreen, { initialEvents: [] }))
    expect(html).toContain('Không có cập nhật mới')
    expect(html).toContain('Kiểm tra ngay')
  })
})
