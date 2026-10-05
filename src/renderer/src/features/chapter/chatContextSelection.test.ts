import { describe, expect, it } from 'vitest'
import { CHAT_BLOCK_TEXT_MAX } from '../../../../shared/contracts/aiChat'
import { addedChapterContext } from './chatContextSelection'

const CHAPTER = { id: 'chapter-3', title: 'Mùa đông', number: 3 }

describe('addedChapterContext', () => {
  it('keeps the chosen side and chapter distinct from the writing destination', () => {
    const source = addedChapterContext(CHAPTER, 'source', 'Winter came.')
    const target = addedChapterContext(CHAPTER, 'target', 'Mùa đông đến.')
    expect(source.key).toBe('chapter-3:source')
    expect(source.block).toMatchObject({
      kind: 'chapter-source', label: 'Bản gốc · Mùa đông', text: 'Winter came.'
    })
    expect(target.key).toBe('chapter-3:target')
    expect(target.block).toMatchObject({
      kind: 'chapter-target', label: 'Bản dịch · Mùa đông', text: 'Mùa đông đến.'
    })
  })

  it('freezes the selected content for both preview and send', () => {
    let content = 'Bản ở lúc chọn'
    const selected = addedChapterContext(CHAPTER, 'source', content)
    content = 'Bản sau khi sửa'
    expect(selected.block.text).toBe('Bản ở lúc chọn')
    expect(content).toBe('Bản sau khi sửa')
  })

  it('marks oversized content before the user confirms the exact prefix sent', () => {
    const content = 'a'.repeat(CHAT_BLOCK_TEXT_MAX) + 'SECRET TAIL'
    const selected = addedChapterContext(CHAPTER, 'source', content)
    expect(selected.truncated).toBe(true)
    expect(selected.length).toBe(content.length)
    expect(selected.block.detail).toContain('đã cắt')
    expect(selected.block.text).toBe('a'.repeat(CHAT_BLOCK_TEXT_MAX))
    expect(selected.block.text).not.toContain('SECRET TAIL')
  })
})
