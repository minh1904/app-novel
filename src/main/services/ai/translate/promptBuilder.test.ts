import { describe, expect, it } from 'vitest'
import { TEACHER_ADDRESSING_RULES } from '../../../../shared/contracts/addressingPresets'
import {
  PROMPT_VERSION_V1,
  TRANSLATE_SYSTEM_PROMPT_V1,
  buildTranslateSystemPrompt,
  getLanguageInstructions,
  computePromptHash,
  computeContextHash,
  formatGlossaryLayerC,
  formatAddressingLayerB,
  buildTranslatePayload,
  buildRepairPayload
} from './promptBuilder'

describe('promptBuilder — Xây dựng prompt có version/hash và phân tầng ngữ cảnh', () => {
  it('tạo prompt mặc định với version v1 và hash SHA-256 hợp lệ', () => {
    const { prompt, version, hash } = buildTranslateSystemPrompt()
    expect(version).toBe(PROMPT_VERSION_V1)
    expect(prompt).toBe(
      TRANSLATE_SYSTEM_PROMPT_V1 + '\n\n[Quy ước thầy trò]\n' + TEACHER_ADDRESSING_RULES.join('\n')
    )
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(computePromptHash(prompt))
  })

  it('bổ sung chỉ dẫn riêng theo từng ngôn ngữ nguồn', () => {
    const jaInstruction = getLanguageInstructions('ja')
    expect(jaInstruction).toContain('-san')
    expect(jaInstruction).toContain('tiếng Nhật')

    const zhInstruction = getLanguageInstructions('zh-Hans')
    expect(zhInstruction).toContain('Hán Việt')

    const enInstruction = getLanguageInstructions('en')
    expect(enInstruction).toContain('tiếng Anh')

    const defaultInstruction = getLanguageInstructions('fr')
    expect(defaultInstruction).toBe('')

    const jaPrompt = buildTranslateSystemPrompt({ sourceLang: 'ja' })
    expect(jaPrompt.prompt).toContain('[Chỉ dẫn ngôn ngữ]')
    expect(jaPrompt.prompt).toContain('-san')
    expect(jaPrompt.hash).not.toBe(computePromptHash(TRANSLATE_SYSTEM_PROMPT_V1))
  })

  it('hỗ trợ đầy đủ các tầng ngữ cảnh A, B, C và quy ước của người dịch', () => {
    const { prompt, hash } = buildTranslateSystemPrompt({
      sourceLang: 'ja',
      customConventions: 'Nhân vật chính xưng tôi với mọi người.',
      layers: {
        layerA: 'Bối cảnh thế giới kỳ ảo, vương quốc Elenor.',
        layerB: 'Chương 3: Cuộc gặp gỡ tại kinh thành.',
        layerC: 'Thuật ngữ: Elenor -> Ê-lê-no.'
      }
    })

    expect(prompt).toContain('[Quy ước của người dịch]')
    expect(prompt).toContain('Nhân vật chính xưng tôi với mọi người.')
    expect(prompt).toContain('[Ngữ cảnh tác phẩm - Tầng A]')
    expect(prompt).toContain('vương quốc Elenor')
    expect(prompt).toContain('[Ngữ cảnh chương - Tầng B]')
    expect(prompt).toContain('Chương 3')
    expect(prompt).toContain('[Ngữ cảnh theo lô - Tầng C]')
    expect(prompt).toContain('Elenor -> Ê-lê-no')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('tính toán contextHash nhất quán và phân biệt các ngữ cảnh khác nhau', () => {
    const hash1 = computeContextHash('Glossary: A -> B')
    const hash2 = computeContextHash('Glossary: A -> B')
    const hash3 = computeContextHash('Glossary: A -> C')

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
  })

  it('xây dựng payload gửi lô chính và payload hỏi lại (repair) với ID tạm [n]', () => {
    const units = [
      { tempId: '[1]', originalId: 's1', text: 'Sentence 1' },
      { tempId: '[2]', originalId: 's2', text: 'Sentence 2' }
    ]

    const mainPayload = buildTranslatePayload(units)
    expect(JSON.parse(mainPayload)).toEqual([
      { id: '[1]', src: 'Sentence 1' },
      { id: '[2]', src: 'Sentence 2' }
    ])

    const repairPayload = buildRepairPayload([units[1]])
    expect(JSON.parse(repairPayload)).toEqual([
      { id: '[2]', src: 'Sentence 2' }
    ])
  })

  it('định dạng Tầng C và đảm bảo thuật ngữ chưa duyệt không bao giờ rời máy', () => {
    const approvedTerm = {
      id: '1',
      kind: 'term' as const,
      source: '韩立',
      target: 'Hàn Lập',
      status: 'approved' as const,
      origin: 'user' as const,
      forbidden: false,
      fromChapterId: null,
      toChapterId: null,
      notes: 'Nhân vật chính',
      aliases: ['Lập Ca'],
      createdAt: 1,
      updatedAt: 1
    }
    const pendingTerm = {
      id: '2',
      kind: 'term' as const,
      source: '筑基',
      target: 'Trúc Cơ',
      status: 'pending' as const,
      origin: 'user' as const,
      forbidden: false,
      fromChapterId: null,
      toChapterId: null,
      notes: null,
      aliases: [],
      createdAt: 1,
      updatedAt: 1
    }
    const rejectedTerm = {
      id: '3',
      kind: 'term' as const,
      source: '金丹',
      target: 'Kim Đan',
      status: 'rejected' as const,
      origin: 'user' as const,
      forbidden: false,
      fromChapterId: null,
      toChapterId: null,
      notes: null,
      aliases: [],
      createdAt: 1,
      updatedAt: 1
    }
    const forbiddenTerm = {
      id: '4',
      kind: 'term' as const,
      source: '脏话',
      target: 'Từ Cấm',
      status: 'approved' as const,
      origin: 'user' as const,
      forbidden: true,
      fromChapterId: null,
      toChapterId: null,
      notes: null,
      aliases: [],
      createdAt: 1,
      updatedAt: 1
    }

    const layerC = formatGlossaryLayerC([approvedTerm, pendingTerm, rejectedTerm, forbiddenTerm])

    // Phải có thuật ngữ đã duyệt
    expect(layerC).toContain('韩立')
    expect(layerC).toContain('Hàn Lập')
    expect(layerC).toContain('Lập Ca')
    expect(layerC).toContain('Nhân vật chính')

    // Phải có thuật ngữ cấm đã duyệt
    expect(layerC).toContain('Từ Cấm')
    expect(layerC).toContain('Thuật ngữ cấm kỵ')

    // Tuyệt đối không có thuật ngữ pending hoặc rejected
    expect(layerC).not.toContain('筑基')
    expect(layerC).not.toContain('Trúc Cơ')
    expect(layerC).not.toContain('金丹')
    expect(layerC).not.toContain('Kim Đan')

    // Context hash phản ánh nội dung này
    const contextHash = computeContextHash(layerC)
    expect(contextHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('định dạng Tầng B cho xưng hô và bảo mật các quan hệ chưa duyệt', () => {
    const charA = {
      id: 'c1',
      source: '韩立',
      target: 'Hàn Lập',
      gender: 'male' as const,
      role: 'Nhân vật chính',
      status: 'approved' as const,
      notes: null,
      aliases: [],
      createdAt: 1,
      updatedAt: 1
    }
    const charB = {
      id: 'c2',
      source: '南宫婉',
      target: 'Nam Cung Uyển',
      gender: 'female' as const,
      role: 'Đạo lữ',
      status: 'approved' as const,
      notes: null,
      aliases: [],
      createdAt: 1,
      updatedAt: 1
    }
    const charC = {
      id: 'c3',
      source: '李飞雨',
      target: 'Lý Phi Vũ',
      gender: 'male' as const,
      role: 'Bạn bè',
      status: 'pending' as const,
      notes: null,
      aliases: [],
      createdAt: 1,
      updatedAt: 1
    }

    const approvedDyad1 = {
      id: 'd1',
      sourceCharacterId: charA.id,
      targetCharacterId: charB.id,
      speakerPronoun: 'ta',
      recipientPronoun: 'nàng',
      formality: 'thân mật',
      status: 'approved' as const,
      fromChapterId: null,
      toChapterId: null,
      notes: null,
      createdAt: 1,
      updatedAt: 1,
      sourceCharacter: charA,
      targetCharacter: charB
    }

    const approvedDyad2 = {
      id: 'd2',
      sourceCharacterId: charB.id,
      targetCharacterId: charA.id,
      speakerPronoun: 'thiếp',
      recipientPronoun: 'chàng',
      formality: null,
      status: 'approved' as const,
      fromChapterId: null,
      toChapterId: null,
      notes: null,
      createdAt: 1,
      updatedAt: 1,
      sourceCharacter: charB,
      targetCharacter: charA
    }

    const pendingDyad = {
      id: 'd3',
      sourceCharacterId: charA.id,
      targetCharacterId: charB.id,
      speakerPronoun: 'huynh',
      recipientPronoun: 'muội',
      formality: null,
      status: 'pending' as const,
      fromChapterId: null,
      toChapterId: null,
      notes: null,
      createdAt: 1,
      updatedAt: 1,
      sourceCharacter: charA,
      targetCharacter: charB
    }

    const dyadWithPendingChar = {
      id: 'd4',
      sourceCharacterId: charA.id,
      targetCharacterId: charC.id,
      speakerPronoun: 'ta',
      recipientPronoun: 'huynh đệ',
      formality: null,
      status: 'approved' as const,
      fromChapterId: null,
      toChapterId: null,
      notes: null,
      createdAt: 1,
      updatedAt: 1,
      sourceCharacter: charA,
      targetCharacter: charC
    }

    const layerB = formatAddressingLayerB([
      approvedDyad1,
      approvedDyad2,
      pendingDyad,
      dyadWithPendingChar
    ])

    // Chứa các quy ước approved
    expect(layerB).toContain('[Quy ước xưng hô & đối thoại trong chương]')
    expect(layerB).toContain('Hàn Lập -> Nam Cung Uyển: Hàn Lập tự xưng "ta", gọi Nam Cung Uyển là "nàng" (sắc thái: thân mật).')
    expect(layerB).toContain('Nam Cung Uyển -> Hàn Lập: Nam Cung Uyển tự xưng "thiếp", gọi Hàn Lập là "chàng".')

    // Tuyệt đối không chứa pending dyad hay pending character
    expect(layerB).not.toContain('huynh')
    expect(layerB).not.toContain('muội')
    expect(layerB).not.toContain('Lý Phi Vũ')
    expect(layerB).not.toContain('huynh đệ')

    // System prompt tiêm Layer B thành công
    const { prompt } = buildTranslateSystemPrompt({
      layers: { layerB }
    })
    expect(prompt).toContain('[Ngữ cảnh chương - Tầng B]')
    expect(prompt).toContain(layerB)
  })
})

