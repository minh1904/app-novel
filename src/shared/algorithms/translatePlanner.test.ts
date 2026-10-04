import { describe, expect, it } from 'vitest'
import {
  planBatches,
  splitLongUnit,
  reassembleSplitUnits,
  estimateTextTokens
} from './translatePlanner'

describe('translatePlanner — Lập kế hoạch phân lô Lõi dịch', () => {
  it('ước tính số token phân biệt theo ngôn ngữ', () => {
    const zh = '这是中文内容。'
    const en = 'This is English content.'
    expect(estimateTextTokens(zh, 'zh-Hans')).toBeGreaterThan(0)
    expect(estimateTextTokens(en, 'en')).toBeGreaterThan(0)
  })

  it('chia lô khi vượt giới hạn số đơn vị (maxUnits)', () => {
    const units = Array.from({ length: 15 }, (_, i) => ({
      id: `u${i + 1}`,
      text: `Câu thứ ${i + 1}.`
    }))

    const plan = planBatches(units, { maxUnits: 5, maxTokens: 10000 })

    expect(plan.batches).toHaveLength(3)
    expect(plan.batches[0].units).toHaveLength(5)
    expect(plan.batches[1].units).toHaveLength(5)
    expect(plan.batches[2].units).toHaveLength(5)
    expect(plan.totalUnits).toBe(15)
  })

  it('chia lô khi vượt giới hạn token (maxTokens)', () => {
    const units = [
      { id: 'u1', text: 'Đoạn văn tương đối dài thứ nhất...' },
      { id: 'u2', text: 'Đoạn văn tương đối dài thứ hai...' },
      { id: 'u3', text: 'Đoạn văn tương đối dài thứ ba...' }
    ]

    // Đặt trần token rất nhỏ để mỗi đơn vị rơi vào 1 lô
    const plan = planBatches(units, { maxUnits: 10, maxTokens: 10 })

    expect(plan.batches.length).toBeGreaterThanOrEqual(2)
  })

  it('tách một đoạn văn bản quá dài thành các mảnh nhỏ và ráp lại đúng ID gốc', () => {
    const longText = 'Câu một. '.repeat(100) + 'Câu hai. '.repeat(100)
    const longUnit = { id: 'long-u1', text: longText }

    const pieces = splitLongUnit(longUnit, 200)
    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces[0].id).toContain('long-u1__part_1_of_')

    const plan = planBatches([longUnit], { maxUnitChars: 200 })
    expect(plan.splitMap.size).toBe(pieces.length)

    // Giả lập kết quả dịch cho các mảnh
    const translatedPieces = plan.batches.flatMap((b) => b.units).map((u, i) => ({
      id: u.id,
      text: `[Dịch mảnh ${i + 1}]`
    }))

    const reassembled = reassembleSplitUnits(translatedPieces, plan.splitMap)
    expect(reassembled).toHaveLength(1)
    expect(reassembled[0].id).toBe('long-u1')
    expect(reassembled[0].text).toContain('[Dịch mảnh 1]')
  })
})
