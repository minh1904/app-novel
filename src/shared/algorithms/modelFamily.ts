/**
 * Model family resolution and "different family judge" validation (spec translation-judging R3).
 * Pure function with no Node/DOM dependencies.
 */

export function getModelFamily(modelId: string): string {
  const lower = modelId.toLowerCase().trim()

  // OpenRouter vendor prefix
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

  // Fallback: prefix before '/' if available
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
 * Validates that the judge model belongs to a strictly different family from all translator models.
 * If two translation conditions have two different families, the judge must belong to a 3rd family.
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
