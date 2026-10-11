import type {
  AddressingComplianceIssue,
  AddressingComplianceReport,
  AddressingDyadResolved,
  ParagraphAddressingCheckItem
} from '../contracts/addressing'

export type { AddressingComplianceReport, ParagraphAddressingCheckItem }

export const COMMON_SELF_PRONOUNS = [
  'ta',
  'tôi',
  'huynh',
  'đệ',
  'tỷ',
  'muội',
  'tiểu đệ',
  'tiểu muội',
  'lão phu',
  'tại hạ',
  'vãn bối',
  'mình',
  'em',
  'anh'
]

export const COMMON_RECIPIENT_PRONOUNS = [
  'ngươi',
  'nàng',
  'chàng',
  'huynh',
  'đệ',
  'tỷ',
  'muội',
  'đạo hữu',
  'tiền bối',
  'vãn bối',
  'cô nương',
  'công tử',
  'các hạ',
  'anh',
  'chị',
  'em',
  'cô'
]

const SPEAKING_VERB_REGEX =
  /(nói|đáp|hỏi|bảo|cười|lẩm bẩm|quát|thì thầm|hô|lên tiếng|tiếp lời|than|nhắc|gọi)/i

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function containsPronoun(text: string, pronoun: string): boolean {
  if (!text || !pronoun) return false
  const escaped = escapeRegex(pronoun.trim())
  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'ui')
  return regex.test(text)
}

export function extractDialogueQuotes(text: string): string[] {
  const quotes: string[] = []
  if (!text) return quotes

  // Dấu ngoặc kép thông thường hoặc ngoặc kép cong
  const doubleQuoteRegex = /["“]([^"”]+)["”]/g
  let match: RegExpExecArray | null
  while ((match = doubleQuoteRegex.exec(text)) !== null) {
    const q = match[1]?.trim()
    if (q) quotes.push(q)
  }

  // Dòng thoại bắt đầu bằng gạch ngang: - ... hoặc — ...
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const dashMatch = /^[-—–]\s*(.+)$/.exec(trimmed)
    if (dashMatch) {
      const q = dashMatch[1].trim()
      if (q && !quotes.includes(q)) {
        quotes.push(q)
      }
    }
  }

  return quotes
}

function characterMatches(text: string, names: string[]): boolean {
  return names.some((n) => n && containsPronoun(text, n))
}

/**
 * Thuật toán thuần quy tắc đánh giá mức độ tuân thủ xưng hô trên các đoạn dịch.
 * Phát hiện các đại từ lệch khỏi ma trận xưng hô đang hoạt động của chương.
 */
export function evaluateAddressingCompliance(
  paragraphs: (string | ParagraphAddressingCheckItem)[],
  dyads: AddressingDyadResolved[]
): AddressingComplianceReport {
  const issues: AddressingComplianceIssue[] = []

  const approvedDyads = dyads.filter(
    (d) =>
      d.status === 'approved' &&
      d.sourceCharacter.status === 'approved' &&
      d.targetCharacter.status === 'approved'
  )

  paragraphs.forEach((item, index) => {
    const text = typeof item === 'string' ? item : item.text
    const paragraphIndex = typeof item === 'string' ? index : (item.paragraphIndex ?? index)
    const explicitSpeakerId = typeof item === 'string' ? undefined : item.speakerCharacterId
    const explicitRecipientId = typeof item === 'string' ? undefined : item.recipientCharacterId

    const quotes = extractDialogueQuotes(text)
    if (quotes.length === 0) return

    for (const dyad of approvedDyads) {
      const srcChar = dyad.sourceCharacter
      const tgtChar = dyad.targetCharacter
      const srcNames = [srcChar.target, srcChar.source, ...srcChar.aliases].filter(Boolean)
      const tgtNames = [tgtChar.target, tgtChar.source, ...tgtChar.aliases].filter(Boolean)

      let isRelevant = false

      if (explicitSpeakerId && explicitRecipientId) {
        if (
          explicitSpeakerId === dyad.sourceCharacterId &&
          explicitRecipientId === dyad.targetCharacterId
        ) {
          isRelevant = true
        }
      } else {
        // Suy luận mức độ liên quan: người nói đi kèm động từ dẫn thoại hoặc cả hai nhân vật cùng xuất hiện
        const srcMentioned = characterMatches(text, srcNames)
        const tgtMentioned = characterMatches(text, tgtNames)

        if (srcMentioned && tgtMentioned) {
          isRelevant = true
        } else if (srcMentioned && SPEAKING_VERB_REGEX.test(text)) {
          isRelevant = true
        }
      }

      if (!isRelevant) continue

      const expectedSpeaker = dyad.speakerPronoun.trim().toLowerCase()
      const expectedRecipient = dyad.recipientPronoun.trim().toLowerCase()
      const srcDisplayName = srcChar.target || srcChar.source
      const tgtDisplayName = tgtChar.target || tgtChar.source

      for (const quote of quotes) {
        // 1. Kiểm tra đại từ tự xưng không nhất quán trong cùng một câu thoại
        const usedSelfPronouns = COMMON_SELF_PRONOUNS.filter((p) => containsPronoun(quote, p))
        if (usedSelfPronouns.includes(expectedSpeaker) && usedSelfPronouns.length > 1) {
          const conflicting = usedSelfPronouns.filter((p) => p !== expectedSpeaker)
          for (const conf of conflicting) {
            issues.push({
              paragraphIndex,
              quoteText: quote,
              speakerCharacterId: dyad.sourceCharacterId,
              recipientCharacterId: dyad.targetCharacterId,
              issueType: 'inconsistent_pair',
              expectedPronoun: dyad.speakerPronoun,
              actualPronoun: `${dyad.speakerPronoun} / ${conf}`,
              message: `Câu thoại sử dụng không nhất quán đại từ tự xưng giữa "${dyad.speakerPronoun}" và "${conf}".`
            })
          }
        }

        // 2. Kiểm tra đại từ tự xưng bất thường không theo quy ước
        if (!containsPronoun(quote, expectedSpeaker) && usedSelfPronouns.length > 0) {
          for (const actual of usedSelfPronouns) {
            issues.push({
              paragraphIndex,
              quoteText: quote,
              speakerCharacterId: dyad.sourceCharacterId,
              recipientCharacterId: dyad.targetCharacterId,
              issueType: 'unexpected_pronoun',
              expectedPronoun: dyad.speakerPronoun,
              actualPronoun: actual,
              message: `Nhân vật ${srcDisplayName} theo quy ước xưng "${dyad.speakerPronoun}" với ${tgtDisplayName}, nhưng câu thoại xuất hiện đại từ "${actual}".`
            })
          }
        }

        // 3. Kiểm tra đại từ gọi đối phương bất thường không theo quy ước
        const usedRecipientPronouns = COMMON_RECIPIENT_PRONOUNS.filter((p) =>
          containsPronoun(quote, p)
        )
        if (!containsPronoun(quote, expectedRecipient) && usedRecipientPronouns.length > 0) {
          // Tránh báo lỗi nếu đại từ đối phương trùng với đại từ tự xưng đã dự kiến
          const unexpected = usedRecipientPronouns.filter((p) => p !== expectedSpeaker)
          for (const actual of unexpected) {
            issues.push({
              paragraphIndex,
              quoteText: quote,
              speakerCharacterId: dyad.sourceCharacterId,
              recipientCharacterId: dyad.targetCharacterId,
              issueType: 'unexpected_pronoun',
              expectedPronoun: dyad.recipientPronoun,
              actualPronoun: actual,
              message: `Nhân vật ${srcDisplayName} theo quy ước gọi ${tgtDisplayName} là "${dyad.recipientPronoun}", nhưng câu thoại xuất hiện đại từ "${actual}".`
            })
          }
        }
      }
    }
  })

  return {
    checkedParagraphsCount: paragraphs.length,
    issues,
    hasIssues: issues.length > 0
  }
}
