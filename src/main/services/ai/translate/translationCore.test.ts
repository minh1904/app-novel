import { describe, expect, it } from 'vitest'
import { executeTranslateBatch, type TranslationModelCaller } from './translationCore'

describe('translationCore — Điều phối Lõi dịch theo lô', () => {
  it('dịch thành công lô bình thường và tính đúng usage', async () => {
    const caller: TranslationModelCaller = {
      async complete() {
        return {
          text: JSON.stringify([
            { id: '[1]', dst: 'Xin chào.' },
            { id: '[2]', dst: 'Tạm biệt.' }
          ]),
          usage: { inputTokens: 10, outputTokens: 8 }
        }
      }
    }

    const units = [
      { id: 'u1', text: 'Hello.' },
      { id: 'u2', text: 'Goodbye.' }
    ]

    const result = await executeTranslateBatch({ caller, units })

    expect(result.error).toBeNull()
    expect(result.failedIds).toHaveLength(0)
    expect(result.items).toEqual([
      { id: 'u1', text: 'Xin chào.' },
      { id: 'u2', text: 'Tạm biệt.' }
    ])
    expect(result.usage?.inputTokens).toBe(10)
    expect(result.usage?.outputTokens).toBe(8)
  })

  it('bỏ qua đơn vị rỗng mà không cần gửi tới mô hình', async () => {
    let called = false
    const caller: TranslationModelCaller = {
      async complete() {
        called = true
        return { text: '[]', usage: null }
      }
    }

    const units = [{ id: 'empty-1', text: '   ' }]
    const result = await executeTranslateBatch({ caller, units })

    expect(called).toBe(false)
    expect(result.items).toEqual([{ id: 'empty-1', text: '' }])
    expect(result.failedIds).toHaveLength(0)
    expect(result.error).toBeNull()
  })

  it('hỏi lại (repair) khi lượt đầu thiếu ID và ghép nối thành công', async () => {
    let callCount = 0
    const caller: TranslationModelCaller = {
      async complete(messages) {
        callCount++
        if (callCount === 1) {
          // Lượt 1: Chỉ trả ID [1], bỏ sót [2]
          return {
            text: JSON.stringify([{ id: '[1]', dst: 'Câu 1' }]),
            usage: { inputTokens: 10, outputTokens: 5 }
          }
        }
        // Lượt 2 (repair): Nhận prompt hỏi lại và trả ID [2]
        expect(messages[0].content).toContain('thiếu')
        return {
          text: JSON.stringify([{ id: '[2]', dst: 'Câu 2 bổ sung' }]),
          usage: { inputTokens: 5, outputTokens: 5 }
        }
      }
    }

    const units = [
      { id: 'u1', text: 'First' },
      { id: 'u2', text: 'Second' }
    ]

    const result = await executeTranslateBatch({ caller, units })

    expect(callCount).toBe(2)
    expect(result.failedIds).toHaveLength(0)
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      { id: 'u1', text: 'Câu 1' },
      { id: 'u2', text: 'Câu 2 bổ sung' }
    ])
    expect(result.usage?.inputTokens).toBe(15)
    expect(result.usage?.outputTokens).toBe(10)
  })

  it('xử lý lỗi khi kết quả bị cắt vì hết giới hạn đầu ra (finishReason: length)', async () => {
    const caller: TranslationModelCaller = {
      async complete() {
        return {
          text: '[{"id": "[1]',
          usage: { inputTokens: 50, outputTokens: 10 },
          finishReason: 'length'
        }
      }
    }

    const units = [{ id: 'u1', text: 'Văn bản rất dài...' }]
    const result = await executeTranslateBatch({ caller, units })

    expect(result.error?.kind).toBe('invalid_response')
    expect(result.failedIds).toEqual(['u1'])
    expect(result.items).toHaveLength(0)
  })

  it('giữ lại các câu thành công và báo lỗi khi hỏi lại vẫn thiếu ID', async () => {
    let callCount = 0
    const caller: TranslationModelCaller = {
      async complete() {
        callCount++
        // Cả lượt 1 và 2 đều chỉ trả [1], không bao giờ trả [2]
        return {
          text: JSON.stringify([{ id: '[1]', dst: 'Câu 1 duy nhất' }]),
          usage: { inputTokens: 10, outputTokens: 5 }
        }
      }
    }

    const units = [
      { id: 'u1', text: 'Sentence 1' },
      { id: 'u2', text: 'Sentence 2' }
    ]

    const result = await executeTranslateBatch({ caller, units })

    expect(callCount).toBe(2) // Đã thử hỏi lại một lần
    expect(result.items).toEqual([{ id: 'u1', text: 'Câu 1 duy nhất' }])
    expect(result.failedIds).toEqual(['u2'])
    expect(result.error?.kind).toBe('invalid_response')
    expect(result.error?.message).toContain('Thiếu 1 đoạn')
    expect(result.usage?.inputTokens).toBe(20)
  })

  it('xử lý phản hồi JSON hỏng hoàn toàn không thể cứu vãn', async () => {
    let callCount = 0
    const caller: TranslationModelCaller = {
      async complete() {
        callCount++
        return {
          text: 'Văn bản tự do không chứa JSON nào cả.',
          usage: { inputTokens: 10, outputTokens: 5 }
        }
      }
    }

    const units = [{ id: 'u1', text: 'Một đoạn văn' }]
    const result = await executeTranslateBatch({ caller, units })

    expect(callCount).toBe(2)
    expect(result.items).toHaveLength(0)
    expect(result.failedIds).toEqual(['u1'])
    expect(result.error?.kind).toBe('invalid_response')
  })

  it('chuyển tiếp lỗi ProviderError (timeout/network) với đúng kind và failedIds', async () => {
    const { ProviderError } = await import('../../../infra/providers/types')
    const caller: TranslationModelCaller = {
      async complete() {
        throw new ProviderError('timeout', 'Hết thời gian chờ phản hồi.')
      }
    }

    const units = [
      { id: 'u1', text: 'Unit 1' },
      { id: 'u2', text: 'Unit 2' }
    ]
    const result = await executeTranslateBatch({ caller, units })

    expect(result.error?.kind).toBe('timeout')
    expect(result.error?.message).toBe('Hết thời gian chờ phản hồi.')
    expect(result.failedIds).toEqual(['u1', 'u2'])
    expect(result.items).toHaveLength(0)
  })

  it('dừng và không gọi repair khi tín hiệu signal bị hủy (abort)', async () => {
    const controller = new AbortController()
    let callCount = 0

    const caller: TranslationModelCaller = {
      async complete() {
        callCount++
        // Sau khi hoàn thành lượt 1 thì người dùng bấm Hủy
        controller.abort()
        return {
          text: JSON.stringify([{ id: '[1]', dst: 'Đã xong trước khi hủy' }]),
          usage: { inputTokens: 10, outputTokens: 5 }
        }
      }
    }

    const units = [
      { id: 'u1', text: 'First' },
      { id: 'u2', text: 'Second' }
    ]

    const result = await executeTranslateBatch({
      caller,
      units,
      signal: controller.signal
    })

    // Chỉ gọi đúng 1 lần, không gửi tiếp lượt repair vì signal đã bị abort
    expect(callCount).toBe(1)
    expect(result.items).toEqual([{ id: 'u1', text: 'Đã xong trước khi hủy' }])
    expect(result.failedIds).toEqual(['u2'])
  })
})

