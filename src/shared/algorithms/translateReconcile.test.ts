import { describe, expect, it } from 'vitest'
import {
  mapToTempIds,
  normalizeTempId,
  reconcileTempItems
} from './translateReconcile'

describe('translateReconcile — Đối soát hợp đồng Lõi dịch', () => {
  it('ánh xạ đúng các đơn vị nguồn sang ID tạm [1], [2] và bỏ qua đơn vị rỗng', () => {
    const units = [
      { id: 'u1', text: 'Câu thứ nhất.' },
      { id: 'u2', text: '   ' },
      { id: 'u3', text: 'Câu thứ ba.' }
    ]

    const { sendable, skippedEmpty, idToTemp, tempToId } = mapToTempIds(units)

    expect(sendable).toEqual([
      { tempId: '[1]', originalId: 'u1', text: 'Câu thứ nhất.' },
      { tempId: '[2]', originalId: 'u3', text: 'Câu thứ ba.' }
    ])
    expect(skippedEmpty).toEqual([{ id: 'u2', text: '' }])
    expect(idToTemp.get('u1')).toBe('[1]')
    expect(idToTemp.get('u3')).toBe('[2]')
    expect(tempToId.get('[1]')).toBe('u1')
    expect(tempToId.get('[2]')).toBe('u3')
    expect(tempToId.get('1')).toBe('u1')
  })

  it('chuẩn hóa các biến thể của ID tạm', () => {
    expect(normalizeTempId('[1]')).toBe('[1]')
    expect(normalizeTempId(' 1 ')).toBe('[1]')
    expect(normalizeTempId('[ 2 ]')).toBe('[2]')
    expect(normalizeTempId('#3')).toBe('[3]')
    expect(normalizeTempId('custom-id')).toBe('custom-id')
  })

  it('đối soát thành công 1–1 khi mô hình trả về đúng và đủ', () => {
    const units = [
      { id: 'u1', text: 'Hello' },
      { id: 'u2', text: 'World' }
    ]
    const { sendable, tempToId } = mapToTempIds(units)

    const modelItems = [
      { tempId: '[1]', text: 'Xin chào' },
      { tempId: '[2]', text: 'Thế giới' }
    ]

    const result = reconcileTempItems(sendable, tempToId, modelItems)

    expect(result.matched).toEqual([
      { id: 'u1', text: 'Xin chào' },
      { id: 'u2', text: 'Thế giới' }
    ])
    expect(result.missing).toHaveLength(0)
    expect(result.extraneous).toHaveLength(0)
    expect(result.empty).toHaveLength(0)
  })

  it('bảo toàn đúng ID khi mô hình đảo lộn thứ tự trả về', () => {
    const units = [
      { id: 'u1', text: 'Một' },
      { id: 'u2', text: 'Hai' },
      { id: 'u3', text: 'Ba' }
    ]
    const { sendable, tempToId } = mapToTempIds(units)

    const modelItems = [
      { tempId: '[3]', text: 'Three' },
      { tempId: '[1]', text: 'One' },
      { tempId: '[2]', text: 'Two' }
    ]

    const result = reconcileTempItems(sendable, tempToId, modelItems)

    expect(result.matched).toEqual([
      { id: 'u3', text: 'Three' },
      { id: 'u1', text: 'One' },
      { id: 'u2', text: 'Two' }
    ])
    expect(result.missing).toHaveLength(0)
  })

  it('phát hiện ID bị thiếu khi mô hình bỏ sót', () => {
    const units = [
      { id: 'u1', text: 'A' },
      { id: 'u2', text: 'B' },
      { id: 'u3', text: 'C' }
    ]
    const { sendable, tempToId } = mapToTempIds(units)

    const modelItems = [
      { tempId: '[1]', text: 'Bản dịch A' },
      { tempId: '[3]', text: 'Bản dịch C' }
    ]

    const result = reconcileTempItems(sendable, tempToId, modelItems)

    expect(result.matched).toHaveLength(2)
    expect(result.missing).toEqual(['u2'])
  })

  it('bỏ qua ID lạ ngoài danh sách yêu cầu', () => {
    const units = [{ id: 'u1', text: 'Alpha' }]
    const { sendable, tempToId } = mapToTempIds(units)

    const modelItems = [
      { tempId: '[1]', text: 'Bản dịch 1' },
      { tempId: '[99]', text: 'Bản dịch lạ' },
      { tempId: 'ghost', text: 'Bản dịch ma' }
    ]

    const result = reconcileTempItems(sendable, tempToId, modelItems)

    expect(result.matched).toEqual([{ id: 'u1', text: 'Bản dịch 1' }])
    expect(result.extraneous).toEqual(['[99]', 'ghost'])
    expect(result.missing).toHaveLength(0)
  })

  it('chọn bản đầu tiên khi mô hình trả trùng một ID và phát hiện bản dịch rỗng', () => {
    const units = [
      { id: 'u1', text: 'X' },
      { id: 'u2', text: 'Y' }
    ]
    const { sendable, tempToId } = mapToTempIds(units)

    const modelItems = [
      { tempId: '[1]', text: 'Bản dịch đầu' },
      { tempId: '[1]', text: 'Bản dịch trùng' },
      { tempId: '[2]', text: '   ' }
    ]

    const result = reconcileTempItems(sendable, tempToId, modelItems)

    expect(result.matched).toEqual([{ id: 'u1', text: 'Bản dịch đầu' }])
    expect(result.empty).toEqual(['u2'])
    expect(result.missing).toHaveLength(0)
  })
})
