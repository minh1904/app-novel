import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SourceBinding } from '../../../../../shared/contracts/sources'
import { SourcesArea } from './SourcesArea'

const WORK_ID = '11111111-1111-4111-8111-111111111111'

const mockTwoSameLangBindings: SourceBinding[] = [
  {
    id: 'binding-qidian',
    workId: WORK_ID,
    sourceId: 'mira.folder',
    adapterVersion: '1.0.0',
    remoteWorkId: 'folder:qidian-raw',
    canonicalUrl: null,
    countryCode: 'CN',
    languageTag: 'zh-Hans',
    label: 'Bản Qidian Web',
    role: 'primary',
    authProfileId: null,
    enabled: true,
    checkpoint: 'cursor-1',
    createdAt: 1728500000000,
    updatedAt: 1728500000000
  },
  {
    id: 'binding-epub',
    workId: WORK_ID,
    sourceId: 'mira.single-file',
    adapterVersion: '1.0.0',
    remoteWorkId: 'file:novel.epub',
    canonicalUrl: null,
    countryCode: 'CN',
    languageTag: 'zh-Hans',
    label: 'Bản EPUB Đối Chiếu',
    role: 'reference',
    authProfileId: null,
    enabled: true,
    checkpoint: 'cursor-2',
    createdAt: 1728500000000,
    updatedAt: 1728500000000
  }
]

describe('SourcesArea component (Task 9.1 & 9.3)', () => {
  it('renders two bindings of the same language as separate cards', () => {
    const html = renderToStaticMarkup(
      createElement(SourcesArea, {
        workId: WORK_ID,
        initialBindings: mockTwoSameLangBindings
      })
    )

    // Keyed by binding ID, both zh-Hans cards appear separately
    expect(html).toContain('Bản Qidian Web')
    expect(html).toContain('Bản EPUB Đối Chiếu')
    expect(html).toContain('Bản chính')
    expect(html).toContain('Đối chiếu')
    expect(html).toContain('Đặt làm bản chính')
  })

  it('renders empty state when no bindings exist', () => {
    const html = renderToStaticMarkup(
      createElement(SourcesArea, {
        workId: WORK_ID,
        initialBindings: []
      })
    )

    expect(html).toContain('Chưa có Bản raw nào')
    expect(html).toContain('Thêm Bản raw ngay')
  })
})
