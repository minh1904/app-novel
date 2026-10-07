import { THINKING_LEVELS, type ThinkingLevel } from '../contracts/modelSettings'

/**
 * The allowed level closest to `level` in `THINKING_LEVELS` order; on a tie, the lower one. `null` when the
 * model allows none (only "Mặc định"). A suggestion for the person, never applied silently: a level that was
 * changed behind their back would be sent as something they did not choose.
 */
export function nearestThinkingLevel(
  allowed: readonly ThinkingLevel[],
  level: ThinkingLevel
): ThinkingLevel | null {
  const at = THINKING_LEVELS.indexOf(level)
  let nearest: ThinkingLevel | null = null
  let best = Infinity
  // Walk from low to high and take only a strictly smaller distance, so the lower level wins a tie.
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
