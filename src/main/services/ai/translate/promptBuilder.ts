import { createHash } from 'node:crypto'
import type { SourceLanguage } from '../../../../shared/contracts/library'
import type { TempMappedUnit } from '../../../../shared/contracts/translateCore'
import type { ContextEntryItem } from '../../../../shared/contracts/glossary'
import type { MatchedContextEntry } from '../../../../shared/algorithms/contextMatching'

export const PROMPT_VERSION_V1 = 'translate-v1'

export const TRANSLATE_SYSTEM_PROMPT_V1 =
  'Bạn là dịch giả văn học chuyên nghiệp. Hãy dịch các đoạn văn bản nguồn sang tiếng Việt lưu loát, tự nhiên và trung thành với văn phong gốc.\n' +
  'Quy tắc hợp đồng:\n' +
  '1. Mỗi đoạn nguồn có một ID tạm thời dạng [n]. Bạn PHẢI dịch đủ mọi đoạn và giữ đúng ID tương ứng.\n' +
  '2. Đầu ra là một mảng JSON duy nhất chứa các đối tượng: [{"id": "[n]", "dst": "bản dịch tiếng Việt"}].\n' +
  '3. Không bỏ sót, không gộp hai đoạn thành một, không thêm văn bản ngoài mảng JSON.'

export const REPAIR_SYSTEM_PROMPT_V1 =
  'Bạn là dịch giả văn học. Các đoạn sau đây bị thiếu hoặc chưa hoàn chỉnh từ phản hồi trước. Hãy dịch bổ sung đúng các ID này.\n' +
  'Đầu ra là một mảng JSON duy nhất: [{"id": "[n]", "dst": "bản dịch tiếng Việt"}].'

export interface PromptContextLayers {
  /** Tầng A: Ngữ cảnh cấp tác phẩm / quy ước dịch bền vững */
  layerA?: string
  /** Tầng B: Ngữ cảnh cấp chương */
  layerB?: string
  /** Tầng C: Ngữ cảnh cấp lô (thuật ngữ, đoạn liền trước) */
  layerC?: string
}

export interface PromptBuilderOptions {
  sourceLang?: SourceLanguage | string
  layers?: PromptContextLayers
  customConventions?: string
}

export function getLanguageInstructions(sourceLang?: SourceLanguage | string): string {
  switch (sourceLang) {
    case 'ja':
      return 'Quy ước nguồn tiếng Nhật: Giữ nguyên các hậu tố xưng hô gắn sau tên riêng (-san, -kun, -chan, -sama, -senpai, -sensei...) trừ khi có yêu cầu khác. Giữ văn phong tự nhiên trong đối thoại và độc thoại nội tâm.'
    case 'zh-Hans':
    case 'zh-Hant':
      return 'Quy ước nguồn tiếng Trung: Tên nhân vật, địa danh và thuật ngữ dịch theo âm Hán Việt chuẩn xác, câu văn tự nhiên thuần Việt, tránh lạm dụng từ Hán Việt tối nghĩa.'
    case 'en':
      return 'Quy ước nguồn tiếng Anh: Dịch thoát ý nhưng giữ đúng sắc thái văn phong, ngữ điệu đối thoại tự nhiên của tiểu thuyết tiếng Việt.'
    default:
      return ''
  }
}

export function buildTranslateSystemPrompt(options?: PromptBuilderOptions): {
  prompt: string
  version: string
  hash: string
} {
  const parts: string[] = [TRANSLATE_SYSTEM_PROMPT_V1]

  const langInstruction = getLanguageInstructions(options?.sourceLang)
  if (langInstruction) {
    parts.push(`\n[Chỉ dẫn ngôn ngữ]\n${langInstruction}`)
  }

  if (options?.customConventions) {
    parts.push(`\n[Quy ước của người dịch]\n${options.customConventions}`)
  }

  if (options?.layers?.layerA) {
    parts.push(`\n[Ngữ cảnh tác phẩm - Tầng A]\n${options.layers.layerA}`)
  }

  if (options?.layers?.layerB) {
    parts.push(`\n[Ngữ cảnh chương - Tầng B]\n${options.layers.layerB}`)
  }

  if (options?.layers?.layerC) {
    parts.push(`\n[Ngữ cảnh theo lô - Tầng C]\n${options.layers.layerC}`)
  }

  const prompt = parts.join('\n')
  return {
    prompt,
    version: PROMPT_VERSION_V1,
    hash: computePromptHash(prompt)
  }
}

export function computePromptHash(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex')
}

export function computeContextHash(contextPayload: string): string {
  return createHash('sha256').update(contextPayload).digest('hex')
}

export function formatGlossaryLayerC(
  entries: (ContextEntryItem | MatchedContextEntry)[]
): string {
  const approvedItems: { entry: ContextEntryItem }[] = []
  for (const item of entries) {
    const entry = 'entry' in item ? item.entry : item
    if (entry.status === 'approved') {
      approvedItems.push({ entry })
    }
  }

  if (approvedItems.length === 0) return ''

  const regular = approvedItems.filter((i) => !i.entry.forbidden)
  const forbidden = approvedItems.filter((i) => i.entry.forbidden)

  const parts: string[] = []

  if (regular.length > 0) {
    const lines = ['[Thuật ngữ bắt buộc tuân thủ]']
    for (const { entry } of regular) {
      const aliasPart = entry.aliases.length > 0 ? ` (hoặc ${entry.aliases.join(', ')})` : ''
      const notesPart = entry.notes ? ` [Ghi chú: ${entry.notes}]` : ''
      lines.push(`- ${entry.source}${aliasPart} => ${entry.target}${notesPart}`)
    }
    parts.push(lines.join('\n'))
  }

  if (forbidden.length > 0) {
    const lines = ['[Thuật ngữ cấm kỵ (không dùng trong bản dịch)]']
    for (const { entry } of forbidden) {
      lines.push(`- Không dùng: "${entry.target}" (từ gốc: ${entry.source})`)
    }
    parts.push(lines.join('\n'))
  }

  return parts.join('\n\n')
}

export function buildTranslatePayload(units: TempMappedUnit[]): string {
  return JSON.stringify(units.map((u) => ({ id: u.tempId, src: u.text })))
}

export function buildRepairPayload(missingUnits: TempMappedUnit[]): string {
  return JSON.stringify(missingUnits.map((u) => ({ id: u.tempId, src: u.text })))
}

