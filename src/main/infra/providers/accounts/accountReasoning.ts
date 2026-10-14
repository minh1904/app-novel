import { THINKING_LEVELS, type ThinkingLevel } from '../../../../shared/contracts/modelSettings'

/**
 * Reasoning levels of subscription-account models, which models.dev does not describe (tasks 3.4 and 4.4
 * of change `subscription-providers`). Codex follows Hermes' live-verified ladder per model generation
 * (`agent/reasoning_effort.py`, `codex_supported_efforts`): `minimal` is rejected everywhere, `max` exists
 * from gpt-5.6 / GPT-6 Sol and Luna on, and the Astra/6.1-Sol tier cannot turn reasoning off. Copilot
 * reports its own list in `/models` (`capabilities.supports.reasoning_effort`).
 */

const CODEX_GPT56: readonly string[] = ['none', 'low', 'medium', 'high', 'xhigh', 'max']
const CODEX_LEGACY: readonly string[] = ['none', 'low', 'medium', 'high', 'xhigh']
const CODEX_NO_DISABLE: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max']

const ASTRA = new Set(['gpt-6-astra', 'gpt-6-astra-900k'])
const GPT6_TIER_PREFIXES = ['gpt-6-sol', 'gpt-6-luna']
const NO_DISABLE_PREFIXES = ['gpt-6.1-sol']
const DAYBREAK = new Set(['gpt-daybreak-blue-latest', 'gpt-daybreak-blue-latest-900k'])

/** Wire levels → Mira levels: `none` is "Tắt" (`off`); unknown names are dropped, order follows Mira. */
export function thinkingLevelsFromWire(levels: readonly string[]): ThinkingLevel[] {
  const named = new Set(levels.map((level) => (level === 'none' ? 'off' : level)))
  return THINKING_LEVELS.filter((level) => named.has(level))
}

export function codexThinkingLevels(model: string): ThinkingLevel[] {
  const bare = model.trim().toLowerCase().split('/').at(-1) ?? ''
  if (ASTRA.has(bare) || NO_DISABLE_PREFIXES.some((prefix) => bare.startsWith(prefix))) {
    return thinkingLevelsFromWire(CODEX_NO_DISABLE)
  }
  const gen56 =
    bare.includes('gpt-5.6') ||
    GPT6_TIER_PREFIXES.some((prefix) => bare.startsWith(prefix)) ||
    DAYBREAK.has(bare)
  return thinkingLevelsFromWire(gen56 ? CODEX_GPT56 : CODEX_LEGACY)
}
