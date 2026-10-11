/**
 * Xác định họ của mô hình và kiểm tra tính độc lập giữa họ của giám khảo và người dịch.
 * Hàm thuần túy không phụ thuộc Node/DOM.
 */

export function getModelFamily(modelId: string): string {
  const lower = modelId.toLowerCase().trim()

  // Tiền tố nhà cung cấp qua OpenRouter
  if (lower.startsWith('google/') || lower.includes('gemini')) {
    return 'google'
  }
  if (lower.startsWith('anthropic/') || lower.includes('claude')) {
    return 'anthropic'
  }
  if (
    lower.startsWith('openai/') ||
    lower.startsWith('gpt') ||
    lower.startsWith('o1') ||
    lower.startsWith('o3')
  ) {
    return 'openai'
  }
  if (lower.startsWith('meta-llama/') || lower.includes('llama')) {
    return 'meta'
  }
  if (lower.startsWith('deepseek/') || lower.includes('deepseek')) {
    return 'deepseek'
  }
  if (lower.startsWith('mistralai/') || lower.includes('mistral')) {
    return 'mistral'
  }
  if (lower.startsWith('qwen/') || lower.includes('qwen')) {
    return 'qwen'
  }

  // Phương án dự phòng: tiền tố trước dấu '/' nếu có
  if (lower.includes('/')) {
    return lower.split('/')[0]
  }

  return lower
}

export interface JudgeFamilyCheckResult {
  valid: boolean
  judgeFamily: string
  translatorFamilies: string[]
  reason?: string
}

/**
 * Kiểm tra xem mô hình giám khảo có thuộc họ hoàn toàn khác biệt so với tất cả các mô hình dịch hay không.
 * Nếu hai cấu hình dịch thuộc hai họ khác nhau, giám khảo bắt buộc phải thuộc họ thứ ba.
 */
export function checkJudgeFamily(
  judgeModel: string,
  translatorModels: string[],
  options?: { allowSameFamily?: boolean }
): JudgeFamilyCheckResult {
  const judgeFamily = getModelFamily(judgeModel)
  const translatorFamilies = Array.from(new Set(translatorModels.map(getModelFamily)))

  const isConflict = translatorFamilies.includes(judgeFamily)

  if (isConflict) {
    if (options?.allowSameFamily) {
      return {
        valid: true,
        judgeFamily,
        translatorFamilies,
        reason: `Cảnh báo: Giám khảo thuộc họ "${judgeFamily}", trùng với model dịch nhưng đã được cho phép bằng cờ bỏ qua.`
      }
    }
    return {
      valid: false,
      judgeFamily,
      translatorFamilies,
      reason: `Vi phạm: Giám khảo thuộc họ "${judgeFamily}", trùng với họ của model dịch [${translatorFamilies.join(', ')}]. Giám khảo phải thuộc họ độc lập.`
    }
  }

  return {
    valid: true,
    judgeFamily,
    translatorFamilies
  }
}
