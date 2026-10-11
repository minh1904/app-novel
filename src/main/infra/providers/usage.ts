import type { TokenUsage } from '../../../shared/contracts/usage'

/**
 * What a provider says a call cost in tokens, in one shape for every endpoint.
 *
 * Convention (design D9 of change `ai-gateway`): `inputTokens` counts only the input that was **not**
 * served from the provider's cache, the way Zed, pi-ai and the AI SDK spec count it. OpenAI-style
 * endpoints report `prompt_tokens` *including* cached tokens, so the cached part is taken out here and
 * reported on its own. Goose counts the other way round, which is why the convention is written down.
 *
 * A field the endpoint did not send is **absent**, never 0: 0 would read as "measured, and free".
 */
export interface Usage {
  /** Input not served from cache. */
  inputTokens: number
  outputTokens: number
  /** Input served from the provider's cache (billed at the cache-read price). */
  cacheReadTokens?: number
  /** Input written into the provider's cache. */
  cacheWriteTokens?: number
  /**
   * Reasoning ("thinking") tokens, always **a part of** `outputTokens`: a model is billed for them at the
   * output price, so the output figure has to include them for the cost to be right.
   *
   * OpenAI-style endpoints already count them inside `completion_tokens` and say how many in
   * `completion_tokens_details.reasoning_tokens`. **Gemini does not**: its `completion_tokens` is only
   * the visible answer and it reports no detail, but `total_tokens` still adds the thinking. In a real call
   * (2026-10-03, gemini-2.5-flash, `__fixtures__/live/chat-complete.json`) that was 21 in, 13 out, total 125:
   * 91 tokens of thinking, seven times the answer, invisible unless the total is compared. With
   * `reasoning_effort: "none"` the same prompt gave total 33 = 21 + 12.
   */
  reasoningTokens?: number
}

/** A count the endpoint sent: a non-negative number, or a digit string (some gateways send those). */
function readCount(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  return undefined
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/**
 * Reads the `usage` object of an OpenAI-compatible response or stream chunk.
 *
 * Returns `null` unless both the prompt and the completion count are present: a half-known usage is
 * not something a bill can be built from, and the caller already treats `null` as "not reported".
 */
export function normalizeUsage(raw: unknown): Usage | null {
  const usage = record(raw)
  const prompt = readCount(usage.prompt_tokens)
  const completion = readCount(usage.completion_tokens)
  if (prompt === undefined || completion === undefined) return null

  const promptDetails = record(usage.prompt_tokens_details)
  // OpenAI / OpenRouter report `cached_tokens`; DeepSeek reports `prompt_cache_hit_tokens`.
  const cacheRead =
    readCount(promptDetails.cached_tokens) ?? readCount(usage.prompt_cache_hit_tokens)
  const cacheWrite = readCount(promptDetails.cache_write_tokens)
  let reasoning = readCount(record(usage.completion_tokens_details).reasoning_tokens)

  // Thinking that is billed but not counted anywhere: the total exceeds prompt + completion while no
  // reasoning figure was given. The surplus is the thinking (Gemini). When a reasoning figure *is* given
  // (OpenAI), `completion_tokens` already contains it and the total adds up, so this does nothing.
  const total = readCount(usage.total_tokens)
  let hidden = 0
  if (reasoning === undefined && total !== undefined && total > prompt + completion) {
    hidden = total - prompt - completion
    reasoning = hidden
  }

  const result: Usage = {
    // `prompt_tokens` includes the cached part on these endpoints; never let it go negative.
    inputTokens: Math.max(0, prompt - (cacheRead ?? 0) - (cacheWrite ?? 0)),
    outputTokens: completion + hidden
  }
  if (cacheRead !== undefined) result.cacheReadTokens = cacheRead
  if (cacheWrite !== undefined) result.cacheWriteTokens = cacheWrite
  if (reasoning !== undefined) result.reasoningTokens = reasoning
  return result
}

function addOptional(a: number | undefined, b: number | undefined): number | undefined {
  return a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0)
}

/** Sums the usage of several calls. A call without usage adds nothing; two without give `null`. */
export function addUsage(total: Usage | null, next: Usage | null): Usage | null {
  if (next === null) return total
  if (total === null) return { ...next }
  const sum: Usage = {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens
  }
  const cacheRead = addOptional(total.cacheReadTokens, next.cacheReadTokens)
  const cacheWrite = addOptional(total.cacheWriteTokens, next.cacheWriteTokens)
  const reasoning = addOptional(total.reasoningTokens, next.reasoningTokens)
  if (cacheRead !== undefined) sum.cacheReadTokens = cacheRead
  if (cacheWrite !== undefined) sum.cacheWriteTokens = cacheWrite
  if (reasoning !== undefined) sum.reasoningTokens = reasoning
  return sum
}

/**
 * The shape that crosses IPC (`TokenUsage`): `inputTokens` is the **total** input including cache,
 * which is the number a person expects to see on screen and what the renderer already shows.
 */
export function toWireUsage(usage: Usage, complete = true): TokenUsage {
  const result: TokenUsage = {
    inputTokens: usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0),
    uncachedInputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    source: 'provider',
    complete
  }
  if (usage.cacheReadTokens !== undefined) result.cacheReadTokens = usage.cacheReadTokens
  if (usage.cacheWriteTokens !== undefined) result.cacheWriteTokens = usage.cacheWriteTokens
  if (usage.reasoningTokens !== undefined) result.reasoningTokens = usage.reasoningTokens
  return result
}

/** Aggregates every executed call; missing usage lowers completeness rather than becoming zero. */
export function aggregateReportedUsage(calls: readonly (Usage | null)[]): TokenUsage | null {
  let total: Usage | null = null
  let complete = true
  for (const call of calls) {
    if (call === null) complete = false
    else total = addUsage(total, call)
  }
  return total === null ? null : toWireUsage(total, complete)
}
