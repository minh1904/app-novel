import { THINKING_LEVELS, type ThinkingLevel } from '../contracts/modelSettings'

/**
 * Mức suy nghĩ cho phép gần nhất với `level` theo thứ tự `THINKING_LEVELS`; khi khoảng cách bằng nhau, ưu tiên mức thấp hơn.
 * Trả về `null` khi mô hình không hỗ trợ cấu hình mức suy nghĩ (chỉ có "Mặc định").
 * Đây là giá trị gợi ý cho người dùng và không tự ý áp dụng ngầm.
 */
export function nearestThinkingLevel(
  allowed: readonly ThinkingLevel[],
  level: ThinkingLevel
): ThinkingLevel | null {
  const at = THINKING_LEVELS.indexOf(level)
  let nearest: ThinkingLevel | null = null
  let best = Infinity
  // Duyệt từ thấp đến cao và chỉ nhận khoảng cách nhỏ hơn tuyệt đối, để mức thấp hơn được ưu tiên khi hòa.
  for (const candidate of THINKING_LEVELS) {
    if (!allowed.includes(candidate)) continue
    const distance = Math.abs(THINKING_LEVELS.indexOf(candidate) - at)
    if (distance < best) {
      best = distance
      nearest = candidate
    }
  }
  return nearest
}
