import { describe, expect, it } from 'vitest'
import type { AddressingDyadResolved, CharacterItem } from '../contracts/addressing'
import {
  containsPronoun,
  evaluateAddressingCompliance,
  extractDialogueQuotes
} from './addressingCompliance'

describe('addressingCompliance — Thuật toán kiểm tra tuân thủ xưng hô', () => {
  const charA: CharacterItem = {
    id: 'char-1',
    source: '韩立',
    target: 'Hàn Lập',
    gender: 'male',
    role: 'Nhân vật chính',
    status: 'approved',
    notes: null,
    aliases: ['Lập Ca'],
    createdAt: 1,
    updatedAt: 1
  }

  const charB: CharacterItem = {
    id: 'char-2',
    source: '南宫婉',
    target: 'Nam Cung Uyển',
    gender: 'female',
    role: 'Đạo lữ',
    status: 'approved',
    notes: null,
    aliases: [],
    createdAt: 1,
    updatedAt: 1
  }

  const activeDyadAB: AddressingDyadResolved = {
    id: 'dyad-1',
    sourceCharacterId: charA.id,
    targetCharacterId: charB.id,
    speakerPronoun: 'ta',
    recipientPronoun: 'nàng',
    formality: 'thân mật',
    status: 'approved',
    fromChapterId: null,
    toChapterId: null,
    notes: null,
    createdAt: 1,
    updatedAt: 1,
    sourceCharacter: charA,
    targetCharacter: charB
  }

  it('trích xuất câu thoại chuẩn xác từ dấu ngoặc kép và gạch đầu dòng', () => {
    const text = 'Hàn Lập cười nói: "Ta sẽ trở lại sớm thôi."\n- Nam Cung Uyển, cẩn thận!'
    const quotes = extractDialogueQuotes(text)
    expect(quotes).toEqual(['Ta sẽ trở lại sớm thôi.', 'Nam Cung Uyển, cẩn thận!'])
  })

  it('kiểm tra đại từ khớp nguyên từ tiếng Việt (word boundaries)', () => {
    expect(containsPronoun('Ta không đi.', 'ta')).toBe(true)
    expect(containsPronoun('Tác giả cuốn sách', 'ta')).toBe(false)
    expect(containsPronoun('Nam Cung Uyển, nàng hãy đợi ta.', 'nàng')).toBe(true)
    expect(containsPronoun('Nàng dâu hiền thảo', 'nàng')).toBe(true)
    expect(containsPronoun('Khách quan có khỏe không?', 'ta')).toBe(false)
  })

  it('báo cáo hợp lệ khi bản dịch tuân thủ đúng xưng hô', () => {
    const paragraphs = [
      'Hàn Lập nhìn Nam Cung Uyển mỉm cười: "Nàng yên tâm, ta nhất định sẽ thành công."'
    ]

    const report = evaluateAddressingCompliance(paragraphs, [activeDyadAB])
    expect(report.checkedParagraphsCount).toBe(1)
    expect(report.hasIssues).toBe(false)
    expect(report.issues).toHaveLength(0)
  })

  it('phát hiện đại từ tự xưng bất thường ngoài ma trận (unexpected_pronoun)', () => {
    const paragraphs = ['Hàn Lập nhìn Nam Cung Uyển: "Tôi không thể giúp cô việc này."']

    const report = evaluateAddressingCompliance(paragraphs, [activeDyadAB])
    expect(report.hasIssues).toBe(true)
    expect(report.issues.some((i) => i.actualPronoun === 'tôi')).toBe(true)
  })

  it('phát hiện sự không nhất quán giữa hai đại từ tự xưng trong cùng câu (inconsistent_pair)', () => {
    const paragraphs = ['Hàn Lập vội nói: "Ta đã nói rồi, tôi không hề biết chuyện đó!"']

    const report = evaluateAddressingCompliance(paragraphs, [activeDyadAB])
    expect(report.hasIssues).toBe(true)
    expect(report.issues.some((i) => i.issueType === 'inconsistent_pair')).toBe(true)
  })

  it('bỏ qua các dyad đang ở trạng thái pending hoặc rejected', () => {
    const pendingDyad: AddressingDyadResolved = {
      ...activeDyadAB,
      status: 'pending',
      speakerPronoun: 'huynh',
      recipientPronoun: 'muội'
    }

    const paragraphs = ['Hàn Lập nói: "Tôi đi đây."']

    const report = evaluateAddressingCompliance(paragraphs, [pendingDyad])
    expect(report.hasIssues).toBe(false)
    expect(report.issues).toHaveLength(0)
  })
})
